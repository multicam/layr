# Standard Library Specification

## Purpose

The Standard Library (`@layr/std-lib`, formerly `@toddle/std-lib`) provides the built-in formulas and actions available to all Layr components. It includes 97 formulas across 10 categories and 19 actions across 8 categories, all prefixed with `@toddle/` in the runtime registry.

### Jobs to Be Done

- Provide a comprehensive set of data transformation formulas
- Provide built-in actions for common side effects
- Support higher-order formulas (map, filter, reduce) with closure arguments
- Run identically on server (SSR) and client (CSR) with environment-aware behavior
- Auto-generate registry files from individual formula/action modules

---

## Formula Categories

### Array (21 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `append` | `(Array, Value) → Array` | Add element to end |
| `drop` | `(Array, Count) → Array` | Remove first N elements |
| `dropLast` | `(Array, Count) → Array` | Remove last N elements |
| `every` | `(Array, Fn(item,index)→bool) → bool` | All elements match predicate |
| `filter` | `(Array, Fn(item,index)→bool) → Array` | Keep matching elements |
| `find` | `(Array, Fn(item,index)→bool) → T?` | First matching element |
| `findIndex` | `(Array, Fn(item,index)→bool) → number` | Index of first match (-1 if none) |
| `findLast` | `(Array, Fn(item,index)→bool) → T?` | Last matching element |
| `first` | `(Array) → T?` | First element |
| `flatten` | `(Array) → Array` | Flatten one level of nesting |
| `last` | `(Array) → T?` | Last element |
| `map` | `(Array, Fn(item,index)→T2) → Array` | Transform each element |
| `prepend` | `(Array, Value) → Array` | Add element to start |
| `reduce` | `(Array, Fn(result,item,index)→T, Init) → T` | Accumulate to single value |
| `reverse` | `(Array) → Array` | Reverse order |
| `shuffle` | `(Array) → Array` | Random order |
| `some` | `(Array, Fn(item,index)→bool) → bool` | Any element matches predicate |
| `sort_by` | `(Array, Fn(item,index)→comparable) → Array` | Sort by derived value |
| `take` | `(Array, Count) → Array` | Keep first N elements |
| `takeLast` | `(Array, Count) → Array` | Keep last N elements |
| `unique` | `(Array) → Array` | Remove duplicates |

**Higher-order Args context (Arrays):** `{ item, index }`
**Higher-order Args context (Objects):** `{ key, value }`
**Reduce Args context:** `{ result, item, index }` or `{ result, key, value }`

### Object (8 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `deleteKey` | `(Object, Key) → Object` | Remove key from object |
| `entries` | `(Object) → Array<[key, value]>` | Object to entries array |
| `fromEntries` | `(Array<[key, value]>) → Object` | Entries array to object |
| `get` | `(Object, Key) → unknown` | Get value by key |
| `groupBy` | `(Array, Fn(item,index)→string) → Object` | Group array elements by key |
| `keyBy` | `(Array, Fn(item,index)→string) → Object` | Index array by key |
| `set` | `(Object, Key, Value) → Object` | Set key in object (immutable) |
| `size` | `(Object) → number` | Count of keys |

### String (18 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `capitalize` | `(String) → String` | Capitalize first letter |
| `concatenate` | `(...args) → String` | Join values into string |
| `decodeBase64` | `(String) → String` | Decode Base64 |
| `decodeURIComponent` | `(String) → String` | Decode URI component |
| `encodeBase64` | `(String) → String` | Encode to Base64 |
| `encodeJSON` | `(Value) → String` | `JSON.stringify()` |
| `encodeURIComponent` | `(String) → String` | Encode URI component |
| `join` | `(Array, Separator) → String` | Join array to string |
| `lowercase` | `(String) → String` | Convert to lowercase |
| `matches` | `(String, Regex) → boolean` | Regex match test |
| `parseJSON` | `(String) → unknown` | `JSON.parse()` |
| `parseURL` | `(String) → URL object` | Parse URL string |
| `replaceAll` | `(String, Search, Replace) → String` | Replace all occurrences |
| `split` | `(String, Separator) → Array` | Split string to array |
| `startsWith` | `(String, Prefix) → boolean` | Check string prefix |
| `string` | `(Value) → String` | Convert to string |
| `trim` | `(String) → String` | Remove leading/trailing whitespace |
| `uppercase` | `(String) → String` | Convert to uppercase |

### Number (14 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `absolute` | `(Number) → Number` | Absolute value |
| `add` | `(A, B) → Number` | Addition |
| `clamp` | `(Value, Min, Max) → Number` | Constrain to range |
| `divide` | `(A, B) → Number` | Division |
| `logarithm` | `(Number) → Number` | Natural logarithm |
| `max` | `(A, B) → Number` | Maximum of two values |
| `min` | `(A, B) → Number` | Minimum of two values |
| `minus` | `(A, B) → Number` | Subtraction |
| `modulo` | `(A, B) → Number` | Remainder |
| `multiply` | `(A, B) → Number` | Multiplication |
| `number` | `(Value) → Number` | Convert to number |
| `power` | `(Base, Exponent) → Number` | Exponentiation |
| `randomNumber` | `(Min, Max) → Number` | Random integer in range |
| `squareRoot` | `(Number) → Number` | Square root |

### Rounding (3 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `round` | `(Number, Decimals?) → Number` | Round to nearest |
| `roundDown` | `(Number, Decimals?) → Number` | Floor |
| `roundUp` | `(Number, Decimals?) → Number` | Ceil |

### Logic & Comparison (8 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `boolean` | `(Value) → boolean` | Convert to boolean |
| `equals` | `(A, B) → boolean` | Deep equality |
| `greaterOrEqual` | `(A, B) → boolean` | `>=` comparison |
| `greaterThan` | `(A, B) → boolean` | `>` comparison |
| `lessOrEqual` | `(A, B) → boolean` | `<=` comparison |
| `lessThan` | `(A, B) → boolean` | `<` comparison |
| `not` | `(Value) → boolean` | Logical negation |
| `notEqual` | `(A, B) → boolean` | Deep inequality |

### Date/Time (5 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `dateFromString` | `(String) → Date` | Parse date string |
| `dateFromTimestamp` | `(Number) → Date` | Create date from timestamp |
| `formatDate` | `(Date, Format, Locale?) → String` | Format date to string |
| `now` | `() → Date` | Current date/time |
| `timestamp` | `(Date) → Number` | Date to Unix timestamp |

### Environment & DOM (9 formulas)

| Formula | Server Behavior | Client Behavior |
|---------|----------------|-----------------|
| `branchName` | Returns `env.branchName` | Returns `env.branchName` |
| `canShare` | Returns `false` | Returns `navigator.canShare()` result |
| `currentURL` | Returns `env.request.url` | Returns `window.location.href` |
| `getElementById` | Returns `null` | Returns `document.getElementById()` |
| `getCookie` | Reads `env.request.cookies[name]` | Reads `document.cookie` |
| `getHttpOnlyCookie` | Reads `env.request.cookies[name]` | Returns `null` (inaccessible) |
| `isServer` | Returns `true` | Returns `false` |
| `languages` | Returns `['en']` | Returns `navigator.languages` |
| `userAgent` | Returns request User-Agent | Returns `navigator.userAgent` |

### Storage (2 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `getFromLocalStorage` | `(Key) → unknown` | Read and JSON parse from `localStorage` |
| `getFromSessionStorage` | `(Key) → unknown` | Read and JSON parse from `sessionStorage` |

### Data Utilities (7 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `defaultTo` | `(Value, Default) → unknown` | Return default if value is null/undefined |
| `includes` | `(Array\|String, Value) → boolean` | Check if collection contains value |
| `indexOf` | `(Array\|String, Value) → number` | First index of value (-1 if not found) |
| `lastIndexOf` | `(Array\|String, Value) → number` | Last index of value |
| `range` | `(Start, End, Step?) → Array<number>` | Generate number sequence |
| `typeOf` | `(Value) → string` | Type name (`'string'`, `'number'`, `'array'`, `'object'`, `'null'`, etc.) |
| `json` | `(Value) → unknown` | Deep clone via JSON round-trip |

### Formatting (2 formulas)

| Formula | Signature | Description |
|---------|-----------|-------------|
| `formatDate` | `(Date, Format, Locale?) → String` | Format date with Intl.DateTimeFormat |
| `formatNumber` | `(Number, Locale?, Options?) → String` | Format number with Intl.NumberFormat |

---

## Action Categories

### Local Storage (3 actions)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `saveToLocalStorage` | Key (string), Value (any) | `localStorage.setItem(key, JSON.stringify(value))` |
| `deleteFromLocalStorage` | Key (string) | `localStorage.removeItem(key)` |
| `clearLocalStorage` | — | `localStorage.clear()` |

### Session Storage (3 actions)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `saveToSessionStorage` | Key (string), Value (any) | `sessionStorage.setItem(key, JSON.stringify(value))` |
| `deleteFromSessionStorage` | Key (string) | `sessionStorage.removeItem(key)` |
| `clearSessionStorage` | — | `sessionStorage.clear()` |

### Cookies (3 actions)

| Action | Arguments | Events |
|--------|-----------|--------|
| `setCookie` | Name, Value, Expires in, SameSite, Path, Include Subdomains | Success, Error |
| `setHttpOnlyCookie` | Same as setCookie | Success, Error |
| `setSessionCookies` | Access token, Expires in | — (deprecated) |

### Navigation (1 action)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `gotToURL` | URL (string) | Sets `window.location.href` (blocked in preview) |

### Events (3 actions)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `focus` | Element (DOM element) | Calls `element.focus()` |
| `preventDefault` | — | Calls `event.preventDefault()` |
| `stopPropagation` | — | Calls `event.stopPropagation()` |

### Timers (2 actions)

| Action | Arguments | Events | Cleanup |
|--------|-----------|--------|---------|
| `sleep` | Delay in ms | `tick` | Clears timeout on unmount |
| `interval` | Interval in ms | `tick` | Clears interval on unmount |

### Debugging (1 action)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `logToConsole` | Label, Data | `console.log(label, data)` |

### Sharing (2 actions)

| Action | Arguments | Behavior |
|--------|-----------|----------|
| `copyToClipboard` | Value (string) | `navigator.clipboard.writeText(value)` |
| `share` | URL?, Title?, Text? | `navigator.share(data)` |

### Theming (1 action)

| Action | Arguments | Events | Behavior |
|--------|-----------|--------|----------|
| `setTheme` | Name (string or null) | Success, Error | Sets theme cookie, null resets |

---

## Registration

### Build-Time Generation

`/packages/lib/bin/generate.js` auto-generates:
- `formulas.ts`: Exports all handler modules
- `dist/lib.ts`: Exports all formula metadata (from `formula.json` files)

### Runtime Registration

**Server (SSR):**
- Core formulas loaded from `@layr/std-lib` exports
- `getFormula()` looks up by name with `@toddle/` prefix
- `getCustomFormula()` returns only `ToddleFormula` types (no code formulas in SSR)

**Client (CSR):**
- `window.toddle.registerFormula('@toddle/' + name, handler, getArgumentInputData?)`
- `window.toddle.registerAction('@toddle/' + name, handler)`
- All built-in formulas/actions registered during `initGlobalObject()`

### Namespace

All standard library items prefixed with `@toddle/` in the registry (e.g., `@toddle/map`, `@toddle/filter`).

---

## Higher-Order Formula Pattern

Formulas accepting function arguments use `isFunction: true` on `FunctionArgument`:

- Regular argument: Evaluated immediately → value passed to handler
- Function argument: Wrapped in closure → `(Args) => applyFormula(formula, { data: { ...data, Args } })`

### Handler Pattern

```javascript
// map handler
const handler = ([items, fn]) => {
  if (Array.isArray(items)) {
    return items.map((item, index) => fn({ item, index }))
  }
  // Object support
  return Object.fromEntries(
    Object.entries(items).map(([key, value]) => [key, fn({ key, value })])
  )
}
```

### `getArgumentInputData` Export

Each higher-order formula exports this function for editor autocomplete:

```javascript
export const getArgumentInputData = (items, argIndex, input) => {
  if (argIndex === 0) return input  // First arg: no Args context
  if (Array.isArray(items)) {
    return { ...input, Args: { item: items[0], index: 0 } }
  }
  return { ...input, Args: { key: Object.keys(items)[0], value: Object.values(items)[0] } }
}
```

---

## Error Handling

All formulas follow null-safe design:

| Scenario | Result |
|----------|--------|
| Invalid input type | Return `null` |
| Missing arguments | Return `null` |
| Handler throws | Catch, push to `ctx.toddle.errors[]`, return `null` |
| Formula not found | Log error, return `null` |

---

## Metadata Files

Each formula includes a `formula.json` metadata file:

| Field | Description |
|-------|-------------|
| `name` | Display name |
| `description` | Human-readable description |
| `arguments` | Argument definitions with names, types, defaults |
| `testCases` | Example inputs and expected outputs |
| `category` | Category for editor organization |

Validated against `libFormula.schema.json`.
