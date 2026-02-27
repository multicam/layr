# 05 — Signal System

SolidJS-inspired reactive primitive driving all state propagation and DOM updates in Layr. Push-based, synchronous, with deep equality change detection and hierarchical destruction.

**Implementing package:** `packages/core/src/signal/signal.ts`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| `Signal<T>` class with `get/set/update/subscribe/destroy` | MVP |
| `Signal.map()` derived signals | MVP |
| `fast-deep-equal` change detection | MVP |
| Hierarchical destruction cascade | MVP |
| Re-entrancy guard on `destroy()` | MVP |
| `cleanSubscribers()` for editor preview | MVP |
| `createSignal()` factory function | MVP |
| `ComponentData` signal per component instance | MVP |
| Attribute signal (parent → child via `map()`) | MVP |
| Formula cache integration | MVP |
| Batched lifecycle action execution (`BatchQueue`) | MVP |
| API race condition guard (timestamp-based) | MVP |
| `window.signal` / `window.deepEqual` debug exports | MVP |
| Automatic dependency tracking (a la SolidJS) | Deferred |
| Signal scheduling / batching for concurrent updates | Deferred |

---

## TypeScript Types

```typescript
// packages/core/src/signal/signal.ts

import deepEqual from 'fast-deep-equal';

export interface Subscriber<T> {
  notify: (value: T) => void;
  destroy?: () => void;
}

export interface SignalConfig {
  onDestroy?: () => void;
}

export class Signal<T> {
  private value: T;
  private subscribers: Set<Subscriber<T>>;
  private destroying: boolean;
  private config?: SignalConfig;

  constructor(initialValue: T, config?: SignalConfig);
  get(): T;
  set(newValue: T): void;
  update(fn: (value: T) => T): void;
  subscribe(notify: (value: T) => void, config?: { destroy?: () => void }): () => void;
  map<T2>(fn: (value: T) => T2): Signal<T2>;
  destroy(): void;
  cleanSubscribers(): void;
}

export function createSignal<T>(initialValue: T, config?: SignalConfig): Signal<T>;
export function isSignal(value: unknown): value is Signal<unknown>;
```

---

## API

### `createSignal<T>(initialValue, config?): Signal<T>`

Factory function. Creates a new signal with the given initial value.

```typescript
const count = createSignal(0);
const user = createSignal<User | null>(null);
```

### `Signal.get(): T`

Returns current value. Synchronous, no side effects, no dependency tracking.

### `Signal.set(newValue: T): void`

Sets the value and notifies subscribers if changed.

**Behavior:**
1. If `this.destroying` → return immediately (re-entrancy guard)
2. If `this.subscribers.size === 0` → assign value directly, skip equality check (optimization)
3. If `deepEqual(this.value, newValue)` → no-op
4. Otherwise → assign value, then call `subscriber.notify(newValue)` for every subscriber synchronously

**Equality:** Uses `fast-deep-equal`. Two distinct object references with identical structure are equal and will NOT trigger notifications.

### `Signal.update(fn: (current: T) => T): void`

Convenience wrapper: `this.set(fn(this.get()))`.

```typescript
// Immutable variable update pattern used by SetVariable action:
dataSignal.update(data => ({
  ...data,
  Variables: { ...data.Variables, [name]: newValue }
}));
```

### `Signal.subscribe(notify, config?): () => void`

Registers a subscriber. **Immediately invokes `notify` with current value.**

| Parameter | Description |
|-----------|-------------|
| `notify` | Called immediately with current value, then on every subsequent change |
| `config.destroy` | Optional cleanup callback invoked when the signal is destroyed |

Returns an unsubscribe function that removes this subscriber from the set.

**Critical:** The immediate invocation on subscribe is what drives initial DOM rendering — elements are populated synchronously when subscribed, not deferred.

```typescript
// DOM text binding pattern:
const unsubscribe = signal.subscribe(value => {
  elem.textContent = String(value);
}, {
  destroy: () => elem.remove()
});
```

### `Signal.map<T2>(fn: (value: T) => T2): Signal<T2>`

Creates a derived signal that transforms the parent's value.

**Behavior:**
1. Creates a child `Signal<T2>` with `fn(parentValue)` as initial value
2. Subscribes to parent; on parent change: `childSignal.set(fn(newValue))`
3. Registers the parent subscription cleanup in the child's cleanup chain
4. On parent destruction: child's `destroy()` is called via subscriber `destroy` callback

**Lifecycle coupling:** parent destroyed → child destroyed → child's subscribers destroyed → cascade continues down.

```typescript
// Attribute evaluation pattern:
const nameSignal = dataSignal.map(data =>
  applyFormula(nameFormula, { data, ...formulaCtx })
);
nameSignal.subscribe(value => elem.setAttribute('name', String(value)));
```

### `Signal.destroy(): void`

Tears down the signal and all dependents.

**Destruction order:**
1. Check `this.destroying` guard → return if true
2. Set `this.destroying = true`
3. Call `subscriber.destroy?.()` for every subscriber (cascades to derived signals and DOM cleanup)
4. Clear `this.subscribers`
5. Call `this.config?.onDestroy?.()`
6. (Upstream unsubscribe is handled by `map()` — it patches `destroy` to call the unsubscribe function first)

**Re-entrancy protection:** If `destroy()` is called during a subscriber's `destroy` callback, the guard prevents infinite recursion.

### `Signal.cleanSubscribers(): void`

Calls `subscriber.destroy()` on all subscribers and clears the set, but does NOT destroy the signal itself or unsubscribe from parent signals. Used only by the editor preview runtime for re-rendering a component without full teardown.

---

## Change Detection

Uses `fast-deep-equal` for structural comparison.

| Input | Triggers notification? |
|-------|----------------------|
| Primitive with different value | Yes |
| Same primitive value | No |
| Different object reference, same structure | No |
| Different object reference, different structure | Yes |
| Empty array `[]` vs empty array `[]` | No |

**Optimization:** When `subscribers.size === 0`, the equality check is skipped entirely. The value is assigned directly.

**Integration with formula cache:** `applyFormula()` results checked against the signal's deep equality. If a `map()` callback returns the same value (because the formula cache returned the same result), the signal suppresses propagation. This prevents redundant DOM updates when upstream data changes but the derived value does not.

---

## ComponentData Signal

Every component instance has a root `Signal<ComponentData>` that holds all reactive state.

```typescript
interface ComponentData {
  Location?: LocationData;          // URL state — undefined for custom elements
  Attributes: Record<string, unknown>; // Props from parent
  Variables: Record<string, unknown>;  // Internal mutable state
  Apis: Record<string, ApiState>;      // API response states
  Contexts?: Record<string, Record<string, unknown>>; // Context provider values
  Page?: PageData;                  // Page-level metadata
  ListItem?: { Item: unknown; Index: number }; // Current repeat item
}
```

### Signal creation flow

```
1. createSignal<ComponentData>(initialData)   ← component root signal
   initialData.Variables = each variable's initialValue formula evaluated once
   initialData.Apis = { [apiName]: { data: null, isLoading: false, error: null } }

2. parentDataSignal.map(data => evaluateAttributes(data))
   → creates attribute signal
   → subscribes to component data signal, pushing attribute updates

3. dataSignal passed to renderComponent()
   → each node creates derived signals via .map()
```

---

## DOM Update Patterns

All DOM mutations happen inside `.subscribe()` callbacks. The signal system is the only mechanism that drives DOM changes.

| Node type | Pattern |
|-----------|---------|
| Text node | `dataSignal.map(evalTextFormula).subscribe(v => elem.innerText = v)` |
| Element attribute | `dataSignal.map(evalAttrFormula).subscribe(v => elem.setAttribute(name, v))` |
| CSS custom property | `dataSignal.map(evalPropFormula).subscribe(v => sheet.setProperty(name, v))` |
| Conditional (`if`) | `dataSignal.map(evalCondition).subscribe(bool => bool ? renderChild() : destroyChild())` |
| Repeat (`for`) | `dataSignal.map(evalList).subscribe(items => reconcileList(items))` |

### Conditional rendering detail

- **Condition → true:** Create child `dataSignal.map(d => d)` (identity — independent lifecycle), render child nodes, insert into DOM
- **Condition → false:** `childDataSignal.destroy()` (cascades all cleanup), remove elements from DOM
- **On initial render:** Elements created but NOT inserted; the render phase handles initial insertion

### List reconciliation detail

Maintains `Map<key, { dataSignal, cleanup, elements }>`:

- **Existing key:** Reuse signal, call `.update()` with new `ListItem` data
- **New key:** Create child signal, render nodes, insert into DOM
- **Removed key:** Call `cleanup()`, destroy child signal, remove elements
- **Reordering:** `ensureEfficientOrdering()` minimizes DOM operations
- **Duplicate keys:** Falls back to array index with `console.warn`

### Identity map pattern

`dataSignal.map(data => data)` creates a signal that mirrors the parent but can be destroyed independently. Used for:

- Conditional rendering: child lifecycle independent of parent
- List items: each item has its own lifecycle
- Slot content: slotted elements removable without affecting parent

---

## Memory Management

### Hierarchical destruction cascade

```
component data signal destroyed
  → all subscriber destroy() callbacks fire:
    → derived signals (formula, text, attribute) destroyed
      → their subscribers destroyed
        → DOM elements removed
    → AbortController aborted
      → in-flight fetch requests cancelled
      → addEventListener listeners removed
    → custom property subscriptions unregistered
    → API payload signals destroyed
```

### AbortController integration

Each component links its `AbortController` to the data signal:
```typescript
componentDataSignal.subscribe(() => {}, {
  destroy: () => abortController.abort(`Component ${name} unmounted`)
});
```

The abort signal is passed to `fetch()` calls and `addEventListener()` for automatic cleanup.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `set()` called during destruction | Re-entrancy guard (`this.destroying`) returns immediately |
| Subscriber throws during `notify()` | Caught, `console.error`, other subscribers still notified |
| `destroy()` called multiple times | Re-entrancy guard makes it idempotent |
| `map()` callback returns same structure | `deepEqual` suppresses further propagation |
| No subscribers on `set()` | Equality check skipped, value assigned directly |
| Circular derived signal chain | Re-entrancy guard prevents infinite loops in destruction |
| API race condition | API signals compare `performance.requestStart` timestamps; older responses discarded |

---

## Lifecycle Actions and BatchQueue

`onLoad` and `onAttributeChange` lifecycle actions are deferred via a `BatchQueue` to avoid executing during the initial render pass. All other signal notifications are synchronous and unbatched.

There is no general batching or scheduling — a signal with many subscribers blocks the main thread until all notifications complete. [Scheduled updates: Deferred]

---

## Global Debug Exports

In browser environments:
```typescript
window.signal = createSignal;         // Create a signal from the console
window.deepEqual = deepEqual;          // Test deep equality
```

---

## Architectural Properties

| Property | Value |
|----------|-------|
| Reactivity model | Push-based (notify on set) |
| Change detection | Deep structural equality (`fast-deep-equal`) |
| Update timing | Synchronous, no batching |
| Dependency tracking | Explicit via `.subscribe()` / `.map()` — not automatic |
| Memory model | Hierarchical destruction via `destroy` callbacks |
| Thread safety | Single-threaded (main thread only) |
| External dependencies | `fast-deep-equal` only |

---

## Cross-references

- Formula evaluation integrates with signals via `.map()` callbacks: see `03-formula-system.md`
- `SetVariable` action calls `dataSignal.update()`: see `04-action-system.md`
- Component rendering creates signals via `.map()` and `.subscribe()`: see `06-rendering.md`
- `ComponentData` shape and component definition: see `02-component-system.md`
