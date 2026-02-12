# API Proxy System Specification

## Purpose

The API Proxy System provides secure, server-mediated API request execution for Layr applications. It operates through two distinct pathways: a direct HTTP proxy for client-side requests and an SSR-time API evaluator that pre-fetches data during server-side rendering. Both pathways share common security primitives (header sanitization, cookie template injection) while the SSR path adds dependency-aware parallel/sequential execution.

### Jobs to Be Done

- Proxy client-side API requests through the backend for cookie injection and CORS bypass
- Pre-fetch API data during SSR for hydration
- Sanitize headers to prevent credential leakage and protocol violations
- Inject HTTP-only cookies into request URLs, headers, and bodies via template substitution
- Detect and resolve API dependencies to maximize parallel execution during SSR
- Support custom error detection formulas per API
- Evaluate redirect rules based on API responses during SSR
- Cache API responses to avoid duplicate requests within a single SSR render
- Track performance metrics for API requests

---

## Architecture Overview

### Two Request Pathways

| Pathway | Entry Point | When Used |
|---------|-------------|-----------|
| **Direct Proxy** | `/.toddle/omvej/components/:componentName/apis/:apiName` | Client-side (browser) API calls |
| **SSR Evaluator** | `evaluateComponentApis()` | Server-side rendering |

Both pathways use the same:
- Header sanitization pipeline (`sanitizeProxyHeaders`)
- Cookie template substitution (`applyTemplateValues`)
- URL validation (`validateUrl`)
- Request construction (`createApiRequest`)

---

## Direct HTTP Proxy

### Route

`ALL /.toddle/omvej/components/:componentName/apis/:apiName`

### Request Flow

1. **Extract cookies** from incoming request
2. **Build outgoing URL:**
   - Read URL from `x-nordcraft-url` request header
   - Apply cookie template substitution
   - Validate and normalize URL
3. **Sanitize headers** through the three-layer pipeline
4. **Process body templates** (if `x-nordcraft-templates-in-body` header is present and method allows body)
5. **Execute request** with 5-second timeout
6. **Filter response headers** and stream response back

### Request Transformations

#### URL Construction

The proxy reads the target URL from the `x-nordcraft-url` request header (not from the URL path). Template values in the URL are replaced with cookie values before validation.

#### Header Handling

**Request headers — removed:**
- Hop-by-hop headers (connection, keep-alive, proxy-authenticate, proxy-authorization, te, trailer, transfer-encoding, upgrade)
- Layr internal headers (`x-nordcraft-url`, `x-nordcraft-templates-in-body`)
- `cookie` header (cookies injected explicitly via templates)

**Request headers — added/modified:**
- `accept-encoding` forced to `gzip, deflate`
- `X-Forwarded-For` set to client IP (normalized from IPv4-mapped IPv6)
- `cf-connecting-ip` and `host` removed for localhost requests

**Response headers — removed:**
- Hop-by-hop headers
- `content-encoding` (proxy handles decompression)

**Response headers — added:**
- `Vary: x-nordcraft-url` (for cache correctness)

#### Body Template Processing

When the request header `x-nordcraft-templates-in-body` is present and the HTTP method allows a body (`POST`, `DELETE`, `PUT`, `PATCH`, `OPTIONS`):

- **`application/x-www-form-urlencoded`:** Parse form parameters, apply templates to each value, re-encode
- **All other content types:** Apply templates directly to the raw body text

### Error Responses

| Condition | Status | Response |
|-----------|--------|----------|
| Invalid URL (after template substitution) | 400 | `{ "error": "The provided URL is invalid: {url}" }` |
| Header sanitization failure | 400 | `{ "error": "Proxy validation failed: one or more headers had an invalid name/value" }` |
| Body template processing error | 400 | `{ "error": "Error applying template values to request body..." }` |
| Upstream timeout (5s) | 504 | `{message}` |
| Other fetch error | 500 | `{message}` |
| Request construction failure | 500 | `{ "error": "{message}" }` |

### Response Handling

- Status codes `101`, `204`, `205`, `304` return no response body
- Response body is streamed through (not buffered)
- All response headers are forwarded after filtering

---

## SSR API Evaluator

### Function

`evaluateComponentApis({ component, formulaContext, req, apiCache, updateApiCache })`

### Evaluation Flow

```
1. Filter to V2 APIs only (legacy APIs excluded)
2. Sort by dependency order (sortApiEntries)
3. Split into independent (no API references) and dependent (has API references)
4. Execute independent APIs in parallel (Promise.all)
5. Update formulaContext.data.Apis with independent results
6. Execute dependent APIs sequentially (for loop)
7. Update formulaContext.data.Apis after each dependent API
8. Return combined responses
```

### Per-API Fetch Flow

For each individual API:

1. **Evaluate inputs** — resolve all input formulas against current context
2. **Check SSR enabled** — evaluate `server.ssr.enabled` formula (default: `false`)
3. **Check autoFetch** — evaluate `autoFetch` formula (default: `false`)
4. **Short-circuit** — if either SSR or autoFetch is disabled, return `{ data: null, isLoading: autoFetch, error: null }`
5. **Build request** — call `createApiRequest()` with evaluated context
6. **Check cache** — compute cache key, return cached response if available
7. **Apply cookie templates** to URL search parameters
8. **Sanitize headers** — same three-layer pipeline as direct proxy
9. **Execute fetch** with performance tracking
10. **Parse response body** — based on content type or parser mode override
11. **Evaluate error formula** — custom error detection or default `!response.ok`
12. **Evaluate redirect rules** — sorted by index, may throw `RedirectError`
13. **Update cache** — store response with computed cache key

---

## API Dependency Ordering

### How Dependencies Are Detected

The `ToddleApiV2.apiReferences` getter performs AST traversal of all formulas in the API definition. It searches for `path` formula nodes where the first segment is `'Apis'`, extracting the second segment as the referenced API name.

#### Scanned Formula Locations

- `autoFetch`
- `url`
- `path` parameters
- `headers`
- `body`
- `inputs`
- `queryParams`
- `server.proxy.enabled`
- `server.ssr.enabled`
- `client.debounce`
- `redirectRules`
- `isError`
- `timeout`

#### Formula AST Node Types Traversed

| Node Type | Child Formulas |
|-----------|---------------|
| `path` | Checks if `path[0] === 'Apis'` and extracts `path[1]` |
| `record` | Visits each entry's formula |
| `function`, `array`, `or`, `and`, `apply`, `object` | Visits each argument's formula |
| `switch` | Visits each case's condition and formula |

#### Result

- Returns `Set<string>` of API names this API depends on
- Self-references are removed (prevents false circular dependencies)
- Result is cached on first computation (lazy, computed once per API instance)

### Sorting Algorithm

`sortApiEntries()` sorts API entries using pairwise comparison:

- If A depends on B → B comes first
- If B depends on A → A comes first
- If neither/both depend on each other → maintain original order

### Parallel vs Sequential Execution

| Condition | Execution Strategy |
|-----------|-------------------|
| `api.apiReferences.size === 0` | Parallel (`Promise.all`) |
| `api.apiReferences.size > 0` | Sequential (`for` loop), context updated after each |

After parallel execution completes, all independent API results are merged into `formulaContext.data.Apis` before dependent APIs begin. Each dependent API sees results from all previously completed APIs.

---

## Cookie Template Substitution

### Template Syntax

```
{{ cookies.<cookieName> }}
```

Example: `https://api.example.com/users?token={{ cookies.sessionId }}`

### Substitution Algorithm

1. Scan input string with regex `/{{ cookies\.(.+?) }}/gm`
2. Collect unique cookie names into a Set (deduplication)
3. For each cookie name, replace all occurrences with the cookie value
4. Missing cookies are replaced with empty string (prevents template syntax leakage)

### Substitution Points

| Location | Direct Proxy | SSR Evaluator |
|----------|-------------|---------------|
| URL | Yes (from `x-nordcraft-url` header) | Yes (URL search params only) |
| Headers | Yes (via `mapTemplateHeaders`) | Yes (via `sanitizeProxyHeaders`) |
| Body | Yes (when `x-nordcraft-templates-in-body` set) | No |

---

## Header Sanitization Pipeline

Three-layer filter pipeline applied to all outbound API requests:

### Layer 1: Skip Hop-by-Hop Headers

Removes HTTP/1.1 connection-specific headers per RFC 2616 §13.5.1:

`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`

### Layer 2: Skip Layr Headers

Removes internal routing headers not relevant to target services:

- `x-nordcraft-url` — proxy target URL
- `x-nordcraft-templates-in-body` — template processing flag

### Layer 3: Skip Cookie Header

Removes the `cookie` header entirely. This prevents automatic forwarding of all browser cookies to external APIs. Cookies must be explicitly injected via template syntax (`{{ cookies.name }}`) to ensure intentional credential sharing.

### Layer 4: Apply Templates

After stripping dangerous headers, all remaining header values have cookie template patterns replaced with actual cookie values.

### Response Header Filtering

For proxied responses, two additional filters apply:

1. **Skip hop-by-hop headers** — same as request filtering
2. **Skip content-encoding header** — prevents double-encoding since the proxy or platform handles content encoding

---

## API Request Construction

### URL Building

1. Evaluate `url` formula → base URL
2. Evaluate `path` parameters → sorted by index, joined with `/`
3. Evaluate `queryParams` → each has optional `enabled` formula
4. Evaluate `hash` formula → URL fragment

#### Query Parameter Encoding

| Value Type | Encoding |
|-----------|----------|
| `null`/`undefined` | Skipped |
| `string`/`number` | `key=value` |
| `Array` | Multiple entries: `key=v1&key=v2` |
| `Object` | Bracket notation: `key[nested]=value` (recursive) |

### Request Settings

#### Method

Validated against `ApiMethod` enum (`GET`, `POST`, `DELETE`, `PUT`, `PATCH`, `HEAD`, `OPTIONS`). Defaults to `GET` if invalid.

#### Headers

1. Start with `defaultHeaders` (in SSR: incoming request headers)
2. Merge API-defined headers (each has optional `enabled` formula)
3. Skip headers with null/undefined values
4. Trim header names and values

#### Body

Only for methods: `POST`, `DELETE`, `PUT`, `PATCH`, `OPTIONS`

| Content-Type | Encoding |
|-------------|----------|
| `application/json` (default) | `JSON.stringify(body)` |
| `application/x-www-form-urlencoded` | URL-encoded key-value pairs (arrays supported) |
| `multipart/form-data` | `FormData` object (content-type header deleted so browser sets boundary) |
| `text/plain` | `String(body)` |
| Other | Body passed as-is |

#### Timeout

If `api.timeout` formula evaluates to a positive number, an `AbortSignal.timeout()` is applied.

---

## Cache System

### Cache Key Generation

Keys are computed via `requestHash()` using the cyrb53 non-cryptographic hash algorithm:

**Inputs hashed:**
- Full URL (href)
- HTTP method
- Headers (excluding `host` and `cookie`)
- Request body (or null)

**Why `host` and `cookie` are excluded:** `host` varies by environment without changing request semantics. `cookie` is excluded because cookies are injected via templates into the URL/headers/body which are already part of the hash.

### Cache Scope

The cache exists per SSR render. It is:
- Created fresh for each page render
- Shared across all components on the same page
- Passed via `apiCache` parameter and updated via `updateApiCache` callback
- Not persisted between requests

### Cache Behavior

- Checked before executing a fetch
- Populated after successful fetch
- Cache hit returns stored `ApiStatus` (skips fetch, sanitization, redirect evaluation)

---

## Error Detection

### Default Error Detection

If no `isError` formula is defined: `!response.ok` (HTTP status >= 400)

### Custom Error Formula

The `isError` formula receives an isolated context with only the current API's response:

```
{
  Apis: {
    [apiName]: {
      isLoading: false,
      data: responseBody,
      error: null,
      response: { status, headers, performance }
    }
  }
}
```

- Formula returns `null`/`undefined` → use default behavior (`!response.ok`)
- Formula returns truthy → treat as error
- Formula returns falsy → treat as success

### Error State

When an API is in error state:
- `data` is set to `null`
- `error` is set to the response body (or `statusText` if body is null)

---

## Redirect Rules

### Evaluation

Redirect rules are evaluated after a successful API fetch during SSR:

1. Sort rules by `index` property (ascending)
2. For each rule, evaluate its formula with the current API's response in context
3. If formula returns a string → validate as URL → throw `RedirectError`
4. First matching rule wins (subsequent rules not evaluated)

### RedirectError

```
class RedirectError extends Error {
  redirect: {
    apiName: string
    componentName: string
    url: URL
    statusCode?: RedirectStatusCode
  }
}
```

The error propagates up through the SSR pipeline and is caught by the page handler, which converts it to an HTTP redirect response.

### Redirect Status Codes

`300 | 301 | 302 | 303 | 304 | 307 | 308`

Default (when `statusCode` is not specified): handled by the caller.

### Redirect Headers

When a redirect occurs, the following headers are set on the response:
- `x-nordcraft-redirect-api-name`
- `x-nordcraft-redirect-component-name`
- `x-nordcraft-redirect-name`

---

## Response Body Parsing

### Parser Modes

| Mode | Behavior |
|------|----------|
| `auto` (default) | Detect from `content-type` header |
| `json` | Force `response.json()` |
| `text` | Force `response.text()` |

### Content-Type Detection (auto mode)

| Content-Type Pattern | Parser |
|---------------------|--------|
| `application/json`, `application/*+json` | JSON |
| `text/*`, `application/x-www-form-urlencoded`, `application/xml`, `application/*+xml` | Text |

Unsupported content types throw an error during SSR.

---

## Performance Metrics

### ApiPerformance

```
interface ApiPerformance {
  requestStart?: number | null
  responseStart?: number | null
  responseEnd?: number | null
}
```

| Metric | Measured Point |
|--------|---------------|
| `requestStart` | Before `fetch()` call |
| `responseStart` | After `fetch()` resolves (response headers received), before body parsing |
| `responseEnd` | After response body fully parsed |

### Direct Proxy Timing

Uses Hono's timing middleware with key `apiProxyFetch` — tracks total round-trip time only.

### Performance in ApiStatus

Performance metrics are included in the `ApiStatus.response.performance` field and are available to:
- Error detection formulas
- Redirect rule formulas
- Client-side consumption (hydrated data)

---

## Data Models

### ApiStatus

```
interface ApiStatus {
  data: unknown
  isLoading: boolean
  error: unknown
  response?: {
    status?: number | null
    headers?: Record<string, string> | null
    performance?: ApiPerformance | null
    debug?: unknown | null
  }
}
```

### ApiRequest (V2)

```
interface ApiRequest {
  version: 2
  name: string
  type: 'http' | 'ws'
  autoFetch?: Formula | null
  url?: Formula | null
  path?: Record<string, { formula: Formula; index: number }> | null
  queryParams?: Record<string, { formula: Formula; enabled?: Formula | null }> | null
  hash?: { formula: Formula } | null
  headers?: Record<string, { formula: Formula; enabled?: Formula | null }> | null
  method?: ApiMethod | null
  body?: Formula | null
  inputs: Record<string, { formula?: Formula | null }>
  server?: {
    proxy?: { enabled: { formula: Formula }; useTemplatesInBody?: { formula: Formula } | null } | null
    ssr?: { enabled?: { formula: Formula } | null } | null
  } | null
  client?: {
    debounce?: { formula: Formula } | null
    onCompleted?: EventModel | null
    onFailed?: EventModel | null
    onMessage?: EventModel | null
    parserMode?: ApiParserMode | null
    credentials?: 'include' | 'same-origin' | 'omit' | null
  } | null
  redirectRules?: Record<string, { formula: Formula; statusCode?: RedirectStatusCode | null; index: number }> | null
  isError?: { formula: Formula } | null
  timeout?: { formula: Formula } | null
}
```

### ApiMethod Enum

`GET | POST | DELETE | PUT | PATCH | HEAD | OPTIONS`

### ApiParserMode

`'auto' | 'text' | 'json' | 'event-stream' | 'json-stream' | 'blob'`

---

## Security Considerations

### Cookie Isolation

The proxy strips all cookies from forwarded requests. Cookies are only included when explicitly referenced via `{{ cookies.name }}` templates. This prevents accidental credential forwarding to third-party APIs.

### Template Fallback

Missing cookie values are replaced with empty strings, not the raw template syntax. This prevents internal template patterns (e.g., `{{ cookies.sessionToken }}`) from being sent to external services.

### IP Forwarding

The proxy sets `X-Forwarded-For` with the client's real IP address. IPv4-mapped IPv6 addresses (`::ffff:192.168.1.1`) are normalized to IPv4 (`192.168.1.1`). Localhost requests have `cf-connecting-ip` and `host` headers removed to avoid confusing downstream services.

### Accept-Encoding Restriction

Both proxy pathways force `accept-encoding: gzip, deflate` because the server environment may not support brotli decompression.

### Error Formula Isolation

Custom error detection formulas receive an isolated context containing only the current API's response data. They cannot access other APIs' responses, preventing information leakage between API evaluations.

---

## Edge Cases

- **Circular API dependencies:** The sorting algorithm uses pairwise comparison. If A depends on B and B depends on A, `compareApiDependencies` returns `0` (equal), preserving original order. Both will be treated as dependent and executed sequentially. The system does not detect or warn about circular references.
- **API references self:** Self-references are explicitly removed from the `apiReferences` Set.
- **Missing API dependency:** If API A references API B but B doesn't exist or failed to fetch, A still executes — it sees B's status as whatever was in `formulaContext.data.Apis` (likely `undefined`).
- **SSR disabled but autoFetch enabled:** Returns `{ data: null, isLoading: true, error: null }` — signals the client to fetch on hydration.
- **SSR enabled but autoFetch disabled:** Returns `{ data: null, isLoading: false, error: null }` — API is not fetched on server or client initially.
- **Upstream timeout:** Direct proxy returns 504. SSR fetch wraps timeout errors as 504 response with error message.
- **Non-body response codes (101, 204, 205, 304):** Response body is `undefined` (not an empty stream).
- **FormData content-type:** When body is `multipart/form-data`, the `content-type` header is deleted from the request so the runtime can set the proper boundary parameter.

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxCount` | 1,000 | Maximum items processed |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Count limit:** Stop processing

---

## Invariants

1. **I-OP-VALID:** Operations MUST be valid.
2. **I-OP-SAFE:** Operations MUST be safe.
3. **I-OP-DETERMINISTIC:** Results MUST be deterministic.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-VALID | Build | Error: validation |
| I-OP-SAFE | Runtime | Reject operation |
| I-OP-DETERMINISTIC | Testing | CI failure |

---

## Error Handling

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
