# Packages and Plugins

Custom formula/action registration, the custom code loading system, and the package sharing architecture. Only the custom code registry and code generation pipeline are implemented. Package install flow, plugin registry, and shared package distribution are Phase 2.

**Implementing packages:** `@layr/runtime` (custom code registry), `@layr/ssr` (tree-shaking and code generation), `@layr/core` (component traversal)

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| `CustomCodeRegistry` — formula/action registration | MVP |
| `ToddleFormula` and `CodeFormula` types | MVP |
| `PluginActionV2` type | MVP |
| `isToddleFormula()` / `isCodeFormula()` type guards | MVP |
| `registerFormula()` / `registerAction()` | MVP |
| `getFormula()` / `getAction()` with package scoping | MVP |
| `loadCustomCode()` from generated modules | MVP |
| `safeFunctionName()` for code generation | MVP |
| `generateFormulaCode()` / `generateActionCode()` | MVP |
| `collectFormulaRefs()` / `collectActionRefs()` | MVP |
| `hasCustomCode()` check | MVP |
| Tree-shaking via `takeReferencedFormulasAndActions()` | MVP |
| `generateCustomCodeFile()` — JS module output | MVP |
| Package sharing between projects | Phase 2 |
| Package install flow (registry lookup, version lock) | Phase 2 |
| Plugin registry (community marketplace) | Phase 2 |
| `InstalledPackage` / `PackageManifest` resolution at runtime | Phase 2 |
| Package-scoped component namespace resolution | Phase 2 |

---

## Custom Code System (MVP)

### Overview

The custom code system bridges user-written JavaScript (formulas and actions) with the Layr runtime. It runs at SSR build time to produce self-contained per-page JavaScript modules containing only the custom code actually used by that page.

### Data Flow

```
Entry Component
      │
      ▼
ToddleComponent.formulaReferences  →  Set<string>
ToddleComponent.actionReferences   →  Set<string>
      │
      ├── traverse: nodes, workflows, APIs, lifecycle events, route info
      └── recurse into sub-components (prefixed with packageName/)
      │
      ▼
takeReferencedFormulasAndActions(component, files)
      │
      ├── filter project actions/formulas by reference set
      ├── filter per-package actions/formulas by reference set
      └── exclude packages with no referenced items
      │
      ▼
generateCustomCodeFile({ code, componentName, projectId })
      │
      └── ES module string: export const project, actions, formulas
```

---

## Type Definitions

### `PluginFormula`

Union of `ToddleFormula` (declarative) and `CodeFormula` (JavaScript).

#### `ToddleFormula`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Formula identifier |
| `description` | `string?` | Human-readable description |
| `arguments` | `Array<{ name, formula?, testValue? }>` | Named arguments |
| `exported` | `boolean?` | Exported from package |
| `variableArguments` | `boolean?` | Accepts variable args |
| `formula` | `Formula` | Declarative formula AST |

`isToddleFormula(f)` — presence of `formula` field.

Server-side support: full (evaluated by formula engine, no JS runtime needed).

#### `CodeFormula`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Formula identifier |
| `description` | `string?` | Human-readable description |
| `arguments` | `Array<{ name, formula?, testValue? }>` | Named arguments |
| `exported` | `boolean?` | Exported from package |
| `variableArguments` | `boolean?` | Accepts variable args |
| `version` | `2?` | Version discriminator |
| `handler` | `string \| FormulaHandler` | JS code string (SSR) or compiled function (client) |

Server-side support: code generation only — not executable during SSR.

```typescript
type FormulaHandler = (
  args: Record<string, unknown>,
  ctx: FormulaContext
) => unknown

interface FormulaContext {
  root?: Document | ShadowRoot;
  env?: Record<string, unknown>;
}
```

### `PluginAction`

```typescript
interface PluginActionV2 {
  name: string;
  version: 2;
  description?: string;
  arguments?: Array<{ name: string; formula?: Formula }>;
  events?: Record<string, { dummyEvent?: unknown }>;
  variableArguments?: boolean;
  exported?: boolean;
  handler: ActionHandlerV2;
}

type ActionHandlerV2 = (
  args: Record<string, unknown>,
  ctx: ActionContext,
  event?: unknown
) => void | (() => void) | Promise<void> | Promise<() => void>

interface ActionContext {
  triggerActionEvent: (trigger: string, data?: unknown, event?: unknown) => void;
  root: Document | ShadowRoot;
}
```

Return value from `ActionHandlerV2`: optional cleanup function called on component unmount.

---

## Custom Code Registry

**Source:** `packages/runtime/src/custom-code/index.ts`

```typescript
interface CustomCodeRegistry {
  formulas: Record<string, Record<string, PluginFormula>>;  // [packageName][formulaName]
  actions:  Record<string, Record<string, PluginAction>>;   // [packageName][actionName]
}
```

### API

| Function | Signature | Description |
|----------|-----------|-------------|
| `createCustomCodeRegistry()` | `() → CustomCodeRegistry` | Create empty registry |
| `registerFormula(registry, packageName, formula)` | — | Add formula to package scope |
| `registerAction(registry, packageName, action)` | — | Add action to package scope |
| `getFormula(registry, name, packageName?)` | `→ PluginFormula \| undefined` | Lookup with optional package scope |
| `getAction(registry, name, packageName?)` | `→ PluginAction \| undefined` | Lookup with optional package scope |
| `loadCustomCode(module, registry, packageName)` | `async → void` | Bulk-register from generated module |
| `hasCustomCode(registry, packageName)` | `→ boolean` | Check if package has any registrations |

### Lookup Behavior

```typescript
getFormula(registry, name, packageName?)
```

- If `packageName` provided: lookup `registry.formulas[packageName][name]`
- If no `packageName`: search all packages, return first match

Same logic for `getAction`.

---

## Code Generation

### `safeFunctionName(name: string): string`

Strips non-alphanumeric characters (except `_`), removes leading digits. Fallback: `'_fn'`.

### `generateFormulaCode(packageName, formula: CodeFormula): string`

Produces a JavaScript snippet for a single code formula:

```javascript
// Formula: myFormula
// Package: myPackage

const myFormula = (args, ctx) => { /* handler code */ };

export const formula = {
  name: "myFormula",
  arguments: [...],
  handler: myFormula
};
```

### `generateActionCode(packageName, action: PluginActionV2): string`

Same pattern for actions:

```javascript
export const action = {
  name: "myAction",
  version: 2,
  arguments: [...],
  events: {...},
  handler: myAction
};
```

### `generateCustomCodeFile({ code, componentName?, projectId })`

Full module output format:

```javascript
export const project = "<projectId>";

export const actions = {
  "<projectId>": {
    "<actionName>": {
      arguments: [...],
      handler: (args, ctx) => {
        /* handler code */
        return actionName(args, ctx);
      }
    }
  },
  "<packageName>": { ... }
};

export const formulas = {
  "<projectId>": {
    "<codeFormulaName>": {
      arguments: [...],
      handler: (args, ctx) => { return fn(args, ctx); }
    },
    "<toddleFormulaName>": {
      arguments: [...],
      formula: { /* Formula AST */ }
    }
  },
  "<packageName>": { ... }
};
```

`__PROJECT__` key is replaced with the project's actual `short_id`.

---

## Tree-Shaking

### `collectFormulaRefs(formulas, referenced)`

Filters a formula map to only entries whose names appear in `referenced: Set<string>`.

### `collectActionRefs(actions, referenced)`

Same for actions.

### `takeReferencedFormulasAndActions({ component, files })`

Full traversal:

1. Wrap entry component in `ToddleComponent`
2. Collect `formulaReferences` (all `FunctionOperation` nodes in the component tree)
3. Collect `actionReferences` (all `CustomActionModel` nodes)
4. Recursively visit unique sub-components, prefix refs with `packageName/`
5. Filter project and package formulas/actions to referenced-only set
6. Return `{ __PROJECT__: { actions, formulas }, [packageName]: { actions, formulas } }`

**No entry component:** returns all code without tree-shaking (preview mode / full-project builds).

### Traversal Scope

`formulaReferences` covers:

| Location | What Is Collected |
|----------|------------------|
| Route info | `language`, `title`, `description`, `icon`, `charset`, all `meta` entries |
| Component formulas | Each formula's `formula` field |
| Variables | `initialValue` of each variable |
| Workflows | All actions in each workflow |
| APIs | All formulas within API definitions |
| Lifecycle | `onLoad` and `onAttributeChange` |
| Text nodes | `value`, `condition`, `repeat`, `repeatKey` |
| Slot nodes | `condition` |
| Element nodes | `condition`, `repeat`, `repeatKey`, all attrs, event actions, `classes`, `style-variables`, `customProperties` |
| Component nodes | `condition`, `repeat`, `repeatKey`, all attrs, event actions, `customProperties` |

`actionReferences` covers: workflows, API callbacks (onCompleted, onFailed, onMessage), lifecycle events, node event handlers. Nested actions traversed recursively (Switch cases, Fetch callbacks, Custom event actions).

---

## Loading Custom Code at Runtime

### CSR (Page Runtime)

SSR embeds an inline script in the rendered HTML:

```html
<script type="module">
  import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
  import { loadCustomCode, formulas, actions } from '/_static/cc_PageName.js';
  initGlobalObject({ formulas, actions });
  loadCustomCode();
  createRoot(document.getElementById("App"));
</script>
```

`initGlobalObject()` stores v2 formulas/actions in `window.toddle`.

### Custom Elements

```javascript
import { defineComponents, loadCorePlugins } from '/_static/custom-element.main.esm.js';
import { formulas, actions } from '/_static/cc_ComponentName.js';
// Creates isolated toddle instance per custom element
```

### SSR

- `ToddleFormula` (declarative): evaluated server-side via the formula engine
- `CodeFormula` (JavaScript handler): not executable server-side — skipped
- Actions: not executed during SSR

---

## Package Sharing [Phase 2]

The following features are not yet implemented:

### `InstalledPackage` / `PackageManifest`

```typescript
interface InstalledPackage {
  manifest: PackageManifest;
  components: Partial<Record<string, Component>>;
  actions?: Record<string, PluginAction>;
  formulas?: Record<string, PluginFormula>;
}

interface PackageManifest {
  name: string;    // Namespace prefix (e.g., "best_like_button")
  commit: string;  // Content-addressable version hash
}
```

### Namespace System [Phase 2]

| Reference | Key Format | Example |
|-----------|-----------|---------|
| Project component | `componentName` | `HomePage` |
| Package component | `packageName/componentName` | `best_like_button/LikeButton` |
| Package formula | `packageName/formulaName` | `best_like_button/formatCount` |
| Standard library | `@toddle/name` | `@toddle/MAP` |

### Component Resolution [Phase 2]

With package scope active:
1. `files.packages[packageName].components[name]`
2. Fallback to `files.components[name]` (project-local)

Without package scope: `files.components[name]` only.

### Package Install Flow [Phase 2]

- Package registry lookup
- Version locking via `commit` SHA
- Transitive dependency resolution
- `takeIncludedComponents()` for tree-shaking package components per page

### Plugin Registry [Phase 2]

- Community marketplace
- Package discovery and search
- Version management UI
