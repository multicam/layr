# List Rendering & Keyed Reconciliation Specification

## Purpose

The List Rendering system implements fine-grained reactive list reconciliation with keyed diffing, per-item signal lifecycle management, and efficient DOM ordering. It enables rendering dynamic lists from formula-evaluated data while minimizing DOM operations through key-based item reuse and reverse-order insertion optimization.

### Jobs to Be Done

- Render dynamic lists from formula-evaluated arrays/objects
- Reconcile list changes using keys to reuse existing DOM elements
- Maintain per-item reactive signals that propagate parent updates while preserving list context
- Minimize DOM operations when items are added, removed, or reordered
- Support nested lists via `ListItem.Parent` chaining
- Handle conditional rendering within repeated items
- Integrate with the editor preview system for forced element visibility

---

## Node Type Dispatch

The rendering system dispatches nodes through a three-tier priority:

```
1. node.repeat → repeat() wrapper
2. node.condition → conditional() wrapper
3. node.type → type-specific creation:
   - 'element' → createElement()
   - 'component' → createComponent()
   - 'text' → createText()
   - 'slot' → createSlot()
```

Repeat and conditional are wrappers that internally call the type-specific creation functions. A node can have both `repeat` and `condition` — repeat wraps first, then each repeated item checks its condition.

---

## Keyed Reconciliation Algorithm

### Overview

The `repeat()` function maintains a `Map<string | number, RepeatItem>` that tracks each list item by key. On every data change, the algorithm builds a new map, reuses existing items where keys match, creates new items for new keys, and destroys items for removed keys.

### Data Structures

```
RepeatItem = {
  dataSignal: Signal<ComponentData>   // Per-item reactive signal
  cleanup: () => void                  // Parent subscription cleanup
  elements: ReadonlyArray<Element | Text>  // Rendered DOM nodes
}

repeatItems: Map<string | number, RepeatItem>
```

### Algorithm Steps

#### Step 1: Evaluate List Formula

The repeat formula is evaluated against the current component data. The result is converted to entries via `Object.entries()`, producing `[Key, Item]` pairs. Non-object results produce an empty array.

#### Step 2: Build New Map

For each `[Key, Item]` pair in the list:

1. **Build ListItem context:**
   ```
   ListItem: {
     Item: <current item value>,
     Index: <numeric index>,
     Key: <original key>,
     Parent: <parent ListItem if nested>  // Only if parent has ListItem
   }
   ```

2. **Compute child key:**
   - If `node.repeatKey` formula exists → evaluate it with child data context
   - Otherwise → use the original `Key` from `Object.entries()`

3. **Check for duplicate keys:**
   - If `childKey` already exists in the new map → warn to console and fall back to index as key
   - Duplicate keys disable optimization — items are destroyed and recreated on every update

4. **Reuse or create:**
   - **Key exists in old map:** Reuse the existing `RepeatItem`. Update its signal's `ListItem` with new `Item`, `Index`, and `Key`. The signal update propagates to all subscribed DOM elements.
   - **Key is new:** Create a new `Signal<ComponentData>`, subscribe it to the parent signal, render DOM elements via `create()` or `conditional()`, and store in the new map.

#### Step 3: Remove Stale Items

Iterate old map entries. For any key not present in the new map:
1. Call `cleanup()` to unsubscribe from parent signal
2. Call `dataSignal.destroy()` to cascade destroy to all child subscriptions
3. Call `element.remove()` for each DOM node

#### Step 4: Replace Map

Set `repeatItems = newRepeatItems`.

#### Step 5: Reorder DOM

Call `ensureEfficientOrdering()` to position elements correctly with minimal DOM operations.

### Signal Lifecycle for Repeat Items

#### New Item Signal Creation

```
1. Create childDataSignal = signal(childData)   // New signal with initial data
2. Subscribe to parent dataSignal:
   - On parent update → update child with parent data, preserving ListItem
   - On parent destroy → destroy child signal
3. Store cleanup function (unsubscribe from parent)
```

#### Reused Item Signal Update

```
1. Keep existing signal instance (no new signal created)
2. Update signal's ListItem with new Item, Index, Key
3. Parent subscription continues unchanged
```

#### Item Signal Destruction

```
1. Call cleanup() — unsubscribes from parent
2. Call dataSignal.destroy() — cascades to all child subscribers
3. Remove DOM elements
```

**Key invariant:** When the parent signal updates, each child signal receives the update but preserves its own `ListItem` data. This ensures list context (Item, Index, Key) is maintained while component-level data (Variables, Attributes, Apis) flows through.

---

## Conditional Rendering

### Overview

The `conditional()` function wraps a node with show/hide logic based on a formula evaluation. Elements are lazily created when the condition becomes true and destroyed when it becomes false.

### Lifecycle

#### Show Signal

A derived signal maps the parent data signal through the condition formula and converts to boolean.

#### Toggle Logic

| Previous State | New State | Action |
|---------------|-----------|--------|
| Hidden | Hidden | No-op |
| Shown | Shown | No-op (child signal receives parent updates) |
| Hidden | Shown | Destroy old signal (if any), create new signal, render elements, insert into DOM |
| Shown | Hidden | Destroy signal, remove elements from DOM, clear elements array |

#### Signal Management

- **On show:** Creates a new mapped signal from parent. Does not reuse previous signal.
- **On hide:** Destroys signal, which cascades to all child signals and subscriptions.
- **Cleanup:** Subscribe includes destroy callback to clean up child signal when parent is destroyed.

#### DOM Insertion

When toggling from hidden to shown (not first render):
1. Validate parent element still exists in DOM
2. Check no duplicate `data-id` exists (warns if external DOM modification detected)
3. Find next sibling element via `getNextSiblingElement()`
4. Insert each element before the next sibling

### Editor Preview Integration

In preview mode (`runtime === 'preview'`), the conditional subscribes to `_preview.showSignal`:
- If the node is in `displayedNodes` and not in test mode → force show (regardless of condition)
- Otherwise → respect the condition formula result

This allows designers to select and edit conditionally hidden elements.

---

## DOM Ordering Strategy

### Efficient Ordering Algorithm

`ensureEfficientOrdering(parentElement, items, nextElement)` minimizes DOM operations by processing items in reverse order.

#### Algorithm

```
1. Set insertBeforeElement = nextElement (or null for end)
2. Set currentMarker = previous sibling of insertBeforeElement (or last child)
3. For each item from LAST to FIRST:
   a. If item === currentMarker → already in correct position, advance marker
   b. Otherwise → parentElement.insertBefore(item, insertBeforeElement)
   c. Set insertBeforeElement = item
```

#### Why Reverse Order?

Processing in reverse allows checking if each element is already correctly positioned relative to its expected successor. Only elements that are out of position require `insertBefore()` calls. This is optimal because:
- Appending to the end is a common case (new items added)
- Preserving existing order requires zero moves
- Only displaced items trigger DOM mutations

### Next Sibling Calculation

`getNextSiblingElement(path, parentElement)` finds the correct insertion point for conditional/repeat elements:

1. Parse path format: `"0.1(3)"` → base index `1`, repeat index `3`
2. Search parent's children for first element with higher position
3. Compare both base index and repeat index
4. Return `null` if no next sibling (append to end)

### Path Format

| Format | Meaning |
|--------|---------|
| `"0"` | Root element, first child |
| `"0.1"` | Second child of root |
| `"0.1.2"` | Third child of second child |
| `"0.1(5)"` | Repeat item with key `5`, second child position |
| `"0.1[slotName]"` | Slotted child |

---

## Element Creation

### HTML Elements

`createElement()` creates DOM elements with reactive bindings:

1. **Namespace detection:** `<svg>` → SVG namespace, `<math>` → MathML namespace, `xmlns` attribute override
2. **Element creation:** `document.createElement()` or `document.createElementNS()`
3. **Attributes:** `data-node-id`, `data-id` (path), `data-component` (if not root), class hash
4. **Dynamic classes:** Each class with a formula creates a mapped signal that adds/removes the class
5. **Reactive attributes:** Each non-static attribute creates a mapped signal that calls `setAttribute()`
6. **Style variables:** Each variable creates a mapped signal that sets CSS custom properties via `style.setProperty()`
7. **Event handlers:** Registered with `addEventListener()` using the component abort signal
8. **Children:** Recursively rendered via `createNode()` and appended
9. **Cleanup:** Signal subscription with destroy callback removes element from DOM

### Text Nodes

Two implementations:
- **HTML context:** Wrapped in `<span>` with `data-id`, `data-node-type="text"` for editor selection
- **Namespace context (SVG/MathML):** Raw `TextNode` (no wrapper, as `<span>` is invalid in SVG)

Both support reactive text via mapped signals.

### Slots

`createSlot()` renders either provided children or fallback content:

1. Check `ctx.children[slotName]` for slotted content
2. If provided → create child signals subscribed to slot's data signal, render with parent's providers
3. If not provided → render `node.children` as fallback content
4. In web component mode → wrap in native `<slot>` element

### Components

`createComponent()` sets up a full component lifecycle:

1. **Lookup:** Find component by name (with package namespace)
2. **Attribute signal:** Map parent data to evaluated attributes
3. **Component data signal:** New signal with Location, evaluated Attributes, and API initial states
4. **Context subscription:** Subscribe to context providers
5. **Variable initialization:** Evaluate `initValue` formulas for each variable
6. **API setup:** Create legacy and v2 API instances
7. **Context provider:** If component exposes formulas in context, register as provider
8. **Children mapping:** Group node children by slot name
9. **Attribute sync:** Subscribe attribute signal to update component data
10. **Render:** Call `renderComponent()` recursively

---

## Component Rendering Entry Point

`renderComponent()` builds the component context and triggers the render:

1. **Build ComponentContext:** Aggregates all dependencies (signals, APIs, providers, etc.)
2. **Create root node:** Calls `createNode()` with `id: 'root'`
3. **Batch lifecycle hooks:** Via global `BatchQueue` singleton:
   - `onAttributeChange`: Subscribes to attribute changes with deep equality check, fires actions with change details
   - `onLoad`: Fires actions once after first render

Lifecycle hooks are batched into a single `requestAnimationFrame` to avoid layout thrashing when multiple components mount simultaneously.

---

## Signal System

### Core Signal Behavior

| Operation | Behavior |
|-----------|----------|
| `set(value)` | Deep equality check; notify subscribers only if changed |
| `update(fn)` | Apply function to current value, then `set()` |
| `subscribe(fn, config?)` | Add subscriber, fire immediately with current value |
| `map(fn)` | Create derived signal with automatic lifecycle binding |
| `destroy()` | Call all subscriber destroy callbacks, clear everything |
| `cleanSubscribers()` | Call all subscriber destroy callbacks, clear subscribers only |

### Performance Optimizations

- **No-subscriber fast path:** Skips `deepEqual` check when no subscribers exist
- **Deep equality:** Uses `fast-deep-equal` to prevent unnecessary DOM updates
- **Re-entrancy protection:** `destroying` flag prevents recursive destroy calls
- **Mapped signal cleanup:** Destroying a parent signal automatically destroys all mapped signals

---

## Nested Lists

Lists can be nested. Each level adds a `Parent` reference to its `ListItem`:

```
Outer list item:
  ListItem: { Item: "A", Index: 0, Key: "0" }

Inner list item:
  ListItem: {
    Item: "X",
    Index: 0,
    Key: "0",
    Parent: { Item: "A", Index: 0, Key: "0" }
  }
```

Formulas can access parent list context via `ListItem.Parent.Item`, `ListItem.Parent.Parent.Item`, etc.

---

## Edge Cases

- **Duplicate keys:** Falls back to array index as key with console warning. Disables reuse optimization — items are recreated on every update.
- **Non-object repeat value:** If formula returns a primitive (string, number, boolean), the repeat produces an empty array.
- **External DOM modification:** If parent element is removed from the document tree, repeat/conditional logs an error and skips DOM operations.
- **Duplicate `data-id`:** If an element with the same `data-id` already exists when a conditional shows, a warning is logged (indicates external DOM modification).
- **First render optimization:** DOM insertion/ordering is skipped on first render since elements are returned to the parent and appended in order.
- **Empty list:** No items rendered, no DOM operations performed.
- **Key type coercion:** Keys from `Object.entries()` are always strings. Custom `repeatKey` formulas can return any type but are used as Map keys (reference equality for objects).
- **Component not found:** If a component reference can't be resolved, a warning is logged and an empty array is returned (no crash).
