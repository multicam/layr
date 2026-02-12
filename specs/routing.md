# Routing Specification

## Purpose

The Routing system maps URLs to page components and handles custom route rules (redirects and rewrites). It supports dynamic path segments, query parameters, formula-driven enabling, and specificity-based matching.

### Jobs to Be Done

- Match incoming URLs to page components based on route declarations
- Support custom routes for redirects (HTTP redirects) and rewrites (transparent proxying)
- Extract path and query parameters for use in component formulas
- Construct destination URLs from formulas for redirects and rewrites
- Prevent redirect loops and recursive rewrites

---

## Data Models

### Path Segments

Routes are defined as arrays of path segments:

**StaticPathSegment:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'static'` | Static segment |
| `name` | `string` | Literal path value (e.g., `"products"`) |
| `optional` | `boolean?` | Whether the segment can be omitted |

**DynamicPathSegment:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'param'` | Dynamic parameter |
| `name` | `string` | Parameter name (e.g., `"productId"`) |
| `testValue` | `string` | Test value for preview mode |
| `optional` | `boolean?` | Whether the segment can be omitted |

### RouteDeclaration

Base structure shared by page routes and custom routes.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `Array<StaticPathSegment \| DynamicPathSegment>` | URL path pattern |
| `query` | `Record<string, { name, testValue }>` | Expected query parameters with defaults |

### PageRoute (extends RouteDeclaration)

Page-specific route with HTML head metadata.

| Field | Type | Description |
|-------|------|-------------|
| `info.language` | `{ formula: Formula }?` | `<html lang="...">` value (default: `'en'`) |
| `info.theme` | `{ formula: Formula }?` | `<html data-nc-theme="...">` value |
| `info.title` | `{ formula: Formula }?` | `<title>` value (default: page name) |
| `info.description` | `{ formula: Formula }?` | `<meta name="description">` value |
| `info.icon` | `{ formula: Formula }?` | Favicon path |
| `info.charset` | `{ formula: Formula }?` | Character set (default: `'utf-8'`) |
| `info.meta` | `Record<string, MetaEntry>?` | Additional meta tags |

### Custom Route

| Field | Type | Description |
|-------|------|-------------|
| `source` | `RouteDeclaration` | URL pattern to match |
| `destination` | `ApiBase` | Target URL construction |
| `enabled` | `{ formula: Formula }?` | Formula to dynamically enable/disable the route |
| `type` | `'redirect' \| 'rewrite'` | Route behavior |
| `status` | `RedirectStatusCode?` | HTTP status for redirects (default: `302`) |

**RedirectStatusCode:** `300 | 301 | 302 | 303 | 304 | 307 | 308`

**Redirect vs Rewrite:**
- **Redirect:** Returns HTTP redirect response (client sees new URL)
- **Rewrite:** Fetches content from destination and returns it as-is (transparent to client)

---

## Route Matching Algorithm

### Input

- `url: URL` — incoming request URL
- `entries: Record<string, T>` — named route entries (pages or custom routes)
- `getRoute: (T) => { path, query }` — extract route declaration from entry

### Algorithm

1. **Extract path segments** from URL:
   - Split pathname by `/`
   - Remove empty segments
   - Decode URI components

2. **Filter candidates** — a route matches if:
   - URL segment count ≤ route path segment count
   - Each URL segment matches its route segment:
     - Static: Exact name match
     - Dynamic: Always matches
   - Missing segments are allowed only if the route segment is optional

3. **Compute specificity hash** for each route:
   - Static segment → `'1'`
   - Dynamic segment → `'2'`
   - Join with `.` (e.g., `/products/:id` → `"1.2"`)

4. **Sort by specificity** (ascending lexicographic):
   - Static segments (`'1'`) sort before dynamic (`'2'`)
   - More specific routes win

5. **Return first match** (most specific)

### Specificity Examples

| Route | Hash | Priority |
|-------|------|----------|
| `/products/featured` | `1.1` | Highest |
| `/products/:id` | `1.2` | |
| `/:category/featured` | `2.1` | |
| `/:category/:id` | `2.2` | Lowest |

### Page Matching

`matchPageForUrl({ url, pages })` — matches URL against all page components.

### Custom Route Matching

`matchRouteForUrl({ url, routes, env, req, serverContext })`:
1. Filter routes by `enabled` formula (evaluate with route-specific formula context)
2. Match remaining routes by path pattern
3. Return best match

**Route Formula Context:** Has access to:
- `Route parameters.path`: Extracted path params
- `Route parameters.query`: Query params with defaults
- Global formulas (e.g., `isServer`, `getCookie`)

Does NOT have access to: component data, variables, or API responses.

---

## Parameter Extraction

### Path Parameters

For each dynamic segment in the route definition:
- If URL has a matching segment at that index: Map `param.name → segment value`
- If URL segment is missing: Map `param.name → null`

### Query Parameters

1. Start with defaults: All declared query params set to `null`
2. Merge actual URL search params (override defaults)

### Combined Parameters

`combinedParams = { ...searchParams, ...pathParams }`

Path parameters take precedence over query parameters with the same name.

### Hash

Extracted from URL hash (without leading `#`).

---

## Destination URL Construction

Custom routes construct destination URLs using the `ApiBase` structure:

1. **Base URL:** Evaluate `destination.url` formula → parse as URL
2. **Path segments:** Evaluate each `destination.path[key].formula`, sorted by `index`, joined with `/`
3. **Query params:** Evaluate each `destination.queryParams[key].formula`
   - Conditional inclusion via `enabled` formula
   - Array values: Multiple entries with same key
   - Object values: Bracket notation (e.g., `user[name]=John`)
4. **Hash:** Evaluate `destination.hash.formula` (if present)

### Safety Checks

| Scenario | Prevention |
|----------|------------|
| Redirect to same URL | Skip if origin + pathname match (prevents redirect loop) |
| Rewrite from same origin | Skip if request origin matches destination (prevents recursive fetch) |
| Recursive rewrite | Check `x-nordcraft-rewrite` header; reject if present |

---

## Backend Route Handling

### Route Handler Flow

1. Match incoming URL against custom routes
2. Resolve destination URL
3. **Redirect:** Return HTTP redirect with configured status code (405 for non-GET requests)
4. **Rewrite:**
   - Sanitize headers (remove hop-by-hop, cookie, Layr-specific headers)
   - Set `Accept: */*` and `Accept-Encoding: gzip, deflate`
   - Mark request with `x-nordcraft-rewrite` header
   - Fetch destination URL
   - Stream response body back to client
   - Copy response headers (excluding hop-by-hop and content-encoding)

### Page Handler Flow

1. Match URL against page components
2. Load page content (compiled JS)
3. Render page via SSR
4. Return HTML with appropriate status (404 for `'404'` page)

### Routes Loading

Routes are loaded from a compiled `routes.js` file (singleton, loaded once):

```typescript
interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, Route>
}
```

---

## Header Management

### Hop-By-Hop Headers (Always Removed)

`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`

### Layr Custom Headers

| Header | Purpose |
|--------|---------|
| `x-nordcraft-url` | Proxy: original destination URL |
| `x-nordcraft-templates-in-body` | Proxy: enable cookie template injection in body |
| `x-nordcraft-rewrite` | Rewrite: prevents recursive rewrites |
| `x-nordcraft-redirect-name` | Redirect: route name tracking |
| `x-nordcraft-redirect-api-name` | Redirect: API name tracking |
| `x-nordcraft-redirect-component-name` | Redirect: component name tracking |

---

## Edge Cases

- **No matching route:** Falls through to page matching, then 404 handler
- **Invalid destination URL:** Returns 500 with "Invalid destination"
- **Non-GET redirect:** Returns 405 "Method Not Allowed"
- **Rewrite fetch failure:** Returns 500 with error message
- **Recursive rewrite:** Returns 500 with explicit error message
- **Localhost requests:** Remove `cf-connecting-ip` and `host` headers for compatibility
- **Non-body response codes (101, 204, 205, 304):** Skip body in response

---

## Formula Context for Routes

Routes use a specialized formula context with limited data:

| Data Field | Value |
|------------|-------|
| `Route parameters.path` | `{ [paramName]: string \| null }` from source pattern |
| `Route parameters.query` | `{ [paramName]: string \| null }` with defaults |
| `Attributes` | Empty `{}` |

This context is used for:
- Evaluating `enabled` formula (dynamic route enabling)
- Evaluating destination URL formulas (url, path, queryParams, hash)

---

## ToddleRoute Class

Wrapper for route traversal and analysis:

| Property/Method | Description |
|-----------------|-------------|
| `type` | `'redirect' \| 'rewrite'` |
| `source` | Route source declaration |
| `destination` | API base for URL construction |
| `status` | Redirect status code (redirect only) |
| `formulasInRoute()` | Generator yielding all formulas in the route for analysis |

Traversed formulas: `destination.url`, `destination.path[].formula`, `destination.queryParams[].formula`, `destination.queryParams[].enabled`

---

## System Limits

### Route Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxRoutes` | 100 | 500 | Custom route definitions |
| `maxRouteParams` | 20 | 50 | Parameters per route |
| `maxRouteSegments` | 20 | 50 | Path segments per route |

### Performance Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxRouteMatchTime` | 10ms | Maximum time for route matching |
| `maxRedirectChain` | 10 | Maximum consecutive redirects |

### Enforcement

- **Route count:** Warn at 80%, error at 100%
- **Redirect chain:** Break with "Too many redirects" error
- **Match time:** Log warning in dev mode

---

## Invariants

### Route Definition Invariants

1. **I-ROUTE-SOURCE-VALID:** Route source MUST be valid route declaration.
2. **I-ROUTE-DESTINATION-VALID:** Destination MUST be valid URL formula.
3. **I-ROUTE-STATUS-VALID:** Redirect status MUST be valid HTTP redirect code.
4. **I-ROUTE-NO-LOOP:** Routes MUST NOT create redirect loops.

### Path Matching Invariants

5. **I-ROUTE-PARAM-NAME-VALID:** Parameter names MUST be valid identifiers.
6. **I-ROUTE-PARAM-UNIQUE:** Parameter names MUST be unique within route.
7. **I-ROUTE-SEGMENT-ORDERED:** Segments MUST be in definition order.

### Execution Invariants

8. **I-ROUTE-ENABLED-CHECK:** `enabled` formula MUST be evaluated before route execution.
9. **I-ROUTE-REDIRECT-CHAIN:** Maximum redirect chain length MUST be enforced.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-ROUTE-NO-LOOP | Runtime | 500 Internal Server Error |
| I-ROUTE-PARAM-UNIQUE | Build | Error: schema validation |
| I-ROUTE-REDIRECT-CHAIN | Runtime | 310 "Too many redirects" |

---

## Error Handling

### Error Types

| Error Type | When | Response |
|------------|------|----------|
| `RouteNotFoundError` | No matching route | Falls through to pages |
| `RouteLoopError` | Redirect loop | 500 Internal Server Error |
| `RouteTimeoutError` | Matching timeout | 500 Internal Server Error |
| `InvalidDestinationError` | Invalid URL formula | 500 Internal Server Error |

### Redirect Loop Detection

```typescript
interface RedirectContext {
  chain: string[];  // URLs in redirect chain
  maxChain: number; // Maximum chain length
}

function checkRedirectLoop(url: string, ctx: RedirectContext): boolean {
  if (ctx.chain.includes(url)) {
    return true; // Loop detected
  }
  if (ctx.chain.length >= ctx.maxChain) {
    return true; // Chain too long
  }
  return false;
}
```

---

## Changelog

### Unreleased
- Added System Limits section with route and performance limits
- Added Invariants section with 9 route definition, matching, and execution invariants
- Added Error Handling section with error types and loop detection
