# 07 — Event System

Connects DOM events and component lifecycle triggers to declarative action pipelines. All events route through a single `handleAction()` dispatcher.

**Packages:** `@layr/runtime`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| DOM event binding via `addEventListener` | MVP |
| AbortSignal-based listener cleanup | MVP |
| Custom component events (`TriggerEvent`) | MVP |
| Lifecycle events (`onLoad`, `onAttributeChange`) | MVP |
| Action dispatcher (`handleAction`) | MVP |
| Switch branching | MVP |
| Fetch / AbortFetch actions | MVP |
| SetURLParameter / SetURLParameters | MVP |
| Workflow execution (`TriggerWorkflow`) | MVP |
| Workflow callbacks (`TriggerWorkflowCallback`) | MVP |
| DragEvent data extraction | MVP |
| ClipboardEvent data extraction | MVP |
| Custom action cleanup functions | MVP |
| Event delegation (`delegateEvent`) | MVP |

---

## 1. Event Flow

```
DOM Event (click, input, submit, drag, etc.)
  │
  ▼
addEventListener on Element (with AbortSignal)
  │
  ├── DragEvent:      augment e.data with parsed drag transfer data
  ├── ClipboardEvent: augment e.data with parsed clipboard items (JSON where possible)
  │
  ▼
For each action in event.actions:
  handleAction(action, { ...dataSignal.get(), Event: e }, ctx, e)
  │
  ├── SetVariable         → update dataSignal
  ├── TriggerEvent        → ctx.triggerEvent (parent handler)
  ├── TriggerWorkflow     → execute workflow actions with Parameters
  ├── Fetch               → trigger API fetch with callbacks
  ├── AbortFetch          → cancel in-flight API request
  ├── SetURLParameter     → update locationSignal (deprecated)
  ├── SetURLParameters    → update locationSignal
  ├── Switch              → evaluate cases, dispatch first match
  ├── Custom / Built-in   → evaluate args, call handler
  └── TriggerWorkflowCallback → call workflow callback
```

---

## 2. Event Binding

### 2.1 DOM Events on Element Nodes

In `createElement()`, each entry in `node.events` becomes an event listener:

```typescript
element.addEventListener(eventName, handler, { signal: ctx.abortSignal })
// AbortSignal linked to component AbortController — auto-removed on unmount
```

Handler behavior:

```typescript
(e: Event) => {
  for (const action of event.actions) {
    if (e instanceof DragEvent)      { e.data = getDragData(e) }
    if (e instanceof ClipboardEvent) { e.data = parseClipboardItems(e) }
    handleAction(action, { ...dataSignal.get(), Event: e }, ctx, e)
  }
}
```

The `Event` key in the data context gives formulas access to the native DOM event.

### 2.2 Custom Component Events

In `createComponent()`, an `onEvent` callback searches `node.events` for a matching trigger name:

```
Child Component
  └── TriggerEvent action { event: "submitted", data: formula }
      └── ctx.triggerEvent("submitted", evaluatedData)
          └── Parent's onEvent callback
              └── Find node.events where trigger === "submitted"
                  └── handleAction(action, { ...parentData, Event: data }, parentCtx)
```

The same `onEvent` callback wires into API creation so API lifecycle events (`onCompleted`, `onFailed`) from child components bubble to parent handlers.

### 2.3 Lifecycle Events

**onLoad**
Fired once after the component is mounted and the root node is created.
Timing: batched via `BatchQueue` — all `onLoad` handlers queued and executed together in a single `requestAnimationFrame` after the synchronous render pass.

```typescript
BATCH_QUEUE.add(() => {
  component.onLoad?.actions?.forEach(action =>
    handleAction(action, dataSignal.get(), ctx)
  )
})
```

**onAttributeChange**
Fired when component attributes change value. Also batched.

```typescript
dataSignal.map(data => data.Attributes).subscribe(props => {
  if (prev) {
    // Build CustomEvent('attribute-change') with detail = changed attributes only
    // deep equality check (fastDeepEqual) filters unchanged attributes
    handleAction(action, dataSignal.get(), ctx, changeEvent)
  }
  prev = props
})
```

Change event detail format:
```typescript
{
  [attributeName: string]: {
    current: unknown  // Previous value
    new: unknown      // New value
  }
}
// Only attributes that actually changed are included
// Key is the attribute's `name` field, not its record key
```

---

## 3. Action Dispatcher (`handleAction`)

### 3.1 Signature

```typescript
function handleAction(
  action: ActionModel,
  data: ComponentData,
  ctx: ComponentContext,
  event?: Event,
  workflowCallback?: (event: string, data: unknown) => void,
): void
```

### 3.2 Action Types

| Action | Behavior |
|--------|----------|
| `SetVariable` | `ctx.dataSignal.update(data => ({ ...data, Variables: { ...data.Variables, [action.variable]: evaluatedValue } }))` |
| `TriggerEvent` | `ctx.triggerEvent(action.event, evaluatedPayload)` |
| `Switch` | Evaluate case conditions in order; execute first truthy case or default |
| `Fetch` | Trigger API fetch with `onCompleted`, `onFailed`, `onMessage` callback lists |
| `AbortFetch` | Cancel in-flight API request |
| `SetURLParameter` | Update single URL parameter — see below |
| `SetURLParameters` | Update multiple URL parameters atomically — see below |
| `TriggerWorkflow` | Execute named workflow with evaluated Parameters |
| `TriggerWorkflowCallback` | Call `workflowCallback` passed from parent workflow trigger |
| `Custom` | Evaluate args, call `action.handler(args, { root, triggerActionEvent }, event)` |
| `Built-in` | Lookup from `ctx.toddle.getCustomAction` with `@toddle/` prefix |

**Switch** — only one case executes per action:
```typescript
const match = action.cases?.find(c => toBoolean(applyFormula(c.condition))) ?? action.default
match?.actions?.forEach(a => handleAction(a, freshData, ctx, event, workflowCallback))
```

**TriggerWorkflow** — two modes:
1. Local workflow: `ctx.component.workflows[action.workflow]` — execute with `Parameters` in data context
2. Context provider workflow: lookup from `ctx.providers[action.contextProvider]` — execute in provider's context

Both support **workflow callbacks**:
```typescript
workflow.actions.forEach(action =>
  handleAction(action, { ...data, Parameters: evaluatedParams }, providerCtx, event,
    (callbackName, callbackData) => {
      callbacks[callbackName]?.actions?.forEach(a =>
        handleAction(a, { ...callerData, Parameters, Event: callbackData }, callerCtx))
    }
  )
)
```

**Custom action cleanup:**
If handler returns a function (or `Promise<function>`), register it as cleanup on `dataSignal.destroy`:
```typescript
ctx.dataSignal.subscribe(() => {}, { destroy: cleanup })
```

### 3.3 SetURLParameter

Updates a single path or query parameter.

1. Evaluate `data` formula → new value
2. Classify parameter:
   - Path param → `historyMode = 'push'` (default), update `params`
   - Query param → `historyMode = 'replace'` (default), update `query` (remove key if `undefined`)
3. Build old and new URLs via `getLocationUrl()`
4. If URLs differ → call `history.pushState()` or `history.replaceState()`
5. Update `ctx.toddle.locationSignal`

Unrecognized parameter name → no-op.

### 3.4 SetURLParameters

Updates multiple parameters atomically.

1. Evaluate all parameter formulas
2. Classify each: path params (`type === 'param'` segments only), query params (must exist in `route.query`)
3. If any path param updated → `historyMode = 'push'`; else `replace`
4. `fastDeepEqual` check against current location — no-op if unchanged
5. Update history and signal

Requires valid `route` (no-op for V1 routing).

---

## 4. Event Data Extraction

### 4.1 Data Context During Event Handling

| Key | Value | When Available |
|-----|-------|----------------|
| `Location` | Current route location | Always |
| `Attributes` | Component input props | Always |
| `Variables` | Component state | Always |
| `Contexts` | Subscribed context data | If contexts defined |
| `Apis` | API status objects | Always |
| `Event` | DOM event or custom event payload | During event handling |
| `ListItem` | `{ Item, Index, Key, Parent? }` | Inside repeat nodes |
| `Parameters` | Workflow parameters | Inside workflow execution |
| `Page` | `{ Theme }` | Always |

Actions calling `ctx.dataSignal.get()` get the latest state (not a snapshot) — later actions in a list see variable changes made by earlier actions.

### 4.2 Event-Specific Data Extraction

```typescript
extractEventData(event: Event): Record<string, unknown>
```

| Event Type | Extracted Fields |
|-----------|-----------------|
| All events | `type`, `target`, `currentTarget` |
| `SubmitEvent` | `formData` (from `FormData`), `submitter` |
| `InputEvent` | `value` (from target), `inputType` |
| `KeyboardEvent` | `key`, `code`, `altKey`, `ctrlKey`, `shiftKey`, `metaKey` |
| `MouseEvent` | `clientX`, `clientY`, `button`, `buttons` |
| `FocusEvent` | `relatedTarget` |
| `DragEvent` | `data` (parsed drag transfer) |
| `ClipboardEvent` | `data` (MIME-keyed clipboard items, JSON auto-parsed) |

Element data (for `target`/`currentTarget`):
- `tagName`, `id`, `className`, `dataset`
- `value`, `checked`, `disabled`, `href`, `src` (when present)

---

## 5. Cleanup

### 5.1 AbortSignal-Based Listener Cleanup

Each component creates an `AbortController`. AbortSignal is:
- Passed to all `addEventListener` calls
- Aborted when component's `dataSignal` is destroyed (component unmounts)

All event listeners automatically removed on unmount — no manual tracking required.

### 5.2 Event Delegation

```typescript
function delegateEvent(
  container: Element,
  selector: string,
  eventName: string,
  handler: EventHandler,
  ctx: EventContext
): () => void
// Returns cleanup function
// Uses event.target.closest(selector) for delegation
```

### 5.3 preventDefault / stopPropagation

```typescript
EventConfigs.preventDefault(event)   // event.preventDefault()
EventConfigs.stopPropagation(event)  // event.stopPropagation()
EventConfigs.preventAll(event)       // both
```

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| `action` is falsy | Throw `'Action does not exist'` (caught externally, logged) |
| `Fetch` references missing API | `console.error`, return |
| `TriggerWorkflow` references missing workflow | `console.warn`, return |
| Custom action handler missing | Log `'Missing custom action'`, continue |
| Missing workflow callback | No-op |

---

## 7. Cross-References

| Spec | Relationship |
|------|-------------|
| `06-rendering.md` | Event listeners attached in `createElement()`; lifecycle hooks in `renderComponent()` |
| `08-navigation.md` | `SetURLParameter` and `SetURLParameters` update `locationSignal` |
| `11-page-lifecycle.md` | `BatchQueue` for lifecycle hook batching; `onLoad` / `onAttributeChange` timing |
