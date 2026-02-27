# 04 — Action System

Declarative side-effect execution engine for all user interactions, API triggers, navigation, and state mutations. Actions execute synchronously in response to DOM events, API callbacks, and lifecycle hooks.

**Implementing packages:** `packages/types/src/action.ts`, `packages/core/src/action/handle.ts`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| 10 action types | MVP |
| `handleAction()` dispatch engine | MVP |
| Sequential action execution | MVP |
| `Switch` conditional branching | MVP |
| `SetVariable` reactive state update | MVP |
| `TriggerEvent` child-to-parent events | MVP |
| `Fetch` API trigger with callbacks | MVP |
| `AbortFetch` cancel in-flight request | MVP |
| `Custom` plugin actions with cleanup | MVP |
| `SetURLParameter` / `SetURLParameters` | MVP |
| `TriggerWorkflow` synchronous workflows | MVP |
| `TriggerWorkflowCallback` callback mechanism | MVP |
| Depth limit (100) | MVP |
| Data freshness merge (`...dataSignal.get()`) | MVP |
| Context provider workflows | MVP |
| Async workflows | Phase 2 |
| Workflow recursion depth guard | Phase 2 |
| `getActionsInAction()` traversal | Phase 2 |

---

## TypeScript Types

```typescript
// packages/types/src/action.ts

export type ActionModel =
  | SetVariableAction
  | TriggerEventAction
  | SwitchAction
  | FetchAction
  | AbortFetchAction
  | CustomAction
  | SetURLParameterAction
  | SetURLParametersAction
  | TriggerWorkflowAction
  | WorkflowCallbackAction;

export interface SetVariableAction {
  type: 'SetVariable';
  name: string;
  data?: Formula;
}

export interface TriggerEventAction {
  type: 'TriggerEvent';
  name: string;
  data?: Formula;
}

export interface SwitchAction {
  type: 'Switch';
  data?: Formula;
  cases: Array<{ condition: Formula; actions: ActionModel[] }>;
  default?: { actions: ActionModel[] };
}

export interface FetchAction {
  type: 'Fetch';
  name: string;
  inputs?: Array<{ name: string; formula?: Formula }>;
  onSuccess?: { actions: ActionModel[] };
  onError?: { actions: ActionModel[] };
  onMessage?: { actions: ActionModel[] };
}

export interface AbortFetchAction {
  type: 'AbortFetch';
  name: string;
}

export interface CustomAction {
  type?: 'Custom';
  name: string;
  package?: string;
  version?: 2;
  arguments?: CustomActionArgument[];
  data?: Formula;
  events?: Record<string, { actions: ActionModel[] }>;
}

export interface CustomActionArgument {
  name: string;
  formula: Formula;
}

export interface SetURLParameterAction {
  type: 'SetURLParameter';
  name: string;
  data?: Formula;
  historyMode?: 'push' | 'replace';
}

export interface SetURLParametersAction {
  type: 'SetURLParameters';
  parameters: Array<{ name: string; formula: Formula }>;
  historyMode?: 'push' | 'replace';
}

export interface TriggerWorkflowAction {
  type: 'TriggerWorkflow';
  name: string;
  parameters?: Array<{ name: string; formula?: Formula }>;
  callbacks?: Record<string, { actions: ActionModel[] }>;
  componentName?: string;
  package?: string;
}

export interface WorkflowCallbackAction {
  type: 'TriggerWorkflowCallback';
  name: string;
  data?: Formula;
}
```

---

## Action Types

| Type | Description |
|------|-------------|
| `SetVariable` | Update a component variable via reactive signal |
| `TriggerEvent` | Emit named event with payload to parent component |
| `Switch` | Conditional branch — execute first matching case, or default |
| `Fetch` | Trigger an API request; callbacks fire on success/error/message |
| `AbortFetch` | Cancel all in-flight requests for a named API |
| `Custom` | Invoke a registered plugin action handler |
| `SetURLParameter` | Update a single URL path or query parameter |
| `SetURLParameters` | Update multiple URL parameters atomically |
| `TriggerWorkflow` | Execute a named workflow with parameters and callbacks [MVP sync] |
| `TriggerWorkflowCallback` | Send data back to the `TriggerWorkflow` call site |

---

## Execution Engine

### `handleAction(action, ctx, event?, workflowCallback?, depth = 0): void`

```typescript
// packages/core/src/action/handle.ts

export interface ActionContext {
  dataSignal: Signal<ComponentData>;
  apis: Record<string, ApiInstance>;
  component: Component;
  triggerEvent: (name: string, data: unknown) => void;
  setUrlParameter: (key: string, value: string | null) => void;
  toddle: { getCustomAction: (name: string, pkg?: string) => CustomActionHandler | undefined };
  env: ToddleEnv;
  providers?: Record<string, { component: Component; ctx: ActionContext }>;
  package?: string;
  applyFormula?: (formula: Formula, ctx: FormulaContext) => unknown;
  event?: Event;
  preview?: boolean;
  onUnmount?: (cleanup: () => void) => void;
}
```

**Depth limit:** 100. On breach, logs error and returns without executing.

**Outer try-catch:** Wraps the entire switch. Errors are logged to `console.error` and execution returns. Actions do not throw to callers.

**Synchronicity:** All built-in actions are synchronous. `Fetch` is fire-and-forget — the request is initiated but the function returns immediately; callbacks execute later via the API system. Async workflows are [Phase 2].

### Data freshness

Sub-actions within `Switch` and `TriggerWorkflow` receive merged data to see changes from preceding actions:

```
{ ...data, ...ctx.dataSignal.get() }
```

`SetVariable` updates the signal synchronously, so the next action in a sequence sees the updated value.

---

## Action Behaviors

### SetVariable

1. Evaluate `action.data` formula
2. `ctx.dataSignal.update(data => ({ ...data, Variables: { ...data.Variables, [action.name]: value } }))`

Signal's deep equality check (via `fast-deep-equal`) prevents redundant DOM updates if the value hasn't actually changed.

### TriggerEvent

1. Evaluate `action.data` formula → payload
2. `ctx.triggerEvent(action.name, payload)`

Parent component receives the event via its event handler binding on the child component node.

### Switch

1. For each case: evaluate `case.condition` formula → `toBoolean(result)`
2. First truthy case wins → execute its `actions` array
3. If no case matches → execute `action.default.actions`
4. Each sub-action receives `{ ...data, ...ctx.dataSignal.get() }` (data freshness)

### Fetch

1. Look up `ctx.apis[action.name]`; if missing → `console.warn`, return
2. Evaluate each `action.inputs[i].formula` → `inputs` record
3. Call `api.fetch({ inputs, callbacks })`
4. Callbacks execute later:
   - `onSuccess` → `Event = { type: 'success', data, status, headers }`
   - `onError` → `Event = { type: 'failed', error, status, headers }`
   - `onMessage` → `Event = { type: 'message', data }` (streaming)

### AbortFetch

1. Look up `ctx.apis[action.name]`
2. Call `api.cancel()` — aborts all tracked `AbortController` instances for this API

### Custom

1. Look up `ctx.toddle.getCustomAction(action.name, action.package ?? ctx.package)`
2. If not found → `console.warn`, return
3. Evaluate `action.arguments` → `args: Record<string, unknown>`
4. Call `handler(args, { root: document, triggerActionEvent }, event)`
5. Cleanup lifecycle:
   - Handler returns `() => void` → register on signal destroy
   - Handler returns `Promise<() => void>` → await, then register cleanup [Phase 2]
   - Handler returns `Promise<void>` → async execution [Phase 2]

**Sub-events:** Custom actions call `triggerActionEvent(name, data)` to fire named events. This executes `action.events[name].actions` with `Event = data`.

**Handler signature:**
```typescript
type CustomActionHandler = (
  args: Record<string, unknown>,
  ctx: { root: Document; triggerActionEvent: (name: string, data: unknown) => void },
  event?: Event
) => void | (() => void) | Promise<void> | Promise<() => void>
```

### SetURLParameter

1. Evaluate `action.data` formula → value
2. Determine parameter type:
   - Matches a route path segment → default `historyMode = 'push'`
   - Query parameter → default `historyMode = 'replace'`
3. Apply `action.historyMode` override if set
4. Call `history.pushState()` or `history.replaceState()`
5. Setting `null`/`undefined` value removes the query parameter

### SetURLParameters

Batch-updates multiple parameters in one `locationSignal.update()` call. Prevents redundant history entries using `fastDeepEqual` check before applying.

Path parameter detection uses strict `type === 'param'` check (stricter than `SetURLParameter`'s name-match approach — kept for backwards compatibility).

### TriggerWorkflow [MVP — synchronous]

**Local workflow** (no `componentName`):
1. Look up `ctx.component.workflows[action.name]`; if missing → `console.warn`, return
2. Evaluate `action.parameters` formulas in caller's context
3. Execute `workflow.actions` with merged data `{ ...callerData, ...componentSignal.get(), Parameters: evaluatedParams }`
4. Pass `callbackHandler` as `workflowCallback` down the action chain

**Context provider workflow** (`componentName` set):
1. Resolve provider: `ctx.providers["pkg/componentName"] ?? ctx.providers["componentName"]`
2. Look up workflow on `provider.component.workflows[action.name]`
3. Evaluate parameters in caller's context
4. Execute workflow actions in **provider's context** (`provider.ctx`)
5. Callbacks still execute in **caller's context**

**Scope rules:**

| Phase | Context |
|-------|---------|
| Parameter evaluation | Caller's context |
| Workflow actions | Workflow owner's context |
| Callback actions | Caller's context |

**Async workflows:** [Phase 2] — All workflow actions currently execute synchronously. No async/await support.

### TriggerWorkflowCallback

1. If `workflowCallback` is `undefined` → `console.warn`, return
2. Evaluate `action.data` formula → payload
3. Call `workflowCallback(action.name, payload)`

The `workflowCallback` function was passed down from the `TriggerWorkflow` handler. It executes the matching callback actions in the original caller's context.

---

## Workflow Data Model

```typescript
// packages/types (part of component definition)

interface ComponentWorkflow {
  name: string;
  parameters: Array<{ name: string; testValue?: unknown }>;
  callbacks?: Array<{ name: string; testValue?: unknown }> | null;
  actions: ActionModel[];
  exposeInContext?: boolean | null;
  testValue?: unknown;
}
```

| Field | Description |
|-------|-------------|
| `name` | Unique within component |
| `parameters` | Named inputs; evaluated as formulas at call site |
| `callbacks` | Named output events the workflow can trigger back to caller |
| `actions` | Sequential action pipeline |
| `exposeInContext` | If `true`, workflow is available to descendant components via context providers |

### Callback mechanism

Callback data context when `TriggerWorkflowCallback` fires:
```
{
  ...callerData,
  ...callerSignal.get(),
  Parameters: originalParams,   // Same params passed to TriggerWorkflow
  Event: callbackPayload         // Data from TriggerWorkflowCallback.data
}
```

If no matching callback was provided in `TriggerWorkflow.callbacks`, the call is silently ignored (optional chaining).

---

## Built-in Actions (19)

All built-in actions are registered as `Custom` actions under the `@toddle/` namespace.

### Local Storage (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Save to local storage | `Key`, `Value` | `localStorage.setItem(key, JSON.stringify(value))` |
| Delete from local storage | `Key` | `localStorage.removeItem(key)` |
| Clear local storage | — | `localStorage.clear()` |

### Session Storage (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Save to session storage | `Key`, `Value` | `sessionStorage.setItem(key, JSON.stringify(value))` |
| Delete from session storage | `Key` | `sessionStorage.removeItem(key)` |
| Clear session storage | — | `sessionStorage.clear()` |

### Cookies (2 active + 1 deprecated)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Set cookie | `Name`, `Value`, `Expires in` (s), `SameSite`, `Path`, `Include Subdomains` | Sets `document.cookie` |
| Set HttpOnly cookie | Same as above | POST to `/.layr/cookies/set-cookie` |
| Set session cookies | `Access token`, `Expires in` | **Deprecated.** Use Set HttpOnly cookie. |

### Navigation (1)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Go to URL | `URL` | `window.location.href = url`. Blocked in preview mode (posts message to editor frame). |

### Events (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Focus | `Element` | `element.focus()` |
| Prevent default | — | `event.preventDefault()` |
| Stop propagation | — | `event.stopPropagation()` |

### Timers (2)

| Action | Arguments | Events | Cleanup |
|--------|-----------|--------|---------|
| Sleep | `Delay` (ms) | `tick` after delay | `clearTimeout` on abort signal |
| Interval | `Interval` (ms) | `tick` every interval | `clearInterval` on abort signal |

### Debugging (1)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Log to console | `Label`, `Data` | `console.log(label, data)` |

### Sharing (2)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Copy to clipboard | `Value` | `navigator.clipboard.writeText(value)` |
| Share | `URL?`, `Title?`, `Text?` | `navigator.share(data)` |

### Theming (1)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Set theme | `Name` (string or null) | Sets theme cookie via `cookieStore.set()`. `null` resets to default. Requires `style-variables-v2` feature flag. |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `action` is null/undefined | Throws `'Action does not exist'` (caught by outer try-catch, logged) |
| API not found | `console.error` + return |
| Workflow not found | `console.warn` + return |
| Custom action not found | `console.warn` + return |
| Provider not found | `console.warn` + return |
| Provider's workflow not found | `console.warn` with descriptive message |
| Callback not found | Silent (optional chaining) |
| Depth limit exceeded | `console.error` + return |
| Any unhandled exception | `console.error` + return (no re-throw) |

---

## Component Lifecycle Integration

### onLoad

Fires once after component mount (after initial render). Executes action list with full `ComponentData`. Deferred via `BatchQueue` to run after the first render pass.

### onAttributeChange

Fires when parent updates component attributes. `Event.detail` contains `{ [attrName]: { current, new } }`. Also deferred via `BatchQueue`.

### Abort Signal

Each component creates an `AbortController` linked to its data signal's destroy lifecycle. Used to auto-cancel pending operations on unmount:
- Fetch requests pass the abort signal to `fetch()`
- Timer actions (`Sleep`, `Interval`) listen to the abort event
- Custom action cleanups registered via signal destroy subscriber

---

## Action Traversal [Phase 2]

### `getActionsInAction(action, path)`

Generator yielding all actions in nested structures, with their paths. Used by the editor for refactoring and search.

| Action type | Traversal |
|-------------|-----------|
| `Switch` | Recurse into each case's `actions` and `default.actions` |
| `Fetch` | Recurse into `onSuccess.actions`, `onError.actions`, `onMessage.actions` |
| `Custom` | Recurse into each `events[key].actions` |
| `TriggerWorkflow` | Recurse into each `callbacks[key].actions` |
| Leaf types | No recursal |

### Formula locations in actions

| Action type | Formula locations |
|-------------|-----------------|
| `SetVariable` | `data` |
| `TriggerEvent` | `data` |
| `TriggerWorkflowCallback` | `data` |
| `SetURLParameter` | `data` |
| `SetURLParameters` | `parameters[i].formula` |
| `Fetch` | `inputs[i].formula` |
| `Custom` | `arguments[i].formula`, `data` |
| `Switch` | `data`, `cases[i].condition` |

---

## System Limits

| Limit | Value | Behavior on breach |
|-------|-------|--------------------|
| `MAX_ACTION_DEPTH` | 100 | Log error, return without executing |

Additional limits from the original specs (per-event action count, workflow depth, execution time) are aspirational and not yet enforced. [Phase 2]

---

## Cross-references

- Formula evaluation: `applyFormula()` — see `03-formula-system.md`
- Reactive state updates: `Signal.update()` — see `05-signal-system.md`
- Component rendering and event binding: see `06-rendering.md`
- API system: Fetch/AbortFetch delegate to API instances — see `07-api-system.md` (if exists)
- Component data model (`ComponentWorkflow`): see `02-component-system.md`
