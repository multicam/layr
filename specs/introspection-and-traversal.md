# Introspection and Traversal System Specification

## Purpose

The Introspection and Traversal System provides a unified mechanism for walking, analyzing, and extracting information from the Layr project data model. It powers search/linting (issue detection), custom code bundling (tree-shaking), API dependency sorting, and reference collection. The system uses generator-based traversal with wrapper classes that expose typed iterators over formulas, actions, and sub-components.

### Jobs to Be Done

- Walk every formula in a component, API, route, or service for linting and reference extraction
- Walk every action model in a component for action reference collection
- Collect transitive sub-component dependencies for a given root component
- Extract formula and action references for tree-shaking unused custom code
- Compute API dependency order by tracing `Apis.*` path references
- Support package-scoped traversal with correct namespace propagation
- Enable incremental traversal (visit only changed paths) for editor performance

---

## Architecture Overview

The system consists of two layers:

### Layer 1: Low-Level Traversal Functions

Generator functions that recursively walk formula and action trees:

| Function | Location | Input | Yields |
|----------|----------|-------|--------|
| `getFormulasInFormula` | `packages/core/src/formula/formulaUtils.ts:36` | Formula tree + global formulas | `{ path, formula, packageName? }` |
| `getFormulasInAction` | `packages/core/src/formula/formulaUtils.ts:177` | Action model + global formulas | `{ path, formula, packageName? }` |
| `getActionsInAction` | `packages/core/src/component/actionUtils.ts:5` | Action model | `[path, ActionModel]` |

### Layer 2: Wrapper Classes

Classes that compose Layer 1 functions to traverse complete entities:

| Class | Location | Wraps | Key Generators |
|-------|----------|-------|----------------|
| `ToddleComponent` | `packages/core/src/component/ToddleComponent.ts` | `Component` | `formulasInComponent()`, `actionModelsInComponent()` |
| `ToddleFormula` | `packages/core/src/formula/ToddleFormula.ts` | `Formula` (Toddle) | `formulasInFormula()` |
| `ToddleApiV2` | `packages/core/src/api/ToddleApiV2.ts` | `ApiRequest` | `formulasInApi()`, `actionModelsInApi()` |
| `ToddleApiService` | `packages/ssr/src/ToddleApiService.ts` | `ApiService` | `formulasInService()` |
| `ToddleRoute` | `packages/ssr/src/ToddleRoute.ts` | `Route` | `formulasInRoute()` |

### Layer 3: Project-Level Traversal

The `searchProject` function (`packages/search/src/searchProject.ts`) composes Layer 2 classes to visit every node type in a complete project.

---

## Formula Traversal

### `getFormulasInFormula`

Recursively walks a formula tree, yielding each formula node with its path and package context.

**Signature:**

```
function* getFormulasInFormula<Handler>({
  formula,
  globalFormulas,
  path?,
  visitedFormulas?,
  packageName?,
}): Generator<{ path: (string|number)[], formula: Formula, packageName?: string }>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `formula` | `Formula?` | Root formula to traverse (null-safe — returns immediately if undefined) |
| `globalFormulas` | `GlobalFormulas` | Registry of all project + package formulas for resolving `function` references |
| `path` | `(string\|number)[]?` | Current path prefix for yielded results (default: `[]`) |
| `visitedFormulas` | `Set<string>?` | Tracks visited formula keys to prevent infinite recursion on circular references |
| `packageName` | `string?` | Current package scope for namespace-qualified lookups |

**Traversal Rules by Formula Type:**

| Formula Type | Children Traversed |
|--------------|-------------------|
| `path` | None (leaf node) |
| `value` | None (leaf node) |
| `record` | Each `entry.formula` |
| `function` | Each `argument.formula`, then the resolved global formula body (if `ToddleFormula` and not yet visited) |
| `array`, `or`, `and`, `object` | Each `argument.formula` |
| `apply` | Each `argument.formula` |
| `switch` | Each `case.condition`, each `case.formula`, and `default` |

**Cycle Prevention:**

For `function` type formulas, the function key (computed as `[packageName, formulaName].join('/')`) is tracked in `visitedFormulas`. If already visited, the function body is not re-entered. This prevents infinite loops when formulas reference each other circularly.

**Package Resolution:**

When a `function` formula has a `package` field (or inherits `packageName` from context), the resolved formula is looked up in `globalFormulas.packages[packageName].formulas[name]`. Only `ToddleFormula` types (declarative compositions) are recursively traversed — `CodeFormula` types (JavaScript handlers) are opaque leaves.

---

### `getFormulasInAction`

Recursively walks an action model, yielding all formulas found within it.

**Signature:**

```
function* getFormulasInAction<Handler>({
  action, globalFormulas, path?, visitedFormulas?, packageName?,
}): Generator<{ path: (string|number)[], formula: Formula, packageName?: string }>
```

**Traversal Rules by Action Type:**

| Action Type | Formulas Traversed |
|-------------|-------------------|
| `AbortFetch` | None |
| `Fetch` | Each `inputs[].formula`, then recursively into `onSuccess.actions`, `onError.actions`, `onMessage.actions` |
| `Custom` / `undefined` / `null` | `data` (if formula), each `arguments[].formula`, each `events[].actions` (recursive) |
| `SetVariable` | `data` |
| `TriggerEvent` | `data` |
| `TriggerWorkflowCallback` | `data` |
| `SetURLParameter` | `data` |
| `SetURLParameters` | Each `parameters[]` formula |
| `TriggerWorkflow` | Each `parameters[].formula` |
| `Switch` | `data` (if formula), each `cases[].condition`, each `cases[].actions` (recursive), `default.actions` (recursive) |

---

### `getActionsInAction`

Recursively walks an action tree, yielding each action model with its path. Unlike `getFormulasInAction`, this yields the action models themselves (not their formulas).

**Signature:**

```
function* getActionsInAction(
  action, path?
): Generator<[(string|number)[], ActionModel]>
```

**Traversal Rules:**

| Action Type | Children Traversed |
|-------------|-------------------|
| `AbortFetch`, `SetURLParameter`, `SetURLParameters`, `SetVariable`, `TriggerEvent`, `TriggerWorkflow`, `TriggerWorkflowCallback` | None (leaf actions) |
| `Fetch` | `onSuccess.actions`, `onError.actions`, `onMessage.actions` |
| `Custom` / `undefined` / `null` | Each `events[eventName].actions` |
| `Switch` | Each `cases[].actions`, `default.actions` |

---

## Component Introspection

### `ToddleComponent`

Wraps a `Component` to provide introspection capabilities.

**Constructor:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `component` | `Component` | The component to introspect |
| `getComponent` | `(name, packageName?) => Component?` | Resolver for sub-components |
| `packageName` | `string?` | Package scope for this component |
| `globalFormulas` | `GlobalFormulas` | Project + package formula registry |

### `formulasInComponent()`

Generator that yields every formula in the component, traversing:

1. **Page route formulas** (if page component): `language`, `title`, `description`, `icon`, `charset`, and all `meta[].content` and `meta[].attrs`
2. **Component formulas**: Each `formulas[].formula`
3. **Variable initial values**: Each `variables[].initialValue`
4. **Workflow actions**: Each `workflows[].actions[]` (via `getFormulasInAction`)
5. **API formulas**: Each API's `formulasInApi()` (via `ToddleApiV2`)
6. **Lifecycle actions**: `onLoad.actions[]` and `onAttributeChange.actions[]` (via `getFormulasInAction`)
7. **Node formulas**: For each node in `nodes`:
   - `condition`, `repeat`, `repeatKey` (all node types except slot)
   - `value` (text nodes)
   - `attrs[]` (element and component nodes)
   - `events[].actions[]` (element and component nodes, via `getFormulasInAction`)
   - `classes[].formula` (element nodes)
   - `style-variables[].formula` (element nodes, legacy)
   - `customProperties[].formula` (element and component nodes)
   - `variants[].customProperties[].formula` (element and component nodes)

### `actionModelsInComponent()`

Generator that yields every action model in the component:

1. **Workflow actions**: Each `workflows[].actions[]`
2. **API actions**: Each API's `actionModelsInApi()`
3. **Legacy API callbacks**: `onCompleted.actions[]`, `onFailed.actions[]`
4. **Lifecycle actions**: `onLoad.actions[]`, `onAttributeChange.actions[]`
5. **Node event actions**: Each node's `events[].actions[]`

### `uniqueSubComponents`

Computed property that returns all unique sub-components transitively referenced from this component's node tree.

**Algorithm:**

1. Create a `Map<string, ToddleComponent>` to track visited components
2. Walk all nodes in the component
3. For each `ComponentNodeModel`:
   - Skip if already visited (by component name)
   - Resolve the component via `getComponent(name, package ?? currentPackage)`
   - Wrap in a new `ToddleComponent` with propagated package context
   - Recursively walk the resolved component's nodes
4. Return map values as array

**Package propagation:** `node.package ?? parentPackageName`

### `formulaReferences`

Computed property returning a `Set<string>` of all formula names referenced by this component. Used for tree-shaking.

**Logic:**

1. Iterate `formulasInComponent()`
2. Filter for `type === 'function'`
3. For each: add the formula name
4. If the formula exists in a package's global formulas, also add `packageName/formulaName`

### `actionReferences`

Computed property returning a `Set<string>` of all custom action names referenced by this component. Used for tree-shaking.

**Logic:**

1. Iterate `actionModelsInComponent()`
2. Filter for `type === 'Custom'` or `type === undefined`
3. Return `[package, name].filter(isDefined).join('/')`

---

## API Introspection

### `ToddleApiV2`

Wraps an `ApiRequest` for formula/action traversal and dependency analysis.

### `formulasInApi()`

Yields all formulas in a v2 API definition:

`inputs[].formula`, `autoFetch`, `url`, `path[].formula`, `queryParams[].formula`, `queryParams[].enabled`, `headers[].formula`, `headers[].enabled`, `body` (only if method allows body), `client.onCompleted.actions` (via `getFormulasInAction`), `client.onFailed.actions`, `client.debounce.formula`, `client.onMessage.actions`, `redirectRules[].formula`, `isError.formula`, `timeout.formula`, `server.proxy.enabled.formula`, `server.proxy.useTemplatesInBody.formula`, `server.ssr.enabled.formula`

### `actionModelsInApi()`

Yields all action models in a v2 API's callback handlers:

`client.onCompleted.actions[]`, `client.onFailed.actions[]`, `client.onMessage.actions[]`

### `apiReferences`

Computed property returning a `Set<string>` of API names referenced via `Apis.*` path formulas. Used for dependency sorting.

**Algorithm:**

1. Walk all API formulas using a local `visitFormulaReference` function
2. For each `path` formula where `path[0] === 'Apis'`: add `path[1]` to the set
3. Remove self-references (the API's own name)
4. Cache result for subsequent access

**Traversed formulas:** `autoFetch`, `url`, `path[].formula`, `headers[].formula`, `body`, `inputs[].formula`, `queryParams[].formula`, `server.proxy.enabled`, `server.ssr.enabled`, `client.debounce`, `redirectRules[].formula`, `isError`, `timeout`

---

## Service and Route Introspection

### `ToddleApiService.formulasInService()`

Yields formulas in an API service definition: `baseUrl`, `docsUrl`, `apiKey`, and `meta.projectUrl` (Supabase only).

### `ToddleRoute.formulasInRoute()`

Yields formulas in a custom route definition: `destination.url`, `destination.path[].formula`, `destination.queryParams[].formula`, `destination.queryParams[].enabled`.

---

## Project-Level Traversal (`searchProject`)

The top-level traversal function that visits every entity in a project.

**Signature:**

```
function* searchProject({
  files, rules, pathsToVisit?, useExactPaths?, state?, fixOptions?,
}): Generator<Result | ProjectFiles | void>
```

### Visited Entity Types (Node Types)

The traversal visits entities in this order:

| Order | Entity | Node Type | Source |
|-------|--------|-----------|--------|
| 1 | Components | `component` | `files.components` |
| 2 | Project formulas | `project-formula` | `files.formulas` |
| 3 | Project actions | `project-action` | `files.actions` |
| 4 | Themes | `project-theme` | `files.themes` |
| 5 | Theme properties | `project-theme-property` | `themes[].propertyDefinitions` |
| 6 | API services | `api-service` | `files.services` |
| 7 | Custom routes | `project-route` | `files.routes` |
| 8 | Project config | `project-config` | `files.config` |

### Component Traversal Depth

When visiting a component, `searchProject` recursively descends into:

1. `component-attribute` — for each attribute
2. `component-variable` — for each variable
3. `component-api` — for each API
4. `component-api-input` — for each API input (v2 only)
5. `component-formula` — for each component formula
6. `component-workflow` — for each workflow
7. `component-event` — for each declared event
8. `component-context` — for each context subscription
9. `component-node` — for each node, then further into:
   - `component-node-attribute` — element/component node attributes
   - `style-declaration` — style properties on element/component nodes
   - `style-variable` — legacy style variables (element nodes only)
   - `custom-property` — CSS custom properties
   - `style-variant` — each variant, including its style declarations and custom properties
10. `formula` — every formula in the component (via `ToddleComponent.formulasInComponent()`)
11. `action-model` — every action in the component (via `ToddleComponent.actionModelsInComponent()`)
12. `action-custom-model-argument` — arguments of custom actions
13. `action-custom-model-event` — events of custom actions

### Path Filtering

The `pathsToVisit` parameter enables incremental traversal:

- `shouldVisitTree(path, pathsToVisit)`: Returns `true` if the current path is a prefix of or is prefixed by any path in `pathsToVisit`
- `shouldSearchExactPath(path, pathsToVisit)`: Returns `true` only if the path exactly matches one of `pathsToVisit`
- When `pathsToVisit` is empty (default), all paths are visited

### Memoization

A shared `Map<string, any>` memo cache is passed to all rules during a search run. Rules can use `memo(key, fn)` to cache expensive computations (e.g., building component lookup maps) and share them across multiple rule evaluations.

### Fix Mode

When `fixOptions` is provided, rules can return modified `ProjectFiles` instead of reporting issues. The first successful fix terminates further rule processing for that node.

---

## Consumers

### Search/Linting System

Uses `searchProject` with 100+ rules to detect issues. Each rule receives a node type, value, path, and files reference, then reports problems via a callback.

### Custom Code Bundler

Uses `ToddleComponent.formulaReferences` and `ToddleComponent.actionReferences` (including from `uniqueSubComponents`) to collect all referenced custom code for tree-shaking.

### API Dependency Sorter

Uses `ToddleApiV2.apiReferences` to build a dependency graph between APIs, then sorts them in initialization order (dependencies before dependents).

### Component Dependency Collector

Uses `takeIncludedComponents` (which internally mirrors `ToddleComponent.uniqueSubComponents` logic) to collect all components needed for a page, enabling per-page code splitting and package filtering.

---

## Edge Cases

### Circular Formula References

Handled by the `visitedFormulas` set in `getFormulasInFormula`. Formula keys are tracked as `packageName/formulaName`. Once visited, the formula body is not re-entered, preventing infinite recursion.

### Package Formula Skipping in Search

When `searchProject` traverses component formulas, it skips formulas where `packageName` is defined and not `'root'`. This prevents reporting issues inside package code that the consuming project cannot fix.

### Missing Components in Traversal

Both `ToddleComponent.uniqueSubComponents` and `takeIncludedComponents` gracefully handle missing components. If `getComponent()` returns `undefined`, the component is skipped without error.

### Code Formulas Are Opaque

`getFormulasInFormula` only descends into `ToddleFormula` bodies (declarative compositions). `CodeFormula` types (JavaScript handlers) are treated as leaf nodes since their implementation isn't representable as a formula tree.

### API Self-Reference Exclusion

`ToddleApiV2.apiReferences` removes self-references (the API referencing its own response, e.g., in redirect rules). This prevents false circular dependency detection.

---

## Dependencies

| System | Relationship |
|--------|-------------|
| [Formula System](./formula-system.md) | Defines `Formula` types traversed by `getFormulasInFormula` |
| [Action System](./action-system.md) | Defines `ActionModel` types traversed by `getFormulasInAction` and `getActionsInAction` |
| [Component System](./component-system.md) | Defines `Component` wrapped by `ToddleComponent` |
| [API Integration](./api-integration.md) | Defines `ApiRequest` wrapped by `ToddleApiV2` |
| [Search and Linting](./search-and-linting.md) | Uses `searchProject` as its core traversal engine |
| [Custom Code System](./custom-code-system.md) | Uses reference collection for tree-shaking |
| [Package Management](./package-management.md) | Package-scoped traversal with `GlobalFormulas` registry |
| [Project Data Model](./project-data-model.md) | Defines `ProjectFiles` traversed at the top level |

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxItems` | 10,000 | Maximum items |

### Enforcement

- Size: Truncate with warning
- Time: Cancel with error
- Items: Stop processing

---

## Invariants

1. Operations MUST be valid
2. Operations MUST be safe
3. Results MUST be deterministic

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Operation fails | Log, continue |
| Timeout | Cancel |
| Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
