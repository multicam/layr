# API Integration Specification

## Purpose

The API Integration system provides declarative HTTP resource definitions that can auto-fetch, stream responses, proxy through the backend, and integrate with the component lifecycle. It supports two versions (legacy v1 and modern v2) with distinct capabilities.

### Jobs to Be Done

- Define HTTP APIs declaratively within components
- Support auto-fetch with reactive dependency tracking
- Handle multiple response formats: JSON, text, SSE, JSON-stream, blob
- Proxy requests through the backend for server-side cookie injection
- Enable SSR-time API evaluation with client-side cache hydration
- Sort API initialization by dependency order
- Provide custom error detection and redirect rules

---

## Data Models

### ApiRequest (v2 — Modern)

| Field | Type | Description |
|-------|------|-------------|
| `version` | `2` | Version discriminator |
| `name` | `string` | API identifier within component |
| `type` | `'http' \| 'ws'` | Protocol type |
| `url` | `Formula?` | Base URL formula |
| `path` | `Record<string, { formula, index }>?` | Path segments (sorted by index) |
| `queryParams` | `Record<string, { formula, enabled? }>?` | Query parameters with optional conditional |
| `hash` | `{ formula }?` | URL hash fragment |
| `method` | `ApiMethod?` | HTTP method (default: `GET`) |
| `headers` | `Record<string, { formula, enabled? }>?` | Request headers with optional conditional |
| `body` | `Formula?` | Request body formula |
| `inputs` | `Record<string, { formula? }>` | Named inputs for formula context |
| `autoFetch` | `Formula?` | Auto-fetch condition formula |
| `service` | `string?` | API service reference |
| `servicePath` | `string?` | Path within service |
| `server.proxy.enabled` | `{ formula }?` | Enable server-side proxying |
| `server.proxy.useTemplatesInBody` | `{ formula }?` | Enable cookie templates in body |
| `server.ssr.enabled` | `{ formula }?` | Enable SSR-time evaluation |
| `client.debounce` | `{ formula }?` | Debounce interval formula |
| `client.onCompleted` | `EventModel?` | Success callback actions |
| `client.onFailed` | `EventModel?` | Error callback actions |
| `client.onMessage` | `EventModel?` | Stream message callback actions |
| `client.parserMode` | `ApiParserMode?` | Response parser (default: `'auto'`) |
| `client.credentials` | `'include' \| 'same-origin' \| 'omit'?` | Credentials mode |
| `redirectRules` | `Record<string, { formula, statusCode?, index }>?` | Post-response redirect rules |
| `isError` | `{ formula }?` | Custom error detection formula |
| `timeout` | `{ formula }?` | Request timeout in ms |

### LegacyComponentAPI (v1)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | API identifier |
| `type` | `'REST'` | Always REST |
| `url` | `Formula?` | URL formula |
| `path` | `Array<{ formula }>?` | Path segments (ordered array) |
| `queryParams` | `Record<string, { name, formula }>?` | Query parameters |
| `headers` | `Record<string, Formula> \| Formula?` | Headers (record or single formula) |
| `method` | `'GET' \| 'POST' \| 'DELETE' \| 'PUT'?` | HTTP method |
| `body` | `Formula?` | Request body |
| `autoFetch` | `Formula?` | Auto-fetch condition |
| `proxy` | `boolean?` | Enable proxying (boolean, not formula) |
| `auth` | `{ type: 'Bearer id_token' \| 'Bearer access_token' }?` | Built-in auth |
| `throttle` | `number?` | Throttle interval in ms |
| `debounce` | `number?` | Debounce interval in ms |
| `onCompleted` | `EventModel?` | Success callback |
| `onFailed` | `EventModel?` | Error callback |

### ApiStatus

| Field | Type | Description |
|-------|------|-------------|
| `data` | `unknown` | Response data |
| `isLoading` | `boolean` | Whether request is in flight |
| `error` | `unknown` | Error data (null if successful) |
| `response.status` | `number?` | HTTP status code |
| `response.headers` | `Record<string, string>?` | Response headers |
| `response.performance` | `ApiPerformance?` | Timing data |

### ApiPerformance

| Field | Type | Description |
|-------|------|-------------|
| `requestStart` | `number?` | Timestamp when request started |
| `responseStart` | `number?` | Timestamp when first byte received |
| `responseEnd` | `number?` | Timestamp when response completed |

### HTTP Methods

`GET`, `POST`, `DELETE`, `PUT`, `PATCH`, `HEAD`, `OPTIONS`

Body allowed on: `POST`, `DELETE`, `PUT`, `PATCH`, `OPTIONS`

### Parser Modes

| Mode | Description |
|------|-------------|
| `auto` | Detect from Content-Type header |
| `json` | Parse as JSON |
| `text` | Plain text |
| `event-stream` | Server-Sent Events (SSE) |
| `json-stream` | Newline-delimited JSON |
| `blob` | Binary data (returns blob URL) |

---

## Request Construction

### URL Building

1. Evaluate `url` formula → string
2. Parse as absolute or relative URL, extract pathname and search params
3. Evaluate path segments (sorted by `index`), join with `/`, append to pathname
4. Merge query parameters: URL params + evaluated `queryParams` formulas
5. Evaluate hash formula (if present)
6. Construct final URL

### Query Parameter Features

- **Conditional inclusion:** Each param can have an `enabled` formula
- **Array encoding:** Array values produce multiple entries with same key
- **Object encoding:** Bracket notation (e.g., `user[name]=John&user[age]=30`)
- **Nested objects:** Recursive bracket notation

### Header Construction

- Start with optional default headers
- For each API header:
  - Evaluate `enabled` formula (skip if false)
  - Evaluate `formula` → value
  - Trim key and value
  - Coerce non-string values to strings
  - Silently ignore invalid headers

### Body Encoding

| Content-Type | Encoding |
|--------------|----------|
| `application/json` (or none) | `JSON.stringify(body)` |
| `application/x-www-form-urlencoded` | URL-encoded key=value pairs (arrays supported) |
| `multipart/form-data` | `FormData` (Content-Type header deleted to let browser set boundary) |
| `text/plain` | `String(body)` |
| Other | Pass through as-is |

### Timeout

Evaluated from `timeout.formula`. If result is a positive number, applies `AbortSignal.timeout(value)`.

---

## API Inputs

V2 APIs have an `inputs` field that provides named values to the formula context:

```
ApiInputs = { [key]: evaluatedFormula(inputs[key].formula) }
```

These are available in all API formulas via the `ApiInputs` path prefix.

---

## Auto-Fetch (Client-Side)

### Reactive Dependency Tracking

1. Create `payloadSignal` derived from `ctx.dataSignal`:
   - Evaluates all request parameters (url, headers, body, query params)
   - Evaluates `autoFetch` formula
   - Evaluates `proxy` formula
2. Subscribe to `payloadSignal` changes
3. On each change:
   - If first load and SSR cache exists: Use cached data
   - If `autoFetch` is truthy: Execute fetch
   - If `autoFetch` is falsy: Initialize with `{ isLoading: false, data: null, error: null }`

### SSR Cache Hydration

On initial page load, auto-fetch APIs check `window.__toddle.pageState.Apis` for cached responses:

- Cache key: `requestHash(url, requestSettings)` — hash of URL + method + headers + body (excluding `host` and `cookie` headers)
- Cache used only on first load (`window.__toddle.isPageLoaded === false`)
- If cache hit with error: Trigger `onFailed` actions
- If cache hit with data: Trigger `onCompleted` actions
- After using cache, normal reactive tracking takes over

### Debounce

If `client.debounce` formula evaluates to a positive number, fetches are debounced by that many milliseconds.

---

## Response Handling

### Auto-Detection (parserMode: 'auto')

| Content-Type | Parser |
|--------------|--------|
| `text/event-stream` | `event-stream` |
| `application/json`, `application/*+json` | `json` |
| `text/*`, `application/xml`, `application/*+xml`, `application/x-www-form-urlencoded` | `text` |
| `application/stream+json`, `application/x-ndjson` | `json-stream` |
| `image/*` | `blob` |
| Other | `text` |

### JSON Response

Parse response body as JSON. Date strings (ISO 8601, 24 chars) are automatically converted to Date objects.

### Text Streaming

Read response body via `TextDecoderStream`, accumulate chunks, join into final string.

### Event Stream (SSE)

Parse chunks delimited by `\n\n` or `\r\n\r\n`:
- Extract `event` (default: `'message'`), `data`, `id`, `retry` fields
- Attempt JSON parse on `data` field
- Each chunk triggers `onMessage` actions
- Final data is array of all parsed events

### JSON Stream

Parse chunks delimited by `\n` or `\r\n`:
- Each chunk parsed as JSON
- Each chunk triggers `onMessage` actions
- Final data is array of parsed objects

### Blob Response

Read response as blob, create object URL via `URL.createObjectURL(blob)`. Response `data` is the blob URL string.

### Streaming State Updates

During streaming, `Apis[name]` is updated incrementally:
- `isLoading: true` while streaming
- `data` updated with accumulated chunks after each message
- `onMessage` triggered for each individual chunk
- After stream completes: `isLoading: false`, `onCompleted`/`onFailed` triggered

---

## Error Detection

### Default Behavior

Response is an error if `response.ok` is `false` (HTTP status >= 400).

### Custom Error Formula

`isError.formula` receives the API response in context and can override default:
- If formula returns `null`/`undefined`: Fall back to default `!response.ok`
- If formula returns truthy: Treat as error
- If formula returns falsy: Treat as success

The formula receives `Apis[apiName]` with the response data, status, and headers.

---

## Redirect Rules

Post-response rules evaluated after both success and error:

1. Sort rules by `index`
2. For each rule: Evaluate `formula` with current API state in context
3. If result is a non-empty string: Parse as URL
4. If valid URL: `window.location.replace(url)` (or notify parent in preview mode)

**Use case:** Redirect to login on 401, redirect to success page on completion.

---

## Server-Side Proxy

### Purpose

Proxy API requests through the Layr backend to:
- Inject server-side cookies into requests (security)
- Access HTTP-only cookies
- Hide API keys from client
- Bypass CORS restrictions

### Proxy Route

`POST /.toddle/omvej/components/:componentName/apis/:apiName`

### Proxy Flow

1. Extract destination URL from `x-nordcraft-url` header
2. Apply cookie template values to URL: `{{ cookies.name }}` → cookie value
3. Sanitize headers (remove hop-by-hop, cookie, Layr-specific headers)
4. If `x-nordcraft-templates-in-body` is set:
   - Apply cookie templates to request body
   - Handle URL-encoded bodies specially (template each value)
5. Fetch destination with 5-second timeout
6. Set `X-Forwarded-For` header with client IP
7. Stream response back (headers + body)

### Template Syntax

`{{ cookies.<cookieName> }}` — replaced with the cookie value from the request, or empty string if not found.

### Header Sanitization

Removed headers:
- Hop-by-hop: `connection`, `keep-alive`, `proxy-authenticate`, etc.
- Cookie: `cookie` header
- Layr: `x-nordcraft-url`, `x-nordcraft-templates-in-body`

### Error Responses

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid URL | 400 | `{ error: "The provided URL is invalid: ..." }` |
| Invalid headers | 400 | `{ error: "Proxy validation failed: ..." }` |
| Timeout | 504 | Error message |
| Other fetch error | 500 | Error message |
| Invalid request | 500 | `{ error: "Unable to build a valid request..." }` |

---

## API Dependency Sorting

APIs within a component are initialized in dependency order.

### Algorithm

1. For each API: Extract all `Apis.<name>` path references from all formulas
2. Build dependency set (excluding self-references)
3. Sort with comparison:
   - If A references B but B doesn't reference A: A comes after B
   - If both reference each other (circular): No ordering constraint
   - If neither references the other: No ordering constraint

### Traversed Formulas for Dependencies

`autoFetch`, `url`, `path[].formula`, `headers[].formula`, `body`, `inputs[].formula`, `queryParams[].formula`, `server.proxy.enabled`, `server.ssr.enabled`, `client.debounce`, `redirectRules[].formula`, `isError.formula`, `timeout.formula`

---

## API Services

Reusable API configuration templates:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Service name |
| `type` | `'supabase' \| 'xano' \| 'custom'` | Service type |
| `baseUrl` | `Formula?` | Base URL formula |
| `docsUrl` | `Formula?` | Documentation URL |
| `apiKey` | `Formula?` | API key formula |
| `meta` | `Record<string, unknown>?` | Service-specific metadata |

Supabase services also have `meta.projectUrl`.

---

## Request Hashing (SSR Cache)

Cache key computation:

```
hash(JSON.stringify({
  url: url.href,
  method: request.method,
  headers: { ...headers, excluding 'host' and 'cookie' },
  body: request.body ?? null
}))
```

The `host` and `cookie` headers are excluded because they vary per request but don't affect the API response content.

---

## Client-Side API Interface

### v2 ContextApiV2

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetch(options)` | `(options) => Promise` | Execute API request with optional overrides |
| `cancel()` | `() => void` | Abort in-flight request |
| `update(newApi, data)` | `(ApiRequest, ComponentData) => void` | Update API definition |
| `triggerActions(data)` | `(ComponentData) => void` | Trigger initial actions |
| `destroy()` | `() => void` | Cleanup (destroy payload signal) |

### v1 ContextApiV1

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetch(api?)` | `(ApiRequest?) => Promise` | Execute API request |
| `destroy` | `Function` | Cleanup |

---

## Abort Handling

### ApiAbortHandler

Manages abort controllers for in-flight requests:

- `applyAbortSignal(requestInit)`: Add abort controller to request; combine with existing signals via `AbortSignal.any()`
- `abort()`: Cancel all in-flight requests
- Automatically cleans up already-aborted controllers

### Abort Scenarios

- Component unmount → `abortSignal` from component
- New auto-fetch request → Cancel previous request
- Manual `cancel()` call → Cancel current request
- Timeout → `AbortSignal.timeout(ms)`

---

## v1 vs v2 Comparison

| Feature | v1 (Legacy) | v2 (Modern) |
|---------|------------|-------------|
| Path format | Array of formulas | Record with index |
| Query params | `{ name, formula }` | `{ formula, enabled? }` |
| Headers | Record or single formula | Record with `{ formula, enabled? }` |
| Methods | GET, POST, DELETE, PUT | + PATCH, HEAD, OPTIONS |
| Proxy | Boolean | Formula |
| Auth | Built-in Bearer | Via headers/cookies |
| Throttle | Built-in | Not available |
| Debounce | Built-in (number) | Via formula |
| Streaming | Not supported | SSE, JSON-stream, text, blob |
| SSR | Not supported | Supported |
| Timeout | Not supported | Formula-based |
| Error detection | Status-based only | Custom formula |
| Redirect rules | Not supported | Formula-based |
| Cancel | Not supported | Supported |
| Credentials | Not configurable | include/same-origin/omit |
| API inputs | Not supported | Named inputs |

---

## Non-Body Response Codes

Status codes `101`, `204`, `205`, `304` skip response body processing.

---

## System Limits

### Request Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxApiTimeout` | 30,000ms | 300,000ms | Maximum request timeout |
| `maxApiBodySize` | 10 MB | 100 MB | Maximum request/response body size |
| `maxApiHeaderSize` | 16 KB | 64 KB | Maximum total headers size |
| `maxConcurrentApis` | 10 | 50 | Maximum concurrent API requests |

### Retry Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxApiRetries` | 3 | Maximum retry attempts |
| `maxRetryDelay` | 30,000ms | Maximum delay between retries |

### Enforcement

- **Timeout:** Request aborted, `onError` triggered with timeout error
- **Body size:** Response truncated with warning
- **Concurrent:** Queued when limit reached

---

## Invariants

### Request Invariants

1. **I-API-METHOD-VALID:** HTTP method MUST be one of GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.
2. **I-API-URL-ABSOLUTE:** Final URL MUST be absolute (protocol + host + path).
3. **I-API-HEADERS-STRING:** All header values MUST be strings (or convertible).
4. **I-API-BODY-SERIALIZABLE:** Request body MUST be JSON-serializable (for JSON content-type).

### Response Invariants

5. **I-API-STATUS-NUMBER:** Response status MUST be a valid HTTP status code (100-599).
6. **I-API-ERROR-DETECTION:** `isError` formula determines error state (not just HTTP status).
7. **I-API-CACHE-KEY-DETERMINISTIC:** Same inputs MUST produce same cache key.

### Lifecycle Invariants

8. **I-API-ABORT-CLEANUP:** In-flight requests MUST be aborted on component unmount.
9. **I-API-SIGNAL-DESTROY:** API signal MUST be destroyed with component signal.
10. **I-API-CACHE-SCOPE:** Cache is per-component instance (not global).

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-API-METHOD-VALID | Build | Error: schema validation |
| I-API-URL-ABSOLUTE | Runtime | Error: skip request |
| I-API-ABORT-CLEANUP | Runtime | Abort on unmount (guaranteed) |

---

## Error Handling

### Error Types

| Error Type | When Thrown | Recovery |
|------------|-------------|----------|
| `ApiTimeoutError` | Request exceeds timeout | `onError` with timeout |
| `ApiNetworkError` | Network failure | Retry or `onError` |
| `ApiAbortError` | Request aborted | Silent (expected) |
| `ApiParseError` | Response body parse failure | `onError` with parse error |
| `ApiSizeLimitError` | Response exceeds size limit | Truncate, warn |

### Status Code Handling

| Status Range | Behavior |
|--------------|----------|
| 200-299 | Check `isError` formula (may still be error) |
| 300-399 | Follow redirect or treat as error |
| 400-499 | Client error, `onError` |
| 500-599 | Server error, `onError` |
| 0 | Network error or CORS |

### Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;  // Base delay in ms
  retryBackoff: 'linear' | 'exponential';
  retryOn: (status: number, error?: Error) => boolean;
}

async function fetchWithRetry(
  request: RequestInfo,
  config: RetryConfig
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(request);
      if (!config.retryOn(response.status)) {
        return response;
      }
      lastError = new Error(`Status ${response.status}`);
    } catch (e) {
      lastError = e;
    }
    
    const delay = config.retryBackoff === 'exponential'
      ? config.retryDelay * Math.pow(2, attempt)
      : config.retryDelay * (attempt + 1);
    
    await sleep(Math.min(delay, 30000));
  }
  
  throw lastError;
}
```

---

## Changelog

### Unreleased
- Added System Limits section with request, retry, and size limits
- Added Invariants section with 10 request, response, and lifecycle invariants
- Added Error Handling section with error types, status handling, and retry logic
