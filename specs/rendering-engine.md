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
