# Legacy Compatibility & Migration System

## Purpose

The Legacy Compatibility and Migration System handles backwards compatibility with Layr's v1 APIs, legacy formulas, and legacy actions. It provides runtime execution of v1 constructs, detection of deprecated patterns via linting rules, and automated transformation of legacy constructs to their modern v2 equivalents. The system ensures existing projects continue to function while providing a clear, automated migration path.

### Jobs to Be Done

- Execute v1 legacy APIs at runtime with a different proxy pattern and simpler request construction
- Detect legacy formulas (UPPERCASE naming convention, no version field) across the project
- Auto-fix 50+ legacy formula names to modern `@toddle/` namespaced equivalents
- Transform structural formula changes (AND→`and` operation, OR→`or` operation, IF→`switch` operation, LIST→`array` operation)
- Detect and auto-fix 10+ legacy action types to modern equivalents
- Rename legacy argument names to match modern conventions
- Distinguish v1 APIs from v2 APIs throughout the rendering and evaluation pipeline

---

## Key Files

| File | Package | Responsibility |
|------|---------|----------------|
| `packages/runtime/src/api/createAPI.ts` | `@layr/runtime` | Legacy v1 API runtime client |
| `packages/search/src/rules/issues/formulas/legacyFormulaRule.ts` | `@layr/search` | Legacy formula detection rule |
| `packages/search/src/rules/issues/formulas/legacyFormulaRule.fix.ts` | `@layr/search` | Legacy formula auto-fix transformations (660 lines, 50+ mappings) |
| `packages/search/src/rules/issues/actions/legacyActionRule.ts` | `@layr/search` | Legacy action detection rule |
| `packages/search/src/rules/issues/actions/legacyActionRule.fix.ts` | `@layr/search` | Legacy action auto-fix transformations |
| `packages/search/src/util/helpers.ts` | `@layr/search` | `isLegacyAction()`, argument renaming utilities |
| `packages/core/src/api/api.ts` | `@layr/core` | `isLegacyApi()` detection function |
| `packages/core/src/api/LegacyToddleApi.ts` | `@layr/core` | Legacy API wrapper class for traversal |

---

## Version Detection

### API Version Detection

**Function:** `isLegacyApi(api)`

**Source:** `packages/core/src/api/api.ts:22-25`

| Input | Result |
|-------|--------|
| Instance of `LegacyToddleApi` wrapper class | Legacy (v1) |
| API object has no `version` field | Legacy (v1) |
| `version === 2` | Modern (v2) |

Used throughout the system to dispatch between v1 and v2 processing paths: different URL construction, proxy routing, response handling, and SSR evaluation.

### Formula Version Detection

**Function:** `isLegacyFormula(formula, files)`

**Source:** `packages/search/src/rules/issues/formulas/legacyFormulaRule.ts:42-59`

A formula is classified as legacy when ALL of these conditions are met:
1. Name is ALL UPPERCASE (e.g., `AND`, `IF`, `FILTER`)
2. The formula exists in `files.formulas` (registered as a plugin)
3. It is NOT a `ToddleFormula` (not a visual formula tree)
4. It has no `version` field
5. Its lowercase name matches either a built-in formula or a known legacy formula

### Action Version Detection

**Function:** `isLegacyAction(model)`

**Source:** `packages/search/src/util/helpers.ts:51-62`

An action is classified as legacy when:
1. `model.type` is `'Custom'` or `undefined`
2. `model.version` is falsy (modern actions have `version >= 2`)
3. `model.name` is in the `LEGACY_CUSTOM_ACTIONS` set

---

## Legacy API Runtime (v1)

### Overview

The v1 API system (`createLegacyAPI()`) provides a simpler API client than v2, with a different proxy routing pattern, throttle support (not available in v2), and direct name-based SSR cache lookup.

**Source:** `packages/runtime/src/api/createAPI.ts`

### Key Differences from v2

| Aspect | v1 Legacy | v2 Modern |
|--------|-----------|-----------|
| **Proxy URL** | `/_query/{ComponentName}.{QueryName}` | `/.toddle/omvej/components/{name}/apis/{name}:{api}` |
| **Proxy payload** | Full `ApiRequest` as POST JSON body | Original request with `x-nordcraft-url` header |
| **Direct mode** | `api.proxy === false` → direct fetch | `server.proxy.enabled` formula evaluates to falsy |
| **URL construction** | Manual string concatenation: `baseUrl + urlPath + queryString` | `createApiRequest()` with URL object manipulation |
| **Path segments** | Array of `{ formula }` joined with `/` | Record with `{ formula, index }` sorted by index |
| **Query params** | Simple `name=value` encoding | Nested object/array encoding with bracket notation |
| **Headers** | Formula-evaluated map (supports legacy formula-as-whole-object) | Per-header with conditional `enabled` formula |
| **Body encoding** | Content-Type switch (JSON, form-data, URL-encoded, text) | Same + multipart boundary handling |
| **Debounce** | Static number: `api.debounce` | Formula-evaluated: `api.client.debounce.formula` |
| **Throttle** | Supported: `api.throttle` | Not supported |
| **Cache lookup** | By API name: `pageState.Apis[api.name]` | By request hash: `pageState.Apis[requestHash()]` |
| **Response parsing** | `parseJSONWithDate()` (attempts JSON, falls back to text) | Content-Type-based routing (JSON, text, SSE, NDJSON, blob) |
| **Streaming** | Not supported | SSE, JSON-stream, text streaming |
| **Error detection** | `!response.ok` (no custom formula) | Custom `isError` formula with isolated context |
| **Redirect rules** | Not supported | Formula-evaluated redirect rules per API |
| **Abort handling** | Single `ctx.abortSignal` | `ApiAbortHandler` with per-request controllers |
| **Race condition protection** | None | Timestamp-based ordering |
| **Credentials** | Not configurable | `api.client.credentials` option |

### V1 Request Construction

```
constructPayload(api, data) → ApiRequest:
  1. Evaluate URL formula → baseUrl
  2. Evaluate path segments → join with "/" → urlPath
  3. Build query string from queryParams array → "?key=value&key2=value2"
  4. Evaluate headers (supports legacy formula-as-whole-object format)
  5. Evaluate body with Content-Type-aware encoding
  6. Return { url: baseUrl + urlPath + queryString, method, auth, headers, body }
```

### V1 Proxy Routing

When `api.proxy !== false`:
```
POST /_query/{encodeURIComponent(componentName)}.{encodeURIComponent(apiName)}
Content-Type: application/json
Body: { url, method, auth, headers, body }
```

The proxy endpoint reconstructs the original request from the JSON payload.

### V1 Throttle Mechanism

Unlike v2's debounce-only approach, v1 supports both:

- **Debounce** (delay until idle): Clear previous timer, set new timer
- **Throttle** (limit rate): If timer active, drop request. Otherwise execute and set cooldown timer.

### V1 SSR Cache Lookup

V1 APIs use name-based cache lookup (not hash-based):
```
const cached = ctx.toddle?.pageState?.Apis?.[api.name]
```

Only root component APIs check the cache (`ctx.isRootComponent` guard). If cached data is a string, it's re-parsed with `parseJSONWithDate()` to restore date objects.

---

## Legacy Formula Migration

### Detection Rule

**Code:** `legacy formula`
**Level:** `warning`
**Category:** `Deprecation`

Reports all formulas matching the legacy detection criteria. Offers the `replace-legacy-formula` fix for all legacy formulas except `TYPE` and `BOOLEAN`, which cannot be auto-fixed because their semantics changed between versions.

### Legacy Formula Categories

#### Known Legacy Formulas (34 entries)

Formulas that existed as built-in v1 functions with UPPERCASE names and different argument conventions:

`AND`, `CONCAT`, `DEFAULT`, `DELETE`, `DROP_LAST`, `EQ`, `FIND INDEX`, `FLAT`, `GT`, `GTE`, `GROUP_BY`, `IF`, `INDEX OF`, `JSON_PARSE`, `KEY_BY`, `LIST`, `LOWER`, `LT`, `LTE`, `MOD`, `NEQ`, `OR`, `RANDOM`, `SIZE`, `SQRT`, `STARTS_WITH`, `TAKE_LAST`, `TYPE`, `UPPER`, `URI_ENCODE`

#### Built-in Formula Upgrades (86 entries)

Standard library formulas that were registered without the `@toddle/` namespace prefix:

`ABSOLUTE`, `ADD`, `APPEND`, `BOOLEAN`, `CAPITALIZE`, `CLAMP`, `DIVIDE`, `DROP`, `ENTRIES`, `EVERY`, `FILTER`, `FIND`, `FLATTEN`, `GET`, `INCLUDES`, `JOIN`, `MAP`, `MAX`, `MIN`, `MINUS`, `MULTIPLY`, `NOT`, `NUMBER`, `RANGE`, `REDUCE`, `REPLACEALL`, `REVERSE`, `ROUND`, `SET`, `SOME`, `SPLIT`, `STRING`, `SUM`, `TAKE`, `TRIM`, and many more.

### Transformation Types

#### 1. Structural Transformations (Type Changes)

Some legacy formulas map to entirely different formula operation types:

| Legacy | Modern | Transformation |
|--------|--------|----------------|
| `AND(a, b, c)` | `and` operation | `FunctionOperation` → `AndOperation`. Arguments stripped of `name` property. |
| `OR(a, b, c)` | `or` operation | `FunctionOperation` → `OrOperation`. Arguments stripped of `name` property. |
| `IF(cond, then, else)` | `switch` operation | `FunctionOperation` → `SwitchOperation` with single case + default. |
| `LIST(a, b, c)` | `array` operation | `FunctionOperation` → `ArrayOperation`. Arguments preserved. |

#### 2. Namespace Renames (Simple)

Most migrations are straightforward renames to the `@toddle/` namespace:

| Legacy | Modern | Notes |
|--------|--------|-------|
| `EQ` | `@toddle/equals` | — |
| `NEQ` | `@toddle/notEqual` | — |
| `GT` | `@toddle/greaterThan` | — |
| `GTE` | `@toddle/greaterOrEqueal` | Note: typo preserved in modern name |
| `LT` | `@toddle/lessThan` | — |
| `LTE` | `@toddle/lessOrEqual` | — |
| `CONCAT` | `@toddle/concatenate` | — |
| `DEFAULT` | `@toddle/defaultTo` | Also enables `variableArguments: true` |
| `DELETE` | `@toddle/deleteKey` | — |
| `LOWER` | `@toddle/lowercase` | — |
| `UPPER` | `@toddle/uppercase` | — |
| `RANDOM` | `@toddle/randomNumber` | — |
| `SQRT` | `@toddle/squareRoot` | — |
| `JSON_PARSE` | `@toddle/parseJSON` | Argument renamed: `Input` → `JSON string` |
| `URI_ENCODE` | `@toddle/encodeURIComponent` | Argument renamed: `URI` → `URIComponent` (fixes typo) |
| `SIZE` | `@toddle/size` | — |
| `ADD` | `@toddle/add` | — |
| `MINUS` | `@toddle/minus` | — |
| `MULTIPLY` | `@toddle/multiply` | — |
| `DIVIDE` | `@toddle/divide` | — |
| `MOD` | `@toddle/modulo` | Argument renamed: `Dividor` → `Divider` (fixes typo) |

#### 3. Namespace Renames with Argument Renaming

Many array/collection formulas also rename arguments:

| Argument Mapping | Old Name | New Name |
|-----------------|----------|----------|
| `ARRAY_ARGUMENT_MAPPINGS` | `List` | `Array` |
| `PREDICATE_ARGUMENT_MAPPINGS` | `List` | `Array`, `Predicate fx` | `Formula` |

Formulas using these mappings: `DROP_LAST`, `FLAT`, `TAKE_LAST`, `GROUP_BY`, `FIND INDEX`, `INDEX OF`, `KEY_BY` (also `Key formula` → `Formula`), `EVERY`, `FILTER`, `FIND`, `FROMENTRIES`, `INCLUDES`, `JOIN`, `MAP` (also `Mapping fx` → `Formula`), `MAX`, `MIN`, `REDUCE` (`Reducer fx` → `Formula`), `REVERSE`, `SOME`, `TAKE`, `UPPER`.

#### 4. Special Cases with Additional Logic

| Legacy | Transformation Details |
|--------|----------------------|
| `REPLACEALL` | Argument renamed: `String to repalce` → `Search` (fixes typo) |
| `RANGE` | If second argument has no name, sets it to `Max` |
| `STARTS_WITH` | Argument renamed: `Input` → `String` |

### Non-Fixable Formulas

| Formula | Reason |
|---------|--------|
| `TYPE` | Type system semantics changed between v1 and v2 |
| `BOOLEAN` | Boolean coercion logic changed between v1 and v2 |

---

## Legacy Action Migration

### Detection Rule

**Code:** `legacy action`
**Level:** `warning`
**Category:** `Deprecation`

### Legacy Action Types (17 entries)

`If`, `PreventDefault`, `StopPropagation`, `CopyToClipboard`, `UpdateVariable`, `Update Variable`, `Update URL parameter`, `updateUrlParameters`, `UpdateQueryParam`, `Fetch`, `SetTimeout`, `SetInterval`, `FocusElement`, `Debug`, `GoToURL`, `TriggerEvent`, `Set session cookies`, `@toddle/setSessionCookies`

### Auto-Fixable Transformations

| Legacy Action | Modern Equivalent | Transformation |
|--------------|-------------------|----------------|
| `If` | `Switch` action type | `events.true.actions` → first case, `events.false.actions` → default |
| `PreventDefault` | `@toddle/preventDefault` | Simple rename |
| `StopPropagation` | `@toddle/stopPropagation` | Simple rename |
| `UpdateVariable` / `Update Variable` | `SetVariable` action type | Extracts variable name from first argument, value from second |
| `SetTimeout` | `@toddle/sleep` | Argument renamed: `Delay in ms` → `Delay in milliseconds`. Event renamed: `timeout` → `tick` |
| `SetInterval` | `@toddle/interval` | Argument renamed: `Interval in ms` → `Interval in milliseconds` |
| `Debug` | `@toddle/logToConsole` | Simple rename |
| `GoToURL` | `@toddle/gotToURL` | Note: typo preserved in modern name. Argument renamed: `url` → `URL` |
| `TriggerEvent` | `TriggerEvent` action type | Extracts event name from first argument, data from second |
| `FocusElement` | `@toddle/focus` | Wraps argument in `@toddle/getElementById` formula |

### Non-Fixable Actions

| Action | Reason |
|--------|--------|
| `CopyToClipboard` | Previously JSON-stringified non-string inputs; behavior changed |
| `Update URL parameter` | User must choose history mode (push/replace) |
| `Fetch` | Mainly used for v1 APIs; migration path unclear |
| `@toddle/setSessionCookies` | New `Set cookie` action requires additional arguments |

### Fixability Guards

For `UpdateVariable`, `Update Variable`, and `TriggerEvent`:
- Auto-fix only available when the first argument is a `value` formula with a `string` value
- If the first argument is dynamic (formula-computed name), auto-fix is disabled since the literal name can't be statically extracted

---

## Argument Renaming Utility

**Function:** `renameArguments(mappings, args)`

**Source:** `packages/search/src/util/helpers.ts:144-159`

Takes a mapping record and an argument array, renames argument `name` fields where they match a key in the mapping. Preserves all other argument properties.

```
renameArguments({ 'List': 'Array', 'Predicate fx': 'Formula' }, args)
→ args with matching name fields replaced
```

Filters out `undefined` entries (handles sparse arrays from legacy data).

---

## API Dependency Sorting with Legacy Support

The `sortApiObjects()` and `sortApiEntries()` functions handle mixed v1/v2 API collections:

1. Each API is wrapped in either `ToddleApiV2` or `LegacyToddleApi`
2. Both wrapper classes expose `apiReferences` (a `Set<string>` of cross-API references)
3. Sorting compares API references regardless of version
4. V1 APIs in the sorted output are processed by the legacy runtime
5. V2 APIs are processed by the modern runtime

**Source:** `packages/core/src/api/api.ts:382-422`

---

## Edge Cases

- **Mixed v1/v2 APIs in one component:** Both versions can coexist. V2 APIs are evaluated first during SSR (independent in parallel, dependent sequentially). V1 APIs use name-based cache lookup instead of hash-based.
- **Legacy formula-as-whole-object headers:** V1 API `headers` field can be either a formula (entire headers object computed at once) or a record of per-header formulas. The `isFormula()` check dispatches to the correct evaluation path.
- **Typos preserved in modern names:** Several modern formula/action names contain historical typos (`greaterOrEqueal`, `gotToURL`) that are preserved for backwards compatibility with projects that already migrated.
- **`parseJSONWithDate` in v1 responses:** V1 API responses attempt JSON parsing with date revival. V2 APIs use standard `response.json()`.
- **Throttle dropping requests:** V1 throttle silently drops requests during cooldown (returns a never-resolving promise), unlike v2 debounce which replaces the pending request.
- **Auto-fix iteration safety:** Each legacy formula/action fix is applied one at a time through the iterative fix loop (max 100 iterations). This prevents conflicting transformations.
- **`BOOLEAN` and `TYPE` detection:** These are detected as legacy (reported as warnings) but no auto-fix is offered because their evaluation semantics changed.
- **`FocusElement` structural change:** The fix wraps the argument in a `@toddle/getElementById` formula call, changing the formula tree structure rather than just renaming.

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [Client-Side API System](./client-api-system.md) | V2 API runtime that replaces the legacy `createLegacyAPI()` |
| [API Request Construction](./api-request-construction.md) | V2 request construction used by modern APIs; legacy builds requests manually |
| [Search & Linting Engine](./search-and-linting-engine.md) | Framework for rule execution, fix iteration, and batch processing |
| [Standard Library Architecture](./standard-library-architecture.md) | Modern `@toddle/` namespaced formulas that legacy formulas migrate to |
| [Action Execution Engine](./action-execution-engine.md) | Modern action types (`SetVariable`, `Switch`, `TriggerEvent`) that legacy actions migrate to |
| [Formula Evaluation Engine](./formula-evaluation-engine.md) | Evaluates both legacy and modern formula types at runtime |
| [Introspection & Traversal](./introspection-and-traversal.md) | `LegacyToddleApi` wrapper class for traversing v1 API formulas |
| [API Proxy System](./api-proxy-system.md) | V2 proxy routing; legacy uses the different `/_query/` endpoint |

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
