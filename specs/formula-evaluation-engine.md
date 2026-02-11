# Formula Evaluation Engine Specification

## Purpose

The Formula Evaluation Engine is the expression evaluation core of Layr. It recursively evaluates a formula AST (Abstract Syntax Tree) against a data context, supporting 10 operation types ranging from simple value literals and path lookups to higher-order function invocations and component-scoped formula application with caching. The engine runs identically on both server (SSR) and client, never throws exceptions to callers, and integrates with a per-component formula cache for memoized `apply` operations.

### Jobs to Be Done

- Evaluate formula ASTs against component data contexts
- Resolve data paths through nested object traversal
- Invoke registered formulas (standard library and custom) with named arguments
- Support higher-order functions via closure-based argument passing with Args parent chaining
- Execute component-scoped formulas with per-component caching
- Provide short-circuit evaluation for boolean operations (or/and)
- Handle legacy formula formats (record) alongside current formats
- Traverse formula ASTs for dependency analysis and code generation

---

## Formula AST Types

### Operation Types

| Type | Purpose | Output |
|------|---------|--------|
| `value` | Literal constant | The literal value (string, number, boolean, null, object) |
| `path` | Data context lookup | Value at path, or `null` if path broken |
| `switch` | Conditional expression | Result of first matching case, or default |
| `or` | Short-circuit logical OR | `true` on first truthy, `false` if all falsy |
| `and` | Short-circuit logical AND | `false` on first falsy, `true` if all truthy |
| `function` | External formula invocation | Return value of the formula handler |
| `object` | Object literal construction | `Record<string, unknown>` from named entries |
| `record` | Legacy object construction | Same as `object` (historical alias) |
| `array` | Array literal construction | `unknown[]` from positional entries |
| `apply` | Component formula invocation | Cached or computed result of component formula |

### Type Definitions

```
Formula =
  | ValueOperation       // { type: 'value', value: string | number | boolean | null | object }
  | PathOperation        // { type: 'path', path: string[] }
  | SwitchOperation      // { type: 'switch', cases: Array<{ condition, formula }>, default }
  | OrOperation          // { type: 'or', arguments: Array<{ formula }> }
  | AndOperation         // { type: 'and', arguments: Array<{ formula }> }
  | FunctionOperation    // { type: 'function', name, package?, arguments: FunctionArgument[] }
  | ObjectOperation      // { type: 'object', arguments?: FunctionArgument[] }
  | RecordOperation      // { type: 'record', entries: FunctionArgument[] }
  | ArrayOperation       // { type: 'array', arguments: Array<{ formula }> }
  | ApplyOperation       // { type: 'apply', name, arguments: FunctionArgument[] }
```

### FunctionArgument

```
FunctionArgument = {
  name?: string          // Argument name (key in named args)
  isFunction?: boolean   // If true, argument is passed as a closure
  formula: Formula       // The formula to evaluate (or wrap as closure)
  type?: any             // Editor-only type information
  testValue?: any        // Editor-only test value
}
```

---

## Evaluation Rules

### Input Handling

`applyFormula()` accepts `Formula | string | number | undefined | null | boolean`. If the input is not a valid formula (fails `isFormula()` check), it is returned as-is. This allows raw values to pass through without wrapping.

### value

Returns `formula.value` directly. No computation.

### path

Traverses `ctx.data` using `formula.path` (array of string keys):

```
1. Start with input = ctx.data
2. For each key in formula.path:
   a. If input is an object → input = input[key]
   b. Otherwise → return null (broken path)
3. Return final input value
```

Paths are the primary mechanism for accessing component data: `['Variables', 'count']`, `['Apis', 'userApi', 'data']`, `['ListItem', 'Item']`, etc.

### switch

Evaluates cases sequentially (like if/else-if/else):

```
1. For each case in formula.cases:
   a. Evaluate case.condition
   b. If toBoolean(result) → evaluate and return case.formula
2. If no case matched → evaluate and return formula.default
```

Only one branch is evaluated (short-circuit).

### or

Short-circuit logical OR:

```
1. For each argument:
   a. Evaluate argument.formula
   b. If toBoolean(result) → return true immediately
2. If all falsy → return false
```

Returns boolean `true`/`false`, not the actual truthy/falsy value.

### and

Short-circuit logical AND:

```
1. For each argument:
   a. Evaluate argument.formula
   b. If !toBoolean(result) → return false immediately
2. If all truthy → return true
```

Returns boolean `true`/`false`.

### function

Invokes a registered formula (standard library, custom, or Toddle formula):

**Resolution order:**
1. Try `ctx.toddle.getCustomFormula(name, packageName)` — looks up v2 formulas
2. If not found → try `ctx.toddle.getFormula(name)` — looks up legacy formulas
3. If neither found → log error (if `logErrors` enabled), return `null`

**Package resolution:** `formula.package ?? ctx.package ?? undefined`. The context package is set to the resolved package before argument evaluation, enabling nested formula calls within the same package.

**Argument evaluation:**

For each argument in `formula.arguments`:
- **Regular argument** (`isFunction` falsy): Evaluate `arg.formula` immediately, pass result as value
- **Higher-order argument** (`isFunction` truthy): Wrap in a closure `(Args) => applyFormula(arg.formula, { ...ctx, data: { ...ctx.data, Args: ... } })` (see Higher-Order Functions section)

Arguments are collected as a named record: `{ [arg.name ?? index]: evaluatedValue }`.

**Execution:**

| Formula Type | Execution |
|-------------|-----------|
| `ToddleFormula` (has `.formula` field) | Recursive `applyFormula()` with `data.Args = args` |
| `CodeFormula` (has `.handler` field) | Direct call: `handler(args, { root, env })` |
| Legacy formula (bare function) | Positional call: `handler(argsArray, ctx)` |

**Error handling:** Errors from formula execution are caught, pushed to `ctx.toddle.errors`, logged if `logErrors` enabled, and `null` is returned.

### object

Constructs a plain object from named entries:

```
Object.fromEntries(
  formula.arguments.map(entry => [entry.name, applyFormula(entry.formula, ctx)])
)
```

### record

Legacy alias for `object`. Uses `formula.entries` instead of `formula.arguments`:

```
Object.fromEntries(
  formula.entries.map(entry => [entry.name, applyFormula(entry.formula, ctx)])
)
```

Exists because `object` was historically called `record` — both are supported for backwards compatibility.

### array

Constructs an array by evaluating each element:

```
formula.arguments.map(entry => applyFormula(entry.formula, ctx))
```

### apply

Invokes a component-scoped formula (defined in `ctx.component.formulas`) with caching support.

**Flow:**
1. Look up `ctx.component.formulas[formula.name]`
2. If not found → log error, return `null`
3. Build `Input` record from arguments (same higher-order handling as `function`)
4. Construct `Args` with parent chaining (see Higher-Order Functions)
5. **Cache check:** Call `ctx.formulaCache[formula.name].get(data)`
   - If `cache.hit === true` → return `cache.data` (skip evaluation)
6. Evaluate `componentFormula.formula` with `data.Args = Input`
7. **Cache store:** Call `ctx.formulaCache[formula.name].set(data, result)`
8. Return result

---

## Higher-Order Functions

### Args Parent Chaining

When a function argument is marked as `isFunction: true`, it creates a closure that can be called later with its own `Args`. To support nested higher-order calls (e.g., `map` inside `filter`), the engine chains Args contexts via a `@toddle.parent` key:

```
Outer call: Args = { item: "A", index: 0 }
Inner call: Args = { item: "X", index: 0, "@toddle.parent": { item: "A", index: 0 } }
```

**Construction:**
```
If ctx.data.Args already exists:
  newArgs = { ...callerArgs, "@toddle.parent": ctx.data.Args }
Else:
  newArgs = callerArgs
```

This enables formulas to reference parent iterator variables via `Args.@toddle.parent.item` when nested inside higher-order function chains.

### Closure Semantics

Higher-order arguments capture the current formula context at creation time but receive fresh `Args` at invocation time. The closure signature is:

```
(Args: any) => applyFormula(arg.formula, {
  ...ctx,
  data: {
    ...ctx.data,
    Args: ctx.data.Args
      ? { ...Args, "@toddle.parent": ctx.data.Args }
      : Args,
  },
})
```

---

## Formula Context

```
FormulaContext = {
  component: Component | undefined,    // Component definition (for apply lookups)
  formulaCache?: Record<string, {      // Per-component formula cache
    get: (data) => { hit: boolean, data: any },
    set: (data, result) => void,
  }>,
  data: ComponentData,                 // Current data context
  root?: Document | ShadowRoot,        // DOM root (for custom formulas)
  package: string | null,              // Current package namespace (mutable)
  toddle: {                            // Global runtime
    getFormula: FormulaLookup,         // Legacy formula lookup
    getCustomFormula: CustomFormulaHandler, // v2 formula lookup
    errors: Error[],                   // Error accumulator
  },
  env: ToddleEnv | undefined,         // Environment flags
}
```

**Note:** `ctx.package` is mutated during `function` evaluation to match the resolved package. This is intentional — it ensures nested formula calls within a custom formula resolve within the same package context.

---

## Formula Types

### ToddleFormula

A formula defined as a visual formula tree in the editor:

```
ToddleFormula = {
  name: string,
  description?: string,
  arguments: Array<{ name, formula?, testValue? }>,
  formula: Formula,          // The formula AST to evaluate
  exported?: boolean,
  variableArguments?: boolean,
}
```

Evaluated by recursively calling `applyFormula()` with `data.Args` set to the evaluated arguments.

### CodeFormula

A formula implemented as JavaScript code:

```
CodeFormula<Handler> = {
  name: string,
  description?: string,
  arguments: Array<{ name, formula?, testValue? }>,
  handler: Handler,          // string (server) or Function (client)
  version?: 2,
}
```

Server-side, `handler` is a string (source code). Client-side, it's a compiled function.

### PluginFormula

Union type: `ToddleFormula | CodeFormula<Handler>`. Distinguished by checking `Object.hasOwn(formula, 'formula')` and `isDefined(formula.formula)`.

---

## Formula Traversal

### getFormulasInFormula()

A generator function that yields all formulas (and sub-formulas) in a formula tree. Used for dependency analysis, code generation, and search indexing.

**Yields:** `{ path: (string | number)[], formula: Formula, packageName?: string }`

**Traversal rules per type:**
- `path`, `value`: Leaf nodes — no recursion
- `record`: Recurse into each `entries[i].formula`
- `function`: Recurse into arguments, then (if not already visited) follow into the global formula's definition
- `array`, `or`, `and`, `object`: Recurse into each `arguments[i].formula`
- `apply`: Recurse into each `arguments[i].formula`
- `switch`: Recurse into each case's `condition` and `formula`, plus the `default`

**Cycle prevention:** Maintains a `visitedFormulas` Set keyed by `[package/name]`. Global formulas are only traversed once, preventing infinite recursion in mutually-referencing formulas.

### getFormulasInAction()

A generator function that yields all formulas within an action tree. Handles each action type's specific formula locations:

| Action Type | Formula Locations |
|-------------|-------------------|
| `AbortFetch` | None |
| `Fetch` | `inputs[key].formula`, plus recurse into `onSuccess/onError/onMessage` actions |
| `Custom`/`undefined`/`null` | `data`, `arguments[i].formula`, plus recurse into `events[key].actions` |
| `SetVariable`, `TriggerEvent`, `TriggerWorkflowCallback` | `data` |
| `SetURLParameter` | `data` |
| `SetURLParameters` | `parameters[key]` |
| `TriggerWorkflow` | `parameters[key].formula` |
| `Switch` | `data`, `cases[i].condition`, recurse into case actions and default actions |

---

## Error Handling Strategy

The formula engine is designed to **never throw to callers**:

1. **Outer try-catch:** Wraps the entire `applyFormula()` switch statement
2. **Per-function try-catch:** Formula handler invocations (both ToddleFormula and CodeFormula) have their own catch blocks
3. **Error accumulation:** Caught errors are pushed to `ctx.toddle.errors` array
4. **Conditional logging:** Errors are only `console.error`'d when `ctx.env?.logErrors` is true
5. **Default return:** All error paths return `null`

This ensures a single broken formula never crashes the rendering pipeline — the affected binding receives `null` and rendering continues.

---

## Environment Types

```
ToddleEnv =
  | ToddleServerEnv   // { isServer: true, request: { headers, cookies, url }, logErrors }
  | ToddleClientEnv   // { isServer: false, runtime: Runtime, logErrors }
```

The `isServer` flag is available to formulas but doesn't change evaluation behavior. The `request` object on server provides access to HTTP context (headers, cookies, URL) for server-side formula evaluation.

---

## Edge Cases

- **Non-formula input:** `applyFormula()` accepts raw values (`string | number | boolean | null | undefined`) and returns them unchanged — no wrapping required
- **Broken path traversal:** If any intermediate value in a path is not an object, returns `null` immediately rather than throwing
- **Missing formula function:** Logs error and returns `null` — does not throw
- **Package context mutation:** `ctx.package` is set to the resolved package during `function` evaluation; this is intentional side-effect for nested package resolution
- **Record vs object:** Both `record` and `object` operation types produce identical output — `record` exists for backwards compatibility with older formula definitions
- **Legacy formula handler:** Falls back to positional argument array when v2 lookup fails
- **Apply without component:** If `ctx.component` is undefined, `apply` returns `null`
- **Apply cache miss on first call:** Cache always misses on first evaluation (no previous input exists)
- **Higher-order in non-nested context:** When `ctx.data.Args` is undefined (no parent higher-order call), the `@toddle.parent` key is not added — clean Args object
- **Formula cycle prevention:** `getFormulasInFormula` tracks visited formulas by `[package/name]` key, preventing infinite generator recursion through mutually-referencing global formulas
- **Or/And return booleans:** Unlike JavaScript's `||`/`&&`, the `or` and `and` operations return strict `true`/`false`, not the actual truthy/falsy values
