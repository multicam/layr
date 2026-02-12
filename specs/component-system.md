# Component System Specification

## Purpose

The Component System is the foundational domain of Layr. It defines the data model for all UI building blocks, how they compose, render, and manage state. Every page, reusable component, and custom element is expressed through this system.

### Jobs to Be Done

- Define reusable, composable UI units with declarative data models
- Support three rendering modes: client-side (CSR), server-side (SSR), and Web Components (Custom Elements)
- Provide reactive state management through a signal-based system
- Enable component composition via slots, attributes, and context providers
- Support conditional rendering, list rendering, and event-driven interactions

---

## System Limits

Component-level limits enforced to prevent runaway scenarios.

### Component Size Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxNodes` | 10,000 | 50,000 | Nodes in `component.nodes` record |
| `maxAttributes` | 50 | 200 | Attribute definitions |
| `maxVariables` | 50 | 200 | Variable definitions |
| `maxFormulas` | 100 | 500 | Formula definitions |
| `maxApis` | 30 | 100 | API definitions |
| `maxWorkflows` | 30 | 100 | Workflow definitions |
| `maxEvents` | 20 | 50 | Declared events |
| `maxContexts` | 10 | 30 | Context subscriptions |
| `maxNodeChildren` | 500 | 2,000 | Children array per node |
| `maxVariants` | 50 | 200 | Style variants per node |

### Nesting Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxComponentDepth` | 50 | Maximum parent→child nesting |
| `maxRepeatDepth` | 10 | Maximum nested repeat loops |
| `maxConditionDepth` | 20 | Maximum nested conditional blocks |
| `maxSlotDepth` | 20 | Maximum nested slot projection |

### Enforcement

- **Build time:** Validation warns if approaching limits (80% threshold)
- **Runtime:** Throws `LimitExceededError` if limit exceeded
- **Editor:** Prevents operations that would exceed limits

---

## Invariants

### Structural Invariants

1. **I-COMP-ROOT:** Every component's `nodes` MUST contain a `'root'` key.
2. **I-COMP-NODE-ID:** Node IDs MUST be unique within their component.
3. **I-COMP-NO-DANGLING:** Every `children` array entry MUST reference an existing node ID.
4. **I-COMP-NO-SELF-REF:** A component MUST NOT directly reference itself as a child (see Recursive Components).
5. **I-COMP-SLOT-NO-REPEAT:** `SlotNodeModel.repeat` MUST be `null`/`undefined`/`never`.

### Reference Invariants

6. **I-COMP-COMPONENT-REF:** Every `ComponentNodeModel.name` MUST resolve to an existing component.
7. **I-COMP-FORMULA-REF:** Every `apply` operation MUST reference a formula in `component.formulas`.
8. **I-COMP-WORKFLOW-REF:** Every `TriggerWorkflow` MUST reference a workflow in `component.workflows` or context provider.
9. **I-COMP-API-REF:** Every `Fetch` action MUST reference an API in `component.apis`.
10. **I-COMP-CONTEXT-REF:** Every `ComponentContext` MUST reference an existing context provider.

### Type Invariants

11. **I-COMP-PAGE-ROUTE:** Pages (components with `route`) MUST have `type: 'app'`.
12. **I-COMP-PACKAGE-EXPORT:** Package components for external use MUST have `exported: true`.
13. **I-COMP-CUSTOM-ELEMENT:** Only non-page components MAY have `customElement.enabled`.

### Lifecycle Invariants

14. **I-COMP-ONLOAD-ONCE:** `onLoad` actions execute exactly once per component mount.
15. **I-COMP-ONATTR-CHANGE:** `onAttributeChange` only fires after initial attributes set.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-COMP-ROOT, I-COMP-NO-DANGLING | Build | Error: build fails |
| I-COMP-NO-SELF-REF | Build + Runtime | Error: reject/render nothing |
| I-COMP-*COMPONENT-REF | Runtime | Warning: skip, return empty |
| I-COMP-*FORMULA-REF | Runtime | Warning: return `null` |
| I-COMP-SLOT-NO-REPEAT | Build | Error: schema violation |

---

## Node Identification

### Node ID Requirements

Node IDs serve as stable references within a component:

1. **Format:** Node IDs MUST be non-empty strings
2. **Uniqueness:** MUST be unique within `component.nodes`
3. **Stability:** IDs SHOULD NOT change during editing (use UUIDs, not indices)
4. **Immutability:** Once created, ID SHOULD remain stable for reference integrity

### Recommended ID Generation

```typescript
// Recommended: UUID-based IDs
function generateNodeId(): string {
  return crypto.randomUUID();
}

// NOT recommended: Index-based IDs (unstable on reorder)
function badGenerateNodeId(index: number): string {
  return `node-${index}`;
}
```

### Reference Integrity

When a node is deleted:
1. All references in other nodes' `children` arrays are removed
2. References in `repeat`, `condition`, and `slot` bindings are cleared
3. Orphaned nodes (no parent reference) trigger build warnings

---

## Recursive Components

### Problem Definition

A component that renders itself (directly or indirectly) creates infinite recursion:
- **Direct:** Component A's nodes contain a `ComponentNodeModel` referencing component A
- **Indirect:** A → B → A cycle

### Prevention Strategy

1. **Build-time detection:** Static analysis flags direct self-references
2. **Runtime depth tracking:** Component context maintains depth counter
3. **Depth limit enforcement:** Throws error if `maxComponentDepth` exceeded

### Runtime Depth Tracking

```typescript
interface ComponentRenderContext {
  // ... existing fields
  depth: number;           // Current nesting depth
  ancestorPath: string[];  // Component names in current path
}

// In createComponent()
if (ctx.depth > LIMITS.maxComponentDepth) {
  throw new LimitExceededError('nesting', 'maxComponentDepth', ctx.depth, LIMITS.maxComponentDepth);
}

if (ctx.ancestorPath.includes(component.name)) {
  console.warn(`Recursive component detected: ${ctx.ancestorPath.join(' → ')} → ${component.name}`);
}
```

### Self-Reference Handling for Custom Elements

Custom elements have special handling via `replaceTagInNodes()`:
- Self-references are replaced with `<div>` to prevent infinite loops
- Only applies when `env.runtime === 'custom-element'` AND component is root

---

## Signal Lifecycle

### Destruction Order

When a parent signal is destroyed, child signals are destroyed in a defined order:

1. **Child-first cleanup:** Children destroyed before parents (leaf-to-root)
2. **Sequential notification:** Each subscriber's `destroy` callback runs in registration order
3. **Re-entrancy protection:** `destroying` flag prevents infinite loops during cascade

### Destruction Cascade

```
Parent component signal destroyed
  ├── All derived signals (formulas, conditions, repeats) destroyed
  │     └── Their subscribers notified (cleanup callbacks fire)
  ├── All API payload signals destroyed
  │     └── In-flight requests aborted
  ├── All event listeners removed (via abortSignal)
  ├── All context subscriptions cleaned
  └── DOM elements removed
```

### Memory Safety

- Every `subscribe()` with a `destroy` callback is tracked
- `destroy()` calls all cleanup callbacks even if some throw
- Circular signal references are handled by `destroying` flag

---

## Lifecycle Timing

### onLoad Timing

| Phase | When | Description |
|-------|------|-------------|
| **Render** | Synchronous | Component nodes created and inserted into DOM |
| **Batch Queue** | Same tick | `onLoad` queued in `BatchQueue` |
| **Execution** | Next `requestAnimationFrame` | `onLoad` actions execute |

**Timing guarantee:** `onLoad` fires AFTER initial DOM paint (browser has rendered).

### onAttributeChange Timing

| Phase | When | Description |
|-------|------|-------------|
| **Detection** | On signal update | Deep equality check detects actual changes |
| **Batch Queue** | Same tick | Change handler queued in `BatchQueue` |
| **Execution** | Next `requestAnimationFrame` | Actions execute with change details |

**Change details:**
```typescript
Event.detail = {
  [attributeName]: {
    current: previousValue,
    new: newValue
  }
}
```

**Only actual changes fire:** If `Attributes` is set to a deeply-equal value, no event fires.

---

## Data Models

### Component

The top-level definition of a UI unit.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique component identifier |
| `route` | `PageRoute?` | Route configuration (pages only) |
| `attributes` | `Record<string, ComponentAttribute>?` | Input properties schema |
| `variables` | `Record<string, ComponentVariable>?` | Internal reactive state |
| `formulas` | `Record<string, ComponentFormula>?` | Computed/derived values |
| `contexts` | `Record<string, ComponentContext>?` | Consumed context from ancestors |
| `workflows` | `Record<string, ComponentWorkflow>?` | Reusable action sequences |
| `apis` | `Record<string, ComponentAPI>?` | HTTP API definitions |
| `nodes` | `Record<string, NodeModel>?` | All nodes (must include `'root'`) |
| `events` | `ComponentEvent[]?` | Declared emittable events |
| `onLoad` | `EventModel?` | Lifecycle: runs once after mount |
| `onAttributeChange` | `EventModel?` | Lifecycle: runs on attribute changes |
| `exported` | `boolean?` | Whether exported in a package |
| `customElement` | `{ enabled?: Formula }?` | Custom element (Web Component) configuration |

**Constraints:**
- `nodes` must contain a `'root'` key
- `route` is only valid on page components
- Component names can include package prefix (`package/name`)

### ComponentAttribute

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name |
| `testValue` | `unknown` | Default/test value for preview mode |

### ComponentVariable

| Field | Type | Description |
|-------|------|-------------|
| `initialValue` | `Formula` | Formula evaluated at mount to set initial value |

### ComponentFormula

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Formula name |
| `arguments` | `Array<{ name, testValue }>?` | Parameters the formula accepts |
| `memoize` | `boolean?` | Cache results based on inputs |
| `exposeInContext` | `boolean?` | Make available to descendant components |
| `formula` | `Formula` | The formula definition |

### ComponentWorkflow

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Workflow name |
| `parameters` | `Array<{ name, testValue }>` | Input parameters |
| `callbacks` | `Array<{ name, testValue }>?` | Callback definitions |
| `actions` | `ActionModel[]` | Sequence of actions to execute |
| `exposeInContext` | `boolean?` | Make available to descendants |

### ComponentContext

Declares which formulas and workflows to consume from an ancestor context provider.

| Field | Type | Description |
|-------|------|-------------|
| `formulas` | `string[]` | Formula names to consume |
| `workflows` | `string[]` | Workflow names to consume |
| `componentName` | `string?` | Provider component name |
| `package` | `string?` | Provider package |

---

## Node Models

All UI structure is expressed through four node types. Nodes are stored in a flat dictionary (`Record<string, NodeModel>`) with string IDs, and `children` arrays reference other node IDs.

### Common Fields (all node types)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string?` | Node identifier |
| `type` | `'element' \| 'text' \| 'component' \| 'slot'` | Node type discriminator |
| `condition` | `Formula?` | Conditional rendering formula |
| `repeat` | `Formula?` | List rendering formula (evaluates to array) |
| `repeatKey` | `Formula?` | Unique key for each repeated item |
| `slot` | `string?` | Target slot name when used as child of a component |

### ElementNodeModel

An HTML/SVG/MathML element.

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `string` | HTML tag name (e.g., `'div'`, `'button'`, `'svg'`) |
| `attrs` | `Record<string, Formula>` | Reactive attributes via formulas |
| `style` | `NodeStyleModel?` | Base CSS styles |
| `variants` | `StyleVariant[]?` | Media query / state-based style variations |
| `animations` | `Record<string, Record<string, AnimationKeyframe>>?` | CSS animations |
| `children` | `string[]` | Child node IDs |
| `events` | `Record<string, EventModel?>` | Event handlers |
| `classes` | `Record<string, { formula?: Formula }>?` | Dynamic CSS class toggles |
| `style-variables` | `Array<StyleVariable>?` | CSS custom properties (deprecated) |
| `customProperties` | `Record<CustomPropertyName, CustomProperty>?` | CSS custom properties |

### TextNodeModel

A text content node.

| Field | Type | Description |
|-------|------|-------------|
| `value` | `Formula` | Formula that evaluates to string content |
| `children` | `never?` | Text nodes cannot have children |

### ComponentNodeModel

A reference to a child component.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Referenced component name |
| `package` | `string?` | Package namespace for cross-package references |
| `path` | `string?` | Component path |
| `attrs` | `Record<string, Formula>` | Attribute bindings (maps to child's `Attributes`) |
| `children` | `string[]` | Slotted child node IDs |
| `events` | `Record<string, EventModel>` | Event handlers for child's emitted events |
| `style` | `NodeStyleModel?` | Instance styles |
| `variants` | `StyleVariant[]?` | Instance style variants |
| `customProperties` | `Record<CustomPropertyName, CustomProperty>?` | Instance CSS custom properties |

### SlotNodeModel

A content distribution point.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string?` | Slot identifier (defaults to `'default'`) |
| `children` | `string[]` | Fallback content node IDs |
| `repeat` | `never?` | Slots cannot be repeated |
| `repeatKey` | `never?` | Slots cannot be repeated |

---

## ComponentData (Runtime State)

The reactive data context available to all formulas within a component.

| Field | Type | Available In | Description |
|-------|------|-------------|-------------|
| `Location` | `{ page?, path, params, query, hash }?` | Pages only | Current URL/route state |
| `Attributes` | `Record<string, unknown>` | Always | Input props from parent |
| `Variables` | `Record<string, unknown>?` | Always | Internal reactive state |
| `Contexts` | `Record<string, Record<string, unknown>>?` | If contexts defined | Data from ancestor context providers |
| `Apis` | `Record<string, ApiStatus>?` | If APIs defined | API request/response state |
| `Args` | `unknown?` | Inside formula functions | Arguments passed to current formula |
| `Parameters` | `Record<string, unknown>?` | Inside workflows | Workflow parameters |
| `Event` | `unknown?` | Inside event handlers | Event payload |
| `ListItem` | `{ Item, Index, Parent? }?` | Inside repeat | Current iteration context |
| `Page` | `{ Theme: string \| null }?` | Pages only | Current theme |

### ListItem

| Field | Type | Description |
|-------|------|-------------|
| `Item` | `unknown` | Current array element |
| `Index` | `number` | Current index |
| `Parent` | `ListItem?` | Parent ListItem for nested loops |

---

## Signal System

Fine-grained reactive state management primitive.

### Signal\<T\>

| Method | Signature | Description |
|--------|-----------|-------------|
| `get()` | `() => T` | Returns current value |
| `set(value)` | `(T) => void` | Updates value, notifies subscribers (deep equality check) |
| `update(fn)` | `((T) => T) => void` | Functional update: `set(fn(get()))` |
| `subscribe(notify, config?)` | Returns `() => void` | Subscribe to changes. **Immediately invokes** with current value. Returns unsubscribe function |
| `destroy()` | `() => void` | Destroys signal, cascades to all derived signals |
| `map(fn)` | `((T) => T2) => Signal<T2>` | Creates derived signal with automatic cleanup cascade |

**Behavior:**
- `set()` skips update if new value is deeply equal (`fast-deep-equal`)
- `set()` short-circuits if no subscribers (optimization)
- `destroy()` is re-entrant safe (guards against infinite loops)
- `map()` creates parent→child dependency: destroying parent destroys derived signal

---

## Rendering Pipeline

### Client-Side Rendering (CSR)

**Entry point:** `renderComponent()` → `createNode()` (recursive)

1. **Component initialization:**
   - Create `componentDataSignal` with Location, Attributes, Variables, Apis
   - Subscribe to ancestor context providers
   - Initialize variables (evaluate `initialValue` formulas)
   - Initialize APIs in dependency order (`sortApiObjects`)
   - If context provider: register exposed formulas/workflows in providers registry

2. **Node creation** (`createNode()`):
   - If `repeat`: Create `repeatSignal`, render items with keyed reconciliation
   - If `condition`: Create `showSignal`, toggle create/destroy on changes
   - Otherwise: Create directly via type-specific function

3. **Element creation** (`createElement()`):
   - Determine namespace (SVG, MathML, HTML)
   - Set `data-node-id`, `data-id`, `data-component` attributes
   - Apply base CSS class hash
   - Subscribe dynamic classes, attributes, custom properties
   - Attach event listeners (with `abortSignal` for cleanup)
   - Recursively create children

4. **Lifecycle hooks** (deferred via `BatchQueue`):
   - `onAttributeChange`: Subscribes to attribute changes with deep equality diff
   - `onLoad`: Fires once after initial render

### Server-Side Rendering (SSR)

**Entry point:** `renderPageBody()` → `renderComponent()` (recursive)

- Evaluates formulas once (no reactivity)
- APIs evaluated before rendering
- Generates HTML string
- Collects CSS custom properties separately
- Returns `{ html, apiCache, customProperties }`

### Custom Elements (Web Components)

**Entry point:** `ToddleComponent extends HTMLElement`

- Renders into Shadow DOM (`mode: 'open'`)
- Attributes observed via `attributeChangedCallback`
- Complex (non-string) values supported via overridden `setAttribute`
- Styles inlined in shadow root (includes reset styles)
- Events dispatched with `bubbles: true, composed: true` (crosses shadow boundary)
- `connectedCallback`: Initialize APIs, context, theme, render
- `disconnectedCallback`: Destroy signal (cleanup cascade)

---

## Conditional Rendering

1. Create `showSignal` by mapping `dataSignal` through condition formula → `toBoolean()`
2. On show: Create new `childDataSignal`, create elements, insert into DOM
3. On hide: Destroy `childDataSignal`, remove elements from DOM
4. Preview mode can override show state for design-time visibility

**Key behavior:** Child data signal is created/destroyed on toggle (not just hidden). This ensures full cleanup of subscriptions and APIs.

---

## List Rendering (Repeat)

1. Create `repeatSignal` evaluating repeat formula → convert to `[Key, Item][]`
2. For each item, evaluate `repeatKey` formula (or use array index as default)
3. **Keyed reconciliation:**
   - Existing items (matching key): Reuse element, update `ListItem` in data signal
   - New items: Create `childDataSignal`, subscribe to parent data updates, create elements
   - Removed items: Destroy signals, remove elements from DOM
4. After first render: Reorder DOM to match array order (`ensureEfficientOrdering`)

**Edge cases:**
- Duplicate `repeatKey` values: Console warning, fallback to array index
- Parent data updates propagate to repeat children (excluding `ListItem` field)

---

## Context System

### Provider Registration

A component is a context provider if it has any formula or workflow with `exposeInContext: true`.

1. For each exposed formula: Create `formulaDataSignal` (derived from component data)
2. Register in `ctx.providers` with component name as key

### Consumer Subscription

1. For each `context` entry in component definition:
   - Look up provider in `ctx.providers` (key = `package/componentName`)
   - Subscribe to each `formulaDataSignal`
   - On update: Merge into `componentDataSignal.Contexts`
2. Preview mode fallback: Use static test data from provider's definition

**Behavior:** Context is reactive (live updates propagate), not just read-once.

---

## Slot System

1. Parent component's child nodes are grouped by `slot` property (default: `'default'`)
2. Slot node checks for matching slotted content in `ctx.children[slotName]`
3. If slotted content exists: Render with **parent's** data signal (parent component context)
4. If no slotted content: Render fallback children from slot node definition
5. Custom elements: Wrap in native `<slot name="...">` element with fallback as children

---

## Event System

### Event Emission

- Components declare emittable events in `events` array
- Actions of type `TriggerEvent` emit events to parent
- Parent handles via `events` on `ComponentNodeModel`
- Event payload available as `Event` in handler's `ComponentData`

### DOM Events

- Element events (click, input, etc.) trigger action lists
- `DragEvent`: Augmented with parsed `data` property from `dataTransfer`
- `ClipboardEvent`: Augmented with parsed clipboard data
- All event listeners use `abortSignal` for automatic cleanup on unmount

---

## Lifecycle

| Hook | Trigger | Context |
|------|---------|---------|
| `onLoad` | Once after component mounts (after initial render) | Full `ComponentData` available |
| `onAttributeChange` | When `Attributes` change (after first set) | `Event.detail` = `{ [attrName]: { current, new } }` |

Both hooks are deferred via `BatchQueue` to run after initial render completes.

---

## Action Types

| Type | Description |
|------|-------------|
| `SetVariable` | Update a component variable |
| `TriggerEvent` | Emit event to parent component |
| `Switch` | Conditional branching with cases and default |
| `Fetch` | Trigger API fetch with onSuccess/onError/onMessage callbacks |
| `AbortFetch` | Cancel in-flight API request |
| `Custom` | Call a custom/plugin action |
| `SetURLParameter` | Update a single URL parameter |
| `SetMultiUrlParameter` | Update multiple URL parameters |
| `TriggerWorkflow` | Call a workflow with parameters and callbacks |
| `WorkflowCallback` | Invoke a workflow callback |

Actions are arrays executed sequentially. `Switch` and `Fetch` actions can contain nested action arrays.

---

## Component Registration (Custom Elements)

`defineComponents()` registers components as Web Components:

1. Map component names to definitions
2. For each: Generate safe custom element tag name
3. Check if already defined (skip with warning if so)
4. Define custom element class extending `ToddleComponent`
5. Set `observedAttributes` to lowercased attribute names

---

## Error Handling

### Error Types

| Error Type | When Thrown | Recovery |
|------------|-------------|----------|
| `LimitExceededError` | Size/depth limit exceeded | Reject operation |
| `ComponentNotFoundError` | Referenced component missing | Render nothing |
| `FormulaEvaluationError` | Formula throws | Return `null` |
| `SignalDestructionError` | Error during cleanup | Log, continue cascade |
| `RecursiveComponentError` | Cycle detected | Render placeholder |

### Missing Resource Handling

| Scenario | Behavior | Log Level |
|----------|----------|-----------|
| Component not found | Return empty array, skip rendering | `warn` |
| Formula not found | Return `null` value | `warn` |
| Workflow not found | Skip action, continue chain | `warn` |
| API not found | Skip fetch, continue | `error` |
| Context provider not found | Skip subscription | `warn` |
| Node not in nodes record | Skip node | `warn` |

### Formula Evaluation Errors

When `applyFormula()` throws:

1. Error caught at top level
2. Pushed to `ctx.toddle.errors[]` array
3. Logged to console if `ctx.env.logErrors === true`
4. Return `null` to formula caller

**Error context preserved:**
```typescript
interface FormulaEvaluationError extends Error {
  formulaName: string;
  componentContext: string;
  dataPath: string[];
}
```

### API Error Handling

| Phase | Error | Behavior |
|-------|-------|----------|
| **Request** | Network error | Set `Apis[name].error`, trigger `onFailed` |
| **Request** | Timeout | Set `Apis[name].error = "Request timed out"` |
| **Response** | HTTP 4xx/5xx | Check `isError` formula, may be success |
| **Parse** | Invalid JSON | Set `Apis[name].error`, trigger `onFailed` |
| **Stream** | Connection lost | Trigger `onError` with partial data |

### Graceful Degradation

Components should handle missing/error state gracefully:

```typescript
// Recommended pattern in formulas
if (Apis.fetchUsers.error) {
  return "Failed to load users";
}
if (Apis.fetchUsers.isLoading) {
  return "Loading...";
}
return Apis.fetchUsers.data;
```

---

## Performance Optimizations

- **Signal short-circuit:** `set()` skips if no subscribers
- **Deep equality:** Prevents unnecessary re-renders
- **Formula caching:** Memoize results based on `ComponentData` input
- **Keyed reconciliation:** Reuse DOM elements in repeat lists
- **Batch queue:** Defer lifecycle hooks until after initial render
- **API dependency sorting:** Ensure correct initialization order
- **Lazy derived signals:** `map()` evaluates only when subscribed

---

## Changelog

### Unreleased
- Added System Limits section with component size and nesting constraints
- Added Invariants section with 15 structural, reference, type, and lifecycle invariants
- Added Node Identification section with ID requirements and stability
- Added Recursive Components section with detection and prevention
- Added Signal Lifecycle section with destruction order and memory safety
- Added Lifecycle Timing section with precise onLoad/onAttributeChange timing
- Enhanced Error Handling with error types, missing resources, and graceful degradation
