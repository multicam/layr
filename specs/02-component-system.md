# Layr Component System

Covers the component abstraction, slot composition, context providers, and introspection/traversal. Implemented across `packages/types/src/` (types), `packages/core/src/` (context, traversal, signal), and `packages/runtime/src/render/` (CSR rendering).

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Component data model | MVP |
| CSR rendering (element, text, component, slot nodes) | MVP |
| SSR rendering | MVP |
| Signal-based reactive state | MVP |
| Conditional rendering | MVP |
| List rendering (repeat + keyed reconciliation) | MVP |
| Slot system (default + named slots) | MVP |
| Context providers (formulas) | MVP |
| Lifecycle hooks (onLoad, onAttributeChange) | MVP |
| Generator-based traversal | MVP |
| Formula/action reference collection | MVP |
| Context workflows (TriggerWorkflow via context) | MVP |
| Preview mode context fallback | MVP |
| Web Components (Custom Elements) | Phase 2 |
| Incremental traversal (pathsToVisit) | Phase 2 |

---

## Component as the Core Abstraction

A `Component` is the single data type representing both pages and reusable UI units. See `01-data-model.md` for the full type. Key composition mechanisms:

| Mechanism | How It Works |
|-----------|-------------|
| **Attributes** | Input props; parent passes via `ComponentNodeModel.attrs` as formulas |
| **Variables** | Internal reactive state; initialized by `initialValue` formula at mount |
| **Formulas** | Computed/derived values over `ComponentData`; memoizable |
| **Workflows** | Reusable action sequences with parameters and callbacks |
| **Slots** | Named content injection points in the node tree |
| **Context** | Ancestor-to-descendant data and workflow sharing without prop drilling |

---

## ComponentData (Runtime Scope)

Every formula in a component evaluates against this record. See `01-data-model.md` for the full type.

| Key | Type | Available In |
|-----|------|-------------|
| `Attributes` | `Record<string, unknown>` | Always |
| `Variables` | `Record<string, unknown>` | Always |
| `Apis` | `Record<string, ApiStatus>` | If APIs defined |
| `Contexts` | `Record<string, Record<string, unknown>>` | If contexts declared |
| `Location` | `LocationState` | Pages only |
| `Page` | `{ Theme: string \| null }` | Pages only |
| `ListItem` | `{ Item, Index, Key, Parent? }` | Inside `repeat` |
| `Event` | `unknown` | Inside event handlers |
| `Parameters` | `Record<string, unknown>` | Inside workflows |
| `Args` | `unknown` | Inside formula functions |

---

## Signal System

Fine-grained reactive state. Implemented in `packages/core/src/signal/`.

```typescript
// packages/types/src/signal.ts
interface Signal<T> {
  get(): T
  set(value: T): void            // Deep equality check; skips if unchanged
  update(fn: (value: T) => T): void
  subscribe(notify: (value: T) => void, config?: { destroy?: () => void }): () => void
  destroy(): void                // Cascades to all derived signals
  map<T2>(fn: (value: T) => T2): Signal<T2>  // Creates derived signal
}
```

**Key behaviors:**
- `set()` uses `fast-deep-equal` — no update if value is deeply equal
- `set()` short-circuits if no subscribers
- `destroy()` is re-entrant safe (`destroying` flag)
- `map()` creates parent→child dependency: destroying parent destroys derived

### Destruction Order

```
Parent signal.destroy()
  ├── All derived signals (map()) destroyed
  ├── All API payload signals destroyed (in-flight requests aborted)
  ├── All event listeners removed (via abortSignal)
  ├── All context subscriptions cleaned
  └── DOM elements removed
```

---

## Rendering Pipeline

### Entry Point

```typescript
// packages/runtime/src/render/component.ts
interface RenderContext {
  dataSignal: Signal<ComponentData>
  component: Component
  root: Element
  abortSignal: AbortSignal
}

function renderComponent(ctx: RenderContext): Element[]
```

Renders the `'root'` node of `ctx.component.nodes`. Returns DOM elements.

### CSR Rendering Flow

1. **Component initialization** (`createComponent()`):
   - Create `componentDataSignal` with `Location`, `Attributes`, `Variables`, `Apis`
   - Subscribe to ancestor context providers (`subscribeToContext()`)
   - Evaluate `initialValue` formulas for each variable
   - Sort APIs by dependency order (`sortApiObjects`) and initialize
   - If context provider: register exposed formulas/workflows in `ctx.providers`
   - Queue `onLoad` in `BatchQueue` (fires after initial render)
   - Subscribe to attribute changes for `onAttributeChange`

2. **Node creation** (`createNode()`):
   - If `repeat`: create `repeatSignal`, keyed reconciliation
   - If `condition`: create `showSignal`, create/destroy on changes
   - Otherwise: dispatch to type-specific creation function

3. **Element creation** (`createElement()`):
   - Determine namespace (HTML / SVG / MathML from tag)
   - Set `data-node-id`, `data-id`, `data-component` attributes
   - Apply base CSS class hash
   - Subscribe dynamic classes, attrs, custom properties to data signal
   - Attach event listeners (with `abortSignal` for cleanup)
   - Recursively create children

### SSR Rendering Flow

Evaluates formulas once (no reactivity). Returns `{ html, apiCache, customProperties }`.

1. APIs evaluated before rendering
2. Contexts resolved via static `applyFormula()` — no signals
3. Slots: render children to HTML strings, concatenate by slot name
4. Returns HTML string

### Lifecycle Timing

| Hook | When | Detail |
|------|------|--------|
| `onLoad` | After initial DOM paint | Queued in `BatchQueue`, fires on next `requestAnimationFrame` |
| `onAttributeChange` | When `Attributes` change | Deep equality diff; `Event.detail = { [attrName]: { current, new } }` |

Both hooks fire after initial render completes. `onAttributeChange` does NOT fire on initial attribute set.

---

## Conditional Rendering

```
showSignal = dataSignal.map(data => toBoolean(applyFormula(condition, data)))
```

- `true`: create `childDataSignal`, create elements, insert into DOM
- `false`: destroy `childDataSignal`, remove elements from DOM

Child data signal is fully created/destroyed on toggle — not just hidden. This ensures complete cleanup of subscriptions and APIs.

Preview mode: can override show state for design-time visibility.

---

## List Rendering (Repeat)

```
repeatSignal = dataSignal.map(data => toKeyedArray(applyFormula(repeat, data)))
```

Each item gets a key from `repeatKey` formula (fallback: array index).

**Keyed reconciliation:**

| Case | Action |
|------|--------|
| Key exists | Reuse element, update `ListItem` in data signal |
| New key | Create `childDataSignal`, create elements |
| Removed key | Destroy signals, remove elements |

After first render: reorder DOM to match array order (`ensureEfficientOrdering`).

Duplicate `repeatKey` values → console warning, fallback to index.

---

## Slot System

Slots enable content projection from parent components into child component placeholders.

### Data Model

```typescript
// packages/types/src/node.ts
interface SlotNodeModel extends NodeBase {
  type: 'slot'
  name?: string      // undefined → 'default'
  children: string[] // Fallback content node IDs
  repeat?: never     // Prohibited
  repeatKey?: never  // Prohibited
}
```

Node's `slot` field (on any node type) names the target slot in its parent component.

### Resolution Flow

**Phase 1: Parent collects children by slot name**

```
For each child node ID in ComponentNodeModel.children:
  1. Look up node in parent's nodes
  2. Read node.slot (default: 'default')
  3. Push ComponentChild { id, path, dataSignal, ctx } into children[slotName]
```

Result: `Record<string, ComponentChild[]>`

**Phase 2: Child receives children map** — stored in `ctx.children`

**Phase 3: Slot node renders**

| Condition | CSR Behavior | SSR Behavior |
|-----------|-------------|-------------|
| `ctx.children[name]` exists | Render with parent's `dataSignal` | Return pre-rendered HTML string |
| No provided content, fallback defined | Render `slot.children` with child's `dataSignal` | Render fallback to HTML |
| No content, no fallback | Empty | Empty string |

**Phase 4: Web Component mode** [Phase 2] — wrap in native `<slot name="...">` element

### Context Merging in Slots

Slotted content receives a merged context:

```typescript
ctx: {
  ...child.ctx,           // Parent's context (data scope)
  providers: ctx.providers // Child's context providers
}
```

| Accessible | Source |
|-----------|--------|
| Parent Variables, Attributes, APIs | Parent's `dataSignal` |
| Child's context providers | Child's `ctx.providers` |
| **Not accessible:** Child Variables, Attributes, APIs | Different `dataSignal` scope |

### Slot Signal Lifecycle

```typescript
// For each slotted child:
const childDataSignal = child.dataSignal.map(data => data)
// Cleanup: destroy derived signal when child component unmounts
dataSignal.subscribe(data => data, { destroy: () => childDataSignal.destroy() })
```

### Slot Constraints

| Constraint | Rule |
|-----------|------|
| No repeat on slots | `repeat: never` — type-enforced |
| Static slot assignment | `slot` property is a static string, not a formula |
| Content CAN be repeated | Nodes with `slot` + `repeat` expand to multiple `ComponentChild` entries |
| Condition evaluated in child scope | Slot's `condition` uses child's `dataSignal` |
| Fallback uses child scope | Fallback content formulas evaluate in child's `ComponentData` |

---

## Context Provider System

Enables ancestor-to-descendant data sharing without prop drilling. Implemented in `packages/core/src/context/index.ts`.

### Provider Detection

A component is a context provider if any formula or workflow has `exposeInContext: true`:

```typescript
// packages/core/src/context/index.ts
function isContextProvider(component: Component): boolean {
  return (
    Object.values(component.formulas ?? {}).some(f => f?.exposeInContext) ||
    Object.values(component.workflows ?? {}).some(w => w?.exposeInContext)
  )
}
```

### Provider Registration (CSR)

During `createComponent()` for a provider:

1. Filter formulas where `exposeInContext === true`
2. Create derived signals: `componentDataSignal.map(data => applyFormula(formula, { data }))`
3. Register in `ctx.providers` with key `packageName/componentName` (or just `componentName`)
4. Store full `ComponentContext` alongside signals (for workflow access)

### Consumer Subscription (CSR)

For each entry in `component.contexts`:

1. Look up provider: `[currentPackage, providerName].filter(isDefined).join('/')`
2. For each requested formula: subscribe to `provider.formulaDataSignals[name]`
3. On change: update `componentDataSignal.Contexts[providerName][formulaName]`
4. If formula not found: `console.warn` with available names

**Reactivity chain:**
```
Provider state changes
  → Provider data signal updates
  → Exposed formula derived signal recalculates (deep equality check)
  → Consumer data signal updated at Contexts path
  → Consumer DOM updates
```

### Workflow Invocation via Context

Workflows exposed via context are NOT data signals — they are invoked through `TriggerWorkflow` with `componentName` field:

| Field | Execution Context |
|-------|------------------|
| Workflow side effects | Provider's `ComponentContext` |
| Parameters | Evaluated in consumer's context |
| Callbacks | Execute in consumer's context with `Event` = callback data |

### SSR Context

No signals. Static resolution:
1. Provider evaluates exposed formulas once via `applyFormula()`
2. Results passed as `data.Contexts` through render tree
3. Child providers get ancestor contexts in their own `data.Contexts`

### Preview Mode Context

When consumer renders in editor without a real provider ancestor:

1. Find provider component definition in `ctx.components`
2. Build synthetic `FormulaContext` from test data (`attribute.testValue`, `variable.initialValue`)
3. Evaluate each requested formula once (not reactive)
4. Result: `Contexts` updated once with evaluated values

Not reactive — requires re-render when test data changes.

### Context API (Low-Level)

```typescript
// packages/core/src/context/index.ts
function provide<T>(key: ContextKey, value: T | Signal<T>): ContextProvider<T>
function consume<T>(key: ContextKey, defaultValue?: T): T | undefined
function consumeSignal<T>(key: ContextKey): Signal<T> | undefined
function hasContext(key: ContextKey): boolean
function unprovide(key: ContextKey): boolean
function createContext<T>(key: string | symbol): { provide, consume, consumeSignal, has }

// Scoped context (SSR-safe; avoids cross-request leakage)
class ContextScope {
  provide<T>(key, value): ContextProvider<T>
  consume<T>(key, defaultValue?): T | undefined
  has(key): boolean
  clear(): void
}

// Helper: build provider key
function buildProviderKey(providerName: string, packageName?: string): string
```

**Common context keys:**

```typescript
const ContextKeys = {
  Attributes: 'layr:attributes',
  Variables: 'layr:variables',
  Apis: 'layr:apis',
  ListItem: 'layr:listItem',
  Component: 'layr:component',
  Page: 'layr:page',
  URL: 'layr:url',
  Route: 'layr:route',
  Env: 'layr:env',
  Request: 'layr:request',
  Response: 'layr:response',
}
```

### Context Error Handling

| Scenario | Behavior |
|----------|----------|
| Consumer requests formula not exposed | `console.warn` with available names |
| Consumer references non-existent provider | No error in production; `console.error` in preview |
| Provider workflow not found | `console.warn` |
| Provider component not found in preview | `console.error` |

No throws — failures degrade to `undefined`/`null` context values.

### Context Limits

| Limit | Default |
|-------|---------|
| `maxContextsPerComponent` | 10 |
| `maxExposedFormulas` per provider | 20 |
| `maxExposedWorkflows` per provider | 20 |
| `maxSubscriptionsPerSignal` | 1,000 |

---

## Traversal / Introspection System

Generator-based traversal of formulas, actions, and components. Implemented in `packages/core/src/traversal/index.ts`.

### Traversal Result Types

```typescript
interface FormulaVisit {
  path: (string | number)[]
  formula: Formula
  packageName?: string
}

interface ActionVisit {
  path: (string | number)[]
  action: ActionModel
}

interface GlobalFormulas {
  formulas: Record<string, ComponentFormula>
  packages?: Record<string, { formulas: Record<string, ComponentFormula> }>
}
```

### Formula Traversal

```typescript
function* getFormulasInFormula(
  formula: Formula | undefined | null,
  options: { path?: (string | number)[]; packageName?: string }
): Generator<FormulaVisit>
```

**Traversal rules by formula type:**

| Type | Children traversed |
|------|--------------------|
| `value`, `path` | None (leaf) |
| `record`, `object`, `array`, `or`, `and` | Each `arguments[i].formula` |
| `function` | Each `arguments[i].formula` (with package context propagation) |
| `apply` | Each `arguments[i].formula` |
| `switch` | Each `cases[i].condition`, each `cases[i].formula`, `default` |

### Action Traversal

```typescript
function* getFormulasInAction(
  action: ActionModel | ActionModel[] | undefined | null,
  options: { path?: (string | number)[]; packageName?: string }
): Generator<FormulaVisit>

function* getActionsInAction(
  action: ActionModel | ActionModel[] | undefined | null,
  path?: (string | number)[]
): Generator<ActionVisit>
```

**`getFormulasInAction` — formulas traversed per action type:**

| Action Type | Formulas |
|-------------|---------|
| `AbortFetch` | None |
| `SetVariable`, `TriggerEvent`, `TriggerWorkflowCallback`, `SetURLParameter` | `data` |
| `SetURLParameters` | Each `parameters[i].formula` |
| `TriggerWorkflow` | Each `parameters[i].formula` |
| `Fetch` | Each `inputs[i].formula`; recurse into `onSuccess/onError/onMessage.actions` |
| `Switch` | `data`; each `cases[i].condition`; recurse into `cases[i].actions`; recurse into `default.actions` |
| `Custom` / `undefined` | Each `arguments[i].formula`; recurse into each `events[name].actions` |

**`getActionsInAction` — children traversed per action type:**

| Action Type | Children |
|-------------|---------|
| `AbortFetch`, `SetURLParameter`, `SetURLParameters`, `SetVariable`, `TriggerEvent`, `TriggerWorkflow`, `TriggerWorkflowCallback` | None (leaf) |
| `Fetch` | `onSuccess.actions`, `onError.actions`, `onMessage.actions` |
| `Custom` / `undefined` | Each `events[name].actions` |
| `Switch` | Each `cases[i].actions`, `default.actions` |

### Node Traversal

```typescript
function* getFormulasInNode(
  node: NodeModel, nodeId: string,
  options: { packageName?: string }
): Generator<FormulaVisit>

function* getActionsInNode(
  node: NodeModel, nodeId: string,
  path?: (string | number)[]
): Generator<ActionVisit>
```

**Formulas visited per node type:**

| Node Type | Formulas |
|-----------|---------|
| All | `condition`, `repeat`, `repeatKey` |
| `text` | `value` |
| `element` | `attrs[*]`, `events[*].actions`, `classes[*].formula`, `customProperties[*].formula`, `variants[*].customProperties[*].formula` |
| `component` | `attrs[*]`, `events[*].actions`, `customProperties[*].formula` |
| `slot` | None beyond common fields |

### Component Traversal

```typescript
function* getFormulasInComponent(
  component: Component,
  options: { packageName?: string }
): Generator<FormulaVisit>

function* getActionsInComponent(
  component: Component,
  path?: (string | number)[]
): Generator<ActionVisit>
```

**`getFormulasInComponent` visits (in order):**

1. Page route formulas (`route.info.title`, `route.info.description`)
2. Each `formulas[name].formula`
3. Each `variables[name].initialValue`
4. Each `workflows[name].actions` (via `getFormulasInAction`)
5. Each `apis[name]` (via `getFormulasInApi`)
6. `onLoad.actions`, `onAttributeChange.actions` (via `getFormulasInAction`)
7. Each node in `nodes` (via `getFormulasInNode`)

### API Traversal

```typescript
function* getFormulasInApi(
  api: ComponentAPI,
  options: { path?: (string | number)[]; packageName?: string }
): Generator<FormulaVisit>
```

Visits: `autoFetch`, `url`, `method`, `body`, `headers[*].formula`, `headers[*].enabled`, `queryParams[*].formula`, `queryParams[*].enabled`, `client.onCompleted.actions`, `client.onFailed.actions`, `client.onMessage.actions`.

### Reference Collection

```typescript
// packages/core/src/traversal/index.ts

// All formula names referenced by a component (for tree-shaking)
function collectFormulaReferences(component: Component): Set<string>

// All custom action names referenced by a component (for tree-shaking)
function collectActionReferences(component: Component): Set<string>

// All sub-components transitively referenced (for per-page bundling)
function collectSubComponentNames(
  component: Component,
  getComponent: (name: string, packageName?: string) => Component | undefined,
  packageName?: string,
  visited?: Set<string>
): string[]
```

**`collectFormulaReferences` logic:** Iterate `getFormulasInComponent()`; for each `type === 'function'`: add `name`; if `packageName` is set also add `packageName/name`.

**`collectActionReferences` logic:** Iterate `getActionsInComponent()`; for each `type === 'Custom'` or `undefined`: add `name`.

**`collectSubComponentNames` logic:** Walk all `ComponentNodeModel` nodes; for each unique `key = package/name`: recurse into resolved component; return flat list.

### Traversal Edge Cases

| Case | Behavior |
|------|---------|
| Circular formula references | `visitedFormulas` set prevents re-entry |
| Missing components in sub-component collection | `getComponent()` returns `undefined` — skip |
| Package formula bodies | Only `ToddleFormula` (declarative) descended; `CodeFormula` (JS handler) is a leaf |
| API self-reference | Self-reference excluded from `apiReferences` set |
| `pathsToVisit` filtering [Phase 2] | `shouldVisitTree()` / `shouldSearchExactPath()` for incremental traversal |

---

## Component Registration (Web Components) [Phase 2]

`defineComponents()` registers components as Web Components:

1. Map component names to definitions
2. Generate safe custom element tag names
3. Check if already defined (skip with warning)
4. Define class extending `ToddleComponent extends HTMLElement`
5. Set `observedAttributes` to lowercased attribute names

**Custom element specifics:**
- Renders into Shadow DOM (`mode: 'open'`)
- Styles inlined in shadow root (includes CSS reset)
- Events dispatched with `bubbles: true, composed: true` (crosses shadow boundary)
- `connectedCallback`: initialize APIs, context, theme, render
- `disconnectedCallback`: destroy signal (cleanup cascade)
- Self-references replaced with `<div>` via `replaceTagInNodes()`

---

## Structural Invariants

| ID | Invariant |
|----|-----------|
| I-COMP-ROOT | Every `nodes` record must contain key `'root'` |
| I-COMP-NODE-ID | Node IDs unique within component |
| I-COMP-NO-DANGLING | Every `children` entry resolves to existing node ID |
| I-COMP-NO-SELF-REF | Component must not directly reference itself as child |
| I-COMP-SLOT-NO-REPEAT | `SlotNodeModel.repeat` must be `never` |
| I-COMP-COMPONENT-REF | Every `ComponentNodeModel.name` resolves to existing component |
| I-COMP-FORMULA-REF | Every `apply` references a formula in `component.formulas` |
| I-COMP-WORKFLOW-REF | Every `TriggerWorkflow` resolves a workflow |
| I-COMP-API-REF | Every `Fetch` action references an API in `component.apis` |
| I-COMP-CONTEXT-REF | Every `ComponentContext` references existing context provider |
| I-COMP-ONLOAD-ONCE | `onLoad` fires exactly once per mount |
| I-CTX-PROVIDER-UNIQUE | Provider key unique in `ctx.providers` |
| I-CTX-CLEANUP-CASCADE | Provider unmount destroys all subscriber signals |

---

## Error Handling

| Error Type | When | Recovery |
|------------|------|---------|
| `LimitExceededError` | Size/depth limit exceeded | Reject operation |
| Component not found | `ComponentNodeModel` references missing component | Render nothing; `console.warn` |
| Formula not found | `apply` references missing formula | Return `null`; `console.warn` |
| Workflow not found | `TriggerWorkflow` references missing workflow | Skip; `console.warn` |
| API not found | `Fetch` action references missing API | Skip; `console.error` |
| Context provider not found | No matching provider | Render with `undefined` context; `console.warn` |
| Formula evaluation throws | `applyFormula()` throws | Return `null`; push to `ctx.toddle.errors[]` |

---

## Cross-References

| Spec | Relationship |
|------|-------------|
| `01-data-model.md` | Component type definition, NodeModel types, Formula/Action types |
| `03-formula-system.md` | `applyFormula()` used by context providers and rendering |
| `04-action-system.md` | Action execution in workflows, events, lifecycle hooks |
| `05-signal-system.md` | Signal implementation used by reactive state |
| `06-rendering.md` | Full SSR + CSR pipeline orchestration |
| `07-event-system.md` | DOM event handling and component event emission |
| `10-api-system.md` | API initialization, dependency sorting, execution |
| `13-search-and-linting.md` | Uses `getFormulasInComponent` and `getActionsInComponent` |
| `20-styling-engine.md` | Style variant rendering from node models |
| `24-editor.md` | Editor uses component model for canvas and property panels |
| `25-preview-system.md` | Preview mode context fallback |
| `33-packages-and-plugins.md` | Package component resolution and namespace |
