# Reactive Signal System Specification

## Purpose

The Signal System is the foundational reactive primitive underpinning all state management in Layr. Every component variable, attribute, formula evaluation, API response, and DOM update flows through signals. The system provides fine-grained, synchronous, push-based reactivity with deep equality checking and hierarchical cleanup.

### Jobs to Be Done

- Provide a reactive primitive that drives all UI updates when state changes
- Enable derived state via signal chaining (`.map()`)
- Ensure efficient updates by preventing redundant notifications through deep structural equality
- Manage memory through hierarchical destruction — destroying a parent signal cascades to all derived signals and DOM cleanup
- Support the component lifecycle: creation, updates, conditional rendering, list reconciliation, and teardown

---

## Data Models

### Signal\<T\>

The core reactive primitive.

| Field | Type | Description |
|-------|------|-------------|
| `value` | `T` | Current state value |
| `subscribers` | `Set<Subscriber<T>>` | Active subscriptions receiving notifications |
| `subscriptions` | `Array<() => void>` | Cleanup functions for upstream subscriptions (used by `.map()`) |
| `destroying` | `boolean` | Re-entrancy guard preventing infinite destruction loops |

### Subscriber\<T\>

| Field | Type | Description |
|-------|------|-------------|
| `notify` | `(value: T) => void` | Callback invoked when value changes |
| `destroy` | `(() => void)?` | Optional cleanup callback invoked on signal destruction |

---

## API Contract

### `signal<T>(initialValue: T): Signal<T>`

Factory function. Creates a new signal with the given initial value.

### `Signal.get(): T`

Returns the current value. Synchronous, no side effects, no dependency tracking on access.

### `Signal.set(value: T): void`

Sets the signal's value and notifies subscribers.

**Behavior:**
1. If `subscribers.size === 0`: assigns value directly, skips equality check (optimization)
2. If `fastDeepEqual(value, this.value) === false`: assigns value, then synchronously calls `subscriber.notify(value)` for every subscriber
3. If values are deeply equal: no-op

**Equality:** Uses `fast-deep-equal` for deep structural comparison. Two distinct object references with identical structure are considered equal and will NOT trigger notifications.

### `Signal.update(f: (current: T) => T): void`

Convenience method. Equivalent to `signal.set(f(signal.get()))`.

### `Signal.subscribe(notify, config?): () => void`

Adds a subscriber and immediately invokes `notify` with the current value.

**Parameters:**
- `notify: (value: T) => void` — Called on subscription and on every subsequent change
- `config?.destroy: () => void` — Optional cleanup callback invoked when the signal is destroyed

**Returns:** Unsubscribe function that removes this subscriber from the set.

**Critical behavior:** The `notify` callback fires synchronously at subscription time with the current value. This means DOM elements are rendered immediately when subscribed, not deferred.

### `Signal.map<T2>(f: (value: T) => T2): Signal<T2>`

Creates a derived signal that transforms the parent's value.

**Behavior:**
1. Creates a new signal with `f(parentValue)` as initial value
2. Subscribes to the parent signal; on parent change, calls `childSignal.set(f(newValue))`
3. Registers the parent subscription in the child's `subscriptions` array for cleanup
4. Links destruction: when the parent signal is destroyed, the child signal's `destroy` callback fires, cascading destruction downward

**Lifecycle coupling:** Parent destruction → child `destroy()` callback → child `Signal.destroy()` → child's subscribers destroyed → downstream cascade continues.

### `Signal.destroy(): void`

Tears down the signal and all dependents.

**Destruction order:**
1. Check re-entrancy guard (`if (this.destroying) return`)
2. Set `this.destroying = true`
3. Call `subscriber.destroy()` for every subscriber (cascades to derived signals)
4. Clear the subscribers set
5. Call every cleanup function in `this.subscriptions` (unsubscribes from parent signals)
6. Clear the subscriptions array
7. Reset `this.destroying = false`

**Re-entrancy protection:** If `destroy()` is called during a subscriber's `destroy` callback (e.g., circular references), the guard prevents infinite loops.

### `Signal.cleanSubscribers(): void`

Calls `destroy()` on all subscribers and clears the set, but does NOT destroy the signal itself or its upstream subscriptions. Used only in editor preview runtime for re-rendering without full teardown.

---

## Component Data Signal

Every component instance has a root `Signal<ComponentData>` that holds all reactive state.

### ComponentData Shape

| Field | Type | Description |
|-------|------|-------------|
| `Location` | `object?` | URL state (path, query, hash, params) — undefined for custom elements |
| `Attributes` | `Record<string, unknown>` | Input properties from parent component |
| `Variables` | `Record<string, unknown>` | Internal mutable state |
| `Apis` | `Record<string, ApiState>` | API response states |
| `Contexts` | `Record<string, Record<string, unknown>>?` | Values from ancestor context providers |
| `Page` | `object?` | Page-level metadata |
| `ListItem` | `{ Item: unknown, Index: number }?` | Current item/index in repeat rendering |

### Signal Creation Flow

1. **Component instantiation** — `createComponent()` creates a `Signal<ComponentData>` with initial values:
   - `Variables`: each variable's `initialValue` formula evaluated once
   - `Attributes`: initially undefined, updated via parent's attribute signal
   - `Apis`: each API initialized to `{ data: null, isLoading: false, error: null }`
   - `Contexts`: populated by context subscriptions after creation

2. **Attribute signal** — Parent's data signal is mapped to evaluate attribute formulas:
   ```
   parentDataSignal.map(data => evaluateAttributeFormulas(data))
   ```
   This derived signal subscribes to the component data signal, pushing attribute updates.

3. **Child rendering** — The component data signal is passed to `renderComponent()`, which creates nodes that derive their own signals via `.map()`.

---

## DOM Update Patterns

### Text Nodes

Data signal → `.map()` to evaluate text formula → `.subscribe()` to set `elem.innerText`.

### Element Attributes

Data signal → `.map()` to evaluate attribute formula → `.subscribe()` to call `elem.setAttribute()`.

### CSS Custom Properties

Data signal → `.map()` to evaluate custom property formula → `.subscribe()` to update stylesheet rule.

### Conditional Rendering

Data signal → `.map()` to evaluate condition formula (coerced to boolean) → `.subscribe()` with toggle function:
- **Condition becomes true:** Create a new child data signal via `dataSignal.map(data => data)` (identity map for lifecycle isolation), render child nodes, insert into DOM
- **Condition becomes false:** Destroy child data signal (cascading all cleanup), remove elements from DOM
- **First render:** Elements are created but NOT inserted (the render phase handles initial insertion)

### Repeat / List Rendering

Data signal → `.map()` to evaluate repeat formula → `.subscribe()` with reconciliation function:
- Maintains a `Map<key, { dataSignal, cleanup, elements }>` of rendered items
- **Existing key:** Reuses signal, calls `.update()` with new `ListItem` data
- **New key:** Creates new child data signal, renders nodes, inserts into DOM
- **Removed key:** Calls `cleanup()`, destroys child data signal, removes elements
- **Reordering:** Uses `ensureEfficientOrdering()` to minimize DOM operations
- **Duplicate keys:** Falls back to array index with console warning

---

## Memory Management

### Hierarchical Destruction

Signal destruction cascades through the entire component tree:

```
Component data signal destroyed
  → All subscriber destroy() callbacks fire
    → Derived signals (formulas, text, attributes) destroyed
      → Their subscribers destroyed
        → DOM elements removed from parent
    → AbortController aborted
      → Pending API fetch requests cancelled
      → Event listeners removed (via abort signal)
    → Custom property subscriptions unregistered
    → API payload signals destroyed
```

### AbortController Integration

Each component creates an `AbortController` whose signal is linked to the component data signal via a destroy subscriber:
```
componentDataSignal.subscribe(() => {}, {
  destroy: () => abortController.abort(`Component ${name} unmounted`)
})
```
This abort signal is passed to `fetch()` calls and `addEventListener()` for automatic cleanup.

### Identity Map Pattern

`dataSignal.map(data => data)` creates a new signal that mirrors the parent but can be destroyed independently. Used for:
- **Conditional rendering:** Child lifecycle is independent of parent
- **Slot content:** Slotted elements can be removed without affecting the parent
- **List items:** Each repeat item has an independent lifecycle

---

## Edge Cases

### Deep Equality for Complex Objects

Setting a signal to a structurally identical object (different reference, same content) does NOT trigger subscriber notifications. This prevents unnecessary DOM updates but means the equality check runs `fast-deep-equal` on every `.set()` call when subscribers exist.

**Optimization:** When `subscribers.size === 0`, the equality check is skipped entirely.

### Synchronous Notification

All subscriber callbacks execute synchronously within the `.set()` call. A signal with many subscribers will block the main thread until all notifications complete. There is no batching or scheduling for regular signal updates.

**Exception:** `onLoad` and `onAttributeChange` lifecycle actions are deferred via a `BatchQueue` to avoid executing during the initial render pass.

### Re-entrancy During Destruction

If a subscriber's `destroy()` callback triggers another `destroy()` on the same signal (e.g., via circular mapped signals), the re-entrancy guard (`this.destroying`) prevents infinite recursion.

### API Race Conditions

API signals compare request timestamps (`performance.requestStart`) to ensure only the latest response is applied. If an older response arrives after a newer one, it is discarded.

### Formula Cache Integration

Signals do not know about formula caching. The `applyFormula()` function called within `.map()` callbacks checks a per-component `formulaCache`. Cache hits return the same value, which the signal's deep equality check then suppresses from propagating.

---

## Global Debugging

In browser environments, the signal factory and equality function are exposed on `window`:
- `window.signal(value)` — Create a signal from the console
- `window.deepEqual(a, b)` — Test deep equality
- `window.logState()` — Inspect component state (registered separately via debug utilities)

---

## Dependencies

- `fast-deep-equal` — Deep structural equality comparison
- No framework dependencies — the signal system is self-contained

---

## Architectural Characteristics

| Property | Value |
|----------|-------|
| Reactivity model | Push-based (notify on set) |
| Change detection | Deep structural equality |
| Update timing | Synchronous, no batching |
| Memory model | Hierarchical destruction via destroy callbacks |
| Dependency tracking | Explicit via `.subscribe()` and `.map()`, not automatic |
| Thread safety | N/A (single-threaded, main thread only) |
