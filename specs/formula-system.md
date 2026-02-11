# Formula System Specification

## Purpose

The Formula System is Layr's expression evaluation engine. It powers all data transformation, computation, and dynamic behavior. Every attribute binding, conditional, variable initializer, API URL, and routing decision flows through formula evaluation.

### Jobs to Be Done

- Evaluate declarative expressions (formulas) against component data context
- Support 10 operation types: value, path, function, object, array, switch, or, and, apply, record
- Provide 97 built-in formulas for common data operations
- Enable custom formulas (both code-based and formula-based)
- Support higher-order formulas (map, filter, reduce) with function arguments
- Run identically on server (SSR) and client (CSR) with environment-aware behavior

---

## Data Model

### Formula (Union Type)

All formulas are one of 10 operation types:

```
Formula =
  | ValueOperation      -- Literal constant
  | PathOperation        -- Data extraction from context
  | FunctionOperation    -- Call built-in or custom formula
  | ObjectOperation      -- Create object with computed properties
  | ArrayOperation       -- Create array with computed elements
  | SwitchOperation      -- Conditional branching
  | OrOperation          -- Short-circuit logical OR
  | AndOperation         -- Short-circuit logical AND
  | ApplyOperation       -- Call component-local formula
  | RecordOperation      -- Legacy object syntax (deprecated)
```

### ValueOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'value'` | Discriminator |
| `value` | `string \| number \| boolean \| null \| object` | Literal value |

### PathOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'path'` | Discriminator |
| `path` | `string[]` | Segments to traverse through `ComponentData` |

**Examples:**
- `["Variables", "user", "name"]` → `data.Variables.user.name`
- `["Attributes", "items"]` → `data.Attributes.items`
- `["Apis", "fetchUsers", "data"]` → `data.Apis.fetchUsers.data`
- `["Args", "item", "id"]` → `data.Args.item.id` (inside higher-order formula)
- `["ListItem", "Item"]` → `data.ListItem.Item` (inside repeat)

### FunctionOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'function'` | Discriminator |
| `name` | `string` | Formula name (e.g., `"@toddle/map"`, `"myFormula"`) |
| `package` | `string?` | Package namespace |
| `arguments` | `FunctionArgument[]` | Arguments to pass |
| `variableArguments` | `boolean?` | Allows variable argument count |
| `display_name` | `string?` | Human-readable label |

### FunctionArgument

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string?` | Argument name |
| `formula` | `Formula` | Nested formula to evaluate |
| `isFunction` | `boolean?` | If `true`, argument becomes a closure (not evaluated immediately) |
| `testValue` | `unknown?` | Test data for preview |

### ObjectOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'object'` | Discriminator |
| `arguments` | `FunctionArgument[]?` | Each entry has `name` (key) and `formula` (value) |

### ArrayOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'array'` | Discriminator |
| `arguments` | `Array<{ formula: Formula }>` | Each entry evaluates to an array element |

### SwitchOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'switch'` | Discriminator |
| `cases` | `Array<{ condition: Formula, formula: Formula }>` | Evaluated sequentially |
| `default` | `Formula` | Fallback if no case matches |

### OrOperation / AndOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'or'` or `'and'` | Discriminator |
| `arguments` | `Array<{ formula: Formula }>` | Short-circuit evaluated |

### ApplyOperation

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'apply'` | Discriminator |
| `name` | `string` | Component formula name (from `component.formulas`) |
| `arguments` | `FunctionArgument[]` | Arguments to pass |

---

## Evaluation Engine

### Core Algorithm: `applyFormula(formula, ctx)`

**Input:** Formula definition + FormulaContext
**Output:** Any value (or `null` on error)

**Evaluation by type:**

| Type | Algorithm |
|------|-----------|
| `value` | Return `formula.value` directly |
| `path` | Traverse `ctx.data` by path segments; return `null` if any segment fails |
| `switch` | Evaluate cases sequentially; return first truthy case's formula; fall through to default |
| `or` | Short-circuit: return `true` at first truthy argument; return `false` if all falsy |
| `and` | Short-circuit: return `false` at first falsy argument; return `true` if all truthy |
| `object` | Build `Record<string, unknown>` from `name`→`formula` entries |
| `array` | Build array by evaluating each element formula |
| `record` | Same as `object` (deprecated) |
| `function` | Look up formula handler, evaluate arguments, invoke (see below) |
| `apply` | Look up component formula, evaluate with caching (see below) |

### Function Invocation

1. Determine `packageName` from `formula.package ?? ctx.package`
2. Try V2 lookup: `ctx.toddle.getCustomFormula(name, packageName)`
3. If found:
   - Build named arguments object `Record<string, unknown>`
   - For `isFunction: true` args: Create closure `(Args) => applyFormula(formula, { data: { ...data, Args } })`
   - For regular args: Evaluate immediately
   - If `ToddleFormula`: Evaluate its formula definition with `Args` in data
   - If `CodeFormula`: Call `handler(args, { root, env })`
4. If not found, try legacy lookup: `ctx.toddle.getFormula(name)`
   - Build positional arguments array
   - Call `handler(args, ctx)`
5. If still not found: Log error, return `null`

### Apply Invocation (Component Formulas)

1. Look up `ctx.component.formulas[name]`
2. Build `Input` object from arguments (same `isFunction` handling)
3. Set `data.Args = Input` (with parent chaining)
4. Check memoization cache: `ctx.formulaCache[name].get(data)`
5. If cache hit: Return cached result
6. If cache miss: Evaluate formula, store in cache, return result

### Args Chaining (Nested Higher-Order Formulas)

When formulas are nested (e.g., `map` inside `map`), the `Args` context chains:

```
Outer map:  data.Args = { item: outerItem, index: 0 }
Inner map:  data.Args = { item: innerItem, index: 0, '@toddle.parent': { item: outerItem, index: 0 } }
```

Access parent with path: `["Args", "@toddle.parent", "item"]`

---

## FormulaContext

The context object passed through all formula evaluations:

| Field | Type | Description |
|-------|------|-------------|
| `data` | `ComponentData` | Current component data (Attributes, Variables, Apis, etc.) |
| `component` | `Component?` | Current component definition |
| `formulaCache` | `Record<string, { get, set }>?` | Memoization cache |
| `root` | `Document \| ShadowRoot?` | DOM root |
| `package` | `string?` | Current package namespace |
| `toddle.getFormula` | `(name) => handler?` | Legacy formula lookup |
| `toddle.getCustomFormula` | `(name, pkg?) => PluginFormula?` | V2 formula lookup |
| `toddle.errors` | `Error[]` | Error collection |
| `env` | `ToddleEnv?` | Environment context |

### ToddleEnv

**Server-side:**

| Field | Type | Value |
|-------|------|-------|
| `isServer` | `boolean` | `true` |
| `branchName` | `string` | Current branch |
| `request.headers` | `Record<string, string>` | Request headers |
| `request.cookies` | `Record<string, string>` | Request cookies |
| `request.url` | `string` | Request URL |
| `logErrors` | `boolean` | Error logging flag |

**Client-side:**

| Field | Type | Value |
|-------|------|-------|
| `isServer` | `boolean` | `false` |
| `branchName` | `string` | Current branch |
| `runtime` | `'page' \| 'custom-element' \| 'preview'` | Runtime mode |
| `logErrors` | `boolean` | Error logging flag |

---

## Formula Types

### ToddleFormula (Declarative)

Defined as a nested formula tree. Serializable, portable, and evaluatable on both server and client.

```json
{
  "name": "calculateTotal",
  "arguments": [{ "name": "items", "testValue": [] }],
  "formula": {
    "type": "function",
    "name": "@toddle/reduce",
    "arguments": [
      { "name": "Array", "formula": { "type": "path", "path": ["Args", "items"] } },
      { "name": "Formula", "isFunction": true, "formula": { "type": "function", "name": "@toddle/add", "arguments": [...] } },
      { "name": "Accumulator", "formula": { "type": "value", "value": 0 } }
    ]
  }
}
```

### CodeFormula (Imperative)

Defined as a JavaScript handler function. Not serializable; compiled into package bundles.

**V2 handler signature:** `(args: Record<string, unknown>, ctx: { root, env }) => R | null`

**Legacy handler signature:** `(args: unknown[], ctx: { component, data, root, env }) => T | null`

### Comparison

| Feature | ToddleFormula | CodeFormula |
|---------|---------------|-------------|
| Implementation | Nested formula tree | JavaScript function |
| Serializable | Yes | No (compiled) |
| Evaluation | Recursive interpretation | Direct invocation |
| Namespace | Project or package | Package only |
| Version | N/A | Legacy (array args) or V2 (named args) |

---

## Built-in Formula Categories

97 formulas organized by domain. All prefixed with `@toddle/` in the registry.

### Array (21)

`append`, `drop`, `dropLast`, `every`, `filter`, `find`, `findIndex`, `findLast`, `first`, `flatten`, `last`, `map`, `prepend`, `reduce`, `reverse`, `shuffle`, `some`, `sort_by`, `take`, `takeLast`, `unique`

### Object (8)

`deleteKey`, `entries`, `fromEntries`, `get`, `groupBy`, `keyBy`, `set`, `size`

### String (18)

`capitalize`, `concatenate`, `decodeBase64`, `decodeURIComponent`, `encodeBase64`, `encodeJSON`, `encodeURIComponent`, `join`, `lowercase`, `matches`, `parseJSON`, `parseURL`, `replaceAll`, `split`, `startsWith`, `string`, `trim`, `uppercase`

### Number (14)

`absolute`, `add`, `clamp`, `divide`, `logarithm`, `max`, `min`, `minus`, `modulo`, `multiply`, `number`, `power`, `randomNumber`, `squareRoot`

### Rounding (3)

`round`, `roundDown`, `roundUp`

### Logic & Comparison (8)

`boolean`, `equals`, `greaterOrEqual`, `greaterThan`, `lessOrEqual`, `lessThan`, `not`, `notEqual`

### Date/Time (5)

`dateFromString`, `dateFromTimestamp`, `formatDate`, `now`, `timestamp`

### Environment & DOM (8)

`branchName`, `canShare`, `currentURL`, `getElementById`, `getCookie`, `getHttpOnlyCookie`, `isServer`, `languages`, `userAgent`

### Storage (2)

`getFromLocalStorage`, `getFromSessionStorage`

### Data Utilities (7)

`defaultTo`, `includes`, `indexOf`, `lastIndexOf`, `range`, `typeOf`, `json`

### Formatting (2)

`formatDate`, `formatNumber`

---

## Higher-Order Formula Pattern

Formulas that accept function arguments (e.g., `map`, `filter`, `reduce`) use `isFunction: true`:

**Runtime behavior:**
- Regular argument: Evaluated immediately → value passed to handler
- Function argument: Wrapped in closure → `(Args) => applyFormula(formula, { data: { ...data, Args } })`

**Handler receives closures:**

```javascript
// map handler
const handler = ([items, fx]) => {
  return items.map((item, index) => fx({ item, index }))
}
```

**Args context by formula:**

| Formula | Args Shape |
|---------|------------|
| `map`, `filter`, `find`, `every`, `some`, `findIndex`, `findLast` | `{ item, index }` (arrays) or `{ key, value }` (objects) |
| `reduce` | `{ result, item, index }` or `{ result, key, value }` |
| `sort_by` | `{ item, index }` |
| `groupBy`, `keyBy` | `{ item, index }` |

### `getArgumentInputData` Export

Higher-order formulas export this function for editor autocomplete:

```javascript
export const getArgumentInputData = (items, argIndex, input) => {
  if (argIndex === 0) return input  // First arg: no Args
  if (Array.isArray(items)) {
    return { ...input, Args: { item: items[0], index: 0 } }
  }
  // ... object handling
}
```

---

## Environment-Aware Formulas

Some formulas behave differently on server vs client:

| Formula | Server | Client |
|---------|--------|--------|
| `getCookie` | Reads `env.request.cookies[name]` | Reads `document.cookie` |
| `getHttpOnlyCookie` | Reads `env.request.cookies[name]` | Returns `null` (inaccessible) |
| `currentURL` | Returns `env.request.url` | Returns `window.location.href` |
| `isServer` | Returns `true` | Returns `false` |
| `branchName` | Returns `env.branchName` | Returns `env.branchName` |

---

## Formula Registration

### Build-Time

`/packages/lib/bin/generate.js` auto-generates:
- `formulas.ts`: Exports all handler modules
- `dist/lib.ts`: Exports all formula metadata (from `formula.json` files)

### Runtime Registration

**Server (SSR):**
```
Object.entries(libFormulas) → Map with '@toddle/' prefix
getCustomFormula() → looks up project/package formulas
```

**Client (CSR):**
```
window.toddle.registerFormula('@toddle/' + name, handler, getArgumentInputData?)
window.toddle.getFormula(name) → legacy lookup
window.toddle.getCustomFormula(name, packageName) → V2 lookup
```

---

## Error Handling

### Null Propagation

All formulas are null-safe by design:

| Scenario | Result |
|----------|--------|
| Invalid input type | Return `null` |
| Path not found | Return `null` |
| Formula not found | Log error, return `null` |
| Handler throws | Catch error, push to `ctx.toddle.errors[]`, return `null` |
| Top-level error | Catch, log if `logErrors`, return `null` |

### Error Collection

Errors are accumulated in `ctx.toddle.errors[]` for debugging/reporting rather than throwing.

---

## Formula Traversal

The `getFormulasInFormula` generator recursively walks formula trees, yielding every nested formula with its path:

- Prevents infinite recursion via `visitedFormulas` set
- Follows package boundaries when expanding `ToddleFormula` definitions
- Used by: component analysis, dependency extraction, search/linting

---

## Validation

Formulas are validated via Zod schemas:

- `FormulaSchema`: Union of all operation type schemas
- `ComponentFormulaSchema`: Validates component-level formula definitions
- `libFormula.schema.json`: JSON Schema for built-in formula metadata files

### Key Constraints

- `SwitchOperation.cases` must have exactly 1 case (array length = 1)
- `FunctionArgument.name` must match the formula definition's argument name
- `PathOperation.path` must be an array of strings
- Built-in formula names must be prefixed with `@toddle/`
