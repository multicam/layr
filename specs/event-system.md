# Event System Specification

## Purpose

The Event System handles all user interactions, lifecycle triggers, and inter-component communication in the Layr runtime. It connects DOM events to action pipelines, manages custom component events, fires lifecycle hooks, and dispatches workflow triggers — all flowing through a single recursive `handleAction()` dispatcher.

### Jobs to Be Done

- Bind DOM events (click, input, submit, drag, etc.) to declarative action lists
- Dispatch custom component events from child to parent
- Fire lifecycle events (`onLoad`, `onAttributeChange`) at the right moments
- Execute action pipelines synchronously with access to the current component data context
- Support nested action dispatch (Switch branching, Fetch callbacks, Workflow triggers, Custom action events)
- Provide cleanup for custom actions that return teardown functions

---

## Architecture

### Event Flow

```
DOM Event (click, input, etc.)
      │
      ▼
Event Listener on Element (addEventListener)
      │
      ├── DragEvent: augment with parsed drag data
      ├── ClipboardEvent: augment with parsed clipboard data
      │
      ▼
For each action in EventModel.actions:
      │
      ▼
handleAction(action, { ...componentData, Event: e }, ctx, e)
      │
      ├── SetVariable        → Update dataSignal
      ├── TriggerEvent       → Call ctx.triggerEvent (parent handler)
      ├── TriggerWorkflow    → Execute workflow actions with parameters
      ├── Fetch              → Trigger API fetch with callbacks
      ├── AbortFetch         → Cancel in-flight API request
      ├── SetURLParameter    → Update location signal (deprecated)
      ├── SetURLParameters   → Update location signal
      ├── Switch             → Evaluate cases, dispatch first match
      ├── Custom/Built-in    → Evaluate args, call handler
      └── TriggerWorkflowCallback → Call workflow callback
```

### Key Files

| File | Responsibility |
|------|----------------|
| `packages/runtime/src/events/handleAction.ts` | Central action dispatcher |
| `packages/runtime/src/components/createElement.ts` | DOM event binding on element nodes |
| `packages/runtime/src/components/createComponent.ts` | Custom event wiring between components |
| `packages/runtime/src/components/renderComponent.ts` | Lifecycle event firing (onLoad, onAttributeChange) |
| `packages/runtime/src/components/createNode.ts` | Conditional and repeat rendering with event context |

---

## Event Binding

### DOM Events on Element Nodes

When an `ElementNodeModel` is rendered via `createElement()`:

1. Each entry in `node.events` is converted to a `[eventName, handler]` pair
2. An `addEventListener(eventName, handler, { signal: ctx.abortSignal })` is registered on the DOM element
3. The `AbortSignal` ensures automatic cleanup when the component unmounts

**Event handler behavior:**

```
getEventHandler({ event, dataSignal, ctx }) → (e: Event) => {
  for each action in event.actions:
    - If DragEvent: augment e.data with parsed drag transfer data
    - If ClipboardEvent: augment e.data with parsed clipboard items (JSON where possible)
    - handleAction(action, { ...dataSignal.get(), Event: e }, ctx, e)
  return false
}
```

The `Event` key in the data context gives formulas access to the native DOM event object.

### Custom Component Events

When a `ComponentNodeModel` is rendered via `createComponent()`:

1. An `onEvent` callback is created that searches `node.events` for a matching trigger name
2. This callback is passed as `ctx.triggerEvent` to the child component's context
3. When the child dispatches `TriggerEvent` action, it calls `ctx.triggerEvent(eventName, payload)`
4. The parent's `onEvent` finds the matching handler and executes its actions in the parent's context

**Event propagation chain:**

```
Child Component
  └── TriggerEvent action { event: "submitted", data: formula }
      └── ctx.triggerEvent("submitted", evaluatedData)
          └── Parent's onEvent callback
              └── Find node.events where trigger === "submitted"
                  └── handleAction(action, { ...parentData, Event: data }, parentCtx)
```

This same `onEvent` callback is also wired into API creation, so API lifecycle events (onCompleted, onFailed) from child components can bubble to parent event handlers.

---

## Lifecycle Events

### onLoad

Fired once after the component is mounted and the root node is created.

**Timing:** Batched via `BatchQueue` — all `onLoad` handlers are queued and executed together after the synchronous render pass completes. This ensures the DOM is fully constructed before lifecycle actions run.

**Implementation (in `renderComponent()`):**

```
BATCH_QUEUE.add(() => {
  component.onLoad?.actions?.forEach(action =>
    handleAction(action, dataSignal.get(), ctx)
  )
})
```

### onAttributeChange

Fired when any of the component's attributes change value.

**Timing:** Also batched. A derived signal watches `data.Attributes` and on each change (after the first), fires the actions.

**Implementation:**

```
dataSignal.map(data => data.Attributes).subscribe(props => {
  if (prev) {
    // Build a CustomEvent with detail = { [attrName]: { current, new } }
    // Only include attributes that actually changed (deep equality check)
    handleAction(action, dataSignal.get(), ctx, changeEvent)
  }
  prev = props
})
```

**Event detail format:** A `CustomEvent('attribute-change')` with `detail` containing:
```typescript
{
  [attributeName: string]: {
    current: any  // Previous value
    new: any      // New value
  }
}
```

Only attributes that actually changed (per `fastDeepEqual`) are included. The attribute's `name` field (not its key) is used as the property name.

---

## Action Dispatch (`handleAction`)

### Signature

```typescript
handleAction(
  action: ActionModel,
  data: ComponentData,
  ctx: ComponentContext,
  event?: Event,
  workflowCallback?: (event: string, data: unknown) => void,
)
```

### Action Types

#### SetVariable

Updates a component variable in the data signal.

```
ctx.dataSignal.update(data => ({
  ...data,
  Variables: { ...data.Variables, [action.variable]: evaluatedValue }
}))
```

#### TriggerEvent

Emits a custom event to the parent component.

```
ctx.triggerEvent(action.event, evaluatedPayload)
```

#### Switch

Evaluates case conditions in order; executes the first truthy case's actions, or the default.

```
const matchedCase = action.cases?.find(c => toBoolean(applyFormula(c.condition, ...)))
  ?? action.default
matchedCase?.actions?.forEach(a => handleAction(a, freshData, ctx, event, workflowCallback))
```

Only one case executes per Switch action.

#### Fetch

Triggers an API fetch. Supports both v2 and legacy APIs.

**V2 API:**
- Evaluates input formulas to override API defaults
- Passes `onCompleted`, `onFailed`, `onMessage` action lists as callbacks
- Calls `api.fetch({ actionInputs, actionModels, componentData, workflowCallback })`

**Legacy API:**
- Calls `api.fetch()` returning a Promise
- `.then()` triggers `onSuccess` actions
- `.catch()` triggers `onError` actions

#### AbortFetch

Cancels an in-flight v2 API request. Logs a warning for legacy APIs (not supported).

#### SetURLParameter (deprecated)

Updates a single URL parameter. Determines whether the parameter is a path segment or query parameter:
- Path parameter: defaults to `push` history mode
- Query parameter: defaults to `replace` history mode
- Respects explicit `historyMode` override

Updates `ctx.toddle.locationSignal` and calls `window.history.pushState/replaceState`.

#### SetURLParameters

Updates multiple URL parameters atomically. Same path/query detection logic but handles N parameters in one pass.

- Deep equality check prevents no-op updates
- History mode defaults to `push` if any path parameter changed, `replace` for query-only changes

#### TriggerWorkflow

Executes a named workflow with evaluated parameters.

**Two modes:**

1. **Local workflow:** Looks up `ctx.component.workflows[action.workflow]` and executes its actions with `Parameters` in the data context
2. **Context provider workflow:** Looks up the workflow from `ctx.providers[action.contextProvider]` and executes it in the provider's context

Both modes support **workflow callbacks**: a `workflowCallback` function is passed that, when called from a `TriggerWorkflowCallback` action inside the workflow, triggers callback actions in the caller's context with the callback data as `Event`.

```
workflow.actions.forEach(action =>
  handleAction(action, { ...data, Parameters: evaluatedParams }, providerCtx, event,
    (callbackName, callbackData) => {
      callbacks[callbackName]?.actions?.forEach(a =>
        handleAction(a, { ...callerData, Parameters, Event: callbackData }, callerCtx))
    }
  )
)
```

#### TriggerWorkflowCallback

Calls the `workflowCallback` function passed from the parent workflow trigger. Only meaningful inside a workflow execution context.

#### Custom Action (v2)

1. Evaluates all named arguments from formulas
2. Calls `action.handler(args, { root, triggerActionEvent }, event)`
3. If the handler returns a function (or Promise of a function), registers it as a cleanup callback on the data signal's destroy hook

#### Custom Action (legacy)

1. Evaluates arguments (named array for v2-style, or legacy `action.data` fallback)
2. Calls `legacyHandler(args, { ...ctx, triggerActionEvent }, event)`

#### Built-in Action

Same dispatch path as Custom Action — looked up from `ctx.toddle.getCustomAction` with the `@toddle/` prefix.

---

## Data Context During Event Handling

Each action receives a `ComponentData` object that includes:

| Key | Value | When Available |
|-----|-------|----------------|
| `Location` | Current route location | Always |
| `Attributes` | Component input props | Always |
| `Variables` | Component state | Always |
| `Contexts` | Subscribed context data | If contexts defined |
| `Apis` | API status objects | Always |
| `Event` | The triggering DOM event or custom event payload | During event handling |
| `ListItem` | `{ Item, Index, Key, Parent? }` | Inside repeat nodes |
| `Parameters` | Workflow parameters | Inside workflow execution |
| `Page` | `{ Theme }` | Always |

Actions that read data via `ctx.dataSignal.get()` get the latest state, not a snapshot — this means actions later in a list see variable changes made by earlier actions in the same list.

---

## Event Augmentation

### DragEvent

When a DOM event is a `DragEvent`, the handler augments it with `e.data = getDragData(e)`, parsing the drag transfer data for formula access.

### ClipboardEvent

When a DOM event is a `ClipboardEvent`, the handler augments it with `e.data` containing all clipboard items, keyed by MIME type. JSON items are automatically parsed; non-JSON items are kept as strings.

---

## Cleanup & Lifecycle

### AbortSignal-based Cleanup

Each component creates an `AbortController`. The signal is:
- Passed to all `addEventListener` calls for automatic event listener removal
- Aborted when the component's data signal is destroyed (component unmounts)

### Custom Action Cleanup

If a v2 custom action handler returns:
- A function → it's called on component unmount
- A Promise that resolves to a function → the resolved function is called on unmount
- `void` or `Promise<void>` → no cleanup needed

This is registered via `ctx.dataSignal.subscribe(() => {}, { destroy: cleanup })`.

---

## Edge Cases

- **Missing action**: If `action` is falsy, throws `'Action does not exist'` (caught by outer try/catch, logged to console)
- **Missing API**: If a `Fetch` or `AbortFetch` references a non-existent API key, logs a console error and returns
- **Missing workflow**: If a `TriggerWorkflow` references a non-existent workflow, logs a console warning and returns
- **Missing custom action**: If neither v2 nor legacy handler is found, logs `'Missing custom action'` to console
- **Duplicate repeat keys**: Falls back to array index as key with a console warning
- **DOM modified externally**: Conditional toggle logs errors/warnings if parent element is missing or duplicate `data-id` exists

---

## System Limits

### Event Handler Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxEventHandlers` | 50 | 200 | Event handlers per node |
| `maxEventActions` | 100 | 500 | Actions per event handler |
| `maxEventDepth` | 20 | 50 | Maximum nested event dispatch depth |

### Event Payload Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxEventPayloadSize` | 1 MB | Maximum event payload size |
| `maxClipboardItems` | 50 | Maximum clipboard items parsed |

### Enforcement

- **Handler count:** Truncate with warning
- **Action count:** Continue execution, log warning
- **Event depth:** Throw `LimitExceededError`

---

## Invariants

### Event Definition Invariants

1. **I-EVENT-NAME-VALID:** Event names MUST be valid DOM event names or custom identifiers.
2. **I-EVENT-HANDLER-NOT-NULL:** Event handlers MUST NOT be null (use empty action array).
3. **I-EVENT-ACTION-SEQUENTIAL:** Actions execute in definition order.

### Execution Invariants

4. **I-EVENT-DATA-IMMUTABLE:** Original event object MUST NOT be mutated.
5. **I-EVENT-PROPAGATION-RESPECTED:** `stopPropagation()` MUST halt dispatch.
6. **I-EVENT-CLEANUP-GUARANTEED:** All listeners MUST be removed on unmount.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-EVENT-HANDLER-NOT-NULL | Build | Error: schema validation |
| I-EVENT-DATA-IMMUTABLE | Runtime | Clone before augmentation |
| I-EVENT-CLEANUP-GUARANTEED | Runtime | AbortSignal cleanup |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `EventHandlerError` | Action execution fails | Log, continue |
| `EventPayloadError` | Payload parse fails | Set `Event.data` to null |
| `EventDepthError` | Max depth exceeded | Stop propagation |

### Event Error Context

```typescript
interface EventError extends Error {
  eventName: string;
  nodeId: string;
  componentContext: string;
  actionIndex: number;
}
```

---

## Changelog

### Unreleased
- Added System Limits section with event handler and payload limits
- Added Invariants section with 6 event definition and execution invariants
- Added Error Handling section with error types and context
