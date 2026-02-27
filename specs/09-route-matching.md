# 09 — Route Matching

Backend route matching: URL-to-page resolution, static/dynamic/catch-all paths, custom route rules (redirects and rewrites), URL parameter extraction, and loop prevention.

**Package:** `@layr/backend`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Static and dynamic path segment matching | MVP |
| Catch-all (`*`) route segments | MVP |
| Specificity-based route prioritization | MVP |
| Optional path segments | MVP |
| Path parameter URL-decoding | MVP |
| Query parameter extraction with defaults | MVP |
| Custom routes (redirects and rewrites) | MVP |
| Formula-based `enabled` for custom routes | MVP |
| Destination URL construction (url, path, query, hash) | MVP |
| Redirect loop prevention | MVP |
| Recursive rewrite prevention | MVP |
| API-driven SSR redirect (`RedirectError`) | MVP |
| Page handler with SSR rendering | MVP |
| 404 page fallback | MVP |

---

## 1. Two-Tier Matching Strategy

```
Incoming Request
  │
  ▼
1. routeHandler — match against custom routes (redirects/rewrites)
   ├── Match, redirect → HTTP redirect (GET only; 405 for other methods)
   ├── Match, rewrite  → fetch destination, proxy response
   └── No match        → fall through
  │
  ▼
2. pageHandler — match against page components
   ├── Match → load component, SSR render, return HTML
   └── No match → fall through
  │
  ▼
3. 404 handler — render custom 404 page or plain text
```

Custom routes always take priority over page routes.

---

## 2. Route Matching Algorithm

### 2.1 Generic Matcher (`matchRoutes`)

Used by both custom route matching and page matching.

**Input:**
- `url: URL` — incoming request URL
- `entries: Record<string, T>` — named route entries
- `getRoute: (T) => { path, query }` — extract route definition

**Algorithm:**

1. Extract path segments from `url.pathname`:
   - Split by `/`, remove empty strings, `decodeURIComponent()` each segment

2. Filter candidates — a route matches when:
   - URL segment count ≤ route segment count
   - Each route segment satisfies one of:
     - `type === 'param'` — dynamic, matches any value
     - `optional === true` — can be absent
     - `name === pathSegments[index]` — static, exact match required
   - URL longer than route → rejected

3. Compute specificity hash per route:
   - Static segment → `'1'`
   - Dynamic segment → `'2'`
   - Join with `.` — e.g., `/products/:id` → `"1.2"`

4. Sort by specificity (ascending lexicographic):
   - `'1'` sorts before `'2'` — static wins over dynamic at same position
   - Shorter routes preferred over longer with same hash

5. Return first match (most specific)

**Specificity examples:**

| Route | Hash | Priority |
|-------|------|----------|
| `/products/featured` | `1.1` | Highest |
| `/products/:id` | `1.2` | |
| `/:category/featured` | `2.1` | |
| `/:category/:id` | `2.2` | |
| `/:a/:b/:c` | `2.2.2` | Lowest |

### 2.2 Path Segment Types

| Type | Match Behavior |
|------|----------------|
| Static (`type: 'static'`) | Exact string match required |
| Dynamic (`type: 'param'`) | Matches any non-empty segment |
| Optional (`optional: true`) | Can be absent from URL |
| Catch-all (`*`) | Matches remainder of path; stored as `params['*']` |

### 2.3 Catch-All Routes (`matchPath` in `@layr/backend`)

Pattern: last segment is `*` (e.g., `/docs/*`).

```typescript
// /docs/* matches /docs/guide/intro
params['*'] = pathParts.slice(patternParts.length - 1).join('/')
```

If URL has fewer segments than non-wildcard pattern parts → no match.

---

## 3. Parameter Extraction

### 3.1 Path Parameters

For each dynamic (`type: 'param'`) segment in route definition:
- URL has matching segment → `params[name] = decodeURIComponent(segment)`
- URL segment missing → `params[name] = null`

### 3.2 Query Parameters

1. Initialize defaults: all declared query params set to `null`
2. Merge actual URL search params (override defaults)

### 3.3 Combined Parameters

```
combinedParams = { ...searchParams, ...pathParams }
// Path parameters take precedence over same-named query parameters
```

---

## 4. Data Models

### 4.1 Path Segments

```typescript
interface StaticPathSegment {
  type: 'static'
  name: string         // literal path value
  optional?: boolean
}

interface DynamicPathSegment {
  type: 'param'
  name: string         // parameter name
  testValue: string    // test value for preview mode
  optional?: boolean
}
```

### 4.2 RouteDeclaration

```typescript
interface RouteDeclaration {
  path: Array<StaticPathSegment | DynamicPathSegment>
  query: Record<string, { name: string; testValue: string }>
}
```

### 4.3 PageRoute (extends RouteDeclaration)

| Field | Type | Description |
|-------|------|-------------|
| `info.language` | `{ formula: Formula }?` | `<html lang>` value |
| `info.theme` | `{ formula: Formula }?` | `<html data-nc-theme>` value |
| `info.title` | `{ formula: Formula }?` | `<title>` value |
| `info.description` | `{ formula: Formula }?` | `<meta name="description">` |
| `info.icon` | `{ formula: Formula }?` | Favicon path |
| `info.charset` | `{ formula: Formula }?` | Character set (default: `'utf-8'`) |
| `info.meta` | `Record<string, MetaEntry>?` | Additional meta tags |

### 4.4 Custom Route

```typescript
interface CustomRoute {
  name: string
  type: 'redirect' | 'rewrite'
  source: RouteDeclaration
  destination: ApiBase         // formula-based URL construction
  enabled?: { formula: Formula }
  status?: RedirectStatusCode  // 300 | 301 | 302 | 303 | 304 | 307 | 308
}
```

| Type | Behavior |
|------|----------|
| `redirect` | HTTP redirect response (client sees new URL) |
| `rewrite` | Fetch destination and return response transparently |

---

## 5. Custom Route Matching

### 5.1 `matchRouteForUrl()`

1. Filter enabled routes: evaluate `enabled.formula` in route-scoped formula context
   - No `enabled` property → always enabled
   - Formula error → silently treated as non-match
2. Match enabled routes using generic matcher
3. Return best match or `undefined`

### 5.2 Route Formula Context

Intentionally limited — no component data:

| Field | Value |
|-------|-------|
| `Route parameters.path` | Extracted path params from incoming URL |
| `Route parameters.query` | Query params with defaults applied |
| `Attributes` | `{}` (empty) |
| `env` | Server environment |
| `toddle` | Server toddle with global formulas only |

Cannot access: component state, variables, API responses.

---

## 6. Destination URL Construction

### 6.1 `getRouteDestination()`

Constructs destination URL for a matched custom route:

1. Build formula context with route parameters
2. Evaluate `route.destination`:
   - `destination.url` formula → parse as base URL
   - `destination.path[key].formula` sorted by `index` → join with `/`
   - `destination.queryParams[key].formula` with conditional `enabled`
   - `destination.hash.formula` (if present)

### 6.2 Query Parameter Value Types

| Value | Encoding |
|-------|----------|
| `null` / `undefined` | Skip |
| Scalar | `?key=value` |
| Array | Multiple entries: `?key=a&key=b` |
| Object | Bracket notation: `?filter[status]=active` |

### 6.3 Safety Checks

| Route Type | Check | Result if Failed |
|-----------|-------|-----------------|
| Redirect | Destination origin + pathname === source | Returns `undefined` (loop prevention) |
| Rewrite | Destination origin === source origin | Returns `undefined` (recursion prevention) |

Formula evaluation error → route treated as non-matching.

---

## 7. Route Handler Implementation

### 7.1 Redirect Handling

1. Check method: only `GET` requests can be redirected; others → `405 Method Not Allowed`
2. Set `x-layr-redirect-name: {routeName}` header
3. Return HTTP redirect with route's `status` code (default: `302`)

### 7.2 Rewrite Handling

1. If `x-layr-rewrite` header present → `500` (recursion blocked)
2. Sanitize headers: strip cookies, hop-by-hop headers, Layr-specific headers
3. Set `x-layr-rewrite: true` on outgoing request
4. Set `Accept: */*`, `Accept-Encoding: gzip, deflate`
5. Remove Cloudflare-specific headers for localhost
6. `fetch()` destination URL with same method and body
7. Copy response headers (excluding hop-by-hop and `content-encoding`)
8. Stream response body back to client

### 7.3 Error Responses

| Condition | Status | Body |
|-----------|--------|------|
| Invalid destination URL | 500 | `"Invalid destination"` |
| Non-GET redirect | 405 | `"Method Not Allowed"` |
| Recursive rewrite | 500 | `"Layr rewrites are not allowed to be recursive"` |
| Fetch failure | 500 | `"Unable to fetch resource defined in proxy destination: {url}"` |

---

## 8. Page Handler Implementation

### 8.1 Flow

1. `matchPageForUrl()` — match URL against all page components
2. Load page content via platform `pageLoader`
3. Validate component has `route` property (`isPageComponent()` check)
4. Render via `layrPage()` (SSR pipeline — see `06-rendering.md`)

### 8.2 Status Codes

| Page Name | HTTP Status |
|-----------|-------------|
| `'404'` | 404 |
| All others | 200 |

### 8.3 API-Driven Redirect During SSR

Any API can throw `RedirectError` during page rendering:

1. API evaluates redirect rule formula against response
2. Formula returns valid URL string → throws `RedirectError`
3. Page handler catches → sets diagnostic headers:
   - `x-layr-redirect-api-name`
   - `x-layr-redirect-component-name`
4. Returns HTTP redirect with configured status (default: `302`)

Pattern: fetch session API → if unauthorized → redirect to login.

### 8.4 404 Page Fallback

If no page matches URL:
1. Try matching `/404` page
2. If found → render with `404` HTTP status
3. If not found → plain HTML 404 response

---

## 9. Header Management

### 9.1 Layr Custom Headers

| Header | Purpose |
|--------|---------|
| `x-layr-url` | Proxy: original destination URL |
| `x-layr-templates-in-body` | Proxy: enable cookie template injection in body |
| `x-layr-rewrite` | Rewrite: prevents recursive requests |
| `x-layr-redirect-name` | Redirect: route name tracking |
| `x-layr-redirect-api-name` | Redirect: API name tracking |
| `x-layr-redirect-component-name` | Redirect: component name tracking |

### 9.2 Hop-By-Hop Headers (Always Removed)

`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`

---

## 10. Routes Loading

Routes loaded from compiled `routes.js` (singleton, loaded once):

```typescript
interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, CustomRoute>
}
```

---

## 11. `ToddleRoute` Wrapper Class

| Property/Method | Description |
|-----------------|-------------|
| `type` | `'redirect' \| 'rewrite'` |
| `source` | Route source declaration |
| `destination` | API base for URL construction |
| `status` | Redirect status code |
| `formulasInRoute()` | Generator yielding all formulas for analysis |

Traversed formulas: `destination.url`, `destination.path[].formula`, `destination.queryParams[].formula`, `destination.queryParams[].enabled`

---

## 12. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Multiple routes matching same URL | Most specific wins (most static segments, then shortest) |
| Optional trailing segments | `/docs/:page?` matches `/docs` and `/docs/intro` |
| URL longer than route | Rejected — `pathSegments.length <= route.path.length` required |
| Route formula evaluation error | Silently treated as non-match |
| Redirect to same URL | Blocked — destination must differ from source |
| Rewrite to same origin | Blocked — destination must be external |
| Non-GET redirect | Returns 405 |
| Nested rewrites | Blocked by `x-layr-rewrite` header |
| Missing page component | `pageLoader` returns undefined → falls through to 404 |
| Component without route property | Fails `isPageComponent()` → falls through to 404 |
| Localhost requests | Remove `cf-connecting-ip` and `host` headers for compatibility |
| Non-body response codes (101, 204, 205, 304) | Skip body in response |

---

## 13. Cross-References

| Spec | Relationship |
|------|-------------|
| `06-rendering.md` | `layrPage()` orchestrates SSR after a page match |
| `08-navigation.md` | Client-side URL parsing after page loads |
| `10-api-system.md` | API-driven redirects (`RedirectError`) during SSR |
