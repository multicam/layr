# 10 — API System

HTTP request construction, fetch execution, signal-based response state, caching, and SSR prefetching. Covers both V1 and V2 API definitions.

**Packages:** `@layr/runtime` (client), `@layr/ssr` (server), `@layr/types` (types)

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| V1 and V2 API definitions | MVP |
| URL construction (base url, path segments, query params, hash) | MVP |
| Header construction with conditional inclusion | MVP |
| Body serialization (JSON, form-data, url-encoded, text) | MVP |
| Request timeout via `AbortSignal.timeout()` | MVP |
| Deterministic request hashing (cyrb53) for cache keys | MVP |
| API dependency sorting | MVP |
| Custom error detection (`isError` formula) | MVP |
| `ApiStatus` signal — data, isLoading, error, response | MVP |
| SSR API prefetching with cache hydration | MVP |
| Cookie template substitution (`{{ cookies.name }}`) | MVP |
| Streaming responses (SSE, NDJSON) | MVP |
| `AbortFetch` action | MVP |
| API proxy routes (`/.toddle/omvej/...`) | Phase 2 |
| `ToddleApiService` wrapper and service management UI | Phase 2 |
| Service management backend routes | Phase 2 |

---

## 1. API Definitions

### 1.1 `ApiStatus` (runtime state)

```typescript
interface ApiStatus<T = unknown> {
  data: T | null
  isLoading: boolean
  error: unknown | null
  response?: ApiResponse
}

interface ApiResponse {
  headers: Record<string, string>
  status: number
  statusText: string
  performance?: {
    requestStart?: number
    responseStart?: number
    responseEnd?: number
  }
}
```

Initial state on component mount: `{ data: null, isLoading: false, error: null }`.

### 1.2 `ApiCache` (SSR hydration)

```typescript
interface ApiCache {
  [requestHash: string]: ApiStatus
}
```

Stored in `pageState.Apis` in the hydration payload. Keys are cyrb53 hashes of the request.

### 1.3 `ApiRequest` (wire format)

```typescript
interface ApiRequest {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  headers: Record<string, string>
  body?: string | FormData | null
  signal?: AbortSignal
  credentials?: 'include' | 'same-origin' | 'omit'
}
```

### 1.4 Streaming

```typescript
type ParserMode = 'json' | 'text' | 'blob' | 'stream' | 'json-stream'

interface StreamingEvent {
  type: 'message' | 'error' | 'done'
  data?: unknown
  error?: Error
}
```

---

## 2. URL Construction (`getUrl`)

```typescript
function getUrl(api: ApiBase, formulaContext: FormulaContext, baseUrl?: string): URL
```

**Algorithm:**

1. Evaluate `api.url` formula → string or number
2. `new URL(urlInput, baseUrl)` — extract existing pathname and search params
3. Build path: `getRequestPath(api.path, formulaContext)` → sort by `index`, evaluate each formula, join with `/`
4. Compose pathname: `parsedPathname + pathSegments` (add `/` separator if needed)
5. Merge query params: URL existing params + `getRequestQueryParams(api.queryParams, formulaContext)`
6. Evaluate hash: `applyFormula(api.hash?.formula)`
7. If URL unparseable → assemble as raw string parts

### 2.1 Base URL Resolution

| Input `url` | Result |
|-------------|--------|
| `undefined` or `''` | `origin` |
| Starts with `/` | `origin + url` |
| Absolute URL | `url` as-is |

### 2.2 Query Parameter Encoding (`getRequestQueryParams`)

| Value Type | Encoding |
|-----------|----------|
| `null` / `undefined` | Skip entirely |
| String / Number / Boolean | `params.set(key, String(value))` |
| Array (1D) | `params.append(key, v)` per element — `?tag=a&tag=b` |
| Object (nested) | Bracket notation via `encodeObject()` — `?filter[status]=active&filter[sort][field]=name` |

Each parameter has optional `enabled` formula — falsy result excludes the parameter entirely.
Numeric URL formula result → coerced to string before URL parsing.

---

## 3. Header Construction (`getRequestHeaders`)

```typescript
function getRequestHeaders(options: {
  apiHeaders: HeaderDefinition[]
  formulaContext: FormulaContext
  defaultHeaders?: Headers
}): Headers
```

1. Start with copy of `defaultHeaders`
2. For each API header definition:
   - If `enabled` formula defined and falsy → skip
   - Evaluate formula → skip if `null`/`undefined`
   - Trim key and value
   - `headers.set(key, value)` (silently catch invalid header name errors)

API-specific headers override default headers (same key).
Non-string values coerced via `String(value)`.

---

## 4. Body Serialization (`getRequestBody`)

Only for methods in: `POST`, `DELETE`, `PUT`, `PATCH`, `OPTIONS`
`GET` and `HEAD` always return `undefined`.

| Content-Type | Serialization | Return |
|-------------|---------------|--------|
| Not set / `application/json` / `application/*+json` | `JSON.stringify(body)` | `string` |
| `application/x-www-form-urlencoded` | Key-value with `encodeURIComponent()`; arrays → multiple `key=value` | `string` |
| `multipart/form-data` | `FormData.set(key, value)` then **delete** Content-Type header | `FormData` |
| `text/plain` | `String(body)` | `string` |
| Other | Pass through as-is | `unknown` |

JSON detection pattern: `/^application\/(json|.*\+json)/` — matches `application/json`, `application/vnd.api+json`, etc.

`multipart/form-data` special: Content-Type header deleted so browser sets it with correct `boundary`.

---

## 5. Request Construction (`createApiRequest`)

```typescript
function createApiRequest(options: {
  api: ApiBase
  formulaContext: FormulaContext
  baseUrl?: string
  defaultHeaders?: Headers
}): {
  url: URL
  requestSettings: {
    method: ApiMethod
    headers: Headers
    body: string | FormData | undefined
    signal?: AbortSignal
  }
}
```

Method validated against `ApiMethod` enum; invalid values fall back to `GET`.
Valid methods: `GET`, `POST`, `DELETE`, `PUT`, `PATCH`, `HEAD`, `OPTIONS`.

### 5.1 Timeout

`applyAbortSignal(api, requestSettings, formulaContext)`:
- `api.timeout` must be defined
- Formula must evaluate to a positive, non-NaN number
- Applies `AbortSignal.timeout(ms)` to `requestSettings`
- Any condition fails → no timeout applied

---

## 6. Request Hashing

```typescript
function requestHash(url: URL, request: RequestInit): number
```

**Hash input:**
```json
{
  "url": "<full URL href>",
  "method": "<HTTP method>",
  "headers": { /* all headers except host and cookie */ },
  "body": "<body string or null>"
}
```

Excluded headers: `host` (differs between server/client), `cookie` (differs server/client).

Algorithm: cyrb53 — two parallel hash streams with prime multipliers (`2654435761`, `1597334677`) and XOR mixing. Produces 53-bit integer.

**Critical:** Hash produces identical values on server and client for the same logical request — required for SSR cache hydration to work.

---

## 7. API Dependency Sorting

```typescript
function sortApiObjects(apis: ComponentAPI[]): ComponentAPI[]
```

1. Wrap each API in `ToddleApiV2` which exposes `apiReferences: Set<string>` — other API names referenced via `Apis.*` path in formulas
2. Compare pairs: if API A references API B → A sorts after B
3. Circular references → stable ordering (comparison returns 0)

Usage:
- Independent APIs (no cross-API refs) → `Promise.all()` in parallel
- Dependent APIs → sequential, update `formulaContext.data.Apis` after each fetch

---

## 8. Error Detection (`isApiError`)

```typescript
function isApiError(options: {
  apiName: string
  response: Response
  formulaContext: FormulaContext
  performance: PerformanceTiming
  errorFormula?: Formula
}): boolean
```

**Default (no `isError` formula):** `!response.ok` (HTTP status >= 400).

**Custom `isError` formula** receives isolated context:
```typescript
{
  Attributes: {},
  Apis: {
    [apiName]: {
      isLoading: false,
      data: <response body>,
      error: null,
      response: { status, headers, performance }
    }
  }
}
```

| Formula Result | Outcome |
|---------------|---------|
| `null` or `undefined` | Fall back to default (`!response.ok`) |
| Truthy | Treat as error |
| Falsy | Treat as success |

---

## 9. Client-Side API Execution

### 9.1 `ApiClient`

```typescript
interface ApiClient {
  fetch<T>(name: string, config: ApiRequestConfig): Promise<ApiStatus<T>>
  abort(name: string): void
  getStatus<T>(name: string): ApiStatus<T> | undefined
}
```

### 9.2 Request Lifecycle

1. Abort existing request for same `name` (if any)
2. Create new `AbortController`
3. Set loading state: `{ data: null, isLoading: true, error: null }`
4. Update `dataSignal.Apis[name]` with loading state
5. Execute `fetch()`
6. Parse response based on `parserMode` (json/text/blob/stream)
7. On success: `{ data, isLoading: false, error: null, response: { headers, status, statusText } }`
8. On HTTP error: `{ data: null, isLoading: false, error: Error('HTTP {status}'), response }`
9. On network error: `{ data: null, isLoading: false, error }`
10. Update `dataSignal.Apis[name]` with final state

### 9.3 Signal Integration

```typescript
function updateApisInSignal(dataSignal: Signal<ComponentData>, apiName: string, status: ApiStatus): void {
  dataSignal.update(d => ({ ...d, Apis: { ...d.Apis, [apiName]: status } }))
}
```

### 9.4 Streaming

For `parserMode === 'stream'` or `parserMode === 'json-stream'`:
- Get `response.body.getReader()`
- Read chunks in loop with `TextDecoder`
- Call `onMessage(chunk)` for each chunk
- Stop on `done` or error

### 9.5 `AbortFetch` Action

Calls `client.abort(apiName)` — cancels in-flight request. The `AbortError` is caught silently (not an error state).

### 9.6 Fetch Action

```typescript
Fetch action:
  - Evaluate input formulas to override API defaults
  - Pass onCompleted, onFailed, onMessage action lists as callbacks
  - api.fetch({ actionInputs, actionModels, componentData, workflowCallback })
```

---

## 10. SSR API Prefetching

### 10.1 Enable Logic

API fetched during SSR only when ALL conditions met:
- `autoFetch` formula evaluates truthy
- `server.ssr.enabled` formula evaluates truthy (default: `false`)

### 10.2 Per-API Lifecycle (`fetchApi`)

1. Evaluate API inputs as formulas
2. Check `server.ssr.enabled` formula
3. Check `autoFetch` formula — if disabled: return `{ data: null, isLoading: false, error: null }`
4. `createApiRequest()` with default headers: `accept: */*`, `accept-encoding: gzip, deflate`
5. Generate cache key: `requestHash(url, requestSettings)`
6. Return cached response if hit
7. Apply cookie templates to URL search params
8. Sanitize headers: remove `cookie`, hop-by-hop, Layr headers
9. Apply cookie templates to remaining headers
10. Execute fetch

### 10.3 Response Handling (`fetchApiV2`)

1. Execute fetch with performance tracking (`requestStart`, `responseStart`, `responseEnd`)
2. Parse body based on `parserMode`: JSON, text, or auto-detect from Content-Type
3. Evaluate `isError` formula for custom error detection
4. Build `ApiStatus` object
5. Evaluate redirect rules — if URL returned, throw `RedirectError` (halts SSR)

### 10.4 Cache Deduplication

Hash-based (`requestHash()`) prevents duplicate requests within a single page render.
Cache persists for the duration of the SSR request only.

---

## 11. SSR Cache Hydration (Client-Side)

When `autoFetch` enabled and `isPageLoaded === false`:
1. Compute request hash from URL and request settings
2. Look up `pageState.Apis[requestHash]`
3. If found:
   - Error cached → call `apiError()` with cached error
   - Data cached → call `apiSuccess()` with cached data
4. Not found → proceed with normal fetch

Cache only valid during initial hydration. Once `isPageLoaded = true`, all APIs fetch normally.

---

## 12. Content-Type Detection

| Function | Pattern | Matches |
|----------|---------|---------|
| `isJsonHeader` | `/^application\/(json\|.*\+json)/` | `application/json`, `application/vnd.api+json` |
| `isTextHeader` | `/^(text\/\|application\/x-www-form-urlencoded\|application\/(xml\|.*\+xml))/` | `text/html`, `text/plain`, `application/xml` |
| `isEventStreamHeader` | `/^text\/event-stream/` | SSE streams |
| `isJsonStreamHeader` | `/^(application\/stream\+json\|application\/x-ndjson)/` | NDJSON streams |
| `isImageHeader` | `/^image\//` | `image/png`, `image/jpeg` |

`mapHeadersToObject(headers)`: converts `Headers` to `Record<string, string>`; duplicate values concatenated with `, `.

Non-body response codes (no body read): `[101, 204, 205, 304]`.

---

## 13. Cookie Template Substitution

Applied to API request URLs (search params) and headers before forwarding:

Pattern: `{{ cookies.<name> }}`
Missing cookie → empty string (prevents template syntax leak to external APIs).

---

## 14. Phase 2: API Proxy [Phase 2]

The API proxy (`/.toddle/omvej/components/{component}/apis/{api}`) is not implemented.

**Client-side proxy flow (Phase 2):**
1. Evaluate `api.server.proxy.enabled.formula` — if truthy, construct proxy URL
2. Set `x-layr-url` header with actual target URL
3. If `useTemplatesInBody` → set `x-layr-templates-in-body` header
4. POST to proxy URL instead of target

**Server-side proxy flow (Phase 2):**
1. Extract cookies from request
2. Read target URL from `x-layr-url` header
3. Apply `{{ cookies.name }}` templates to URL and headers
4. Sanitize headers; forward request
5. Stream response back

## 15. Phase 2: API Service Management [Phase 2]

`ApiService` type exists in `@layr/types` but service management backend routes do not exist.

```typescript
// Exists in @layr/types — not used at runtime
interface BaseApiService {
  name: string
  baseUrl?: Formula
  docsUrl?: Formula
  apiKey?: Formula
  meta?: Record<string, unknown>
}

type ApiService =
  | (BaseApiService & { type: 'supabase'; meta?: { projectUrl?: Formula } })
  | (BaseApiService & { type: 'xano' })
  | (BaseApiService & { type: 'custom' })
```

Service references (`service`, `servicePath`) on `ApiRequest` are editor-only fields stripped by `removeTestData()` before runtime. The `ApiRequest.url` formula already contains the fully-resolved service base URL — services exist for authoring convenience only.

`ToddleApiService` wrapper class (formula traversal for linting) exists in `@layr/core` but service management UI routes are Phase 2.

---

## 16. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Numeric URL formula result | Coerced to string before `URL` parsing |
| Unparseable URL | Assemble path/query/hash as raw strings without origin |
| Empty body formula | No body sent regardless of method |
| Duplicate query params from URL + definition | Both included (URL params first) |
| Invalid header names | Silently caught and ignored |
| Circular API dependencies | `sortApiObjects` produces stable ordering; no cycle breaking |
| `AbortSignal.timeout` with NaN | Explicitly guarded — no timeout applied |
| FormData boundary | Content-Type deleted to let browser set `multipart/form-data; boundary=...` |
| `</script>` in JSON | Escaped to `<\/script>` in hydration payload |

---

## 17. Cross-References

| Spec | Relationship |
|------|-------------|
| `06-rendering.md` | SSR API evaluation in `renderPageBody()`; hydration cache injection |
| `09-route-matching.md` | API-driven SSR redirects (`RedirectError`) |
| `11-page-lifecycle.md` | Client API initialization with SSR cache hydration in `createRoot()` |
| `07-event-system.md` | `Fetch` and `AbortFetch` action types in `handleAction()` |
