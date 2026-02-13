# Custom Code & Tree-Shaking System Specification

## Purpose

The Custom Code system bridges user-written JavaScript (actions and formulas) with the Layr runtime. It provides reference collection, tree-shaking, and code generation so that only the custom code actually used by a given page/component is included in the production bundle. This system operates at SSR build time to produce self-contained JavaScript modules.

### Jobs to Be Done

- Collect all custom action and formula references reachable from an entry component
- Tree-shake unused custom code to minimize bundle size
- Generate self-contained TypeScript/JavaScript modules that export actions and formulas
- Support modern (v2) code format
- Handle package-scoped code (code from installed packages vs project-level code)
- Provide a fallback that includes all code when no entry component is specified

---

## Architecture

### Key Files

| File | Package | Responsibility |
|------|---------|----------------|
| `packages/ssr/src/custom-code/codeRefs.ts` | `@layr/ssr` | Reference collection, tree-shaking, code generation |
| `packages/core/src/component/ToddleComponent.ts` | `@layr/core` | Component traversal for formula and action references |
| `packages/core/src/component/actionUtils.ts` | `@layr/core` | Recursive action tree traversal |
| `packages/core/src/formula/formulaUtils.ts` | `@layr/core` | Recursive formula tree traversal |
| `packages/core/src/utils/handlerUtils.ts` | `@layr/core` | Safe function name sanitization |
| `packages/core/src/types.ts` | `@layr/core` | Plugin action/formula type definitions |
| `packages/core/src/formula/formulaTypes.ts` | `@layr/core` | Formula type definitions (ToddleFormula, CodeFormula) |

### Data Flow

```
Entry Component
      │
      ▼
ToddleComponent.formulaReferences  ──► Set<string> of formula keys
ToddleComponent.actionReferences   ──► Set<string> of action keys
      │
      ├── Traverse all nodes (element, component, text, slot)
      ├── Traverse all workflows and their actions
      ├── Traverse all API definitions (onCompleted, onFailed, onMessage)
      ├── Traverse onLoad and onAttributeChange lifecycle events
      ├── Traverse route info formulas (title, description, icon, etc.)
      │
      ▼
uniqueSubComponents (recursive)
      │
      ├── Each sub-component's formulaReferences (prefixed with packageName/)
      └── Each sub-component's actionReferences (prefixed with packageName/)
      │
      ▼
takeReferencedFormulasAndActions()
      │
      ├── Filter project-level actions/formulas by reference set
      ├── Filter per-package actions/formulas by reference set
      └── Only include packages that have at least one referenced item
      │
      ▼
generateCustomCodeFile()
      │
      ├── V2 actions: structured export with argument metadata + handler wrapper
      ├── V2 formulas (code): structured export with handler wrapper
      └── V2 formulas (toddle): structured export with formula JSON (no handler)
```

---

## Data Models

### PluginFormula (Custom Formula)

A union type representing user-defined formulas:

#### ToddleFormula (declarative)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Formula identifier |
| `description` | `string?` | Human-readable description |
| `arguments` | `Array<{ name, formula?, testValue? }>` | Named arguments with optional defaults |
| `exported` | `boolean?` | Whether exported in a package |
| `variableArguments` | `boolean?` | Accepts variable number of arguments |
| `formula` | `Formula` | Declarative formula AST (evaluated by the formula engine) |

#### CodeFormula (imperative)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Formula identifier |
| `description` | `string?` | Human-readable description |
| `arguments` | `Array<{ name, formula?, testValue? }>` | Named arguments |
| `exported` | `boolean?` | Whether exported in a package |
| `variableArguments` | `boolean?` | Accepts variable number of arguments |
| `version` | `2?` | Version discriminator (v2 = modern, undefined = legacy) |
| `handler` | `string \| Function` | JavaScript code string (SSR) or compiled function (runtime) |

### PluginAction (Custom Action)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Action identifier |
| `version` | `2` | Version discriminator |
| `description` | `string?` | Human-readable description |
| `arguments` | `Array<{ name, formula }>?` | Named arguments |
| `events` | `Record<string, { dummyEvent? }>?` | Events the action can emit |
| `variableArguments` | `boolean?` | Accepts variable arguments |
| `exported` | `boolean?` | Whether exported in a package |
| `handler` | `ActionHandlerV2` | `(args, ctx, event?) => void \| cleanup` |

### Handler Signatures

#### ActionHandlerV2

```typescript
(args: Record<string, unknown>, ctx: { triggerActionEvent, root }, event?) =>
  void | (() => void) | Promise<void> | Promise<() => void>
```

- `args`: Named argument values evaluated from formulas
- `ctx.triggerActionEvent(trigger, data, event?)`: Emit an event that parent actions can handle
- `ctx.root`: `Document | ShadowRoot` — the DOM root
- Return value: optional cleanup function (or Promise thereof), called on component unmount

#### FormulaHandlerV2

```typescript
(args: Record<string, unknown>, ctx: { root, env }) => R | null
```

- `args`: Named argument values
- `ctx.root`: `Document | ShadowRoot`
- `ctx.env`: Environment variables

### ProjectFiles

The project file structure that feeds into the custom code system:

| Field | Type | Description |
|-------|------|-------------|
| `components` | `Partial<Record<string, Component>>` | All project components |
| `actions` | `Record<string, PluginAction>?` | Project-level custom actions |
| `formulas` | `Record<string, PluginFormula<string>>>?` | Project-level custom formulas |
| `packages` | `Partial<Record<string, InstalledPackage>>?` | Installed packages with their own actions/formulas/components |

---

## Reference Collection Algorithm

### Formula References (`ToddleComponent.formulaReferences`)

The `formulasInComponent()` generator traverses every location where a formula can appear:

1. **Route info**: `language`, `title`, `description`, `icon`, `charset`, and all `meta` entries (content + attrs)
2. **Component formulas**: Each formula's `formula` field
3. **Variables**: Each variable's `initialValue`
4. **Workflows**: All actions in each workflow
5. **APIs**: All formulas within each API (delegated to `ToddleApiV2.formulasInApi()` or `LegacyToddleApi`)
6. **Lifecycle events**: `onLoad` and `onAttributeChange` action lists
7. **Nodes** (per node type):
   - **Text**: `value`, `condition`, `repeat`, `repeatKey`
   - **Slot**: `condition`
   - **Element**: `condition`, `repeat`, `repeatKey`, all `attrs`, all event actions, all `classes` formulas, all `style-variables`, all `customProperties`, all variant `customProperties`
   - **Component**: `condition`, `repeat`, `repeatKey`, all `attrs`, all event actions, all `customProperties`, all variant `customProperties`

A formula reference is any `FunctionOperation` (type: `'function'`). The reference key is the formula name, optionally prefixed with `packageName/` for package formulas.

### Action References (`ToddleComponent.actionReferences`)

The `actionModelsInComponent()` generator traverses:

1. **Workflows**: All actions in each workflow
2. **APIs**: All actions in API callbacks (onCompleted, onFailed, onMessage) — v2 APIs delegate to `ToddleApiV2.actionModelsInApi()`; legacy APIs traverse onCompleted/onFailed directly
3. **Lifecycle events**: `onLoad` and `onAttributeChange`
4. **Nodes**: All event handlers on element and component nodes

The recursive `getActionsInAction()` utility walks nested action trees:
- `Switch`: recurses into case actions and default actions
- `Fetch`: recurses into onSuccess, onError, onMessage actions
- `Custom`/undefined: recurses into event actions
- All others (`SetVariable`, `TriggerEvent`, `SetURLParameter`, `SetURLParameters`, `TriggerWorkflow`, `TriggerWorkflowCallback`, `AbortFetch`): leaf nodes, no recursion

An action reference is any `CustomActionModel` (type: `'Custom'` or `undefined`). The reference key is `packageName/actionName` or just `actionName`.

### Sub-Component Traversal

`uniqueSubComponents` recursively discovers all component nodes in the tree:

1. Visit every node in the entry component
2. For `type: 'component'` nodes, look up the component definition via `getComponent(name, packageName)`
3. Track visited components by name to avoid duplicates
4. Recursively visit all nodes in the sub-component's tree
5. Return a flat list of `ToddleComponent` instances, each with their own `packageName`

Each sub-component's `formulaReferences` and `actionReferences` are collected and merged with the entry component's references, prefixed with the sub-component's package name where applicable.

---

## Code Generation

### `takeReferencedFormulasAndActions()`

**Input:** `{ component, files: ProjectFiles }`

**Output:** A record keyed by scope name:

```typescript
{
  __PROJECT__: { actions: Record<string, PluginAction>, formulas: Record<string, PluginFormula> }
  [packageName: string]: { actions: Record<string, PluginAction>, formulas: Record<string, PluginFormula> }
}
```

**Behavior:**
- If `component` is `undefined` (no entry point), return **all** actions and formulas from the project and all packages (no tree-shaking)
- If `component` is defined, return only the actions and formulas whose names appear in the collected reference sets
- Only include packages that have at least one referenced action or formula

### `hasCustomCode()`

Returns `true` if the entry component references any custom actions or formulas. Used to determine whether a custom code file needs to be generated at all.

### `generateCustomCodeFile()`

**Input:** `{ code, componentName?, projectId }`

**Output:** A JavaScript module string with the following exports:

```javascript
export const project = "<projectId>"

export const actions = {
  "<projectId>": {
    "<actionName>": {
      arguments: [...],
      handler: (args, ctx) => {
        <handler code>
        return <safeFunctionName>(args, ctx)
      }
    }
  },
  "<packageName>": { ... }
}

export const formulas = {
  "<projectId>": {
    "<formulaName>": {
      arguments: [...],
      // For CodeFormula:
      handler: (args, ctx) => {
        <handler code>
        return <safeFunctionName>(args, ctx)
      }
      // For ToddleFormula:
      formula: <JSON>
    }
  },
  "<packageName>": { ... }
}
```

**Grouping:** The `__PROJECT__` key is replaced with the project's `short_id` in the generated output. Package names are used directly.

**Function name safety:** `safeFunctionName()` strips non-alphanumeric characters (except `_`) and leading digits from handler function names.

---

## Business Rules

1. **ToddleFormula vs CodeFormula discrimination**: `isToddleFormula(f)` checks for the presence of `formula` field. CodeFormula has a `handler` field instead.
2. **No entry = no tree-shaking**: When no entry component is specified, all custom code is included. This is the fallback for preview mode or full-project builds.
3. **Package scoping**: References are scoped by package name. A formula `myFormula` in package `@mypackage` is referenced as `@mypackage/myFormula`.
4. **Deduplication**: Sub-components are tracked by name to prevent duplicate traversal in diamond dependency scenarios.

---

## Edge Cases

- **Missing component**: If `getComponent()` returns `undefined` for a component node, a console warning is emitted and the sub-tree is skipped (no error thrown).
- **Circular component references**: Prevented by the `components` Map in `uniqueSubComponents` — a component is only visited once.
- **Handler as string vs function**: Server-side, handlers are strings (for code generation). Client-side, they're compiled functions. The `Handler` generic parameter on `PluginFormula<Handler>` captures this.
- **Empty handler names**: `safeFunctionName("")` returns `""`, which would generate invalid code. In practice, all actions/formulas have non-empty names.

---

## External Dependencies

- **`@layr/core`**: Provides `ToddleComponent`, `actionUtils`, `formulaUtils`, `handlerUtils`, type definitions
- No external npm dependencies beyond the core package

---

## System Limits

### Code Size Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxCustomCodeSize` | 100 KB | 500 KB | Per-component custom code |
| `maxTotalCustomCode` | 1 MB | 5 MB | Total custom code per project |
| `maxHandlerSize` | 10 KB | 50 KB | Individual handler size |

### Execution Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxExecutionTime` | 1,000ms | Handler execution timeout |
| `maxStackDepth` | 100 | Maximum call stack depth |

### Enforcement

- **Code size:** Truncate with warning
- **Execution time:** Abort with timeout error
- **Stack depth:** Throw `RangeError`

---

## Invariants

### Code Definition Invariants

1. **I-CODE-HANDLER-FUNCTION:** Handler MUST be a function.
2. **I-CODE-NAME-UNIQUE:** Handler names MUST be unique within scope.
3. **I-CODE-SIGNATURE-MATCH:** Handler signature MUST match declared args.

### Execution Invariants

4. **I-CODE-NO-GLOBAL-MUTATION:** Handlers MUST NOT mutate global state.
5. **I-CODE-CLEANUP-RETURNED:** Cleanup MUST be returned function.
6. **I-CODE-ISOLATED-SCOPE:** Handlers run in isolated scope.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-CODE-HANDLER-FUNCTION | Build | Error: validation fails |
| I-CODE-NO-GLOBAL-MUTATION | Runtime | Warning in dev mode |
| I-CODE-CLEANUP-RETURNED | Runtime | Call if function, ignore otherwise |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `CodeExecutionError` | Handler throws | Log, return null |
| `CodeTimeoutError` | Execution timeout | Abort, return null |
| `CodeSizeError` | Code exceeds limit | Truncate, warn |

---

## Changelog

### Unreleased
- Added System Limits section with code size and execution limits
- Added Invariants section with 6 definition and execution invariants
- Added Error Handling section with error types
