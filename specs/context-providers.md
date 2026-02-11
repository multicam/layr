# Context Provider System Specification

## Purpose

The Context Provider System enables ancestor-to-descendant data sharing and cross-component workflow invocation without explicit prop drilling. Components expose formulas and workflows via `exposeInContext`, and descendant components subscribe to these values reactively. The system operates differently across runtime modes: reactive signals in CSR/custom elements, static evaluation in SSR, and test data fallback in editor preview.

### Jobs to Be Done

- Allow components to share computed state (formulas) with arbitrary descendants
- Enable descendants to trigger workflows defined on ancestor components
- Support reactive propagation — provider formula changes automatically update all consumers
- Provide test/preview mode where components can be tested in isolation without a real provider
- Work across SSR (static evaluation) and CSR (reactive signals) rendering modes

---

## Data Models

### ComponentContext (Consumer Declaration)

Declared on a consuming component to specify which provider formulas and workflows it needs.

| Field | Type | Description |
|-------|------|-------------|
| `formulas` | `string[]` | Names of formulas to subscribe to from the provider |
| `workflows` | `string[]` | Names of workflows available for `TriggerWorkflow` actions |
| `componentName` | `string?` | Provider component name |
| `package` | `string?` | Provider package name |

**Location:** `component.contexts` — a record keyed by provider name.

### Provider Registry Entry (Runtime)

Stored in `ctx.providers` during CSR/custom element rendering.

| Field | Type | Description |
|-------|------|-------------|
| `component` | `Component` | The provider component definition |
| `formulaDataSignals` | `Record<string, Signal<unknown>>` | Reactive signals for each exposed formula |
| `ctx` | `ComponentContext` | Full component context (data signal, APIs, abort signal, etc.) |

**Key format:** `packageName/componentName` or just `componentName` for local components.

### ComponentData.Contexts

The consumer accesses context values through its component data signal:

```
data.Contexts = {
  [providerName]: {
    [formulaName]: evaluatedValue,
    ...
  },
  ...
}
```

---

## Provider Detection

A component becomes a context provider when any of its formulas or workflows has `exposeInContext: true`:

```
isContextProvider(component) =
  any formula has exposeInContext === true
  OR any workflow has exposeInContext === true
```

Both `ComponentFormula.exposeInContext` and `ComponentWorkflow.exposeInContext` are optional boolean fields (default `false`/`undefined`).

---

## Runtime Behavior (CSR / Custom Elements)

### Provider Registration

When a component is identified as a provider during `createComponent()`:

1. **Filter** all formulas where `exposeInContext === true`
2. **Create derived signals** for each exposed formula: `componentDataSignal.map(data => applyFormula(formula, { data, ... }))`
3. **Register** in the `providers` object with key `componentName` (package-qualified if applicable)
4. **Store** the full `ComponentContext` alongside the signals for workflow access

The provider entry is passed down through the component tree via the rendering context — descendants receive it in their `ctx.providers`.

### Consumer Subscription

When a component declares `contexts`, during `subscribeToContext()`:

1. **Look up** the provider using package-qualified name: `[ctx.package, providerName].filter(isDefined).join('/')`
2. **For each requested formula:**
   - Find the corresponding signal in `provider.formulaDataSignals[formulaName]`
   - Subscribe to the signal
   - On every value change, update the consumer's `componentDataSignal.Contexts[providerName][formulaName]`
3. **If formula not found:** Log warning with available formula names (does not throw)

**Reactivity chain:**
```
Provider state changes
  → Provider data signal updates
  → Exposed formula derived signal recalculates
  → Deep equality check (fast-deep-equal)
  → If changed, consumer's subscription fires
  → Consumer data signal updated at Contexts path
  → Consumer's own derived signals recalculate
  → Consumer DOM updates
```

### Workflow Invocation

Workflows exposed via context are NOT subscribed to as signals. Instead, they are invoked through `TriggerWorkflow` actions with a `contextProvider` field:

1. **Action references provider:** `action.contextProvider = 'ProviderComponent'`
2. **Lookup:** Provider found in `ctx.providers` using same package-qualified resolution
3. **Workflow found** on `provider.component.workflows[action.workflow]`
4. **Execution context:** Workflow actions execute with the **provider's** `ComponentContext` (provider's data signal, APIs, etc.)
5. **Parameters:** Evaluated in the **consumer's** context and passed as `data.Parameters`
6. **Callbacks:** Callback actions execute back in the **consumer's** context with `data.Event` set to the callback data

This bidirectional execution model means:
- Workflow side effects (e.g., setting variables) affect the **provider**
- Callback side effects affect the **consumer**

---

## SSR Behavior

During server-side rendering, there are no signals. Context is resolved through static formula evaluation:

### Provider Formula Evaluation

1. Parent component evaluates all exposed formulas once via `applyFormula()`
2. Results stored in a `contexts` object keyed by component name

### Consumer Context Propagation

1. Child component receives `data.Contexts` containing pre-evaluated provider values
2. Values are passed through the render tree as plain data
3. No reactivity — formulas evaluated once per render pass

### Nested Providers

Child components that are themselves providers evaluate their exposed formulas with access to ancestor contexts in `data.Contexts`.

---

## Preview Mode Behavior

When a consumer is rendered in editor preview without a real provider ancestor:

1. **Detection:** No matching provider in `ctx.providers`, `ctx.env.runtime === 'preview'`, and `ctx.toddle._preview` is set
2. **Provider lookup:** Finds the provider component definition from `ctx.components` array
3. **Synthetic context:** Builds a `FormulaContext` using test data:
   - `Attributes`: from `provider.attributes[name].testValue`
   - `Variables`: from evaluating `variable.initialValue` formulas with test attributes
   - URL parameters: from route test values
4. **Formula evaluation:** Each requested formula evaluated once (not reactive) with the synthetic context
5. **Result:** Consumer's `Contexts` updated once with evaluated values

**Limitation:** Preview mode context is not reactive. Changes to the provider's test data require re-rendering.

---

## Provider Lookup Rules

Provider resolution follows these rules in order:

1. **Package-qualified:** `[currentPackage, providerName].filter(isDefined).join('/')` — e.g., `myPackage/AuthProvider`
2. **Fallback (workflows only):** For `TriggerWorkflow` actions, also tries unqualified `providerName` — e.g., `AuthProvider`
3. **Local components:** If no package context, just `providerName`

This means a component from package `A` looking for provider `AuthProvider` will:
- First try `A/AuthProvider`
- Then try `AuthProvider` (only for workflow triggers)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Consumer requests formula not exposed by provider | `console.warn` with available formula names listed |
| Consumer references non-existent provider | No error in production; `console.error` in preview mode |
| Provider workflow not found | `console.warn` if provider exists but workflow missing |
| Provider component not found in preview | `console.error` with component name |

No errors are thrown — all failures are logged to console and the consuming component renders with `undefined`/`null` context values.

---

## Business Rules

1. **Formulas only in Contexts data:** Only exposed formulas appear in `ComponentData.Contexts`. Workflows are accessed via actions, not data paths.
2. **Provider registration is inherited:** Child components see all ancestor providers accumulated in `ctx.providers`.
3. **Last provider wins:** If multiple ancestors expose the same component name, the nearest ancestor's registration is used (due to object spread order).
4. **Package scoping:** Components from different packages can have identically named providers — package prefix prevents collision.
5. **No circular contexts:** A component cannot be both provider and consumer of the same context. (Enforced implicitly — provider registers after rendering, but consumes during initialization.)

---

## Edge Cases

### Multiple Consumers of Same Provider

Multiple descendant components can subscribe to the same provider. Each gets its own subscription to the provider's formula signal. Changes propagate to all consumers independently.

### Provider Re-rendering

If a provider component is conditionally rendered (toggled off and on), its signal is destroyed and recreated. Consumers subscribed to the old signal receive `destroy()` callbacks. New consumers subscribe to new signals when the provider re-renders.

### Context with Custom Elements

Custom elements (`ToddleComponent`) support context providers. The provider is registered during `connectedCallback()` with formula signals derived from the component data signal. However, custom elements cannot consume context from outside their shadow DOM boundary — they are always root components.

### Empty Contexts

If a component declares `contexts` but no matching provider exists (and not in preview mode), the `Contexts` field in `ComponentData` remains empty (`{}`). Formulas referencing context values resolve to `undefined`.

---

## Dependencies

- **Signal System** — Provider formulas are exposed as derived signals
- **Formula System** — `applyFormula()` evaluates exposed formulas
- **Action System** — `TriggerWorkflow` action type handles cross-component workflow invocation
- **Component System** — Provider/consumer relationships defined in component data model
