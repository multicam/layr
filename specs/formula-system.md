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
2. Look up: `ctx.toddle.getCustomFormula(name, packageName)`
3. If found:
   - Build named arguments object `Record<string, unknown>`
   - For `isFunction: true` args: Create closure `(Args) => applyFormula(formula, { data: { ...data, Args } })`
   - For regular args: Evaluate immediately
   - If `ToddleFormula`: Evaluate its formula definition with `Args` in data
   - If `CodeFormula`: Call `handler(args, { root, env })`
4. If not found: Log error, return `null`

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
| `toddle.getCustomFormula` | `(name, pkg?) => PluginFormula?` | Formula lookup |
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

**Handler signature:** `(args: Record<string, unknown>, ctx: { root, env }) => R | null`

### Comparison

| Feature | ToddleFormula | CodeFormula |
|---------|---------------|-------------|
| Implementation | Nested formula tree | JavaScript function |
| Serializable | Yes | No (compiled) |
| Evaluation | Recursive interpretation | Direct invocation |
| Namespace | Project or package | Package only |

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
window.toddle.getCustomFormula(name, packageName) → lookup
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

## System Limits

### Evaluation Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxFormulaDepth` | 256 | 1,024 | Maximum AST nesting depth |
| `maxEvaluationTime` | 1,000ms | 5,000ms | Maximum evaluation time per formula |
| `maxPathLength` | 50 | 200 | Maximum segments in path operation |
| `maxSwitchCases` | 10 | 50 | Maximum cases in switch operation |
| `maxLogicalArgs` | 50 | 200 | Maximum arguments in or/and operations |
| `maxFunctionArgs` | 50 | 200 | Maximum arguments to function call |
| `maxArrayElements` | 10,000 | 100,000 | Maximum elements in array operation |

### Cycle Detection Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxApplyChain` | 100 | Maximum nested `apply` calls (A calls B calls C...) |
| `maxRecursionDepth` | 256 | Maximum call stack depth during evaluation |

### Size Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxFormulaSize` | 100 KB | Maximum serialized formula size |
| `maxResultSize` | 10 MB | Maximum result value size |

### Enforcement

- **Build time:** Formula depth validated during schema check
- **Runtime:** Depth counter tracked in evaluation context; throws `LimitExceededError` if exceeded
- **Timeout:** Evaluation wrapped in timeout; throws `EvaluationTimeoutError` if exceeded

---

## Invariants

### Structural Invariants

1. **I-FORM-TYPE:** Every formula MUST have a `type` field matching one of the 10 operation types.
2. **I-FORM-PATH-ARRAY:** `PathOperation.path` MUST be a non-empty array of strings.
3. **I-FORM-SWITCH-CASES:** `SwitchOperation.cases` MUST have at least 1 case.
4. **I-FORM-SWITCH-DEFAULT:** `SwitchOperation.default` MUST be present.
5. **I-FORM-OBJECT-NAMES:** `ObjectOperation.arguments` entries MUST have unique `name` values.

### Reference Invariants

6. **I-FORM-FUNCTION-NAME:** `FunctionOperation.name` MUST reference an existing formula (built-in or custom).
7. **I-FORM-APPLY-NAME:** `ApplyOperation.name` MUST reference a formula in `component.formulas`.
8. **I-FORM-ARG-MATCH:** `FunctionArgument.name` MUST match a parameter name in the referenced formula.

### Evaluation Invariants

9. **I-FORM-NO-CYCLE:** Formula evaluation MUST NOT create infinite cycles (A calls B, B calls A).
10. **I-FORM-ARGS-CHAIN:** Nested higher-order formulas MUST chain `Args` with `@toddle.parent`.
11. **I-FORM-CACHE-KEY:** Memoization cache key MUST be deterministic based on `ComponentData`.

### Type Invariants

12. **I-FORM-NULL-SAFE:** Formula evaluation MUST return `null` on any error, never throw to caller.
13. **I-FORM-BOOLEAN-OR-AND:** `or`/`and` operations MUST return `boolean`, not the actual value.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-FORM-TYPE, I-FORM-PATH-ARRAY | Build | Error: schema validation fails |
| I-FORM-FUNCTION-NAME | Runtime | Warning: return `null` |
| I-FORM-APPLY-NAME | Runtime | Warning: return `null` |
| I-FORM-NO-CYCLE | Runtime | Error: throw `FormulaCycleError` |
| I-FORM-NULL-SAFE | Runtime | Catch, push to errors, return `null` |

---

## Cycle Detection

### Problem Definition

Cycles occur when formula evaluation creates infinite recursion:
- **Direct:** Formula A's body contains `apply` to formula A
- **Indirect:** A → B → C → A chain
- **Cross-package:** Formula in package X calls package Y which calls package X

### Detection Strategy

1. **Stack tracking:** Maintain evaluation stack during `applyFormula()`
2. **Key generation:** Create unique key from `componentName/formulaName/argsHash`
3. **Cycle detection:** If key already in stack, cycle detected
4. **Error reporting:** Include full cycle path in error message

### Implementation

```typescript
interface EvaluationStack {
  keys: Set<string>;
  path: string[];
}

function applyFormula(formula: Formula, ctx: FormulaContext, stack?: EvaluationStack): unknown {
  stack = stack ?? { keys: new Set(), path: [] };
  
  if (formula.type === 'apply') {
    const key = `${ctx.component?.name}/${formula.name}`;
    
    if (stack.keys.has(key)) {
      throw new FormulaCycleError(
        [...stack.path, key].join(' → ')
      );
    }
    
    if (stack.keys.size > LIMITS.maxApplyChain) {
      throw new LimitExceededError('formula', 'maxApplyChain', stack.keys.size, LIMITS.maxApplyChain);
    }
    
    stack.keys.add(key);
    stack.path.push(key);
    // ... evaluate
    stack.keys.delete(key);
    stack.path.pop();
  }
}
```

### Error Format

```typescript
interface FormulaCycleError extends Error {
  type: 'formula-cycle';
  path: string[];  // ['componentA/formulaX', 'componentA/formulaY', 'componentA/formulaX']
  formulaName: string;
  componentName: string;
}
```

---

## Memoization

### Cache Behavior

Component formulas with `memoize: true` cache results:

1. **Cache key:** Deterministic hash of `ComponentData` (excluding `ListItem`, `Event`, `Args`)
2. **Cache scope:** Per-component instance (not global)
3. **Cache invalidation:** Cleared on component unmount
4. **Cache hit:** Returns cached result without re-evaluation

### Cache Key Computation

```typescript
function computeCacheKey(data: ComponentData): string {
  // Exclude volatile fields that don't affect formula result
  const stable = {
    Location: data.Location,
    Attributes: data.Attributes,
    Variables: data.Variables,
    Contexts: data.Contexts,
    Apis: data.Apis,
    Page: data.Page,
  };
  return hash(stable);
}
```

### Cache Warnings

- **Stale data risk:** Memoized formulas referencing `ListItem` or `Event` may return stale results
- **Warning at save:** Editor warns if memoized formula references volatile paths

---

## Error Attribution

### Error Context

All formula errors include attribution for debugging:

```typescript
interface FormulaEvaluationError extends Error {
  type: 'formula-evaluation';
  formulaType: string;        // 'path', 'function', 'apply', etc.
  formulaName?: string;       // For function/apply operations
  path?: string[];            // For path operations
  componentContext: string;   // Component name
  dataContext?: string;       // Relevant ComponentData path
  suggestion?: string;        // Hint for fixing the error
}
```

### Error Collection

Errors are collected rather than thrown to allow evaluation to continue:

1. Error caught at top of `applyFormula()`
2. Pushed to `ctx.toddle.errors[]`
3. Logged to console if `ctx.env.logErrors === true`
4. `null` returned to caller

### Error Recovery Patterns

| Error Type | Recovery Pattern |
|------------|-----------------|
| Path not found | Return `null`, use `defaultTo()` for fallback |
| Function not found | Return `null`, check formula registration |
| Type mismatch | Return `null`, use type-checking formulas |
| Cycle detected | Throw immediately, cannot recover |
| Timeout exceeded | Throw immediately, formula too complex |

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

---

## Changelog

### Unreleased
- Added System Limits section with evaluation, cycle detection, and size limits
- Added Invariants section with 13 structural, reference, evaluation, and type invariants
- Added Cycle Detection section with detection strategy and error format
- Added Memoization section with cache behavior, key computation, and warnings
- Added Error Attribution section with error context and recovery patterns


## Resolved Questions

| Question | Resolution | Date |
|----------|------------|------|
| 10 or 11 operations? | 10 operations (record = object alias) | 2026-02-13 |
| Depth limit? | 256 levels | 2026-02-13 |
| Memoization key? | JSON.stringify of data | 2026-02-13 |

## Implementation Notes

Implemented in:
- `packages/types/src/formula.ts` - Types
- `packages/core/src/formula/evaluate.ts` - Evaluation
- 56 tests, 96% coverage
