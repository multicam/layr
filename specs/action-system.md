# Action System Specification

## Purpose

The Action System drives all user interactions and side effects in Layr. It provides a declarative action model executed by the `handleAction()` engine, supporting 10 action types, 19 built-in actions, workflow execution, and integration with the component lifecycle.

### Jobs to Be Done

- Execute sequential action lists in response to events
- Support conditional branching within action sequences
- Trigger API fetches with success/error/message callbacks
- Manage component variables reactively
- Execute reusable workflows with parameters and callbacks
- Provide built-in actions for storage, navigation, cookies, timers, and more
- Enable custom (plugin) actions with cleanup lifecycle

---

## Data Models

### ActionModel (Union Type)

All actions are one of 10 types:

| Type | Description |
|------|-------------|
| `SetVariable` | Update a component variable |
| `TriggerEvent` | Emit event to parent component |
| `Switch` | Conditional branching with cases and default |
| `Fetch` | Trigger API fetch with callbacks |
| `AbortFetch` | Cancel in-flight API request |
| `Custom` | Call a custom/plugin action |
| `SetURLParameter` | Update a single URL parameter |
| `SetMultiUrlParameter` | Update multiple URL parameters |
| `TriggerWorkflow` | Call a workflow with parameters and callbacks |
| `WorkflowCallback` | Invoke a workflow callback from within the workflow |

### SetVariable Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'SetVariable'` | Discriminator |
| `variable` | `string` | Variable name to update |
| `value` | `Formula` | New value formula |

### TriggerEvent Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'TriggerEvent'` | Discriminator |
| `event` | `string` | Event name |
| `data` | `Formula` | Event payload formula |

### Switch Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'Switch'` | Discriminator |
| `cases` | `Array<{ condition: Formula, actions: ActionModel[] }>` | Evaluated sequentially |
| `default` | `{ actions: ActionModel[] }` | Fallback if no case matches |

### Fetch Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'Fetch'` | Discriminator |
| `api` | `string` | API name to trigger |
| `onSuccess` | `{ actions: ActionModel[] }?` | Success callback |
| `onError` | `{ actions: ActionModel[] }?` | Error callback |
| `onMessage` | `{ actions: ActionModel[] }?` | Stream message callback |

### Custom Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'Custom'` | Discriminator |
| `name` | `string` | Action name |
| `package` | `string?` | Package namespace |
| `version` | `2?` | Version flag (v2 = named args) |
| `arguments` | `CustomActionArgument[]?` | Named arguments (v2) |
| `data` | `Formula?` | Single argument (legacy) |
| `events` | `Record<string, { actions: ActionModel[] }>?` | Sub-event handlers |

### TriggerWorkflow Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'TriggerWorkflow'` | Discriminator |
| `workflow` | `string` | Workflow name |
| `contextProvider` | `string?` | Context provider component name |
| `parameters` | `Record<string, { formula: Formula }>?` | Input parameters |
| `callbacks` | `Record<string, { actions: ActionModel[] }>?` | Callback handlers |

### WorkflowCallback Action

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'TriggerWorkflowCallback'` | Discriminator |
| `event` | `string` | Callback name |
| `data` | `Formula` | Callback payload formula |

---

## Action Execution Engine

### `handleAction(action, data, ctx, event?, workflowCallback?)`

**Input:**
- `action`: Action definition to execute
- `data`: Current `ComponentData` (Variables, Attributes, Apis, Event, Parameters, etc.)
- `ctx`: `ComponentContext` (signals, formulas, APIs, providers)
- `event`: Optional DOM event that triggered action
- `workflowCallback`: Optional callback for workflow communication

**Algorithm:**

1. Switch on `action.type`
2. For each action type, evaluate formulas with current `data` and `ctx`
3. Apply state updates via `ctx.dataSignal.update()` (reactive)
4. Recursively call `handleAction()` for nested actions
5. Wrap in try-catch at top level

**Synchronicity:** All actions execute synchronously. Fetch actions are fire-and-forget (callbacks execute later). Recursive calls for nested actions are immediate.

---

## Action Type Behaviors

### SetVariable

1. Evaluate `action.value` formula
2. Update `ctx.dataSignal.Variables[variableName]` via immutable signal update

### TriggerEvent

1. Evaluate `action.data` formula → payload
2. Call `ctx.triggerEvent(action.event, payload)`
3. Parent handles via event listener on `ComponentNodeModel`

### Switch

1. Evaluate each `case.condition` formula sequentially
2. Convert result via `toBoolean()`
3. First truthy case wins (`.find()`)
4. If no match, use `action.default`
5. Execute all actions in matched case, each receiving latest `ctx.dataSignal.get()` data

### Fetch

1. Look up API by `action.api` in `ctx.apis`
2. Call API's `fetch()` method
3. On success: Execute `onSuccess` actions with `Event = { type: 'success', data, status, headers }`
4. On error: Execute `onError` actions with `Event = { type: 'failed', error, status, headers }`
5. On message (streaming): Execute `onMessage` actions with `Event = { type: 'message', data }`

### AbortFetch

1. Look up API by name in `ctx.apis`
2. Call API's `cancel()` method

### Custom Action (v2)

1. Create `triggerActionEvent` callback for sub-events
2. Look up handler: `ctx.toddle.getCustomAction(name, package)`
3. Evaluate all argument formulas into named `args` object
4. Call `handler(args, { root, triggerActionEvent }, event)`
5. If handler returns function or Promise: Subscribe cleanup to component destroy

### Custom Action (Legacy)

1. Look up handler: `ctx.toddle.getAction(name)`
2. Evaluate arguments array or single `data` field
3. Call `handler(args, { ...ctx, triggerActionEvent }, event)`

### URL Parameter Actions

- `SetURLParameter`: Updates single query parameter and pushes to browser history
- `SetMultiUrlParameter`: Updates multiple parameters at once

---

## Action Handler Signatures

### V2 Handler

```
(args: Record<string, unknown>, ctx: { triggerActionEvent, root }, event?) =>
  void | (() => void) | Promise<void> | Promise<() => void)>
```

**Return values:**
- `void`: Action completed
- `() => void`: Cleanup function (called on component unmount)
- `Promise<void>`: Async action
- `Promise<() => void>`: Async action with cleanup

### Legacy Handler

```
(args: unknown[], ctx: { triggerActionEvent, env, abortSignal }, event?) => void
```

**Differences from v2:** Array-based arguments, `abortSignal` instead of returned cleanup, no Promise support.

### Cleanup Pattern

V2 cleanup functions are registered by subscribing to the component data signal's destroy lifecycle. When the signal is destroyed (component unmount), the cleanup function runs.

---

## Workflow Execution

### Triggering a Workflow

1. **Resolve workflow:** Look up in `ctx.component.workflows[name]` or in context provider's workflows
2. **Evaluate parameters:** Each parameter formula evaluated with current data
3. **Execute actions:** All workflow actions run sequentially with `Parameters` in data context
4. **Handle callbacks:** Workflow actions can call `TriggerWorkflowCallback`, which invokes the callback from the original `TriggerWorkflow` action

### Context Provider Workflows

When `contextProvider` is specified:
- Workflow actions execute in the **provider's** `ComponentContext`
- Callback actions execute in the **consumer's** `ComponentContext`
- Parameters bridge both contexts

### Data Available in Workflows

| Path | Value |
|------|-------|
| `Parameters` | Evaluated workflow parameters |
| `Event` | Callback payload (inside callback handlers) |
| All standard `ComponentData` | Variables, Attributes, Apis, etc. |

---

## Built-in Actions (19 total)

### Local Storage (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Save to local storage | `Key` (string), `Value` (any) | `localStorage.setItem(key, JSON.stringify(value))` |
| Delete from local storage | `Key` (string) | `localStorage.removeItem(key)` |
| Clear local storage | None | `localStorage.clear()` |

### Session Storage (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Save to session storage | `Key` (string), `Value` (any) | `sessionStorage.setItem(key, JSON.stringify(value))` |
| Delete from session storage | `Key` (string) | `sessionStorage.removeItem(key)` |
| Clear session storage | None | `sessionStorage.clear()` |

### Cookies (3)

| Action | Arguments | Events | Behavior |
|--------|-----------|--------|----------|
| Set cookie | `Name`, `Value`, `Expires in` (seconds), `SameSite`, `Path`, `Include Subdomains` | Success, Error | Sets `document.cookie` |
| Set HttpOnly cookie | Same as above | Success, Error | POST to `/.nordcraft/cookies/set-cookie` |
| Set session cookies | `Access token`, `Expires in` | — | **Deprecated.** Superseded by Set HttpOnly cookie |

### Navigation (1)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Go to URL | `URL` (string) | Sets `window.location.href`. Blocked in preview mode (posts message to editor) |

### Events (3)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Focus | `Element` (DOM element) | Calls `element.focus()` |
| Prevent default | None | Calls `event.preventDefault()` |
| Stop propagation | None | Calls `event.stopPropagation()` |

### Timers (2)

| Action | Arguments | Events | Cleanup |
|--------|-----------|--------|---------|
| Sleep | `Delay in milliseconds` | `tick` (after delay) | Clears timeout on unmount |
| Interval | `Interval in milliseconds` | `tick` (every interval) | Clears interval on unmount |

### Debugging (1)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Log to console | `Label`, `Data` | `console.log(label, data)` |

### Sharing (2)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| Copy to clipboard | `Value` (string) | `navigator.clipboard.writeText(value)` |
| Share | `URL?`, `Title?`, `Text?` | `navigator.share(data)` (at least one field required) |

### Theming (1)

| Action | Arguments | Events | Behavior |
|--------|-----------|--------|----------|
| Set theme | `Name` (string or null) | Success, Error | Sets theme cookie via `cookieStore.set()`. Null resets to default |

---

## Action Registration

### V2 Actions

```
getCustomAction(name, packageName) → looks up in toddle.actions[packageName][name]
```

### Legacy Actions

```
registerAction(name, handler) → stores in legacyActions map
getAction(name) → retrieves from legacyActions map
```

### Built-in Action Namespace

All built-in actions are prefixed with `@toddle/` in the registry.

---

## Action Traversal

### `getActionsInAction(action, path)`

Generator that recursively yields all actions in nested structures:

- `Switch`: Traverses cases and default actions
- `Fetch`: Traverses onSuccess, onError, onMessage actions
- `Custom`: Traverses event actions
- `TriggerWorkflow`: Traverses callback actions
- Leaf actions (SetVariable, TriggerEvent, etc.): No traversal

Used by the editor for refactoring, search, and analysis.

---

## Component Lifecycle Integration

### onLoad

Fires once after component mounts (after initial render). All `onLoad` actions execute with full `ComponentData`.

### onAttributeChange

Fires when component attributes change. `Event.detail` contains `{ [attrName]: { current, new } }`.

### Abort Signal

Created per component at mount. All timers, event listeners, and pending operations use this signal for automatic cleanup on unmount.

```
abortController.abort(`Component ${component.name} unmounted`)
```

---

## Event Data Flow

### DOM Events → Actions

1. DOM event fires on element
2. Event handler's action list executes
3. Each action receives `{ ...dataSignal.get(), Event: eventPayload }`

### Component Events → Parent

1. Child calls `TriggerEvent` action
2. Parent's event handler receives `Event` payload
3. Parent's action list executes

### API Callbacks → Actions

1. API response received
2. `onCompleted` / `onFailed` / `onMessage` action lists execute
3. `Event` contains response data, status, and headers

### Workflow Callbacks → Actions

1. Workflow action calls `TriggerWorkflowCallback`
2. Original `TriggerWorkflow` callback handler executes
3. `Event` contains callback payload, `Parameters` contains workflow parameters

---

## Edge Cases

- **Nested data refresh:** Each nested action receives latest `{ ...data, ...ctx.dataSignal.get() }` to see previous action's changes
- **Preview mode navigation:** `goToURL` is blocked and sends message to parent frame
- **Timer cleanup:** Sleep and Interval register cleanup on `abortSignal` abort event
- **V2 action cleanup:** Returned functions registered on signal destroy lifecycle
- **Custom action error:** Caught at top level, logged, does not halt action sequence
- **Duplicate action registration:** Legacy actions log error and skip (no override)
- **Set theme requirement:** Requires `style-variables-v2` feature flag

---

## System Limits

### Execution Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxActionDepth` | 100 | 500 | Maximum nested action depth (Switch→Fetch→callback) |
| `maxActionsPerEvent` | 1,000 | 5,000 | Maximum actions in single event handler |
| `maxSwitchCases` | 20 | 100 | Maximum cases in Switch action |
| `maxWorkflowDepth` | 50 | 200 | Maximum nested workflow calls |

### Time Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxActionExecutionTime` | 5,000ms | Maximum synchronous action execution time |
| `maxSleepDuration` | 60,000ms | Maximum sleep/interval duration |

### Enforcement

- **Depth limit:** Throws `LimitExceededError` if exceeded
- **Time limit:** Logs warning in dev, continues in production
- **Action count:** Truncates with warning if exceeded

---

## Invariants

### Structural Invariants

1. **I-ACT-TYPE:** Every action MUST have a `type` field matching one of the 10 types.
2. **I-ACT-SWITCH-CASES:** Switch MUST have at least 1 case.
3. **I-ACT-SWITCH-DEFAULT:** Switch MUST have a default.
4. **I-ACT-FETCH-API:** Fetch MUST reference an existing API.

### Execution Invariants

5. **I-ACT-SEQUENTIAL:** Actions execute sequentially in definition order.
6. **I-ACT-STATE-PROPAGATION:** Each action sees changes from previous actions.
7. **I-ACT-ABORT-CLEANUP:** All pending operations MUST clean up on abort signal.

### Workflow Invariants

8. **I-ACT-WORKFLOW-REF:** TriggerWorkflow MUST reference existing workflow.
9. **I-ACT-CALLBACK-SCOPE:** WorkflowCallback only valid inside workflow context.
10. **I-ACT-RECURSION-LIMIT:** Maximum workflow depth MUST be enforced.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-ACT-TYPE | Build | Error: schema validation |
| I-ACT-FETCH-API | Runtime | Warning: skip action |
| I-ACT-WORKFLOW-REF | Runtime | Warning: skip action |
| I-ACT-RECURSION-LIMIT | Runtime | Error: throw `LimitExceededError` |

---

## Error Handling

### Error Types

| Error Type | When Thrown | Recovery |
|------------|-------------|----------|
| `ActionExecutionError` | Action throws | Log, continue to next action |
| `LimitExceededError` | Depth/count exceeded | Stop execution |
| `ApiNotFoundError` | Fetch references missing API | Skip, continue |
| `WorkflowNotFoundError` | Workflow not found | Skip, continue |

### Per-Action Error Handling

```typescript
try {
  await executeAction(action, data, ctx);
} catch (e) {
  console.error(`Action ${action.type} failed:`, e);
  // Continue to next action (don't halt sequence)
}
```

### Nested Action Errors

- **Switch case error:** Case fails, subsequent cases not evaluated, default runs
- **Fetch callback error:** Error logged, other callbacks still execute
- **Custom action error:** Error logged, sequence continues

---

## Recursion Prevention

### Problem

Workflows can call themselves directly or indirectly:
- A → TriggerWorkflow('B') → B → TriggerWorkflow('A') → cycle

### Detection

```typescript
interface ActionContext {
  workflowStack: string[];  // ['workflowA', 'workflowB']
}

function executeWorkflow(name: string, ctx: ActionContext) {
  if (ctx.workflowStack.includes(name)) {
    throw new LimitExceededError(
      'workflow', 
      'maxWorkflowDepth', 
      ctx.workflowStack.length, 
      LIMITS.maxWorkflowDepth
    );
  }
  
  ctx.workflowStack.push(name);
  // ... execute workflow
  ctx.workflowStack.pop();
}
```

---

## Changelog

### Unreleased
- Added System Limits section with execution, time, and depth limits
- Added Invariants section with 10 structural, execution, and workflow invariants
- Added Error Handling section with error types and recovery
- Added Recursion Prevention section with workflow cycle detection
