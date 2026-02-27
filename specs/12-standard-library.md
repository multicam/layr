# Standard Library

Built-in formulas and actions provided by `@layr/lib`. All items registered under the `@toddle/` namespace. Available identically on server (SSR) and client (CSR).

**Implementing packages:** `packages/lib/src/`

---

## Phase Summary

| Area | Status | Count |
|------|--------|-------|
| Array formulas | [MVP] Implemented | 15 |
| String formulas | [MVP] Implemented | 17 |
| Number formulas | [MVP] Implemented | 15 |
| Object formulas | [MVP] Implemented | 9 |
| Logic formulas | [MVP] Implemented | 8 |
| Comparison formulas | [MVP] Implemented | 5 |
| Utility formulas | [MVP] Implemented | 7 |
| Datetime formulas | [Phase 2] Not built | 5 |
| Environment/DOM formulas | [Phase 2] Not built | 9 |
| Storage formulas | [Phase 2] Not built | 2 |
| Actions | [MVP] Implemented | 17 |
| `setHttpOnlyCookie` action | [Phase 2] Not built | 1 |
| `setSessionCookies` action | [Deferred] Deprecated | 1 |

**Total built-in formulas: 76 implemented, ~16 Phase 2**
**Total built-in actions: 17 implemented, 2 unbuilt**

---

## Registry Pattern

### Types

```typescript
// packages/lib/src/index.ts
export type FormulaHandler = (args: Record<string, unknown>, ctx: FormulaContext) => unknown;
export type FormulaRegistry = Map<string, FormulaHandler>;
export type ActionHandler = (args: Record<string, unknown>, ctx: ActionContext) => void | Promise<void>;
export type ActionRegistry = Map<string, ActionHandler>;

export const formulas: FormulaRegistry = new Map();
export const actions: ActionRegistry = new Map();
```

### Registration

```typescript
registerFormula('@toddle/map', (args, ctx) => { /* ... */ });
registerAction('@toddle/goToURL', (args, ctx) => { /* ... */ });
```

- All names use `@toddle/` prefix (kebab-case for multi-word names)
- `registerFormula(name, handler)` and `registerAction(name, handler)` add to their respective `Map`
- `getFormula(name)` and `getAction(name)` look up by exact name
- `registerActions()` called once at module init to register all 17 actions
- Seven `register*Formulas()` functions called at module init

### Namespace

All standard library items: `@toddle/<name>` (e.g., `@toddle/map`, `@toddle/go-to-url`)

---

## Formulas

### Array (15 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `map` | `@toddle/map` | `(items: Array, fx: Fn(item, index)) → Array` | Transform each element via callback |
| `filter` | `@toddle/filter` | `(items: Array, condition: Fn(item, index)) → Array` | Keep elements where condition returns truthy |
| `reduce` | `@toddle/reduce` | `(items: Array, reducer: Fn(acc, item, index), initial) → T` | Accumulate to single value |
| `find` | `@toddle/find` | `(items: Array, condition: Fn(item, index)) → T?` | First element where condition is truthy, or `null` |
| `length` | `@toddle/length` | `(items: Array) → number` | Array length, `null` if not array |
| `join` | `@toddle/join` | `(items: Array, separator: string) → string` | Join elements into string |
| `includes` | `@toddle/includes` | `(items: Array, value) → boolean` | Whether array contains value (strict equality) |
| `index-of` | `@toddle/index-of` | `(items: Array, value) → number` | First index of value, `-1` if not found |
| `slice` | `@toddle/slice` | `(items: Array, start: number, end?: number) → Array` | Extract subarray |
| `concat` | `@toddle/concat` | `(items: Array, others: Array) → Array` | Concatenate two arrays |
| `reverse` | `@toddle/reverse` | `(items: Array) → Array` | New array in reverse order (immutable) |
| `sort` | `@toddle/sort` | `(items: Array, ascending?: boolean) → Array` | Sort by natural comparison, default ascending |
| `flat` | `@toddle/flat` | `(items: Array, depth?: number) → Array` | Flatten nested arrays, default depth 1 |
| `every` | `@toddle/every` | `(items: Array, condition: Fn(item, index)) → boolean` | True if all elements match condition |
| `some` | `@toddle/some` | `(items: Array, condition: Fn(item, index)) → boolean` | True if any element matches condition |

**Higher-order callback context:** `{ item, index }` — passed as `Args` to the inner formula.

**Unbuilt array formulas from old spec:** `append`, `prepend`, `drop`, `dropLast`, `take`, `takeLast`, `findIndex`, `findLast`, `first`, `flatten`, `shuffle`, `sort_by`, `unique` — [Phase 2]

---

### String (17 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `concatenate` | `@toddle/concatenate` | `(strings: Array) → string` | Join array of values into one string |
| `split` | `@toddle/split` | `(text: string, delimiter: string) → Array` | Split string to array |
| `uppercase` | `@toddle/uppercase` | `(text: string) → string` | Convert to uppercase |
| `lowercase` | `@toddle/lowercase` | `(text: string) → string` | Convert to lowercase |
| `trim` | `@toddle/trim` | `(text: string) → string` | Remove leading/trailing whitespace |
| `substring` | `@toddle/substring` | `(text: string, start: number, end?: number) → string` | Extract substring |
| `replace` | `@toddle/replace` | `(text: string, search: string, replace: string) → string` | Replace first occurrence |
| `replace-all` | `@toddle/replace-all` | `(text: string, search: string, replace: string) → string` | Replace all occurrences |
| `starts-with` | `@toddle/starts-with` | `(text: string, prefix: string) → boolean` | Check string prefix |
| `ends-with` | `@toddle/ends-with` | `(text: string, suffix: string) → boolean` | Check string suffix |
| `string-includes` | `@toddle/string-includes` | `(text: string, search: string) → boolean` | Check if string contains substring |
| `string-length` | `@toddle/string-length` | `(text: string) → number` | String character length |
| `char-at` | `@toddle/char-at` | `(text: string, index: number) → string?` | Character at index, `null` if out of bounds |
| `string-index-of` | `@toddle/string-index-of` | `(text: string, search: string) → number` | Position of substring, `-1` if not found |
| `pad-start` | `@toddle/pad-start` | `(text: string, length: number, pad?: string) → string` | Pad start to target length |
| `pad-end` | `@toddle/pad-end` | `(text: string, length: number, pad?: string) → string` | Pad end to target length |
| `repeat` | `@toddle/repeat` | `(text: string, count: number) → string` | Repeat string N times |

**Unbuilt string formulas from old spec:** `capitalize`, `decodeBase64`, `encodeBase64`, `decodeURIComponent`, `encodeURIComponent`, `encodeJSON`, `parseJSON`, `parseURL`, `matches` — [Phase 2]

---

### Number (15 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `add` | `@toddle/add` | `(a: number, b: number) → number` | Addition |
| `subtract` | `@toddle/subtract` | `(a: number, b: number) → number` | Subtraction |
| `multiply` | `@toddle/multiply` | `(a: number, b: number) → number` | Multiplication |
| `divide` | `@toddle/divide` | `(a: number, b: number) → number?` | Division, `null` if `b === 0` |
| `mod` | `@toddle/mod` | `(a: number, b: number) → number?` | Modulo, `null` if `b === 0` |
| `power` | `@toddle/power` | `(base: number, exponent: number) → number` | Exponentiation |
| `sqrt` | `@toddle/sqrt` | `(value: number) → number?` | Square root, `null` if negative |
| `abs` | `@toddle/abs` | `(value: number) → number` | Absolute value |
| `round` | `@toddle/round` | `(value: number, decimals?: number) → number` | Round to N decimal places (default 0) |
| `floor` | `@toddle/floor` | `(value: number) → number` | Floor (round down to integer) |
| `ceil` | `@toddle/ceil` | `(value: number) → number` | Ceiling (round up to integer) |
| `min` | `@toddle/min` | `(values: number[]) → number?` | Minimum of array, `null` if empty |
| `max` | `@toddle/max` | `(values: number[]) → number?` | Maximum of array, `null` if empty |
| `random` | `@toddle/random` | `(min?: number, max?: number) → number` | Random float in `[min, max]` (default 0–1) |
| `clamp` | `@toddle/clamp` | `(value: number, min: number, max: number) → number` | Constrain to range |

Note: `min`/`max` here take an array, unlike old spec which described two-argument versions.

**Unbuilt number formulas from old spec:** `logarithm`, `number` (type cast), `randomNumber` (integer), `squareRoot` (alias) — [Phase 2]

---

### Object (9 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `keys` | `@toddle/keys` | `(object: Object) → string[]` | Array of object keys |
| `values` | `@toddle/values` | `(object: Object) → unknown[]` | Array of object values |
| `entries` | `@toddle/entries` | `(object: Object) → [string, unknown][]` | Array of `[key, value]` pairs |
| `from-entries` | `@toddle/from-entries` | `(entries: [string, unknown][]) → Object` | Build object from entries array |
| `merge` | `@toddle/merge` | `(objects: Object[]) → Object` | Shallow merge array of objects (last wins) |
| `pick` | `@toddle/pick` | `(object: Object, keys: string[]) → Object` | New object with only specified keys |
| `omit` | `@toddle/omit` | `(object: Object, keys: string[]) → Object` | New object without specified keys |
| `has-key` | `@toddle/has-key` | `(object: Object, key: string) → boolean` | Own-property check |
| `get` | `@toddle/get` | `(object: Object, key: string, fallback?) → unknown` | Safe key lookup with optional fallback |

**Unbuilt object formulas from old spec:** `deleteKey`, `set`, `size`, `groupBy`, `keyBy` — [Phase 2]

---

### Logic (8 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `equals` | `@toddle/equals` | `(a, b) → boolean` | Deep equality via `fast-deep-equal` |
| `not-equals` | `@toddle/not-equals` | `(a, b) → boolean` | Deep inequality |
| `not` | `@toddle/not` | `(value) → boolean` | Logical negation |
| `if` | `@toddle/if` | `(condition, then, else) → unknown` | Ternary — returns `then` or `else` |
| `switch` | `@toddle/switch` | `(value, cases: Object, default?) → unknown` | Key-based dispatch into cases object |
| `is-null` | `@toddle/is-null` | `(value) → boolean` | True if `null` or `undefined` |
| `is-not-null` | `@toddle/is-not-null` | `(value) → boolean` | True if not `null` and not `undefined` |
| `is-empty` | `@toddle/is-empty` | `(value) → boolean` | True for `null`, empty string, empty array, empty object |

---

### Comparison (5 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `greater-than` | `@toddle/greater-than` | `(a: number, b: number) → boolean` | `a > b`, `false` if NaN |
| `greater-than-or-equal` | `@toddle/greater-than-or-equal` | `(a: number, b: number) → boolean` | `a >= b`, `false` if NaN |
| `less-than` | `@toddle/less-than` | `(a: number, b: number) → boolean` | `a < b`, `false` if NaN |
| `less-than-or-equal` | `@toddle/less-than-or-equal` | `(a: number, b: number) → boolean` | `a <= b`, `false` if NaN |
| `between` | `@toddle/between` | `(value: number, min: number, max: number) → boolean` | `min <= value <= max`, `false` if NaN |

---

### Utility (7 formulas) [MVP]

| Name | Registry Key | Signature | Description |
|------|-------------|-----------|-------------|
| `to-string` | `@toddle/to-string` | `(value) → string` | String coercion, empty string for null/undefined |
| `to-number` | `@toddle/to-number` | `(value) → number?` | Number coercion, `null` if NaN or null/undefined |
| `to-boolean` | `@toddle/to-boolean` | `(value) → boolean` | Truthy coercion (empty string/array/object → false) |
| `to-array` | `@toddle/to-array` | `(value) → Array` | Wrap non-arrays; pass through arrays; empty array for null |
| `type-of` | `@toddle/type-of` | `(value) → string` | Type name: `'null'`, `'array'`, `'object'`, `'string'`, `'number'`, `'boolean'` |
| `default` | `@toddle/default` | `(value, fallback) → unknown` | Return fallback if value is `null` or `undefined` |
| `first` | `@toddle/first` | `(items: Array) → unknown?` | First element, `null` if empty or non-array |
| `last` | `@toddle/last` | `(items: Array) → unknown?` | Last element, `null` if empty or non-array |
| `nth` | `@toddle/nth` | `(items: Array, index: number) → unknown?` | Element at index, `null` if out of bounds |

Note: `first`, `last`, `nth` are implemented in utility.ts (9 formulas total but listed as 7 in spec — 9 actual).

---

### Datetime (5 formulas) [Phase 2]

These formulas are documented in the old spec but not implemented in source.

| Name | Signature | Description |
|------|-----------|-------------|
| `dateFromString` | `(string) → Date` | Parse date string |
| `dateFromTimestamp` | `(number) → Date` | Create date from Unix timestamp |
| `formatDate` | `(Date, format: string, locale?) → string` | Format date using `Intl.DateTimeFormat` |
| `now` | `() → Date` | Current date/time |
| `timestamp` | `(Date) → number` | Date to Unix timestamp |

---

### Environment & DOM (9 formulas) [Phase 2]

Server/client-aware formulas. Not implemented in current source.

| Name | Server Behavior | Client Behavior |
|------|----------------|-----------------|
| `branchName` | Returns `env.branchName` | Returns `env.branchName` |
| `canShare` | Returns `false` | Returns `navigator.canShare()` |
| `currentURL` | Returns `env.request.url` | Returns `window.location.href` |
| `getElementById` | Returns `null` | Returns `document.getElementById()` |
| `getCookie` | Reads `env.request.cookies[name]` | Reads `document.cookie` |
| `getHttpOnlyCookie` | Reads `env.request.cookies[name]` | Returns `null` |
| `isServer` | Returns `true` | Returns `false` |
| `languages` | Returns `['en']` | Returns `navigator.languages` |
| `userAgent` | Returns request User-Agent | Returns `navigator.userAgent` |

---

### Storage (2 formulas) [Phase 2]

| Name | Signature | Description |
|------|-----------|-------------|
| `getFromLocalStorage` | `(key: string) → unknown` | JSON-parse from `localStorage` |
| `getFromSessionStorage` | `(key: string) → unknown` | JSON-parse from `sessionStorage` |

---

## Actions

### Local Storage (3 actions) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `saveToLocalStorage` | `@toddle/saveToLocalStorage` | `key: string, value: any` | `localStorage.setItem(key, JSON.stringify(value))` |
| `deleteFromLocalStorage` | `@toddle/deleteFromLocalStorage` | `key: string` | `localStorage.removeItem(key)` |
| `clearLocalStorage` | `@toddle/clearLocalStorage` | — | `localStorage.clear()` |

All three are no-ops if `typeof window === 'undefined'` (SSR safety).

---

### Session Storage (3 actions) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `saveToSessionStorage` | `@toddle/saveToSessionStorage` | `key: string, value: any` | `sessionStorage.setItem(key, JSON.stringify(value))` |
| `deleteFromSessionStorage` | `@toddle/deleteFromSessionStorage` | `key: string` | `sessionStorage.removeItem(key)` |
| `clearSessionStorage` | `@toddle/clearSessionStorage` | — | `sessionStorage.clear()` |

---

### Cookies (1 action implemented, 2 unbuilt) [MVP / Phase 2 / Deferred]

| Name | Registry Key | Status | Arguments |
|------|-------------|--------|-----------|
| `setCookie` | `@toddle/setCookie` | [MVP] | `name, value, expiresIn (seconds), sameSite, path` |
| `setHttpOnlyCookie` | — | [Phase 2] | Same as setCookie |
| `setSessionCookies` | — | [Deferred] | Access token, expires in (deprecated) |

`setCookie` implementation: builds cookie string with `Expires`, `Path`, `SameSite` then assigns to `document.cookie`. No-op if `typeof document === 'undefined'`.

---

### Navigation (1 action) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `goToURL` | `@toddle/goToURL` | `url: string` | `window.location.href = url`; no-op in preview mode (`ctx.preview === true`) |

---

### Events (3 actions) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `focus` | `@toddle/focus` | `element: HTMLElement` | Calls `element.focus()` |
| `preventDefault` | `@toddle/preventDefault` | — | Calls `ctx.event.preventDefault()` |
| `stopPropagation` | `@toddle/stopPropagation` | — | Calls `ctx.event.stopPropagation()` |

---

### Timers (2 actions) [MVP]

| Name | Registry Key | Arguments | Events | Cleanup |
|------|-------------|-----------|--------|---------|
| `sleep` | `@toddle/sleep` | `delay: number (ms)` | Resolves after delay | `clearTimeout` via `ctx.onUnmount` |
| `interval` | `@toddle/interval` | `delay: number (ms), onTick: Fn` | Calls `onTick()` each interval | `clearInterval` via `ctx.onUnmount` |

Both are async. `sleep` returns a `Promise<void>`.

---

### Debugging (1 action) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `logToConsole` | `@toddle/logToConsole` | `label?, data` | `console.log(label ?? 'Log', data)` |

---

### Sharing (2 actions) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `copyToClipboard` | `@toddle/copyToClipboard` | `value: string` | `navigator.clipboard.writeText(value)`; logs error on failure |
| `share` | `@toddle/share` | `url?, title?, text?` | `navigator.share(data)`; no-op if API not available; silently ignores user cancellation |

---

### Theming (1 action) [MVP]

| Name | Registry Key | Arguments | Behavior |
|------|-------------|-----------|----------|
| `setTheme` | `@toddle/setTheme` | `name: string?` | Sets `data-nc-theme` attribute on `<html>`; `null` removes attribute |

---

## Higher-Order Formula Pattern

Formulas accepting callbacks (map, filter, reduce, find, every, some) pass the callback as a function argument. The `args.fx` or `args.condition` parameter is a JS function that receives a context object:

```typescript
// Array higher-order: callback receives { item, index }
registerFormula('@toddle/map', (args, ctx) => {
  const items = args.items as any[];
  const fx = args.fx as ((item: any) => any);
  if (!Array.isArray(items) || typeof fx !== 'function') return null;
  return items.map((item, index) => fx({ item, index }));
});
```

The formula engine wraps `isFunction: true` arguments as closures before passing to handlers:

```typescript
// evaluate.ts — building args for a function formula
if (arg.isFunction) {
  args[arg.name] = (innerArgs: any) => {
    const innerCtx = { ...ctx, data: { ...ctx.data, Args: innerArgs } };
    return applyFormula(arg.formula, innerCtx, depth + 1);
  };
}
```

See spec `07-formula-system.md` for the full formula evaluation engine.

---

## Error Behavior

All formulas follow null-safe design:

| Scenario | Result |
|----------|--------|
| Invalid input type | Return `null` |
| Missing required arguments | Return `null` or safe default |
| Division by zero | Return `null` |
| Handler throws | Caught by `applyFormula` try/catch; error pushed to `ctx.toddle.errors[]`; return `null` |
| Formula not found | `console.warn`; return `null` |
| Depth limit exceeded (256) | Error pushed to `ctx.toddle.errors[]`; return `null` |

See spec `14-error-handling.md` for the full error collection and reporting system.

---

## Formula Count Summary

| Category | Implemented | Phase 2 |
|----------|-------------|---------|
| Array | 15 | ~13 (append, prepend, drop, etc.) |
| String | 17 | ~9 (base64, URI encode, regex, etc.) |
| Number | 15 | ~4 (log, integer-random, etc.) |
| Object | 9 | ~5 (set, size, groupBy, etc.) |
| Logic | 8 | 0 |
| Comparison | 5 | 0 |
| Utility | 9 | 0 |
| Datetime | 0 | 5 |
| Environment/DOM | 0 | 9 |
| Storage | 0 | 2 |
| **Total** | **78** | **~47** |
