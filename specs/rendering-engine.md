# Rendering Engine Specification

## Purpose

The Rendering Engine is the CSR (Client-Side Rendering) pipeline that transforms Layr component definitions into live DOM elements with reactive signal subscriptions. It handles node dispatch, element creation, conditional and list rendering with keyed reconciliation, event attachment, style management, and hierarchical cleanup.

### Jobs to Be Done

- Transform component definitions into DOM elements with reactive bindings
- Dispatch rendering by node type: element, component, text, slot
- Support conditional rendering with lazy creation/destruction of child signals
- Support list rendering with keyed reconciliation for minimal DOM updates
- Attach event handlers with automatic cleanup via AbortController
- Manage CSS custom properties through efficient stylesheet rule manipulation
- Handle namespaces (SVG, MathML) for non-HTML elements
- Provide hierarchical cleanup when components unmount

---

## Rendering Pipeline

### Entry Point: renderComponent

`renderComponent()` is the top-level entry that initializes a component's rendering context and starts node creation.

1. Creates `ComponentContext` with all dependencies (signals, APIs, stores, providers)
2. Calls `createNode()` for the root node (`id: 'root'`)
3. Batches lifecycle hooks via `BatchQueue`:
   - `onAttributeChange` — triggered when attributes change (deep equality check prevents spurious fires)
   - `onLoad` — triggered once after mount, deferred to `requestAnimationFrame`
4. Returns array of DOM elements

### BatchQueue

A singleton queue that batches callbacks into a single `requestAnimationFrame`. Prevents multiple RAF calls per update cycle. All lifecycle hooks across all components share the same queue.

```
BATCH_QUEUE.add(callback) → queued → requestAnimationFrame → drain all callbacks
```

---

## Node Dispatch (createNode)

The `createNode()` function routes to the correct renderer based on node type and wrapping:

### Decision Tree

```
Has node.repeat?
  → repeat() — list rendering with reconciliation
Has node.condition?
  → conditional() — lazy show/hide with signal lifecycle
Neither?
  → create() — direct node creation
```

### create() Dispatch

```
node.type === 'element'    → createElement()   → returns [HTMLElement]
node.type === 'component'  → createComponent() → returns Element[]
node.type === 'text'       → createText()      → returns [HTMLSpanElement | Text]
node.type === 'slot'       → createSlot()      → returns Element[]
```

---

## Element Creation (createElement)

Creates a DOM element with all reactive bindings.

### DOM Element Construction

1. **Tag resolution** — resolves tag name (may come from formula)
2. **Namespace detection:**
   - `svg` tag → `http://www.w3.org/2000/svg`
   - `math` tag → `http://www.w3.org/1998/Math/MathML`
   - Explicit `xmlns` attribute overrides inference
   - Namespace propagates to all children
3. **Element creation** — `document.createElementNS()` or `document.createElement()`

### Data Attributes

Every rendered element receives:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `data-node-id` | Node ID from component definition | Editor selection target |
| `data-id` | Path string (e.g., `0.1.2`) | DOM ordering/reconciliation |
| `data-component` | Component name | Identifying non-root component elements |
| `class` | Style hash + instance classes | Scoped styling |

### Path Format

- Root: `"0"` or inherited path
- Child element: `${parentPath}.${childIndex}` — e.g., `0.1.2`
- Repeat item: `${parentPath}(${repeatKey})` — e.g., `0.1(abc)`
- Slot child: `${parentPath}.${childIndex}[${slotName}]` — e.g., `0.1.2[header]`

### Class Bindings

- **Static classes** — added directly to the element
- **Dynamic classes** — each class with a formula creates a mapped signal:
  ```
  dataSignal.map(data → toBoolean(applyFormula(formula))) → subscribe → classList.add/remove
  ```

### Attribute Bindings

- **Static attributes** — `setAttribute()` called directly
- **Dynamic attributes** — mapped signal per attribute:
  ```
  dataSignal.map(data → applyFormula(formula)) → subscribe → setAttribute()
  ```
- **Special handling:** `autofocus` skipped in preview mode to prevent focus theft

### Style Variables (Inline)

Each inline style variable creates a signal:
```
dataSignal.map(data → applyFormula(formula) + unit) → subscribe → elem.style.setProperty('--name', value)
```

### CSS Custom Properties (Stylesheet Rules)

Dynamic custom properties managed through `CustomPropertyStyleSheet`:

1. **Rule registration** — `registerProperty(selector, name)` returns an update function
2. **Rule caching** — Map-based lookup for O(1) access to `CSSStyleRule` objects
3. **Signal subscription** — mapped signal calls the update function on changes
4. **Nested rules** — handles `@media`, `@starting-style`, and pseudo-element selectors
5. **Variant properties** — separate rules per variant with media query/breakpoint selectors
6. **SSR hydration** — `hydrateFromBase()` indexes existing SSR-generated rules
7. **Cleanup** — `unregisterProperty()` called on signal destruction

### Event Handlers

1. Events collected from node definition into `[eventName, handler]` pairs
2. Attached via `addEventListener(eventName, handler, { signal: abortSignal })`
3. AbortSignal from component's AbortController — listeners auto-removed on unmount
4. Handler enriches drag/clipboard events with file data before dispatching to `handleAction()`

### Special: Script/Style Tags

For `<script>` and `<style>` elements, text children are concatenated into `textContent` rather than individual text nodes. Dynamic text within these tags creates signals that rewrite the entire `textContent` on any change.

### Child Rendering

1. Iterates `node.children` array
2. Calls `createNode()` for each child with extended path
3. Appends all child elements via `elem.append(...childNodes)`

### Cleanup Subscription

Every element subscribes to its data signal with a destroy hook:
```
dataSignal.subscribe(() => {}, { destroy: () => elem.parentNode?.removeChild(elem) })
```
When the signal is destroyed, the element is removed from the DOM.

---

## Conditional Rendering

Wraps any node type with show/hide logic based on a formula.

### Mechanism

1. **Show signal** — `dataSignal.map(data → toBoolean(applyFormula(condition)))`
2. **Toggle function:**
   - `show === true && no elements exist` → create child data signal (identity map), render nodes, insert into DOM
   - `show === false && elements exist` → destroy child data signal (cascading cleanup), remove elements
3. **Signal subscription** — `showSignal.subscribe(toggle, { destroy: cleanup })`

### Lifecycle Isolation

Child content gets its own data signal via `dataSignal.map(data => data)` (identity map). This allows:
- Independent destruction without affecting the parent signal
- Full cleanup cascade when condition becomes false
- Fresh signal creation when condition becomes true again

### First-Run Optimization

On initial render, elements are created but NOT inserted into the DOM (the parent's `append()` handles that). DOM insertion only happens for subsequent show/hide toggles.

### Insertion Point

`getNextSiblingElement(path, parentElement)` finds the correct insertion point by parsing `data-id` attributes of sibling elements and comparing path indices.

### Preview Mode Override

In editor design mode, selected hidden nodes have their conditions removed so they render despite being conditionally hidden. The `showSignal` is augmented with display tracking.

---

## List Rendering (Repeat)

Renders a list of items with efficient keyed reconciliation.

### Repeat Signal

```
dataSignal.map(data → Object.entries(applyFormula(repeat)))
```
Returns `[key, value]` pairs from the formula result (works with arrays and objects).

### ListItem Data Structure

Each list item extends the parent data with:

| Field | Type | Description |
|-------|------|-------------|
| `ListItem.Item` | `unknown` | The current item value |
| `ListItem.Index` | `number` | Numeric array index |
| `ListItem.Key` | `string` | String key from `Object.entries()` |
| `ListItem.Parent` | `ListItem?` | Parent's ListItem for nested repeats |

### Keyed Reconciliation Algorithm

Maintains a `Map<key, { dataSignal, cleanup, elements }>` of rendered items.

**On each update:**

1. **Evaluate keys** — For each item, evaluate optional `repeatKey` formula or fall back to array index
2. **Reuse existing items** — If key exists in map, update the item's data signal with new ListItem data (no DOM re-creation)
3. **Create new items** — Create new child data signal, subscribe to parent for non-ListItem updates, render nodes
4. **Cleanup removed items** — For old keys not in new list: call cleanup(), destroy data signal, remove DOM elements
5. **Reorder** — Call `ensureEfficientOrdering()` to minimize DOM moves

### Efficient DOM Reordering

`ensureEfficientOrdering(parentElement, items, nextElement)`:
- Processes items in reverse order
- Only calls `insertBefore()` for elements not already in the correct position
- Uses a marker tracking expected position to minimize DOM operations

### Duplicate Key Handling

If `repeatKey` formula returns duplicate keys:
- Logs `console.warn("Duplicate key")`
- Falls back to array index as key
- Disables optimization (forces re-render on every change)

### Child Signal Updates

When an existing item's data changes (same key, new value):
```
existingItem.dataSignal.update(data → {
  ...data,
  ListItem: { ...data.ListItem, Item: newValue, Index: newIndex, Key: newKey }
})
```
Only the `ListItem` fields change — other data updates come through the parent subscription.

---

## Component Instance Creation (createComponent)

Creates a child component instance within the rendering tree.

### Process

1. **Component lookup** — find by `package/name` in `ctx.components`
2. **Attribute signal** — map parent data to evaluate all attribute formulas
3. **Custom properties** — subscribe to CSS custom property signals
4. **Component data signal** — new `Signal<ComponentData>` with:
   - `Location` from parent
   - `Attributes` from attribute signal
   - `Apis` initialized to loading/idle states
5. **Context subscription** — subscribe to ancestor context providers
6. **Variable initialization** — evaluate `initialValue` formulas
7. **AbortController** — linked to signal destruction
8. **API creation** — sorted by dependency, legacy or v2 creation
9. **Context provider registration** — if component exposes formulas/workflows
10. **Children slotting** — group child elements by slot name
11. **Theme store subscription** — link to global theme signal
12. **Attribute signal subscription** — link parent attributes to component data
13. **Render delegation** — call `renderComponent()` with new context

### Instance Tracking

- Root components forward parent instance and add current component
- Non-root components create new instance with current component ID
- Used for scoped styling via class names on elements

---

## Text Node Creation (createText)

### Default (Non-Namespace) Text

1. Creates `<span>` wrapper for editor selection targeting
2. Sets data attributes (`data-node-id`, `data-id`, `data-component`, `data-node-type`)
3. Static text: sets `innerText` directly
4. Dynamic text: `dataSignal.map(data → String(applyFormula(formula))) → subscribe → elem.innerText = value`

### Namespace Text (SVG/MathML)

1. Creates raw `Text` node via `document.createTextNode()`
2. No wrapper element (invalid in SVG/MathML context)
3. Static text: sets `nodeValue`
4. Dynamic text: signal subscription updates `nodeValue`

---

## Slot Rendering (createSlot)

### With Slotted Content

When parent component passes children for this slot:
1. Creates child data signal (identity map for lifecycle isolation)
2. Links destruction to parent data signal
3. Renders each child with `createNode()`, merging provider context

### Without Slotted Content (Fallback)

Renders the slot's own `node.children` as placeholder content.

### Custom Element Slots

In custom element runtime for root component:
- Creates native `<slot name="${slotName}">` element
- Returns native slot for Shadow DOM content projection

---

## Formula-to-Signal Pattern

Every dynamic value in the rendering engine follows this pattern:

1. **Create mapped signal:** `dataSignal.map(data → applyFormula(formula, { data, ... }))`
2. **Subscribe to DOM update:** `signal.subscribe(value → updateDOM(value))`
3. **Automatic cleanup:** Parent signal destruction → child signal destruction → subscriber cleanup

This creates a fully reactive system where any component data change propagates through formula evaluation, signal updates, and DOM mutations automatically and synchronously.

---

## System Limits

### Render Performance Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxRenderTime` | 100ms | Maximum time for single render cycle (target: 60fps) |
| `maxUpdatesPerFrame` | 1,000 | Maximum DOM updates batched per animation frame |
| `maxSubscribers` | 10,000 | Maximum subscribers per signal |

### Structural Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxDOMDepth` | 1,000 | Maximum DOM tree depth |
| `maxChildrenPerNode` | 10,000 | Maximum children per element |
| `maxRepeatItems` | 10,000 | Maximum items in a repeat list |

### Cleanup Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxCleanupDepth` | 100 | Maximum nested cleanup callbacks |
| `cleanupTimeout` | 5,000ms | Maximum time for cleanup cascade |

### Enforcement

- **Render time:** If `maxRenderTime` exceeded, warn in dev mode, continue in production
- **Updates per frame:** Excess updates deferred to next frame
- **Subscribers:** Throw `LimitExceededError` if exceeded (likely memory leak)
- **Repeat items:** Truncate with warning if exceeded

---

## Invariants

### Rendering Invariants

1. **I-REND-ROOT:** Every component render MUST produce at least one DOM element (or empty array).
2. **I-REND-PATH-UNIQUE:** `data-id` attributes MUST be unique within a component's rendered output.
3. **I-REND-NAMESPACE:** SVG/MathML namespaces MUST propagate to all descendants.
4. **I-REND-SIGNAL-CLEANUP:** Every signal subscription MUST have a cleanup callback registered.

### Lifecycle Invariants

5. **I-REND-CLEANUP-CASCADE:** Destroying a parent signal MUST destroy all child signals.
6. **I-REND-CLEANUP-ORDER:** Child signals destroyed BEFORE parent (leaf-to-root).
7. **I-REND-EVENT-CLEANUP:** All event listeners MUST be removed on component unmount.

### DOM Invariants

8. **I-REND-DOM-CONSISTENCY:** Signal state and DOM state MUST be synchronized.
9. **I-REND-NO-ORPHANS:** No element may exist in DOM without an active signal subscription.
10. **I-REND-ABORT-LINK:** Component AbortController MUST be linked to signal destruction.

### Conditional Rendering Invariants

11. **I-REND-COND-ISOLATION:** Conditional child signals MUST be independently destroyable.
12. **I-REND-COND-CLEANUP:** Toggling condition to false MUST fully destroy child content.

### List Rendering Invariants

13. **I-REND-KEY-UNIQUE:** Repeat keys MUST be unique within a list (or fall back to index).
14. **I-REND-REUSE-PRESERVE:** Reusing a repeat item MUST preserve its DOM element.
15. **I-REND-REMOVE-CLEANUP:** Removing a repeat item MUST destroy its signal and remove DOM.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-REND-SIGNAL-CLEANUP | Build + Runtime | Memory leak warning |
| I-REND-CLEANUP-CASCADE | Runtime | Cascade continues despite errors |
| I-REND-KEY-UNIQUE | Runtime | Warning, fallback to index |
| I-REND-DOM-CONSISTENCY | Dev mode | Hydration mismatch warning |

---

## Timeout Handling

### Render Timeout

To prevent main thread blocking:

```typescript
const RENDER_TIMEOUT_MS = 100;

function renderWithTimeout(fn: () => Element[]): Element[] | null {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  if (duration > RENDER_TIMEOUT_MS) {
    console.warn(`Render took ${duration}ms (limit: ${RENDER_TIMEOUT_MS}ms)`);
    // In dev mode, could suggest optimization
  }
  
  return result;
}
```

### Long-Running Detection

For components that exceed time budgets repeatedly:

1. Log warning with component name and duration
2. Suggest simplification (fewer nodes, fewer formulas)
3. In extreme cases, mark component as "needs optimization"

---

## Error Handling

### Error Types

| Error Type | When Thrown | Recovery |
|------------|-------------|----------|
| `ComponentNotFoundError` | Component lookup fails | Return empty array |
| `SignalDestructionError` | Error during cleanup | Log, continue cascade |
| `LimitExceededError` | Limits exceeded | Throw or degrade gracefully |
| `HydrationMismatchError` | SSR/CSR mismatch | Warning, use CSR result |

### Missing Resource Handling

| Scenario | Behavior | Log Level |
|----------|----------|-----------|
| Component not found | Return empty array | `warn` |
| Node not in nodes record | Skip node | `warn` |
| Slot has no content/fallback | Render nothing | None |
| Namespace unknown | Default to HTML | `warn` |

### Cleanup Error Handling

Cleanup errors MUST NOT prevent other cleanup:

```typescript
function destroy(signal: Signal): void {
  if (signal.destroying) return; // Re-entrancy guard
  signal.destroying = true;
  
  for (const subscriber of signal.subscribers) {
    try {
      subscriber.destroy?.();
    } catch (e) {
      console.error('Cleanup error:', e);
      // Continue to next subscriber
    }
  }
  
  signal.subscribers.clear();
  signal.destroying = false;
}
```

---

## Memory Management

### Signal Lifecycle

```
Component Mount
  ├── Create component data signal
  ├── Create derived signals (formulas, conditions, repeats)
  ├── Subscribe to context providers
  └── Register cleanup callbacks
      │
      ▼ (on unmount)
Component Unmount
  ├── AbortController.abort() → cancels pending fetches
  ├── All event listeners removed (via abort signal)
  ├── Derived signals destroyed (cascade)
  ├── Context subscriptions cleared
  └── DOM elements removed
```

### Leak Detection (Dev Mode)

```typescript
interface LeakInfo {
  signalId: string;
  subscriberCount: number;
  componentPath: string;
  createdAt: number;
}

// In dev mode, expose leak detection
window.__layrDebug = {
  detectLeaks(): LeakInfo[] {
    // Find signals with many subscribers or long-lived signals
  }
};
```

### Best Practices

1. **Always use AbortSignal** for event listeners and fetch requests
2. **Avoid closures** in signal subscriptions that capture DOM elements directly
3. **Use identity maps** (`signal.map(x => x)`) for lifecycle isolation
4. **Clear collections** (Maps, Sets) in destroy callbacks

---

## Edge Cases

### Namespace Propagation

SVG and MathML namespaces propagate to all descendants. An explicit `xmlns` attribute on any element overrides the inherited namespace.

### Script/Style Inner Content

`<script>` and `<style>` tags cannot use `innerHTML` safely. Instead, all text children are evaluated and concatenated into `textContent`, preventing XSS and ensuring correct behavior.

### Conditional + Repeat Nesting

A node with both `condition` and `repeat` first evaluates the repeat, then each item can be wrapped in a conditional. The repeat signal is the outer layer.

### Empty Repeat Lists

If a repeat formula returns `null`, `undefined`, or an empty array/object, no items are rendered. Previously rendered items are cleaned up.

### Component Not Found

If a component reference cannot be resolved (missing from `ctx.components`), a `console.warn` is logged and an empty array returned. No error is thrown.

---

## Dependencies

- **Signal System** — All reactive bindings use `Signal.map()` and `Signal.subscribe()`
- **Formula System** — `applyFormula()` evaluates all dynamic values
- **Action System** — `handleAction()` processes event handler actions
- **Styling System** — `CustomPropertyStyleSheet` manages CSS rule updates
- **fast-deep-equal** — Prevents redundant DOM updates via signal equality checks

---

## Changelog

### Unreleased
- Added System Limits section with performance, structural, and cleanup limits
- Added Invariants section with 15 rendering, lifecycle, DOM, conditional, and list invariants
- Added Timeout Handling section with render timeout and long-running detection
- Added Error Handling section with error types, missing resources, and cleanup handling
- Added Memory Management section with signal lifecycle, leak detection, and best practices
