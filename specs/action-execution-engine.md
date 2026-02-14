# Action Execution Engine Specification

## Purpose

The Action Execution Engine dispatches and executes user-defined actions in response to DOM events, API lifecycle callbacks, workflow invocations, and lifecycle hooks. It implements a recursive dispatch model where actions can trigger sub-actions, workflow callbacks can chain back to the calling context, and custom actions support cleanup lifecycle via signal-based destruction.

### Jobs to Be Done

- Dispatch actions by type through a unified `handleAction()` entry point
- Support 10 built-in action types plus extensible custom actions
- Manage URL state changes with appropriate browser history semantics
- Execute workflows across component boundaries via context providers
- Chain workflow callbacks back to the invoking component's context
- Provide cleanup lifecycle for custom actions (event listeners, timers)
- Handle legacy and v2 API fetch actions with callback merging

---

## Action Type Dispatch

### Overview

The `handleAction()` function receives an `ActionModel`, the current component data snapshot, a `ComponentContext`, an optional DOM `Event`, and an optional `workflowCallback` function. It dispatches on `action.type` through a switch statement.

### Action Types

| Type | Description |
|------|-------------|
| `Switch` | Conditional branching — executes first matching case |
| `SetVariable` | Updates a component variable in the data signal |
| `TriggerEvent` | Emits a component event to parent |
| `TriggerWorkflowCallback` | Sends data back to workflow caller |
| `SetURLParameter` | Updates a single URL path or query parameter |
| `SetURLParameters` | Updates multiple URL parameters atomically |
| `Fetch` | Triggers an API request (v1 or v2) |
| `AbortFetch` | Cancels in-flight API requests (v2 only) |
| `TriggerWorkflow` | Invokes a workflow on same or different component |
| `Custom` / `undefined` | Delegates to registered custom action handler |

---

## Built-in Action Types

### Switch

Evaluates case conditions sequentially, executing actions from the first truthy case. Falls back to `default` if no case matches.

**Flow:**
1. Iterate `action.cases` array
2. For each case, evaluate `condition` formula via `applyFormula()`
3. First case where `toBoolean(result)` is true → execute its `actions` array
4. If no case matches → execute `action.default.actions`
5. Only one case executes per Switch action

**Data context:** Each sub-action receives merged data: `{ ...data, ...ctx.dataSignal.get() }`. This ensures sub-actions see the latest signal state, not a stale snapshot.

### SetVariable

Evaluates a formula and updates a named variable in the component's data signal.

**Flow:**
1. Evaluate `action.data` formula to get the new value
2. Call `ctx.dataSignal.update()` with immutable update: spreads existing `Variables` and overwrites `[action.name]`

**Signal propagation:** The `update()` call triggers deep equality check. If the variable value actually changed, all subscribers (DOM bindings, derived signals) are notified.

### TriggerEvent

Emits a named event from the component to its parent, carrying a formula-evaluated payload.

**Flow:**
1. Evaluate `action.data` formula to get the payload
2. Call `ctx.triggerEvent(action.name, payload)`

The parent component receives this event through its event handler bindings on the child component node.

### TriggerWorkflowCallback

Sends data back to the workflow invoker via the `workflowCallback` function passed down the action chain.

**Flow:**
1. Evaluate `action.data` formula to get the payload
2. Call `workflowCallback?.(action.name, payload)` — optional chaining because not all actions are invoked from a workflow context

### SetURLParameter

Updates a single URL parameter with appropriate browser history handling.

**Flow:**
1. Inside `locationSignal.update()` callback:
2. Evaluate `action.data` formula to get the new value
3. Determine parameter type:
   - If `action.name` matches a route **path** segment → default `historyMode = 'push'`
   - Otherwise → treat as **query** parameter, default `historyMode = 'replace'`
4. Build new location object with updated params/query
5. Compare old and new URLs via `getLocationUrl()`
6. If URL changed, apply `action.historyMode` override (if set), then call `history.pushState()` or `history.replaceState()`

**History semantics:**
- Path parameter changes → `push` (new history entry, back button returns to previous page)
- Query parameter changes → `replace` (no new history entry)
- Override via `action.historyMode` allows explicit control

**Query parameter removal:** When `value` is `undefined`/`null`, the query parameter is removed from the URL (via conditional spread).

### SetURLParameters

Batch-updates multiple URL parameters atomically in a single location signal update.

**Flow:**
1. Early return if `action.parameters` is empty
2. Inside `locationSignal.update()`:
3. Validate each parameter against the route definition:
   - `isValidPathParameter()`: checks `p.type === 'param'` (stricter than SetURLParameter)
   - `isValidQueryParameter()`: checks against route's `query` definitions
4. Accumulate `pathUpdates` and `queryUpdates` separately
5. If any path parameter changes → default `historyMode = 'push'`
6. Build new location, check `fastDeepEqual` against current
7. If changed, apply history state update

**Key difference from SetURLParameter:** Uses strict `type === 'param'` check for path parameters (not just name matching). A route must exist. Deep equality check prevents unnecessary history entries.

### Fetch

Triggers an API request.

**API flow:**
1. Look up API by name in `ctx.apis`
2. Evaluate `action.inputs` formulas to compute input values
3. Build `actionModels` with callback action arrays from `onSuccess`, `onError`, `onMessage`
4. Call `api.fetch()` with inputs, models, component data, and workflow callback
5. The API system handles callback execution internally

**Error handling:** Missing API logs `console.error` and returns without throwing.

### AbortFetch

Cancels all in-flight requests for a named API.

**Flow:**
1. Look up API by name in `ctx.apis`
2. Call `api.cancel()` which aborts all tracked controllers

### TriggerWorkflow

Invokes a named workflow, either on the current component or on a context provider component.

**Context provider workflow flow:**
1. Resolve provider from `ctx.providers` using `[package, componentName]` key (with fallback to unqualified name)
2. Look up workflow on `provider.component.workflows`
3. Evaluate `action.parameters` formulas in current context
4. Execute workflow actions with **provider's context** (`provider.ctx`), but merged data:
   - `{ ...data, ...provider.ctx.dataSignal.get(), Parameters: parameters }`
5. Pass a `workflowCallback` function that, when called, executes callback actions in the **caller's context** (`ctx`)

**Same-component workflow flow:**
1. Look up workflow on `ctx.component.workflows`
2. Evaluate parameters
3. Execute workflow actions with current context, merged data includes `Parameters`
4. Same callback mechanism as above

**Callback chain:** The `workflowCallback` function creates a closure that bridges the two component contexts:
- Workflow actions run in the **target** component's context (can modify target's variables, trigger target's APIs)
- Callback actions run in the **calling** component's context (can modify caller's variables)
- Callback data: `{ ...data, ...ctx.dataSignal.get(), Parameters: parameters, Event: callbackData }`

### Custom Actions (default case)

Handles all action types not matched by built-in types, including `type: 'Custom'`, `type: undefined`, and `type: null`.

**Custom action flow:**
1. Look up via `ctx.toddle.getCustomAction(action.name, action.package ?? ctx.package)`
2. Evaluate `action.arguments` as named key-value pairs
3. Call `newAction.handler(args, { root, triggerActionEvent }, event)`
4. **Cleanup lifecycle:** If handler returns a function or Promise:
   - Subscribe to data signal with a `destroy` callback
   - On signal destroy (component unmount), call the cleanup function
   - If Promise, await resolution then call cleanup
   - Enables patterns like `addEventListener` → return `removeEventListener`

**Sub-event handler:** Custom actions can trigger named sub-events via `triggerActionEvent(trigger, eventData)`. This looks up `action.events[trigger]` and executes its actions with `Event` set to the event data.

---

## Formula Context

All formula evaluations within actions use the same context structure:

```
{
  data: ComponentData,          // Current component data snapshot
  component: Component,         // Component definition
  formulaCache: FormulaCache,   // Per-component formula memoization
  root: Document | ShadowRoot,  // DOM root for custom actions
  package: string | null,       // Package namespace
  toddle: Toddle,               // Global runtime object
  env: ToddleEnv,               // Environment (server/client flags)
}
```

---

## Data Freshness

Several action types merge the initial `data` parameter with `ctx.dataSignal.get()` before passing to sub-actions:

```
{ ...data, ...ctx.dataSignal.get() }
```

This pattern ensures sub-actions see variables that were modified by preceding actions in the same action chain, since `SetVariable` updates the signal synchronously.

---

## Error Handling

### Outer Try-Catch

The entire `handleAction()` body is wrapped in `try/catch`. On any unhandled error:
- `console.error(e)` logs the error
- Returns `null` (no re-throw, no propagation)

### Custom Action Inner Try-Catch

The custom action (default) case has its own `try/catch`:
- `console.error('Error in Custom Action', err)` with specific prefix

### Missing Resources

| Missing Resource | Behavior |
|-----------------|----------|
| `action` is null/undefined | Throws `'Action does not exist'` (caught by outer try-catch) |
| API not found | `console.error` + return (no throw) |
| Workflow not found | `console.warn` + return |
| Custom action not found | `console.error('Missing custom action')` + return |
| Provider not found | Silent return (no warning) |
| Provider's workflow not found | `console.warn` with descriptive message |

---

## Data Models

### ActionModel Union Type

```
ActionModel =
  | VariableActionModel      // type: 'SetVariable'
  | EventActionModel         // type: 'TriggerEvent'
  | SwitchActionModel        // type: 'Switch'
  | FetchActionModel         // type: 'Fetch'
  | AbortFetchActionModel    // type: 'AbortFetch'
  | CustomActionModel        // type: 'Custom' | undefined | null
  | SetURLParameterAction    // type: 'SetURLParameter'
  | SetMultiUrlParameterAction // type: 'SetURLParameters'
  | WorkflowActionModel      // type: 'TriggerWorkflow'
  | WorkflowCallbackActionModel // type: 'TriggerWorkflowCallback'
```

### Key Model Fields

| Model | Notable Fields |
|-------|---------------|
| `SwitchActionModel` | `cases: Array<{ condition, actions }>`, `default: { actions }` |
| `FetchActionModel` | `name: string`, `inputs`, `onSuccess`, `onError`, `onMessage` |
| `SetURLParameterAction` | `name: string`, `historyMode?: 'replace' \| 'push'` |
| `SetMultiUrlParameterAction` | `parameters: Record<string, Formula>`, `historyMode` |
| `WorkflowActionModel` | `name: string`, `parameters`, `callbacks`, `componentName?` |
| `CustomActionModel` | `name: string`, `package?`, `arguments?`, `events?`, `version?: 2` |

---

## Edge Cases

- **Stale data in action chains:** Mitigated by re-reading `ctx.dataSignal.get()` before sub-action execution
- **SetURLParameter path vs query ambiguity:** Legacy behavior matches by `name` only (not `type === 'param'`), kept for backwards compatibility. SetURLParameters uses stricter `type === 'param'` check
- **Query parameter removal:** Setting `undefined` value removes the parameter from the URL
- **URL unchanged after parameter update:** `history.pushState/replaceState` is skipped when URLs are equal, preventing empty history entries
- **Custom action cleanup with Promise:** Awaits Promise resolution before calling cleanup, with error catching
- **Workflow callback without caller context:** `workflowCallback?.()` uses optional chaining — safe when action isn't invoked from a workflow
- **Provider resolution fallback:** Tries `[package/componentName]` key first, falls back to bare `componentName` name
- **Missing route in SetURLParameters:** Returns current location unchanged when `current.route` is undefined

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxCount` | 1,000 | Maximum items processed |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Count limit:** Stop processing

---

## Invariants

1. **I-OP-VALID:** Operations MUST be valid.
2. **I-OP-SAFE:** Operations MUST be safe.
3. **I-OP-DETERMINISTIC:** Results MUST be deterministic.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-VALID | Build | Error: validation |
| I-OP-SAFE | Runtime | Reject operation |
| I-OP-DETERMINISTIC | Testing | CI failure |

---

## Error Handling

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
