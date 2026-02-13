# Package Management System Specification

## Purpose

The Package Management System enables composition and reuse of components, formulas, and actions across Layr projects. A `package` project exports assets that an `app` project can install and consume. The system provides namespace isolation so packages can define assets with the same names without conflicts, handles transitive dependency resolution for tree-shaking, and scopes package assets through the rendering, formula evaluation, custom code bundling, and validation pipelines.

### Jobs to Be Done

- Install reusable packages of components, formulas, and actions into app projects
- Namespace-isolate package assets so different packages can coexist without name collisions
- Resolve component, formula, and action references across package boundaries at both SSR and client runtime
- Tree-shake unused package assets per page/entry-point for optimized production bundles
- Validate package references to detect broken, missing, or mismatched assets
- Propagate package context through component trees for correct scoping of nested lookups

---

## Data Models

### InstalledPackage

Represents a package dependency installed into a consuming project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifest` | `PackageManifest` | Yes | Package identity and version lock |
| `components` | `Partial<Record<string, Component>>` | Yes | Components contributed by this package |
| `actions` | `Record<string, PluginAction>?` | No | Custom actions contributed by this package |
| `formulas` | `Record<string, PluginFormula>?` | No | Custom formulas contributed by this package |

**Source:** `packages/ssr/src/ssr.types.ts:80-90`

### PackageManifest

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Package name used as namespace prefix (e.g., `best_like_button`) |
| `commit` | `string (SHA hash)` | Content-addressable version lock for the installed snapshot |

**Business Rules:**
- The `name` is the primary namespace identifier used throughout the system for scoping
- The `commit` hash pins the exact version of the package; updating a package means changing this hash
- Currently only `components`, `actions`, and `formulas` are shared; `themes` and `config` are noted as potential future additions in the source

### ProjectFiles Integration

Packages are stored in `ProjectFiles.packages`:

```
ProjectFiles.packages: Partial<Record<string, InstalledPackage>>
```

The `Partial` wrapper means package entries may be `undefined` — all consumers must null-check.

---

## Namespace System

### Naming Convention

All package assets are namespaced using the `packageName/assetName` format:

| Scope | Key Format | Example |
|-------|-----------|---------|
| Project component | `componentName` | `HomePage` |
| Package component | `packageName/componentName` | `best_like_button/like-button` |
| Project formula | `formulaName` | `myCustomFormula` |
| Package formula | `packageName/formulaName` | `best_like_button/formatCount` |
| Project action | `actionName` | `myAction` |
| Package action | `packageName/actionName` | `best_like_button/trackClick` |
| Standard library | `@toddle/name` | `@toddle/MAP` |

### Package Field on Nodes

The `ComponentNodeModel.package` field statically records which package a component instance was inserted from:

```typescript
interface ComponentNodeModel {
  name: string              // Component name within the package
  package?: string | null   // Package name (null = project-local or inherited)
  // ...
}
```

Similarly, `FunctionOperation.package` records the package for formula references, and `CustomActionModel.package` records it for action references.

### Package Context Propagation

A `package` context is threaded through the rendering pipeline (both CSR and SSR) to track which package scope the current execution is in. This determines how unqualified references are resolved.

**Resolution rule:** When a component node has an explicit `package` field, that value is used. Otherwise, the parent's package context is inherited — unless the component is found locally in the project (in which case the package context resets to `undefined`).

**Runtime implementation** (`packages/runtime/src/components/createNode.ts:53-64`):

```
const isLocalComponent = ctx.components.some(c => c.name === node.name)
ctx.package = node.package ?? (isLocalComponent ? undefined : ctx.package)
```

**SSR implementation** (`packages/ssr/src/rendering/components.ts:303-309`):

```
const _packageName = node.package ?? packageName
if (_packageName) {
  _childComponent = files.packages?.[_packageName]?.components[node.name]
                 ?? files.components[node.name]
} else {
  _childComponent = files.components[node.name]
}
```

---

## Component Resolution

### Lookup Algorithm

Component resolution follows a two-step lookup based on whether a package scope is active:

1. **With package scope** (`packageName` is defined):
   - Try `files.packages[packageName].components[name]`
   - Fall back to `files.components[name]` (project-local)
2. **Without package scope** (`packageName` is `undefined`):
   - Try `files.components[name]` (project-local only)

If neither lookup succeeds, a warning is logged and the component is skipped (returns empty HTML in SSR, empty array in CSR).

**SSR warning:** `Unable to find component ${packageName/name} in files`

**CSR warning:** `Could not find component "${nodeLookupKey}" for component "${parentName}". Available components are: [...]`

### Component Flattening for Runtime

At initialization, all components (project + package) are flattened into a single lookup array for the client runtime:

**Source:** `packages/ssr/src/components/utils.ts:9-40`

```
const components = {
  ...projectComponents,
  ...Object.fromEntries(
    Object.values(packages).flatMap(pkg =>
      Object.values(pkg.components).map(component => [
        `${pkg.manifest.name}/${component.name}`,
        component,
      ])
    )
  )
}
```

Package components are keyed as `packageName/componentName` in the flattened map. The CSR runtime's `createComponent` function (`packages/runtime/src/components/createComponent.ts:45-46`) looks up components using this combined key:

```
const nodeLookupKey = [ctx.package, node.name].filter(isDefined).join('/')
const component = ctx.components?.find(comp => comp.name === nodeLookupKey)
```

---

## Formula Resolution from Packages

### Server-Side (SSR)

Formula resolution uses the `getServerToddleObject` function (`packages/ssr/src/rendering/formulaContext.ts:78-106`):

```
getCustomFormula: (name, packageName) => {
  if (isDefined(packageName)) {
    formula = files.packages?.[packageName]?.formulas?.[name]
  } else {
    formula = files.formulas?.[name]
  }
  // Only Toddle formulas (declarative, no JS) are supported in SSR
  if (formula && isToddleFormula(formula)) {
    return formula
  }
}
```

**Key constraint:** Only `ToddleFormula` (declarative composition) formulas are resolvable in SSR. Code-based formulas (`CodeFormula` with JavaScript handlers) are not supported server-side and are skipped.

### Client-Side (CSR)

Formula resolution uses the `toddle.getCustomFormula` function, which checks:

1. `toddle.formulas[packageName][name]` — package-scoped V2 formulas
2. `toddle.formulas[projectId][name]` — project-scoped V2 formulas (fallback)
3. Legacy `getFormula(name)` — flat namespace legacy formulas

See [Plugin System](./plugin-system.md) for full dispatch logic.

---

## Action Resolution from Packages

Action resolution follows the same pattern as formulas:

1. **With package scope:** `files.packages[packageName].actions[name]`
2. **Without package scope:** `files.actions[name]`

For client-side V2 actions:
1. `toddle.actions[packageName][name]`
2. `toddle.actions[projectId][name]` (fallback)

---

## Dependency Collection (Tree-Shaking)

### Component Dependency Tree

The `takeIncludedComponents` function (`packages/ssr/src/components/utils.ts:9-40`) collects all components transitively referenced from a root component:

**Algorithm:**

1. Flatten all project and package components into a single lookup map (package components keyed as `packageName/componentName`)
2. Starting from the root component, walk all nodes
3. For each `ComponentNodeModel`, compute the lookup key: `[node.package ?? currentPackageName, node.name].join('/')`
4. If the component exists in the lookup map and hasn't been visited, add it and recursively visit its nodes
5. Track the package context as it propagates through nested component references

**Result:** An array of all `Component` objects reachable from the root, with their names prefixed by package name where applicable.

### Formula and Action Reference Collection

The `takeReferencedFormulasAndActions` function (`packages/ssr/src/custom-code/codeRefs.ts:15-140`) collects all custom formulas and actions referenced from an entry component:

**Algorithm:**

1. Create a `ToddleComponent` wrapper for the entry component
2. Collect all formula references (via `formulaReferences`) and action references (via `actionReferences`)
3. For each unique sub-component, collect its references prefixed with its package name
4. Filter the project's and all packages' formulas/actions to only include referenced items
5. Return a grouped result: `{ __PROJECT__: { actions, formulas }, [packageName]: { actions, formulas } }`

**Key behavior:**
- If no entry component is specified (e.g., generic bundles), all formulas and actions are included
- Package references use the `packageName/assetName` format for matching
- Only packages with at least one referenced formula or action are included in the output

---

## Custom Code Bundling

### Per-Page Code Generation

The `generateCustomCodeFile` function (`packages/ssr/src/custom-code/codeRefs.ts:150-262`) generates a JavaScript module for each page/component entry point:

**Output structure:**

```javascript
export const project = "project_short_id";

export const loadCustomCode = () => {
  // Legacy v1 actions and formulas (inline handlers)
};

export const actions = {
  "packageName": {
    "actionName": { arguments: [...], handler: (args, ctx) => { ... } }
  },
  "projectId": {
    "projectAction": { arguments: [...], handler: (args, ctx) => { ... } }
  }
};

export const formulas = {
  "packageName": {
    "formulaName": { arguments: [...], formula: { ... } }  // Toddle formula
    "codeFormula": { arguments: [...], handler: (args, ctx) => { ... } }  // Code formula
  },
  "projectId": { ... }
};
```

**Package scoping rules:**
- The `__PROJECT__` key is replaced with the actual `projectId` (the project's `short_id`)
- Each package gets its own key in the `actions` and `formulas` exports
- Legacy code (v1) is assumed to only exist at the project level — packages are assumed to not have legacy actions/formulas
- V2 actions/formulas are grouped by package for proper namespace scoping

### Build-Time Package Filtering

During route splitting (`packages/ssr/src/utils/routes.ts`), installed packages are filtered per page:

1. Resolve the transitive component dependency tree for each page
2. Filter each package's components to only include those used by the page
3. Strip test data from all package components
4. Package actions are excluded from SSR bundles entirely (`actions: {}`)

---

## Validation Rules

The search/linting system validates package references across three dimensions:

### Unknown Component Rule

**Rule:** `unknownComponentRule` (`packages/search/src/rules/issues/components/unknownComponentRule.ts`)

**Level:** Error

**Logic:**
- For component nodes without a `package` field: check `files.components[name]`
- For component nodes with a `package` field: check `files.packages[package].components[name]`
- Report if neither lookup succeeds

### Unknown Project Formula Rule

**Rule:** `unknownProjectFormulaRule` (`packages/search/src/rules/issues/formulas/unknownProjectFormulaRule.ts`)

**Level:** Warning

**Logic:**
- Skip standard library formulas (names starting with `@toddle/`)
- For formulas with a `package` field: check `files.packages[package].formulas[name]`
- For formulas without a `package` field: check `files.formulas[name]`
- Report if the formula is not found

### Unknown Project Action Rule

**Rule:** `unknownProjectActionRule` (`packages/search/src/rules/issues/actions/unknownProjectActionRule.ts`)

**Level:** Warning

**Logic:**
- Skip non-custom actions (those with a defined type other than `Custom`) and standard library actions (`@toddle/` prefix)
- For actions with a `package` field: check `files.packages[package].actions[name]`
- For actions without a `package` field: check `files.actions[name]`
- Report if the action is not found

### Additional Package-Aware Rules

The following rules also perform package-aware lookups:

| Rule | Code | Level | Package-Aware Behavior |
|------|------|-------|----------------------|
| `noReferenceComponentRule` | `no reference component` | Warning | Checks for unused project components, considering package component references |
| `unknownComponentAttributeRule` | `unknown component attribute` | Warning | Resolves attributes from package components |
| `unknownComponentSlotRule` | `unknown component slot` | Warning | Resolves slots from package components |
| `unknownContextProviderRule` | `unknown context provider` | Warning | Resolves context from package components |
| `unknownContextProviderFormulaRule` | `unknown context provider formula` | Warning | Resolves context formulas from package components |
| `unknownContextProviderWorkflowRule` | `unknown context provider workflow` | Warning | Resolves workflows from package components |
| `unknownEventRule` | `unknown event` | Warning | Resolves events from package components |

---

## Context System Integration

### Package-Scoped Context Providers

Context providers from packages use the component's fully qualified name. When a component from a package provides context:

- **Provider name:** The component's `name` field (without package prefix)
- **Context key in `ComponentData.Contexts`:** Keyed by component name
- **Context reference format:** `componentName` or `packageName/componentName`

The `ComponentContext` type supports explicit package scoping:

```typescript
interface ComponentContext {
  formulas: string[]          // Exposed formula names
  workflows: string[]         // Exposed workflow names
  componentName?: string      // Component providing the context
  package?: string            // Package of the context provider
}
```

### Package Context in Children

When a component renders children passed to slots, the package context propagates:

```typescript
// Runtime (createComponent.ts:306-309)
children[slotName].push({
  ctx: { ...ctx, package: node.package ?? ctx.package }
})
```

This ensures that slot content rendered inside a package component correctly resolves references within that package's scope.

---

## Edge Cases and Error Handling

### Missing Package

If a `ComponentNodeModel` references a package that doesn't exist in `files.packages`:
- **SSR:** Returns empty string, logs warning
- **CSR:** Returns empty array, logs warning with available component names
- **Linting:** Reports "unknown component" error

### Missing Component in Package

If the package exists but the referenced component doesn't:
- Same behavior as missing package — graceful skip with warning

### Package Version Drift

When a package's `commit` hash is outdated relative to the source:
- Components may reference non-existent attributes, formulas, or child components
- The search/linting system detects these as "unknown reference" warnings
- No automatic version conflict resolution — requires manual package update

### Duplicate Asset Names Across Packages

- **Allowed:** Different packages can define components, formulas, and actions with the same name
- **Resolution:** Package namespace prevents collisions — `pkg_a/Button` and `pkg_b/Button` are distinct
- **Not allowed:** Two components with the same name within a single package

### Circular Component Dependencies

- Component dependency collection uses a `Map` to track visited components
- If component A from package X references component B from package Y which references A: the second visit to A is skipped (already in the dependency map)
- This prevents infinite recursion during `takeIncludedComponents`

### Code Formulas in SSR

- Package code formulas (JavaScript handler-based) are not executable during SSR
- Only `ToddleFormula` (declarative) formulas from packages work server-side
- Code formulas are deferred to client-side hydration

---

## Dependencies

| System | Relationship |
|--------|-------------|
| [Project Data Model](./project-data-model.md) | Defines `InstalledPackage`, `ProjectFiles.packages` |
| [Plugin System](./plugin-system.md) | Handles formula/action registration with package scoping |
| [Component System](./component-system.md) | Defines `Component` type and `ComponentNodeModel.package` |
| [Rendering Engine](./rendering-engine.md) | Resolves components from packages during CSR |
| [SSR Pipeline](./ssr-pipeline.md) | Resolves components from packages during SSR |
| [Custom Code System](./custom-code-system.md) | Bundles package formulas/actions per entry point |
| [Search and Linting](./search-and-linting.md) | Validates package references |
| [Build and Deployment](./build-and-deployment.md) | Tree-shakes packages during route splitting |

---

## System Limits

### Package Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxPackagesPerProject` | 50 | 200 | Installed packages |
| `maxPackageSize` | 5 MB | 20 MB | Package JSON size |
| `maxComponentsPerPackage` | 100 | 500 | Components per package |
| `maxDependencyDepth` | 10 | 20 | Package dependency chain |

### Enforcement

- **Package count:** Warn at 80%, error at 100%
- **Package size:** Reject with error
- **Dependency depth:** Throw `CircularDependencyError`

---

## Invariants

### Installation Invariants

1. **I-PKG-VERSION-LOCKED:** Package MUST be locked to specific commit.
2. **I-PKG-NO-CYCLE:** Package dependencies MUST be acyclic.
3. **I-PKG-EXPORT-MARKED:** Only exported components are consumable.

### Resolution Invariants

4. **I-PKG-LOCAL-WINS:** Local components override package components.
5. **I-PKG-PACKAGE-ORDER:** Package order determines precedence for collisions.
6. **I-PKG-COMPLETE-INSTALL:** All dependencies MUST be installed.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-PKG-NO-CYCLE | Build | Error: cycle detected |
| I-PKG-VERSION-LOCKED | Build | Error: version required |
| I-PKG-LOCAL-WINS | Runtime | Local used |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `PackageNotFoundError` | Package missing from registry | Abort install |
| `PackageVersionError` | Version not found | Prompt for update |
| `CircularDependencyError` | Cycle in dependencies | Abort with cycle path |
| `PackageSizeError` | Package exceeds limit | Reject with warning |

### Dependency Resolution

```typescript
interface DependencyError extends Error {
  type: 'circular' | 'missing' | 'version';
  packageName: string;
  chain: string[];
  suggestion?: string;
}
```

---

## Changelog

### Unreleased
- Added System Limits section with package and dependency limits
- Added Invariants section with 6 installation and resolution invariants
- Added Error Handling section with dependency errors
