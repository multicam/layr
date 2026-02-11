# API Request Construction System

## Purpose

The API Request Construction System is the shared core that converts declarative API definitions into executable HTTP request objects. It provides URL composition, query parameter encoding, body serialization, header construction, request hashing, API dependency sorting, error detection, and timeout handling. Both the client-side runtime (`createAPIv2.ts`) and server-side SSR pipeline (`rendering/api.ts`) delegate to these functions when building actual `fetch()` calls.

### Jobs to Be Done

- Construct URLs from formula-evaluated base URLs, ordered path segments, query parameters, and hash fragments
- Serialize request bodies based on Content-Type (JSON, form-data, URL-encoded, plain text)
- Encode query parameters with support for arrays, nested objects, and conditional enable/disable
- Build request headers from formula-evaluated key-value pairs with conditional inclusion
- Generate deterministic cache keys for API response deduplication across SSR and CSR
- Sort API definitions by dependency order to ensure correct initialization sequencing
- Evaluate custom error detection formulas against API responses
- Apply request timeouts via `AbortSignal.timeout()`

---

## Key Files

| File | Package | Responsibility |
|------|---------|----------------|
| `packages/core/src/api/api.ts` | `@layr/core` | Request construction, URL building, hashing, sorting, error detection |
| `packages/core/src/api/apiTypes.ts` | `@layr/core` | Type definitions for `ApiRequest`, `ApiBase`, `ApiStatus` |
| `packages/core/src/api/headers.ts` | `@layr/core` | Content-Type detection utilities |
| `packages/core/src/utils/hash.ts` | `@layr/core` | cyrb53 non-cryptographic hash function |
| `packages/core/src/api/template.ts` | `@layr/core` | Cookie template string format (`{{ cookies.name }}`) |

---

## URL Construction

### `getUrl(api, formulaContext, baseUrl?)`

Composes a full `URL` object from an API definition's url formula, path segments, query parameters, and hash.

**Algorithm:**

1. **Evaluate base URL formula** — `applyFormula(api.url, formulaContext)` yields a string or number
2. **Parse base URL** — attempt `new URL(urlInput, baseUrl)` to extract existing pathname and search params
3. **Build path segments** — `getRequestPath()` evaluates each path segment formula, sorts by `index`, joins with `/`
4. **Compose pathname** — concatenate parsed pathname + path segments (adding `/` separator if needed)
5. **Merge query parameters** — combine URL's existing search params with `getRequestQueryParams()` output
6. **Evaluate hash** — `applyFormula(api.hash?.formula)` for URL fragment
7. **Assemble URL** — if the base was parseable, use `URL` object manipulation; otherwise construct from string parts

**Source:** `packages/core/src/api/api.ts:48-89`

### Base URL Resolution

`getBaseUrl({ origin, url })` resolves relative URLs against the current origin:

| Input `url` | Result |
|-------------|--------|
| `undefined` or `''` | `origin` |
| Starts with `/` | `origin + url` (relative path) |
| Absolute URL (e.g., `https://...`) | `url` as-is |

**Source:** `packages/core/src/api/api.ts:223-231`

---

## Path Segment Construction

### `getRequestPath(path, formulaContext)`

Converts ordered path segment definitions into a URL path string.

**Process:**

1. Sort entries by `index` field (ascending)
2. Evaluate each segment's formula
3. Join with `/`

**Input:** `Record<string, { formula: Formula; index: number }>` (nullable)

**Output:** String like `users/123/posts`

**Source:** `packages/core/src/api/api.ts:145-151`

---

## Query Parameter Encoding

### `getRequestQueryParams(params, formulaContext)`

Converts formula-evaluated query parameter definitions into `URLSearchParams`.

**Source:** `packages/core/src/api/api.ts:153-191`

### Conditional Inclusion

Each parameter has an optional `enabled` formula. If defined and evaluates to falsy, the parameter is excluded entirely. If not defined, the parameter is included by default.

### Value Type Handling

| Value Type | Encoding Strategy | Example |
|-----------|-------------------|---------|
| `null` / `undefined` | Skipped entirely | — |
| String / Number / Boolean | `params.set(key, String(value))` | `?name=John` |
| Array (1D) | Multiple `params.append(key, v)` per element | `?tag=a&tag=b` |
| Object (nested) | Bracket notation via recursive `encodeObject()` | `?filter[status]=active&filter[sort]=name` |

### Nested Object Encoding

Objects are recursively encoded with bracket notation:

```
{ filter: { status: "active", sort: { field: "name" } } }
→ filter[status]=active&filter[sort][field]=name
```

Arrays within objects are **not** recursively expanded — they are cast to strings.

---

## Header Construction

### `getRequestHeaders({ apiHeaders, formulaContext, defaultHeaders })`

Builds a `Headers` object from API header definitions merged with default headers.

**Source:** `packages/core/src/api/api.ts:193-221`

**Process:**

1. Start with a copy of `defaultHeaders` (if provided)
2. For each API header definition:
   - If `enabled` formula is defined, evaluate it; skip if falsy
   - If not defined, include by default
   - Evaluate formula to get header value
   - Skip if value is `null`/`undefined`
   - Trim both key and value
   - Call `headers.set(key, value)` (silently catch errors from invalid header names)

**Business Rules:**

- Default headers can be overridden by API-specific headers (same key)
- Non-string values are coerced via `String(value)`
- Invalid header names (per HTTP spec) are silently ignored via try/catch

---

## Body Serialization

### `getRequestBody({ api, formulaContext, headers, method })`

Serializes the request body based on the HTTP method and Content-Type header.

**Source:** `packages/core/src/api/api.ts:298-358`

### Method Guard

Only methods in `HttpMethodsWithAllowedBody` produce a body:
- `POST`, `DELETE`, `PUT`, `PATCH`, `OPTIONS`

`GET` and `HEAD` always return `undefined` for body.

### Content-Type Routing

| Content-Type | Serialization | Return Type |
|-------------|---------------|-------------|
| Not set / `application/json` / `application/*+json` | `JSON.stringify(body)` | `string` |
| `application/x-www-form-urlencoded` | Key-value pairs with `encodeURIComponent()` | `string` |
| `multipart/form-data` | `FormData` with `formData.set(key, value)` | `FormData` |
| `text/plain` | `String(body)` | `string` |
| Any other | Pass through as-is | `unknown` |

### Content-Type Detection

JSON detection uses a regex pattern supporting vendor content types:
```
/^application\/(json|.*\+json)/
```

This matches `application/json`, `application/vnd.api+json`, `application/vnd.contentful.delivery.v1+json`, etc.

**Source:** `packages/core/src/api/headers.ts:8-13`

### Multipart Form-Data Special Handling

When Content-Type is `multipart/form-data`, the Content-Type header is **deleted** after body construction. This allows the browser to set it automatically with the correct boundary string.

### URL-Encoded Body

Supports arrays: each array element generates a separate `key=value` pair joined by `&`.

```
{ tags: ["a", "b"], name: "test" }
→ tags=a&tags=b&name=test
```

---

## Request Construction

### `createApiRequest({ api, formulaContext, baseUrl, defaultHeaders })`

The main entry point that combines URL construction and request settings.

**Source:** `packages/core/src/api/api.ts:27-46`

**Returns:**
```
{
  url: URL,              // Fully constructed URL
  requestSettings: {     // Fetch init object
    method: ApiMethod,
    headers: Headers,
    body: string | FormData | undefined,
    signal?: AbortSignal  // If timeout configured
  }
}
```

### Method Validation

The method field is validated against the `ApiMethod` enum. Invalid values fall back to `GET`.

**Valid methods:** `GET`, `POST`, `DELETE`, `PUT`, `PATCH`, `HEAD`, `OPTIONS`

---

## Timeout Handling

### `applyAbortSignal(api, requestSettings, formulaContext)`

Evaluates the timeout formula and applies `AbortSignal.timeout()` if valid.

**Source:** `packages/core/src/api/api.ts:99-110`

**Conditions for timeout application:**

1. `api.timeout` must be defined
2. Formula must evaluate to a `number`
3. Number must not be `NaN`
4. Number must be positive (> 0)

If any condition fails, no timeout is applied (request runs indefinitely or until cancelled by other means).

---

## Request Hashing (Cache Keys)

### `requestHash(url, request)`

Generates a deterministic hash for cache key matching between SSR and CSR.

**Source:** `packages/core/src/api/api.ts:235-246`

**Hash Input:**

```json
{
  "url": "<full URL href>",
  "method": "<HTTP method>",
  "headers": { <all headers except "host" and "cookie"> },
  "body": "<body string or null>"
}
```

**Excluded Headers:**
- `host` — differs between server and client
- `cookie` — differs between server (from request) and client (from browser)

**Hash Algorithm:** cyrb53 — a fast, non-cryptographic hash producing a 53-bit integer. Uses two parallel hash streams with prime multipliers (`2654435761`, `1597334677`) and XOR mixing.

**Source:** `packages/core/src/utils/hash.ts:4-18`

**Usage:**
- SSR: Hashes each API response and stores in `apiCache[hash]`
- CSR: Computes the same hash to look up SSR-cached responses during hydration

**Critical invariant:** The hash must produce identical values on server and client for the same logical request, which is why `host` and `cookie` are excluded.

---

## API Dependency Sorting

### `sortApiObjects(apis)`

Sorts API definitions so that dependencies are initialized before their dependents.

**Source:** `packages/core/src/api/api.ts:382-422`

### Algorithm

1. Wrap each `ComponentAPI` in a `ToddleApiV2` or `LegacyToddleApi` wrapper class
2. Each wrapper exposes `apiReferences` — a `Set<string>` of other API names referenced in the API's formulas (via `Apis.*` path analysis)
3. Compare pairs: if API A references API B, A sorts after B (B evaluates first)
4. Mutual references (circular) result in stable ordering (comparison returns 0)

### Dependency Detection

The wrapper classes scan formula trees for `Path` operations starting with `Apis` to extract cross-API references. For example, if API `getUser` has a formula referencing `Apis.getToken.data`, then `getUser` depends on `getToken`.

### `sortApiEntries(apis)`

Same algorithm but accepts pre-wrapped `[name, ToddleApiV2 | LegacyToddleApi]` tuples.

---

## Error Detection

### `isApiError({ apiName, response, formulaContext, performance, errorFormula })`

Determines whether an API response should be treated as an error.

**Source:** `packages/core/src/api/api.ts:248-296`

### Default Behavior

If no `isError` formula is defined: `!response.ok` (HTTP status >= 400).

### Custom Error Formula

When an `isError` formula is provided, it receives an **isolated context**:

```
{
  Attributes: {},
  Args: <current formula args (if any)>,
  Apis: {
    [apiName]: {
      isLoading: false,
      data: <response body>,
      error: null,
      response: {
        status: <HTTP status>,
        headers: <response headers>,
        performance: <timing data>
      }
    }
  }
}
```

**Return value interpretation:**

| Formula Result | Outcome |
|---------------|---------|
| `null` or `undefined` | Fall back to default (`!response.ok`) |
| Truthy | Treat as error |
| Falsy | Treat as success |

---

## Content-Type Detection Utilities

### Header Classification

| Function | Pattern | Matches |
|----------|---------|---------|
| `isJsonHeader` | `/^application\/(json\|.*\+json)/` | `application/json`, `application/vnd.api+json` |
| `isTextHeader` | `/^(text\/\|application\/x-www-form-urlencoded\|application\/(xml\|.*\+xml))/` | `text/html`, `text/plain`, `application/xml` |
| `isEventStreamHeader` | `/^text\/event-stream/` | `text/event-stream` |
| `isJsonStreamHeader` | `/^(application\/stream\+json\|application\/x-ndjson)/` | NDJSON streams |
| `isImageHeader` | `/^image\//` | `image/png`, `image/jpeg`, etc. |

**Source:** `packages/core/src/api/headers.ts`

### `mapHeadersToObject(headers)`

Converts a `Headers` object to a plain `Record<string, string>`. Duplicate header values (e.g., `Set-Cookie`) are concatenated with `, ` separator.

---

## Legacy vs Modern API Detection

### `isLegacyApi(api)`

Discriminates between v1 legacy APIs and v2 modern APIs.

**Source:** `packages/core/src/api/api.ts:22-25`

**Detection logic:**
- If the API is an instance of `LegacyToddleApi` wrapper class → legacy
- If the API object has no `version` field → legacy
- If `version === 2` → modern (v2)

This check is used throughout the system to dispatch to the correct processing path (v1 uses different URL construction, header format, and response handling).

---

## Non-Body Response Codes

```
NON_BODY_RESPONSE_CODES = [101, 204, 205, 304]
```

HTTP status codes where the response body is empty or must not be read. Used by response parsers to skip body parsing.

---

## Edge Cases

- **Numeric URL formula result:** Coerced to string before `URL` parsing
- **Unparseable URL:** If `new URL()` throws, path/query/hash are assembled as raw strings without origin
- **Empty body formula:** If `applyFormula(api.body)` returns falsy, no body is sent regardless of method
- **Duplicate query params from URL and definition:** Both sets are included (URL params first, API definition params appended)
- **Invalid header names:** Silently caught and ignored to prevent runtime errors from formula-generated invalid header keys
- **Circular API dependencies:** `sortApiObjects` produces stable ordering but does not break cycles — both APIs remain in undefined relative order
- **AbortSignal.timeout with NaN:** Explicitly guarded; NaN timeout results in no timeout
- **FormData boundary:** Content-Type header deleted to let browser set `multipart/form-data; boundary=...` automatically
- **Hash with empty body:** `body` field serialized as `null` in hash input to ensure consistent keys
- **Header value trimming:** Both key and value are `.trim()`-ed before setting, preventing whitespace-related issues

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [API Integration](./api-integration.md) | Defines the `ApiRequest` and `ApiBase` data models that this system consumes |
| [Client-Side API System](./client-api-system.md) | Calls `createApiRequest()` for every client-side fetch |
| [SSR Pipeline](./ssr-pipeline.md) | Calls `createApiRequest()` during server-side API evaluation |
| [API Proxy System](./api-proxy-system.md) | Overrides the URL from `createApiRequest()` with proxy URL |
| [Hydration System](./hydration-system.md) | Uses `requestHash()` for SSR-to-CSR cache key matching |
| [Cookie Management](./cookie-management.md) | Template substitution applied to constructed request URLs and headers |
| [Performance & Caching](./performance-and-caching.md) | `requestHash()` is the cache key algorithm |
| [Security & Sanitization](./security-and-sanitization.md) | Header sanitization applied after request construction |
| [Introspection & Traversal](./introspection-and-traversal.md) | API dependency sorting uses formula traversal for reference detection |
