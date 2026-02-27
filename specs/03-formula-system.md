# 03 — Formula System

Formula evaluation engine for all data bindings, computations, and dynamic expressions in Layr. Formulas are serializable ASTs evaluated against a `ComponentData` context.

**Implementing packages:** `packages/types/src/formula.ts`, `packages/core/src/formula/evaluate.ts`, `packages/core/src/formula/context.ts`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| 10 operation types | MVP |
| `applyFormula()` evaluation engine | MVP |
| `FormulaContext` with error collection | MVP |
| Depth limit (256) | MVP |
| Memoization cache for `apply` | MVP |
| Higher-order closures with Args chaining | MVP |
| `getFormulasInFormula()` traversal | MVP |
| `record` type (backwards compat alias) | MVP |
| Server/client environment-aware formulas | MVP |
| Formula registration via `@toddle/` prefix | MVP |
| Build-time formula generation script | MVP |
| Cycle detection with stack tracking | Phase 2 |
| Formula traversal for editor autocomplete | Phase 2 |
| `getArgumentInputData` per formula export | Phase 2 |

---

## TypeScript Types

```typescript
// packages/types/src/formula.ts

export type Formula =
  | ValueOperation
  | PathOperation
  | FunctionOperation
  | ObjectOperation
  | ArrayOperation
  | SwitchOperation
  | OrOperation
  | AndOperation
  | ApplyOperation
  | RecordOperation;

export interface ValueOperation {
  type: 'value';
  value: string | number | boolean | null | object | undefined;
}

export interface PathOperation {
  type: 'path';
  path: string[];
}

export interface FunctionOperation {
  type: 'function';
  name: string;
  package?: string;
  arguments: FunctionArgument[];
  variableArguments?: boolean;
  display_name?: string;
}

export interface FunctionArgument {
  name?: string;
  formula: Formula;
  isFunction?: boolean;
}

export interface ObjectOperation {
  type: 'object';
  arguments?: FunctionArgument[];
}

export interface ArrayOperation {
  type: 'array';
  arguments: Array<{ formula: Formula }>;
}

export interface SwitchOperation {
  type: 'switch';
  cases: Array<{ condition: Formula; formula: Formula }>;
  default: Formula;
}

export interface OrOperation {
  type: 'or';
  arguments: Array<{ formula: Formula }>;
}

export interface AndOperation {
  type: 'and';
  arguments: Array<{ formula: Formula }>;
}

export interface ApplyOperation {
  type: 'apply';
  name: string;
  arguments: FunctionArgument[];
}

export interface RecordOperation {
  type: 'record';
  arguments?: FunctionArgument[];
}
```

---

## Operation Types

| Type | Purpose | Returns |
|------|---------|---------|
| `value` | Literal constant | The literal (`string`, `number`, `boolean`, `null`, `object`) |
| `path` | Data context traversal | Value at path, `null` if any segment fails |
| `function` | Call built-in or custom formula | Formula handler return value |
| `object` | Build object from named entries | `Record<string, unknown>` |
| `record` | Legacy alias for `object` | Same as `object` |
| `array` | Build array from positional entries | `unknown[]` |
| `switch` | Conditional branch (if/else-if/else) | First matching case result, or default |
| `or` | Short-circuit logical OR | `true` or `false` (not truthy value) |
| `and` | Short-circuit logical AND | `true` or `false` (not falsy value) |
| `apply` | Call component-local formula with cache | Cached or computed result |

### Key distinctions from JavaScript

- `or`/`and` return strict `boolean`, not the actual truthy/falsy value
- `path` returns `null` on any broken segment, never throws
- `record` is identical to `object` — kept for backwards compatibility with older definitions

---

## FormulaContext

All formula evaluations receive a `FormulaContext`. The context is threaded through every recursive call.

```typescript
// packages/core/src/formula/context.ts

export interface FormulaContext {
  data: ComponentData;
  component?: Component;
  formulaCache?: Record<string, {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  }>;
  root?: Document | ShadowRoot | null;
  package?: string;
  toddle: {
    getCustomFormula: (name: string, packageName?: string) => PluginFormula | undefined;
    errors: Error[];
  };
  env?: ToddleEnv;
}

type ToddleEnv = ToddleServerEnv | ToddleClientEnv;

interface ToddleServerEnv {
  isServer: true;
  branchName?: string;
  request: {
    headers: Record<string, string>;
    cookies: Record<string, string>;
    url: string;
  };
  logErrors?: boolean;
}

interface ToddleClientEnv {
  isServer: false;
  branchName?: string;
  runtime?: 'page' | 'custom-element' | 'preview';
  logErrors?: boolean;
}
```

### Context fields

| Field | Description |
|-------|-------------|
| `data` | Current `ComponentData` — the root of all path lookups |
| `component` | Component definition (for `apply` lookups and formula cache) |
| `formulaCache` | Per-component memoization cache; only used for `apply` operations on formulas with `memoize: true` |
| `root` | DOM root passed to `CodeFormula` handlers |
| `package` | Current package namespace; mutated during `function` evaluation for nested package resolution |
| `toddle.getCustomFormula` | Looks up a formula by name and package from the runtime registry |
| `toddle.errors` | Accumulates errors — never throws to callers, see Error Handling |
| `env` | Server vs client flags; `logErrors` controls `console.error` output |

### ComponentData paths

`PathOperation` traverses `ctx.data` using these top-level keys:

| Path root | Value |
|-----------|-------|
| `Variables` | Component's mutable internal state |
| `Attributes` | Input props passed from parent |
| `Apis` | API response states (`{ data, isLoading, error }`) |
| `Location` | URL state (path, query, hash, params) |
| `Contexts` | Values from ancestor context providers |
| `Page` | Page-level metadata |
| `ListItem` | Current `{ Item, Index }` inside a repeat |
| `Event` | Event payload (DOM events, API callbacks, component events) |
| `Args` | Arguments passed to the current higher-order closure |
| `Parameters` | Workflow parameters (inside workflow actions) |

---

## Evaluation Engine

### `applyFormula(formula, ctx, depth = 0): unknown`

Entry point. Dispatches on `formula.type`. The `depth` counter is threaded through every recursive call.

**Depth limit:** 256. On breach, pushes a `LimitExceededError` to `ctx.toddle.errors` and returns `null`.

**Outer try-catch:** All evaluation is wrapped. Any unhandled error is pushed to `ctx.toddle.errors`, logged if `ctx.env?.logErrors`, and `null` is returned. The engine never throws to callers.

### Evaluation rules by type

**`value`**
```
return formula.value
```

**`path`**
```
current = ctx.data
for each segment in formula.path:
  if current is null/undefined → return null
  if segment is '__proto__', 'constructor', 'prototype' → return null (prototype guard)
  if current is array and segment is numeric → current = current[parseInt(segment)]
  else if current is object and has own property segment → current = current[segment]
  else → return null
return current ?? null
```

**`switch`**
```
for each case in formula.cases:
  if toBoolean(applyFormula(case.condition)) → return applyFormula(case.formula)
return applyFormula(formula.default)
```
Only one branch evaluates. Short-circuits on first truthy condition.

**`or`**
```
for each arg in formula.arguments:
  if toBoolean(applyFormula(arg.formula)) → return true
return false
```

**`and`**
```
for each arg in formula.arguments:
  if !toBoolean(applyFormula(arg.formula)) → return false
return true
```

**`object` / `record`**
```
result = {}
for each arg in formula.arguments:
  result[arg.name] = applyFormula(arg.formula)
return result
```

**`array`**
```
return formula.arguments.map(arg => applyFormula(arg.formula))
```

**`function`** — see Function Invocation below.

**`apply`** — see Apply Invocation below.

### Function invocation

1. Resolve `packageName = formula.package ?? ctx.package`
2. Look up `ctx.toddle.getCustomFormula(formula.name, packageName)`
3. If not found: log warning, return `null`
4. Build `args` record from `formula.arguments`:
   - Regular argument (`isFunction` falsy): `args[name] = applyFormula(arg.formula, ctx, depth+1)`
   - Higher-order argument (`isFunction` true): `args[name] = (innerArgs) => applyFormula(arg.formula, {...ctx, data: {...ctx.data, Args: innerArgs}}, depth+1)`
5. Execute:
   - `ToddleFormula` (has `.formula` field): `applyFormula(formula.formula, {...ctx, data: {...ctx.data, Args: args}}, depth+1)`
   - `CodeFormula` (has `.handler` function): `handler(args, { root: ctx.root, env: ctx.env })`
6. Catch any error, push to `ctx.toddle.errors`, return `null`

**Note:** `ctx.package` is mutated to the resolved package before argument evaluation. This is intentional — nested calls within a custom formula resolve in the same package context.

### Apply invocation

`apply` calls a component-local formula from `ctx.component.formulas[formula.name]`.

1. Look up `ctx.component?.formulas?.[formula.name]`
2. If not found: log warning, return `null`
3. Build `args` record (same as function invocation, including higher-order handling)
4. If formula has `memoize: true` and `ctx.formulaCache[formula.name]` exists:
   - Compute cache key: `JSON.stringify(args)`
   - On cache hit: return cached result
   - On cache miss: evaluate, store in cache, return result
5. Evaluate: `applyFormula(componentFormula.formula, {...ctx, data: {...ctx.data, Args: args}}, depth+1)`

---

## Higher-Order Functions

Formulas accepting function arguments (e.g., `map`, `filter`, `reduce`) use `isFunction: true` on the relevant argument.

### Args chaining

When `isFunction: true` arguments invoke their closures, new `Args` nest under `@toddle.parent` to support nested higher-order calls (e.g., `map` inside `filter`):

```
Outer call: data.Args = { item: outerItem, index: 0 }
Inner call: data.Args = { item: innerItem, index: 0, "@toddle.parent": { item: outerItem, index: 0 } }
```

Construction rule:
```
if ctx.data.Args exists:
  newArgs = { ...callerArgs, "@toddle.parent": ctx.data.Args }
else:
  newArgs = callerArgs
```

Access parent with path: `["Args", "@toddle.parent", "item"]`

### Args shapes by formula

| Formula | Args shape (array input) | Args shape (object input) |
|---------|--------------------------|---------------------------|
| `map`, `filter`, `find`, `every`, `some`, `findIndex`, `findLast` | `{ item, index }` | `{ key, value }` |
| `reduce` | `{ result, item, index }` | `{ result, key, value }` |
| `sort_by`, `groupBy`, `keyBy` | `{ item, index }` | — |

---

## Formula Types (Plugin System)

### ToddleFormula

A declarative formula defined as a nested formula tree. Serializable and evaluatable on server and client.

```typescript
interface ToddleFormula {
  name: string;
  description?: string;
  arguments: Array<{ name: string; formula?: Formula; testValue?: unknown }>;
  formula: Formula;
  exported?: boolean;
  variableArguments?: boolean;
  memoize?: boolean;
}
```

Evaluated by `applyFormula(formula.formula, {...ctx, data: {...ctx.data, Args: evaluatedArgs}})`.

### CodeFormula

A formula implemented as a JavaScript function. Not serializable; compiled into package bundles.

```typescript
interface CodeFormula<Handler> {
  name: string;
  description?: string;
  arguments: Array<{ name: string; formula?: Formula; testValue?: unknown }>;
  handler: Handler; // string (server-side source) | Function (client-side)
  version?: 2;
}
```

Handler signature: `(args: Record<string, unknown>, ctx: { root?: Document | ShadowRoot; env?: ToddleEnv }) => unknown`

### PluginFormula

`type PluginFormula = ToddleFormula | CodeFormula<Handler>`

Distinguished at runtime by checking `Object.hasOwn(formula, 'formula')` for `ToddleFormula`.

| Feature | ToddleFormula | CodeFormula |
|---------|---------------|-------------|
| Serializable | Yes | No |
| Server + client | Yes | Yes |
| Scope | Project or package | Package only |
| Evaluation | Recursive `applyFormula()` | Direct `handler()` call |

---

## Error Handling

The engine never throws to callers. All errors are collected.

| Scenario | Behavior |
|----------|----------|
| Depth limit exceeded | Push `LimitExceededError` to `ctx.toddle.errors`, return `null` |
| Any uncaught exception | Catch, push to `ctx.toddle.errors`, log if `logErrors`, return `null` |
| Path segment not found | Return `null` immediately (no error pushed) |
| Formula not found by name | Log warning (if `logErrors`), return `null` |
| Component formula not found | Log warning (if `logErrors`), return `null` |
| Handler throws | Push error to `ctx.toddle.errors`, return `null` |

Errors accumulate in `ctx.toddle.errors[]` for debugging/reporting. The calling rendering pipeline receives `null` and continues.

### `toBoolean(value): boolean`

Used by `switch`, `or`, `and`:

| Value | Result |
|-------|--------|
| `null`, `undefined` | `false` |
| `boolean` | as-is |
| `number` | `false` if `NaN` or `0`, else `true` |
| `string` | `false` if empty string |
| `array` | `false` if empty |
| `object` | `false` if no own keys |

---

## System Limits

| Limit | Value | Behavior on breach |
|-------|-------|--------------------|
| `MAX_FORMULA_DEPTH` | 256 | Push error, return `null` |

Additional limits from the original spec are aspirational and not yet enforced in the current implementation. [Phase 2]

---

## Built-in Formulas

97 built-in formulas registered under the `@toddle/` namespace. All are `CodeFormula` implementations compiled into the standard library bundle.

### Categories

| Category | Count | Examples |
|----------|-------|---------|
| Array | 21 | `map`, `filter`, `find`, `reduce`, `sort_by`, `flatten`, `unique` |
| Object | 8 | `get`, `set`, `deleteKey`, `entries`, `fromEntries`, `groupBy`, `keyBy` |
| String | 18 | `concatenate`, `split`, `join`, `trim`, `uppercase`, `lowercase`, `replaceAll` |
| Number | 14 | `add`, `minus`, `multiply`, `divide`, `modulo`, `clamp`, `randomNumber` |
| Rounding | 3 | `round`, `roundDown`, `roundUp` |
| Logic / Comparison | 8 | `equals`, `not`, `greaterThan`, `lessThan`, `boolean` |
| Date / Time | 5 | `now`, `formatDate`, `timestamp`, `dateFromString`, `dateFromTimestamp` |
| Environment / DOM | 8 | `currentURL`, `isServer`, `getCookie`, `getHttpOnlyCookie`, `getElementById` |
| Storage | 2 | `getFromLocalStorage`, `getFromSessionStorage` |
| Data utilities | 7 | `defaultTo`, `includes`, `indexOf`, `range`, `typeOf`, `json` |

### Environment-aware formulas

| Formula | Server | Client |
|---------|--------|--------|
| `getCookie` | Reads `env.request.cookies[name]` | Reads `document.cookie` |
| `getHttpOnlyCookie` | Reads `env.request.cookies[name]` | Returns `null` |
| `currentURL` | Returns `env.request.url` | Returns `window.location.href` |
| `isServer` | `true` | `false` |
| `branchName` | `env.branchName` | `env.branchName` |

---

## Formula Traversal [Phase 2]

### `getFormulasInFormula(formula, ctx)`

Generator yielding every nested formula with its path. Used for dependency analysis, editor search, and linting.

- Yields `{ path: (string | number)[], formula: Formula, packageName?: string }`
- Maintains a `visitedFormulas` `Set` keyed by `[package/name]` to prevent infinite recursion in mutually-referencing formulas
- `function` type follows into global formula definitions (if not already visited)
- `apply` recurses into arguments only (not the referenced formula body)

### `getFormulasInAction(action)`

Generator yielding all formulas embedded in an action tree. See `04-action-system.md` for action-formula locations.

---

## Cross-references

- `ComponentData` shape: see `02-component-system.md`
- Signals and reactivity: see `05-signal-system.md`
- DOM rendering and formula subscriptions: see `06-rendering.md`
- Action system uses `applyFormula()` for all formula evaluations: see `04-action-system.md`
