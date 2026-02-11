# Workflow System

## 1. Overview

### Purpose
The workflow system provides reusable, parameterized action sequences that can be triggered from any action pipeline within a component. Workflows support input parameters, bidirectional communication via callbacks, and can be exposed to descendant components through context providers.

### Jobs to Be Done
- **Define reusable action sequences** that can be invoked from multiple event handlers or other workflows
- **Accept parameters** evaluated as formulas at the call site, providing dynamic inputs
- **Support callbacks** allowing workflows to emit events back to the caller (e.g., onSuccess, onError)
- **Expose workflows via context** so descendant components can trigger ancestor workflows without prop drilling
- **Execute in the correct scope** — local workflows run in the component's own context; context workflows run in the provider's context with callbacks in the caller's context

### Scope
- Workflow definition and data model
- Parameter evaluation and data context injection
- Callback mechanism (TriggerWorkflowCallback action)
- Context provider integration
- Scope rules for workflow execution vs callback execution

---

## 2. Data Model

### ComponentWorkflow

```typescript
interface ComponentWorkflow {
  name: string
  parameters: Array<{ name: string; testValue: any }>
  callbacks?: Array<{ name: string; testValue: any }> | null
  actions: ActionModel[]
  exposeInContext?: boolean | null
  testValue?: unknown | null
}
```

| Field | Description |
|-------|-------------|
| `name` | Workflow identifier (unique within component) |
| `parameters` | Named inputs with test values for editor preview |
| `callbacks` | Named callback events the workflow can trigger (optional) |
| `actions` | Sequential action pipeline executed when workflow runs |
| `exposeInContext` | If `true`, workflow is accessible to descendant components via context |
| `testValue` | Test data for editor preview |

### WorkflowActionModel (TriggerWorkflow)

```typescript
interface WorkflowActionModel {
  type: 'TriggerWorkflow'
  workflow: string
  parameters: Record<string, { formula?: Formula | null }>
  callbacks?: Record<string, { actions?: ActionModel[] | null }> | null
  contextProvider?: string | null
}
```

| Field | Description |
|-------|-------------|
| `workflow` | Name of the workflow to execute |
| `parameters` | Map of parameter names to formulas (evaluated at trigger time) |
| `callbacks` | Map of callback names to action pipelines (executed when workflow calls back) |
| `contextProvider` | If set, look up workflow from a named context provider instead of local component |

### WorkflowCallbackActionModel (TriggerWorkflowCallback)

```typescript
interface WorkflowCallbackActionModel {
  type: 'TriggerWorkflowCallback'
  event: string
  data?: Formula | null
}
```

| Field | Description |
|-------|-------------|
| `event` | Callback name (must match a name defined in the workflow's `callbacks` array) |
| `data` | Formula evaluated in the workflow's data context; result passed as payload to the callback |

---

## 3. Execution Flow

### Local Workflow

When `TriggerWorkflow` has no `contextProvider`:

```
1. Look up workflow in ctx.component.workflows[action.workflow]
2. If not found → console.warn, return
3. Evaluate parameters:
   For each parameter in action.parameters:
     applyFormula(parameter.formula, callerContext)
4. Execute workflow.actions sequentially:
   handleAction(action, {
     ...callerData,
     ...componentSignal.get(),
     Parameters: evaluatedParameters
   }, ctx, event, callbackHandler)
5. If workflow calls TriggerWorkflowCallback(name, payload):
   → Look up action.callbacks[name]
   → Execute callback actions in caller's context
   → Callback data available as Event
```

### Context Provider Workflow

When `TriggerWorkflow` has a `contextProvider`:

```
1. Resolve provider:
   ctx.providers[package/contextProvider] ?? ctx.providers[contextProvider]
2. Look up workflow in provider.component.workflows[action.workflow]
3. If not found → console.warn, return
4. Evaluate parameters (same as local)
5. Execute workflow.actions in PROVIDER's context:
   handleAction(action, {
     ...callerData,
     ...provider.ctx.dataSignal.get(),
     Parameters: evaluatedParameters
   }, provider.ctx, event, callbackHandler)
6. Callbacks still execute in CALLER's context (same as local)
```

### Key Scope Rule

| Execution phase | Context used |
|----------------|--------------|
| Parameter evaluation | Caller's context |
| Workflow actions | Workflow owner's context (local or provider) |
| Callback actions | Caller's context |

This means a context provider workflow can modify the provider's state (set its variables, trigger its APIs), while callbacks modify the caller's state.

---

## 4. Parameter System

### Definition

Parameters are defined as an array of `{ name, testValue }` pairs:

```typescript
parameters: [
  { name: 'userId', testValue: '123' },
  { name: 'action', testValue: 'delete' }
]
```

### Evaluation

At trigger time, each parameter is evaluated as a formula in the caller's data context:

```typescript
const parameters = mapValues(action.parameters ?? {}, (parameter) =>
  applyFormula(parameter.formula, {
    data: callerData,
    component: callerComponent,
    formulaCache,
    root,
    package: callerPackage,
    toddle,
    env,
  })
)
```

### Injection

Evaluated parameters are merged into the workflow's data context as `Parameters`:

```typescript
handleAction(workflowAction, {
  ...existingData,
  Parameters: evaluatedParameters
}, ctx)
```

Workflow actions access parameters via `Parameters.userId`, `Parameters.action`, etc.

---

## 5. Callback System

### Definition

Callbacks are defined on the workflow as named events:

```typescript
callbacks: [
  { name: 'onSuccess', testValue: { id: '123' } },
  { name: 'onError', testValue: { message: 'Failed' } }
]
```

### Triggering (Inside Workflow)

Within a workflow's action pipeline, the `TriggerWorkflowCallback` action invokes a callback:

```typescript
{
  type: 'TriggerWorkflowCallback',
  event: 'onSuccess',
  data: { type: 'path', path: ['Apis', 'createUser', 'data'] }
}
```

The `data` formula is evaluated in the workflow's data context, and the result is passed as the callback payload.

### Handling (At Call Site)

The caller defines action pipelines for each callback:

```typescript
{
  type: 'TriggerWorkflow',
  workflow: 'createUser',
  parameters: { ... },
  callbacks: {
    onSuccess: {
      actions: [
        { type: 'SetVariable', variable: 'lastUser', data: { type: 'path', path: ['Event'] } }
      ]
    },
    onError: {
      actions: [
        { type: 'TriggerEvent', event: 'showError' }
      ]
    }
  }
}
```

### Callback Data Context

Callback actions execute with:

```typescript
{
  ...callerData,
  ...callerSignal.get(),
  Parameters: originalParameters,  // Same parameters passed to workflow
  Event: callbackPayload           // Data from TriggerWorkflowCallback
}
```

### No-Op for Missing Callbacks

If a workflow calls `TriggerWorkflowCallback` and the caller didn't provide a matching callback, the call is silently ignored (`workflowCallback?.()` with optional chaining).

---

## 6. Context Provider Integration

### Making Workflows Available

A component's workflows become available to descendants when `exposeInContext: true` is set on individual workflows. The component is automatically detected as a context provider if any of its workflows or formulas have this flag.

### Detection

```typescript
function isContextProvider(component: Component): boolean {
  // Returns true if any formula or workflow has exposeInContext === true
}
```

### Provider Registration

During component creation, if a component is a context provider, it registers itself in the providers map:

```typescript
providers[component.name] = {
  component,
  formulaDataSignals,
  ctx: { ...ctx, component, dataSignal, ... }
}
```

This providers map is passed down through the component tree.

### Provider Resolution

When triggering a context workflow:

```typescript
const provider =
  ctx.providers[[ctx.package, action.contextProvider].filter(isDefined).join('/')]
  ?? ctx.providers[action.contextProvider]
```

1. First tries package-scoped lookup: `"packageName/componentName"`
2. Falls back to direct name lookup: `"componentName"`

---

## 7. Error Handling

| Error | Behavior |
|-------|----------|
| Workflow not found (local) | `console.warn('Workflow [name] does not exist on component [component]')`, early return |
| Workflow not found (context) | `console.warn('Cannot find workflow "[name]" on component "[name]". It has likely been removed or modified.')`, early return |
| Provider not found | Workflow lookup returns `undefined`, warning logged |
| Callback not found | Silently ignored (optional chaining on callback function) |
| Action error within workflow | Handled by top-level `handleAction()` try-catch (logged, returns null) |

---

## 8. Validation Schema

```typescript
ComponentWorkflowSchema = z.object({
  name: z.string(),
  parameters: z.array(
    z.object({
      name: z.string(),
      testValue: z.any(),
    })
  ),
  actions: z.array(ActionModelSchema),
  exposeInContext: z.boolean().nullish(),
})
```

### Constraints

- Workflow names must be strings (unique within a component by convention)
- Parameters must have string names and can have any test value type
- Actions follow the standard `ActionModel` schema (all action types supported)
- `exposeInContext` defaults to `false`/`null` (not exposed)

---

## 9. Relationship to Other Systems

### Action System
Workflows are triggered via the `TriggerWorkflow` action type, which is one of the standard action types handled by `handleAction()`. Workflow actions execute within the same action pipeline infrastructure.

### Context Providers
Workflows with `exposeInContext: true` make the component a context provider. This integrates with the same provider system used for exposing formulas to descendants.

### Event System
Workflow callbacks use the `Event` data path, consistent with how DOM events and component events expose their payloads. The `TriggerWorkflowCallback` action works like a custom event emission.

### Editor Preview
Test values on parameters and callbacks enable the editor to preview workflows with mock data. The `testValue` field on the workflow itself provides a mock return value.

---

## 10. Edge Cases

### Recursive Workflows
A workflow can trigger itself via `TriggerWorkflow`. No recursion guard exists — this will cause a `RangeError` (maximum call stack exceeded), which is caught by the editor preview and displayed as a panic screen with the "Infinite loop detected" message.

### Workflows in Repeated Elements
When a component is rendered inside a `repeat` (list), each instance has its own data signal. Triggering a workflow from a repeated item executes in that specific instance's context.

### Nested Callback Chains
A callback action can itself trigger another workflow, which can trigger its own callbacks. The callback handler is passed through the `workflowCallback` parameter of `handleAction()`, allowing nested workflow invocations.

### Context Provider Workflow Modifying Provider State
When a descendant triggers a context provider's workflow, the workflow actions execute in the provider's context. If the workflow calls `SetVariable`, it modifies the provider's variables, not the caller's. This is the intended behavior for shared state management patterns.

---

## 11. External Dependencies

| Dependency | Usage |
|------------|-------|
| `handleAction()` | Executes workflow actions sequentially |
| `applyFormula()` | Evaluates parameter and callback data formulas |
| `mapValues()` | Transforms parameter map from formulas to values |
| Context provider system | Resolves ancestor workflow providers |
| Signal system | Reads current component data via `dataSignal.get()` |
