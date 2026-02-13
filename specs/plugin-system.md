# Plugin System Specification

## Purpose

The Plugin System enables extension of Layr with custom formulas and actions beyond the standard library. It supports package-scoped registration, tree-shaking for production bundles, and different loading paths for CSR, SSR, and custom element runtimes.

### Jobs to Be Done

- Register custom formulas (pure functions) and actions (side effects) at runtime
- Support package-scoped plugins so different packages can define formulas/actions with the same name
- Tree-shake unused formulas/actions from production bundles
- Support action cleanup lifecycles (teardown on component unmount)
- Enable editor autocomplete via `getArgumentInputData` functions
- Load plugins differently for CSR (JavaScript modules), SSR (direct imports), and custom elements (bundle-embedded)

---

## API Version

### FormulaHandler

```
(args: Record<string, unknown>, ctx: { root, env }) → R | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `args` | `Record<string, unknown>` | Named arguments object |
| `ctx.root` | `Document \| ShadowRoot` | DOM root |
| `ctx.env` | `ToddleEnv` | Runtime environment |

Returns the formula result or `null` on error. Minimal context (no component/data access).

### ActionHandler

```
(args: Record<string, unknown>, ctx: { triggerActionEvent, root }, event?) → void | (() → void) | Promise<void> | Promise<(() → void)>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `args` | `Record<string, unknown>` | Named arguments object |
| `ctx.triggerActionEvent` | `(trigger, data, event?) → void` | Emits action events |
| `ctx.root` | `Document \| ShadowRoot` | DOM root |
| `event` | `Event?` | Original DOM event |

Can return a cleanup function (sync or async) that runs on component unmount.

---

## Registration API

### Legacy Registration (v1)

```
toddle.registerFormula(name: string, handler: FormulaHandler, getArgumentInputData?: Function)
toddle.registerAction(name: string, handler: ActionHandler)
```

- Stores in flat maps (`legacyFormulas`, `legacyActions`)
- Duplicate names log `console.error` and are rejected
- Standard library registered as `@toddle/{name}` (e.g., `@toddle/MAP`)

### V2 Registration

V2 plugins are stored in nested records:

```
toddle.formulas[packageName][formulaName] = { handler, arguments, ... }
toddle.actions[packageName][actionName] = { handler, arguments, ... }
```

- Package name scopes the plugin
- `__PROJECT__` is replaced with the actual project ID during bundling

---

## Lookup Resolution

### Formula Lookup

1. **Lookup** via `getCustomFormula(name, packageName)`:
   - Check `toddle.formulas[packageName][name]`
   - Fallback to `toddle.formulas[projectId][name]`
2. **Not found**: log error, return `null`

### Action Lookup

1. **Lookup** via `getCustomAction(name, packageName)`:
   - Check `toddle.actions[packageName][name]`
   - Fallback to `toddle.actions[projectId][name]`
2. **Not found**: log `console.error("Missing custom action", name)`, return

---

## Formula Types

### Code Formula

A formula implemented in JavaScript code.

| Field | Type | Description |
|-------|------|-------------|
| `handler` | `FormulaHandler` | The JavaScript handler function |
| `arguments` | `Array<{ name, ... }>` | Argument definitions |
| `version` | `2?` | Version indicator |

### Toddle Formula

A formula composed entirely from other formulas (no JavaScript code). Enables SSR support since it doesn't require a JS runtime.

| Field | Type | Description |
|-------|------|-------------|
| `formula` | `Formula` | The formula composition tree |
| `arguments` | `Array<{ name, ... }>` | Argument definitions |

### Dispatch Logic

When `applyFormula` encounters a `function` type formula:

1. Resolve handler via `getCustomFormula(name, package)`
2. Evaluate arguments (handling function arguments specially — see below)
3. If **Toddle formula**: recursively call `applyFormula` with `{ data: { ...data, Args: evaluatedArgs } }`
4. If **Code formula**: call `handler(args, { root, env })`
5. If **not found**: log error, return `null`

---

## Function Arguments

Some formula arguments are themselves functions (e.g., `map`'s callback). These are identified by `arg.isFunction: true`.

### Evaluation

- **Regular argument**: `applyFormula(arg.formula, ctx)` — evaluated immediately
- **Function argument**: `(Args) => applyFormula(arg.formula, { ...ctx, data: { ...data, Args } })` — deferred, called by the formula handler with `Args` data

### Argument Input Data

`getArgumentInputData(formulaName, args, argIndex, data)` transforms the available data context for function argument autocomplete. For example:

- `map`'s second argument gets `{ ...input, Args: { item: items[0], index: 0 } }`
- `filter`'s second argument gets `{ ...input, Args: { item: items[0], index: 0 } }`
- First arguments and non-function arguments return unchanged input

This enables the editor to show contextual autocomplete (e.g., `Args.item`, `Args.index` inside a map callback).

---

## Action Cleanup Lifecycle

Action handlers can return a cleanup function:

```
handler(args, ctx, event) → void | (() → void) | Promise<(() → void)>
```

If a cleanup function is returned:
1. A signal subscription is created on the component's data signal
2. The subscription's `destroy` callback calls the cleanup function
3. When the component unmounts → signal destroyed → `destroy` called → cleanup runs

For async cleanup:
1. Handler returns `Promise<(() → void)>`
2. On destroy, the promise is awaited, then the resolved function is called
3. Errors are caught and logged

---

## Loading Mechanisms

### CSR (Page Runtime)

1. SSR renders HTML with embedded script:
   ```html
   <script type="module">
     import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
     import { loadCustomCode, formulas, actions } from '/.toddle/custom-code.js?entry=PageName';
     initGlobalObject({ formulas, actions });
     loadCustomCode();
     createRoot(document.getElementById("App"));
   </script>
   ```
2. `initGlobalObject()` stores v2 formulas/actions and registers standard library
3. `loadCustomCode()` executes legacy code (calls `registerFormula`/`registerAction`)

### Custom Elements

1. Bundle imports runtime and custom code:
   ```javascript
   import { defineComponents, loadCorePlugins } from '/_static/custom-element.main.esm.js';
   import { loadCustomCode, formulas, actions } from '/.toddle/custom-code.js?entry=ComponentName';
   ```
2. Creates isolated `toddle` instance with separate registries
3. `loadCorePlugins(toddle)` iterates all `@layr/std-lib` exports and registers them
4. `loadCustomCode()` handles legacy registrations

### SSR

1. Standard library formulas imported directly from `@layr/std-lib`
2. Registered as `@toddle/{name}` in formula context
3. Custom code support limited:
   - **Toddle formulas** (pure compositions) — supported
   - **Code formulas** (JavaScript handlers) — NOT supported (no JS runtime in SSR)
   - **Actions** — NOT supported (SSR doesn't execute actions)

### Editor Preview

1. Standard library loaded same as page runtime
2. Packages loaded via `packages` PostMessage with namespaced formulas/actions
3. Hot-reload support: clear non-`@toddle/*` entries before re-registration
4. Core `@toddle/*` plugins are never cleared during hot-reload

---

## Custom Code Bundling

### Code Generation (`generateCustomCodeFile`)

Produces a JavaScript module per component entry point:

1. **Package scoping** — `__PROJECT__` replaced with actual project ID
2. **Handler wrapping** — each handler wrapped in IIFE with safe function name
3. **Tree-shaking** — only referenced formulas/actions included

### Reference Collection (`takeReferencedFormulasAndActions`)

1. Traverse component tree starting from entry component
2. Collect all formula/action references (including from sub-components)
3. Handle package-scoped references with `packageName/name` format
4. Filter code files to only include referenced items
5. If no entry component specified, include everything (for generic bundles)

---

## Standard Library Registration

All `@layr/std-lib` formulas and actions are registered with `@toddle/` prefix:

- **96+ formulas**: `@toddle/MAP`, `@toddle/FILTER`, `@toddle/GET`, `@toddle/ADD`, etc.
- **20+ actions**: `@toddle/goToURL`, `@toddle/copyToClipboard`, `@toddle/setTheme`, etc.

Each formula module exports:
- `default` — the handler function
- `getArgumentInputData` (optional) — autocomplete context transformer

Each action module exports:
- `default` — the handler function

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing formula | Log error, return `null` |
| Missing action | Log `console.error("Missing custom action", name)` |
| Formula handler throws | Catch error, push to `toddle.errors[]`, return `null` |
| Action cleanup throws | Catch and log error |
| Duplicate registration | Log `console.error`, reject duplicate |
| Custom code fails to load | Element still renders; custom formulas/actions undefined |

---

## Dependencies

- **Formula System** — `applyFormula()` dispatches to plugin handlers
- **Action System** — `handleAction()` dispatches to plugin action handlers
- **Signal System** — Action cleanup tied to signal destruction
- **@layr/std-lib** — Standard library providing 96+ formulas and 20+ actions

---

## System Limits

### Execution Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxDepth` | 256 | Maximum execution depth |
| `maxTime` | 1,000ms | Maximum execution time |
| `maxOperations` | 10,000 | Maximum operations |

### Enforcement

- **Depth limit:** Throw `LimitExceededError`
- **Time limit:** Log warning, continue
- **Operations limit:** Truncate with warning

---

## Invariants

### Execution Invariants

1. **I-EX-DETERMINISTIC:** Same inputs produce same outputs.
2. **I-EX-NO-SIDE-EFFECTS:** Execution MUST NOT modify inputs.
3. **I-EX-NULL-SAFE:** Errors MUST return null.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-EX-DETERMINISTIC | Testing | CI failure |
| I-EX-NO-SIDE-EFFECTS | Testing | CI failure |
| I-EX-NULL-SAFE | Runtime | Return null |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `ExecutionError` | Execution fails | Return null |
| `TimeoutError` | Time limit exceeded | Return null |
| `DepthError` | Depth exceeded | Throw |

---

## Changelog

### Unreleased
- Added System Limits section with execution limits
- Added Invariants section with 3 execution invariants
- Added Error Handling section with error types
