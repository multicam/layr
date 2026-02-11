# Slot System

## 1. Overview

### Purpose
The slot system enables content projection from parent components into child component placeholders. It allows component authors to define named insertion points with optional fallback content, and consumers to pass content that renders within the child's layout while maintaining the parent's data context.

### Jobs to Be Done
- **Define insertion points** in child components where parent content can be projected
- **Support named slots** so parent content can target specific positions in the child layout
- **Provide fallback content** when no parent content is supplied for a slot
- **Maintain data context** — slotted content accesses parent's variables while gaining access to child's context providers
- **Integrate with Web Components** — emit native `<slot>` elements when rendering as custom elements
- **Work across rendering modes** — consistent slot behavior in CSR, SSR, and editor preview

### Scope
- Slot node definition and configuration
- Parent-side content collection by slot name
- Child-side content rendering and fallback
- Signal lifecycle management for slotted content
- SSR slot rendering
- Web Component (Shadow DOM) slot integration

---

## 2. Data Model

### SlotNodeModel

Defines a slot insertion point in a component's node tree:

```typescript
interface SlotNodeModel {
  type: 'slot'
  slot?: string | null       // Which parent slot THIS node goes into (meta-slot)
  name?: string | null       // Name of this slot (what parents reference)
  condition?: Formula | null // Show/hide condition (child's scope)
  repeat?: never | null      // Slots cannot be repeated
  repeatKey?: never | null   // Slots cannot have repeat keys
  children: string[]         // Fallback content node IDs
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `name` | `"default"` | Identifier parents use to target this slot. `null`/`undefined` resolves to `"default"` |
| `slot` | `"default"` | If this slot node is itself inside another component's slot |
| `condition` | none | Formula evaluated in child component's scope; controls whether slot renders |
| `repeat` | prohibited | Slots cannot be repeated (type constraint: `never`) |
| `children` | `[]` | Node IDs for fallback content, rendered when parent provides nothing |

### Slot Assignment on Nodes

Any node (text, element, component) can specify which slot it targets:

```typescript
// On TextNodeModel, ElementNodeModel, ComponentNodeModel:
slot?: string | null  // Which slot to render this node into
```

`null`/`undefined` resolves to `"default"`.

### ComponentChild

Intermediate structure created by parent when organizing content for a child component:

```typescript
interface ComponentChild {
  dataSignal: Signal<ComponentData>  // Parent's data signal
  id: string                         // Node ID in parent's nodes object
  path: string                       // Full path including slot name
  ctx: ComponentContext              // Parent's context
}
```

---

## 3. Slot Resolution Flow

### Phase 1: Parent Collects Children by Slot

When a parent component renders a child component, it iterates through the child component node's children and groups them by their `slot` property:

```
For each child node ID in component node:
  1. Look up node definition in parent's nodes
  2. Read node.slot (default: "default")
  3. Push ComponentChild { id, path, dataSignal, ctx } into children[slotName]
```

The resulting structure is `Record<string, Array<ComponentChild>>`:
```
{
  "default": [child1, child2],
  "header": [child3],
  "footer": [child4, child5]
}
```

**Path format:** `${parentPath}.${childIndex}[${slotName}]` — includes slot name for debugging.

**Context:** Each child entry preserves the parent's `dataSignal` and `ctx`, with the package name potentially overridden by the component node's `package` property.

### Phase 2: Child Component Receives Children Map

The children map is stored in the child component's `ComponentContext.children` and becomes accessible to all slot nodes within the child.

### Phase 3: Slot Node Renders Content

When a slot node renders, it checks for provided content:

**Content provided (`ctx.children[slotName]` exists):**
1. For each `ComponentChild` entry:
   - Create a derived signal: `child.dataSignal.map(data => data)` — mirrors parent's data
   - Register cleanup: subscribe to child's `dataSignal` with a destroy callback that cleans up the derived signal
   - Call `createNode()` with the derived signal and a merged context
2. Return all rendered DOM elements

**No content provided:**
1. Render the slot's `children` array (fallback content) using the child component's own `dataSignal` and `ctx`
2. Return rendered DOM elements

### Phase 4: Web Component Mode

When `env.runtime === 'custom-element'` AND the component is the root component:
1. Create a native `<slot>` element
2. Set `name` attribute to the slot name
3. Wrap all rendered content inside the `<slot>` element
4. Return the `<slot>` element (enables browser-native content projection in Shadow DOM)

---

## 4. Context Merging

### The Hybrid Context Rule

Slotted content receives a merged context:

```typescript
ctx: {
  ...child.ctx,           // Parent's context (component, formulas, package)
  providers: ctx.providers // Child's context providers
}
```

This means:
- **Data scope:** Parent's — formulas in slotted content evaluate against parent's Variables, Attributes, APIs
- **Context providers:** Child's — slotted content can consume context exposed by the child component

### Practical Implications

| What slotted content CAN access | Source |
|--------------------------------|--------|
| Parent's Variables | Parent's `dataSignal` |
| Parent's Attributes | Parent's `dataSignal` |
| Parent's APIs | Parent's `dataSignal` |
| Parent's URL parameters | Parent's `dataSignal` |
| Child's context providers | Child's `ctx.providers` |

| What slotted content CANNOT access | Reason |
|------------------------------------|--------|
| Child's Variables | Different `dataSignal` scope |
| Child's Attributes | Different `dataSignal` scope |
| Child's APIs | Different `dataSignal` scope |

### Example

```
Parent Component (Variables: { count: 5 })
  └─ Child Component (Variables: { multiplier: 2 }, Context: { doubled })
      └─ <slot name="default" />

Slotted content:
  - Can read Parent.Variables.count (= 5)
  - Can read Child.Context.doubled (via providers)
  - Cannot read Child.Variables.multiplier
```

---

## 5. Signal Lifecycle

### Derived Signal Creation

For each slotted child, a derived signal is created:

```typescript
const childDataSignal = child.dataSignal.map((data) => data)
```

This creates a reactive subscription to the parent's data signal. When parent data changes, the derived signal automatically updates, triggering re-evaluation of formulas in the slotted content.

### Cleanup Registration

```typescript
dataSignal.subscribe((data) => data, {
  destroy: () => childDataSignal.destroy(),
})
```

The child component's `dataSignal` (the slot's owning component) subscribes with a destroy callback. When the child component unmounts and its signal is destroyed, all derived signals for slotted content are cleaned up, preventing memory leaks.

### Reactivity Chain

```
Parent data change
  → Parent's dataSignal.set()
  → Derived childDataSignal auto-updates (via .map())
  → Slotted content formulas re-evaluate
  → DOM updates
```

---

## 6. SSR Rendering

In server-side rendering, slots work with pre-rendered HTML strings instead of reactive signals:

### Parent Collects HTML by Slot

```typescript
const children: Record<string, string> = {}
childNodes.forEach((childNode, i) => {
  const slotName = component.nodes?.[childNodeId]?.slot ?? 'default'
  children[slotName] = `${children[slotName] ?? ''}${childNode}`
})
```

Children are rendered to HTML strings and concatenated by slot name.

### Slot Renders Content or Fallback

```typescript
case 'slot': {
  const defaultChild = children?.[node.name ?? 'default']
  if (defaultChild) {
    return defaultChild  // Return pre-rendered HTML
  } else {
    // Render fallback nodes to HTML
    return (await Promise.all(node.children.map(renderNode))).join('')
  }
}
```

No signal management needed — everything is rendered once to static HTML.

---

## 7. Slot Conditions

### Conditional Slot Visibility

Slot nodes support a `condition` formula:

```typescript
condition?: Formula | null
```

- Evaluated in the **child component's scope** (child's `dataSignal`)
- When `false`, the entire slot (including provided content and fallback) is not rendered
- Conditional rendering wraps the slot in the standard `conditional()` handler, which creates/destroys content reactively

### Important Distinction

| Condition type | Evaluated in | Controls |
|---------------|-------------|----------|
| Slot's `condition` | Child's scope | Whether the slot renders at all |
| Slotted content's `condition` | Parent's scope | Whether individual content items render |

Both can coexist independently. A slot condition can hide the entire slot while individual slotted items can be conditionally hidden by the parent.

---

## 8. Slot Constraints

### No Repeat on Slots

Slots cannot be repeated (`repeat: never`). This is enforced at the type level.

**Rationale:** A slot is a named insertion point, not a data-driven element. Repeating slots would create ambiguous content projection targets.

### Content CAN Be Repeated

Content passed to slots can have `repeat` formulas:

```
Parent node with slot="items" and repeat=[array formula]
  → Expands to multiple ComponentChild entries
  → All collected in children["items"] array
  → Rendered in order by the slot
```

### Static Slot Assignment

The `slot` property on nodes is a static string, not a formula. Slot assignment cannot be computed dynamically.

---

## 9. Named Slots vs Default Slot

### Default Slot

- Slot with `name: null` or `name: undefined` resolves to `"default"`
- Content with `slot: null` or `slot: undefined` resolves to `"default"`
- If a component has a single unnamed slot, all unassigned content goes there

### Named Slots

- Slot with `name: "header"` receives only content with `slot: "header"`
- Multiple named slots can coexist in a component
- Each slot independently resolves provided content vs fallback

### Multiple Children in Same Slot

Multiple content items targeting the same slot are collected into an array and rendered in order via `flatMap()`.

---

## 10. Missing Content Behavior

| Scenario | CSR Behavior | SSR Behavior |
|----------|-------------|-------------|
| Content provided | Render provided content with parent data | Return pre-rendered HTML string |
| No content, fallback defined | Render fallback with child data | Render fallback nodes to HTML |
| No content, no fallback | Render nothing (empty array) | Return empty string |

### Fallback Scope

Fallback content uses the **child component's** scope (dataSignal, ctx), not the parent's. This is the inverse of provided content, which uses the parent's scope.

---

## 11. Web Component Integration

When rendering as a custom element (`env.runtime === 'custom-element'` and `isRootComponent === true`):

1. A native `<slot>` HTML element is created
2. The `name` attribute is set to the slot name
3. All rendered children (provided or fallback) are placed inside the `<slot>` element
4. The browser's Shadow DOM handles content projection

This enables Layr components exported as Web Components to accept slotted content from external HTML:

```html
<my-component>
  <div slot="header">External header content</div>
  <p>Default slot content</p>
</my-component>
```

---

## 12. Edge Cases

### Slot Inside a Slot

A slot node can itself have a `slot` property, allowing it to be placed inside another component's slot. This creates nested content projection but is handled by the standard slot resolution flow — the outer slot resolves first, then the inner slot resolves within the rendered context.

### Namespace Propagation

SVG and MathML namespaces propagate through slot boundaries. Both provided content and fallback content respect the `namespace` parameter, ensuring proper element creation in non-HTML contexts.

### Package Resolution

Slotted content inherits the parent's package context. The child component can override the package for its own nodes via the component node's `package` property, but this doesn't affect slotted content from the parent.

### Empty Slot with Condition

If a slot has a `condition` that evaluates to `false`, neither provided content nor fallback content is rendered. The condition is evaluated before any slot resolution logic runs.

---

## 13. External Dependencies

| Dependency | Usage |
|------------|-------|
| `Signal<T>` | Reactive data flow from parent to slotted content |
| `Signal.map()` | Creates derived signals for slotted content |
| `Signal.subscribe()` | Registers cleanup callbacks for signal lifecycle |
| `createNode()` | Renders both provided and fallback content |
| `conditional()` | Handles slot condition formulas |
| Shadow DOM `<slot>` | Native content projection for Web Components |
