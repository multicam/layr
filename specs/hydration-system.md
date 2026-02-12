# Hydration & SSR-to-CSR Data Transfer

## 1. Overview

### Purpose
The hydration system bridges server-side rendering with client-side interactivity by serializing application state into HTML during SSR and deserializing it on the client to avoid redundant API calls and enable instant reactivity. The server embeds a JSON payload containing the component tree, API response cache, and page state into an inline script tag, which the client reads to bootstrap the runtime.

### Jobs to Be Done
- **Transfer API responses** from SSR to CSR, eliminating duplicate network requests on page load
- **Serialize component tree** with editor metadata stripped for production payloads
- **Bootstrap client runtime** from embedded JSON without additional network round-trips
- **Preserve page state** including variables, URL parameters, and route data
- **Manage cookie names** transferring names only (not values) for security
- **Re-initialize client-only state** — variables depending on `localStorage`, sensors, or browser APIs

### Scope
- Server-side construction of the `ToddleInternals` hydration payload
- HTML embedding via inline `<script type="application/json">` tag
- Client-side parsing and runtime initialization
- API response cache keying and matching
- Component tree serialization and test data removal
- Variable re-initialization on the client
- Security considerations for cookie and script handling

---

## 2. Data Model

### ToddleInternals

The core hydration payload:

```typescript
interface ToddleInternals {
  project: string            // Project short_id
  branch: string             // Branch name (e.g., 'main')
  commit: string             // Commit SHA or 'unknown'
  pageState: ComponentData   // Component data including API cache
  component: Component       // Root page component (test data removed)
  components: Component[]    // Dependency components (test data removed)
  isPageLoaded: boolean      // Hydration status flag (starts false)
  cookies: string[]          // Cookie NAMES only (not values)
}
```

| Field | Description |
|-------|-------------|
| `project` | Project identifier for multi-project environments |
| `branch` | Git branch for versioning and preview deployments |
| `commit` | Commit hash for cache busting and debugging |
| `pageState` | Full component data state including `Apis` cache |
| `component` | Root page component definition (cleaned of test data) |
| `components` | All dependency components (cleaned of test data) |
| `isPageLoaded` | Starts `false`; set to `true` after hydration completes |
| `cookies` | Array of cookie names from the request (values excluded for security) |

### PageState Structure

```typescript
{
  ...formulaContext.data,   // Location, Variables, URL parameters
  Apis: {
    [requestHash]: ApiStatus  // Cached API responses keyed by hash
  }
}
```

### ApiStatus

```typescript
interface ApiStatus {
  data: unknown        // Parsed response body
  isLoading: false     // Always false in cache (request complete)
  error?: unknown      // Error object if request failed
  response?: {
    headers: Record<string, string>
    status: number
    performance: { responseEnd: number }
  }
}
```

---

## 3. Server-Side: Payload Construction

### Step 1: API Evaluation and Caching

During SSR, all component APIs with `server.ssr.enabled === true` and `autoFetch === true` are evaluated:

1. **Independent APIs** (no `apiReferences`) execute in parallel via `Promise.all`
2. **Dependent APIs** (referencing other API responses) execute sequentially
3. Each response is stored in an `apiCache: Record<string, ApiStatus>` keyed by request hash
4. Duplicate requests (same hash) return the cached entry without re-fetching

### Step 2: Request Hash Generation

```typescript
requestHash(url: URL, request: RequestInit): string
```

Produces a deterministic hash from:
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": { "accept": "application/json" },
  "body": null
}
```

**Excluded from hash:**
- `host` header — varies between environments (localhost vs production)
- `cookie` header — contains session data; hashing on cookies would break cache sharing

The hash function uses a consistent string serialization to ensure server and client produce identical keys for the same request.

### Step 3: Component Tree Cleanup

Before serialization, `removeTestData()` strips editor-only metadata to reduce payload size:

**Removed fields:**
- `testValue` on attributes, route params, formula arguments
- `dummyEvent` from event definitions
- `description`, `group`, `label` from actions
- `service`, `servicePath` from API objects

Applied recursively to the root component and all dependency components.

### Step 4: Cookie Name Collection

Only cookie **names** are transferred:
```typescript
cookies: Object.keys(formulaContext.env.request.cookies)
```

Values stay server-side. Template-based cookie substitution (`{{cookieName}}`) in API request bodies/headers is handled during SSR, not transferred to the client.

---

## 4. Server-Side: HTML Embedding

### Serialization Format

```html
<script type="application/json" id="nordcraft-data">
  {JSON stringified ToddleInternals with script tag escaping}
</script>
```

**Key properties:**
- `type="application/json"` prevents browser from executing the content as JavaScript
- `id="nordcraft-data"` enables client-side lookup via `getElementById`
- Content is `JSON.stringify()` output with `</script>` escaped to `<\/script>`

### XSS Protection

The only transformation applied is escaping closing script tags:
```typescript
JSON.stringify(toddleInternals).replaceAll('</script>', '<\\/script>')
```

This prevents injection of `</script>` within JSON string values from breaking the enclosing script tag.

### Serialization Limitations

| Data Type | Behavior |
|-----------|----------|
| Strings, numbers, booleans, null | Preserved exactly |
| Objects, arrays | Preserved (nested) |
| `undefined` | Omitted from objects, becomes `null` in arrays |
| `Date` objects | Serialized as ISO strings (not automatically revived) |
| Functions | Lost (not serializable) |
| Circular references | Throws `TypeError` (not handled) |
| `Blob`, `ArrayBuffer` | Not serializable |

---

## 5. Client-Side: Hydration

### Step 1: Parse Hydration Data

```typescript
window.__toddle = JSON.parse(
  document.getElementById('nordcraft-data').textContent
)
```

The `ToddleInternals` object becomes available as `window.__toddle`.

### Step 2: Initialize Global Runtime

`initGlobalObject()` constructs the runtime global from hydration data:

```typescript
window.toddle = {
  project: window.__toddle.project,
  branch: window.__toddle.branch,
  commit: window.__toddle.commit,
  components: window.__toddle.components,
  pageState: window.__toddle.pageState,  // Contains Apis cache
  locationSignal: signal({
    route: component.route,
    page: component.page,
    path: window.location.pathname,
    params: parsedParams,
    query: parsedQuery,
    hash: parsedHash,
  }),
  // ... formulas, actions, etc.
}
```

### Step 3: Re-initialize Variables

Variables are recalculated on the client because the server cannot access client-only APIs:

```typescript
Variables: mapObject(component.variables ?? {}, ([name, variable]) => [
  name,
  applyFormula(variable.initialValue, {
    data: window.toddle.pageState,
    component,
    formulaCache: {},
    root: document,
    package: undefined,
    toddle: window.toddle,
    env,
  }),
])
```

**Why re-initialize:**
- `localStorage.getItem()` not available during SSR
- `window.matchMedia()` not available during SSR
- Sensor APIs (geolocation, device orientation) not available during SSR
- Any formula referencing browser APIs needs client-side evaluation

### Step 4: API Cache Matching

When each API initializes on the client, it checks the hydration cache:

```typescript
const cacheMatch =
  isDefined(api.autoFetch) &&
  (api.autoFetch.type !== 'value' || api.autoFetch.value === true) &&
  (window?.__toddle?.isPageLoaded ?? false) === false
    ? ctx.toddle.pageState.Apis?.[requestHash(url, requestSettings)]
    : undefined
```

**Cache hit conditions:**
1. `autoFetch` is defined (not explicitly disabled)
2. `autoFetch` is not statically `false`
3. Page is still loading (`isPageLoaded === false`)
4. Request hash matches an entry in `pageState.Apis`

**On cache hit:**
- If `cacheMatch.error` exists → call `apiError()` with cached error
- Otherwise → call `apiSuccess()` with cached data and response metadata
- No network request made

**On cache miss:**
- If `autoFetch` evaluates to `true` → execute fresh `fetch()` request
- Otherwise → initialize API with idle state `{ isLoading: false, data: null, error: null }`

### Step 5: Mark Page as Loaded

After hydration completes:
```typescript
window.__toddle.isPageLoaded = true
```

This flag prevents subsequent API initializations (e.g., from lazy-loaded components) from incorrectly using stale cache entries.

---

## 6. Data Flow

```
SSR Pipeline:
┌─────────────────────────────────────────────────┐
│ 1. nordcraftPage() receives HTTP Request         │
│ 2. Evaluate component APIs → apiCache            │
│ 3. Render page body → HTML + apiCache            │
│ 4. Construct ToddleInternals:                    │
│    { pageState: { Apis: apiCache }, ... }        │
│ 5. JSON.stringify → embed in <script> tag        │
│ 6. Send complete HTML to browser                 │
└─────────────────────────────────────────────────┘
                  ↓ (HTML response)
┌─────────────────────────────────────────────────┐
│ Client Hydration:                                │
│ 1. Parse JSON from #nordcraft-data               │
│ 2. initGlobalObject() → window.toddle            │
│ 3. Re-initialize variables (browser APIs)        │
│ 4. createRoot() → initialize signals, APIs       │
│ 5. Each API checks cache:                        │
│    requestHash(url, settings) → pageState.Apis   │
│    • Hit  → apiSuccess(cached)                   │
│    • Miss → fetch()                              │
│ 6. Render component tree → interactive DOM       │
│ 7. isPageLoaded = true                           │
└─────────────────────────────────────────────────┘
```

---

## 7. Theme and Style Transfer

### Theme

- **Server:** Sets `data-theme` attribute on `<html>` element
- **Client:** Reads `pageState.Page.Theme` and subscribes to dynamic theme changes
- No additional hydration needed — the attribute is already in the HTML

### Custom Properties (CSS Variables)

- **Server:** Generated during `renderPageBody()` and embedded in a `<style>` tag in `<head>`
- **Client:** CSS is already parsed by the browser; no JavaScript hydration needed

### Fonts

- **Server:** Preload `<link>` tags added to `<head>` for font files
- **Client:** Fonts already initiated by the browser from preload hints; no rehydration

---

## 8. Route Data Transfer

### Location Signal

The client constructs a location signal from the current URL and the component's route definition:

```typescript
locationSignal: signal({
  route: component.route,          // Route definition from hydration
  page: component.page,            // Page path template
  path: window.location.pathname,  // Live URL path
  params,                          // Parsed path parameters
  query,                           // Parsed query parameters
  hash,                            // URL hash fragment
})
```

**Parameter parsing:**
- Path params extracted by matching URL segments against `component.route.path`
- Query params parsed from `window.location.search`
- All route-defined params default to `null` if missing (avoids `undefined`)

---

## 9. Security

### Cookie Value Isolation

Only cookie **names** appear in the HTML payload:
```typescript
cookies: Object.keys(formulaContext.env.request.cookies)
```

Cookie values are never embedded in the page. The server uses template substitution (`{{cookieName}}`) to inject cookie values into API request bodies/headers during SSR, keeping values server-side only.

### Script Tag Injection Prevention

All `</script>` sequences in the JSON payload are escaped:
```typescript
.replaceAll('</script>', '<\\/script>')
```

This prevents malicious data (e.g., a user-generated string containing `</script>`) from prematurely closing the hydration script tag and injecting arbitrary HTML/JavaScript.

### No Sensitive Data in Payload

The `removeTestData()` function removes editor metadata but does not specifically filter sensitive data. API responses cached during SSR may contain sensitive data visible in the page source. Developers should ensure APIs don't return secrets in their responses.

---

## 10. Business Rules

1. **Cache key excludes host and cookie headers** — enables cache portability across environments while preventing session-specific cache entries
2. **isPageLoaded flag prevents stale cache usage** — once set to `true`, no API uses the hydration cache, even if new components mount later
3. **Variables always re-initialized on client** — SSR values for client-dependent variables (localStorage, matchMedia) are overwritten
4. **Test data stripped from production** — reduces payload size by removing editor-only fields (testValue, dummyEvent, description, group, label, service, servicePath)
5. **All dependency components included** — the full transitive closure of component dependencies is serialized (resolved via `takeIncludedComponents()`)
6. **No explicit size limit** — large payloads (many APIs, large responses) may impact LCP metrics
7. **No TTL or cache invalidation** — hydration cache is one-shot; entries live only until `isPageLoaded = true`
8. **Parallel + sequential API execution** — independent APIs evaluate concurrently during SSR; dependent APIs evaluate sequentially to allow cross-referencing

---

## 11. Edge Cases

### Circular References in API Responses
`JSON.stringify()` will throw a `TypeError`. No circular reference detection or handling is implemented. API responses must be acyclic.

### Date Serialization
`Date` objects become ISO strings during JSON serialization. They are not automatically revived on the client. Formulas that expect `Date` objects from API responses must handle string-to-date conversion.

### Large Payloads
No size limit is enforced on the hydration payload. Projects with many APIs or large API responses may produce multi-megabyte `<script>` tags, impacting page load performance. The `removeTestData()` cleanup mitigates this partially by stripping editor metadata.

### API with Dynamic Headers
If an API's headers change between SSR and CSR (e.g., due to variable re-initialization), the request hash will differ and the client won't find a cache match, triggering a fresh fetch.

### Failed API Responses
API errors during SSR are cached with `error` field set. The client reads these as cache hits and calls `apiError()` with the cached error, triggering `onFailed` handlers without making a network request.

### APIs with autoFetch Disabled
APIs where `autoFetch` is statically `false` are not evaluated during SSR and not cached. They initialize on the client as idle state.

---

## 12. External Dependencies

| Dependency | Usage |
|------------|-------|
| `JSON.stringify` / `JSON.parse` | Serialization/deserialization of hydration payload |
| `document.getElementById` | Locating the hydration script tag on the client |
| `Signal<T>` | Reactive state initialization from hydration data |
| `applyFormula()` | Re-initializing variable values on the client |
| `requestHash()` | Generating cache keys for API response matching |
| `removeTestData()` | Stripping editor metadata from component definitions |
| `hash()` | Deterministic string hashing for cache keys |

---

## System Limits

### Payload Size Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxHydrationPayloadSize` | 10 MB | Maximum JSON payload size |
| `maxCachedApis` | 50 | Maximum API responses in cache |
| `maxCachedComponents` | 200 | Maximum components in payload |

### Performance Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxHydrationTime` | 500ms | Target time for client hydration |
| `maxParseTime` | 100ms | Target time for JSON parsing |

### Enforcement

- **Payload size:** Log warning if `payload.length > 80%` of limit
- **Hydration time:** Log warning if `performance.now() - start > maxHydrationTime`
- **Client impact:** Large payloads increase LCP; consider lazy-loading strategies

---

## Invariants

### Data Invariants

1. **I-HYDR-JSON-VALID:** Hydration payload MUST be valid JSON.
2. **I-HYDR-SCRIPT-ESCAPED:** All `</script>` sequences MUST be escaped.
3. **I-HYDR-COOKIE-NAMES-ONLY:** Cookie values MUST NOT appear in payload.
4. **I-HYDR-TEST-DATA-REMOVED:** Editor test data MUST be stripped.

### Cache Invariants

5. **I-HYDR-CACHE-KEY-DETERMINISTIC:** Same request MUST produce same cache key on server and client.
6. **I-HYDR-CACHE-HASH-EXCLUDES-HOST:** Host header MUST NOT affect cache key.
7. **I-HYDR-CACHE-HASH-EXCLUDES-COOKIE:** Cookie header MUST NOT affect cache key.

### Lifecycle Invariants

8. **I-HYDR-ISPAGELOADED-FALSE:** `isPageLoaded` MUST start as `false`.
9. **I-HYDR-ISPAGELOADED-ONCE:** `isPageLoaded` MUST be set to `true` exactly once after hydration.
10. **I-HYDR-VARIABLES-REINIT:** Client-side variables MUST be re-evaluated (not reused from SSR).

### Component Invariants

11. **I-HYDR-COMPONENT-COMPLETE:** All referenced components MUST be included.
12. **I-HYDR-COMPONENT-ACYCLIC:** Component tree MUST be acyclic (no circular deps).

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-HYDR-JSON-VALID | `JSON.parse()` | Hydration fails, page broken |
| I-HYDR-SCRIPT-ESCAPED | SSR | Auto-escape |
| I-HYDR-COOKIE-NAMES-ONLY | SSR | Auto-strip values |
| I-HYDR-CACHE-KEY-DETERMINISTIC | Runtime | Cache miss, fresh fetch |

---

## Error Handling

### Server-Side Errors

| Error | When | Behavior |
|-------|------|----------|
| `TypeError: Circular reference` | API response has circular refs | Skip API from cache, log error |
| `TypeError: Not serializable` | Response contains `Blob`, etc | Skip API from cache, log error |
| JSON serialization fails | Any stringify error | Return error page |

### Client-Side Errors

| Error | When | Behavior |
|-------|------|----------|
| `SyntaxError: JSON.parse` | Malformed hydration JSON | Page broken, log error |
| `TypeError: Cannot read property` | Missing expected data | Graceful degradation |
| Cache hash mismatch | Request params changed | Fresh fetch (expected) |

### Variable Re-initialization Errors

When a variable formula throws during client re-init:
1. Log error with variable name and component context
2. Set variable to `null`
3. Continue hydration (don't break entire page)

```typescript
try {
  variableValue = applyFormula(variable.initialValue, ctx);
} catch (e) {
  console.error(`Variable ${name} re-init failed:`, e);
  variableValue = null;
}
```

---

## Hydration Mismatch Detection

### Definition

A hydration mismatch occurs when:
1. Server renders content based on state X
2. Client re-initializes variables to state Y ≠ X
3. Client renders content that doesn't match server HTML

### Common Causes

| Cause | Example | Detection |
|-------|---------|-----------|
| Browser-only APIs | `localStorage.getItem()` | `isServer` check |
| Random values | `Math.random()` | Deterministic seed |
| Time-dependent | `Date.now()` | Server timestamp |
| User agent sniffing | `navigator.userAgent` | Server UA header |

### Prevention Strategies

1. **Use `isServer` guard:**
```typescript
const value = isServer 
  ? defaultValue 
  : localStorage.getItem('key');
```

2. **Stabilize timestamps:**
```typescript
const now = isServer 
  ? env.request.timestamp 
  : Date.now();
```

3. **Mark client-only sections:**
```html
<div data-client-only="true">
  <!-- Rendered only on client -->
</div>
```

### Client-Side Detection

After hydration, optionally compare key DOM nodes:
```typescript
function detectMismatch(ssrNode, csrNode) {
  if (ssrNode.textContent !== csrNode.textContent) {
    console.warn('Hydration mismatch:', {
      expected: ssrNode.textContent,
      actual: csrNode.textContent
    });
  }
}
```

---

## Performance Monitoring

### Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Payload parse time | < 100ms | `performance.now()` around `JSON.parse()` |
| Variable re-init time | < 50ms | Sum of all variable evaluations |
| Cache hit rate | > 90% | Cached APIs / Total APIs |
| Hydration complete | < 500ms | Time from script start to `isPageLoaded = true` |

### Logging (Development Mode)

```typescript
const hydrationStart = performance.now();

// ... hydration code ...

const hydrationTime = performance.now() - hydrationStart;
if (hydrationTime > 500) {
  console.warn(`Hydration took ${hydrationTime}ms`);
}
```

---

## Changelog

### Unreleased
- Added System Limits section with payload size and performance limits
- Added Invariants section with 12 data, cache, lifecycle, and component invariants
- Added Error Handling section with server and client error handling
- Added Hydration Mismatch Detection section with causes and prevention
- Added Performance Monitoring section with key metrics
