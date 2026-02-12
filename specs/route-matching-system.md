# Route Matching & Rewriting System Specification

## Purpose

The Route Matching system resolves incoming URLs to page components or custom route rules (redirects and rewrites). It implements a two-tier matching strategy: custom routes are evaluated first with formula-based enablement, then page routes are matched with static/dynamic segment prioritization. The system includes safety mechanisms to prevent redirect loops and recursive rewrites.

### Jobs to Be Done

- Match incoming URLs to the most specific page component
- Evaluate custom route rules for redirects and rewrites before page matching
- Construct destination URLs from formula-based route definitions
- Execute rewrites by proxying external content transparently
- Prevent redirect loops and recursive rewrite chains
- Support formula-based conditional route enablement

---

## Two-Tier Matching Strategy

### Execution Order

```
1. routeHandler: Match URL against custom routes (redirects/rewrites)
   ├── Match found, redirect → Return HTTP redirect
   ├── Match found, rewrite → Fetch destination, proxy response
   └── No match → Fall through to next handler

2. pageHandler: Match URL against page components
   ├── Match found → Load component, SSR render
   └── No match → Fall through to 404 handler

3. notFoundLoader: Render custom 404 page or plain text
```

Custom routes always take priority over page routes.

---

## Route Matching Algorithm

### Generic Matcher: `matchRoutes()`

Used by both custom route matching and page matching.

#### Input

- `url`: The incoming URL
- `entries`: Map of named route entries
- `getRoute`: Function to extract route definition from entry

#### Algorithm

1. **Extract path segments** from URL pathname

2. **Filter candidates:** A route matches if:
   - URL segment count ≤ route segment count
   - Every route segment satisfies one of:
     - `type === 'param'` (dynamic — matches any value)
     - `optional === true` (can be absent)
     - `name === pathSegments[index]` (static — exact match required)

3. **Prioritize by specificity:** Sort matches using a "path hash" where static segments = `'1'` and dynamic segments = `'2'`, then compare lexicographically.

4. **Return best match** (first after sort)

#### Specificity Examples

| Route | Path Hash | Priority |
|-------|-----------|----------|
| `/fruit/apple` | `1.1` | Highest (all static) |
| `/fruit/:id` | `1.2` | High (static + dynamic) |
| `/:category/apple` | `2.1` | Medium |
| `/:category/:id` | `2.2` | Lower |
| `/:a/:b/:c` | `2.2.2` | Lowest (all dynamic, longest) |

Static segments always win over dynamic segments at the same position. Shorter routes are preferred over longer ones with the same specificity pattern.

---

## Custom Route Matching

### Function: `matchRouteForUrl()`

#### Flow

1. **Filter enabled routes:** For each route, evaluate `enabled.formula` in a route-scoped formula context
   - Routes without `enabled` property → always enabled
   - Formula returns truthy → route is enabled
   - Formula returns falsy → route is skipped
2. **Match URL** against enabled routes using generic matcher
3. Return matched route or undefined

#### Formula Context for Route Enablement

The formula context is intentionally limited:

- `component`: `undefined` (no component data available)
- `Attributes`: `{}` (empty)
- `Route parameters`: `{ path: {...}, query: {...} }` — extracted from incoming URL
- `env`: Server environment
- `toddle`: Server toddle object with global formulas

This prevents routes from depending on component-specific data that isn't available at routing time.

---

## Route Destination Resolution

### Function: `getRouteDestination()`

Constructs the destination URL for a matched custom route:

1. Build formula context with route parameters from incoming URL
2. Evaluate `route.destination` formulas (URL, path, query params, hash)
3. Validate constructed URL

#### Safety Checks

| Route Type | Check | Result if Failed |
|-----------|-------|-----------------|
| Redirect | Destination origin + pathname matches source | Returns `undefined` (prevents loop) |
| Rewrite | Destination origin matches source origin | Returns `undefined` (prevents recursion) |

**Redirect loop prevention:** If a redirect would send the user back to the same URL (same origin + pathname), it's treated as a non-match.

**Rewrite recursion prevention:** If a rewrite destination is on the same origin, it could trigger the same route handler again. Same-origin rewrites are blocked entirely.

**Error handling:** Formula evaluation errors are silently caught — the route is treated as non-matching.

---

## Route Handler Implementation

### Redirect Handling

When a custom route with `type: 'redirect'` matches:

1. **Method check:** Only `GET` requests can be redirected; other methods return `405 Method Not Allowed`
2. **Set header:** `x-nordcraft-redirect-name` with route name
3. **Return redirect:** HTTP redirect with route's status code (default: `302`)

### Rewrite Handling

When a custom route with `type: 'rewrite'` matches:

1. **Recursion check:** If `x-nordcraft-rewrite` header is present, return `500` error
2. **Sanitize headers:** Strip cookies and hop-by-hop headers from forwarded request
3. **Mark as rewrite:** Set `x-nordcraft-rewrite: true` header on outgoing request
4. **Clean up headers:** Remove Cloudflare-specific headers for localhost, force compatible encoding
5. **Fetch destination:** Forward request method and body to destination URL
6. **Stream response:** Copy response headers (excluding hop-by-hop and content-encoding), stream body back

### Error Responses

| Condition | Status | Response |
|-----------|--------|----------|
| Invalid destination URL | 500 | `"Invalid destination"` |
| Non-GET redirect | 405 | `"Method Not Allowed"` |
| Recursive rewrite | 500 | `"Layr rewrites are not allowed to be recursive"` |
| Fetch failure | 500 | `"Unable to fetch resource defined in proxy destination: {url}"` |

---

## Page Handler Implementation

### Flow

1. Match URL against all page routes via `matchPageForUrl()`
2. If match → load page content via platform-specific `pageLoader`
3. Validate component exists and has `route` property (`isPageComponent()` check)
4. If invalid → fall through to next handler
5. Render page via `nordcraftPage()` with appropriate status code

### Status Codes

- Page named `'404'` → returns `404` status
- All other pages → returns `200` status

### SSR Page Rendering

The `nordcraftPage()` function orchestrates full SSR:

1. **Setup:** Build formula context, detect language, resolve themes, collect included components
2. **Component wrapping:** Create `ToddleComponent` with resolution logic for nested components and global formulas
3. **Body rendering:** Call `renderPageBody()` which evaluates all APIs and generates HTML
4. **Redirect handling:** If any API throws `RedirectError`, return HTTP redirect with diagnostic headers
5. **Head generation:** Generate `<head>` elements (styles, fonts, meta tags, custom properties)
6. **Hydration injection:** Serialize component tree + API cache as inline JSON, inject runtime scripts
7. **Document assembly:** Combine into complete HTML document with charset and theme attributes

### Hydration Data Structure

Serialized into `<script type="application/json" id="nordcraft-data">`:

```
{
  project: string,
  branch: string,
  commit: string,
  pageState: ComponentData,    // Includes API cache in Apis field
  component: Component,        // Test data stripped
  components: Component[],     // All included components, test data stripped
  isPageLoaded: false,
  cookies: string[],           // Cookie names (not values)
}
```

**Security:** `</script>` in JSON is escaped to `<\/script>` to prevent XSS.

### Custom Code Handling

If the page has custom code:
- Import from generated URL (`/_static/cc_{name}.js` or `/.toddle/custom-code/{name}.js`)
- Call `loadCustomCode()` to register custom formulas/actions
- Pass custom `formulas` and `actions` to `initGlobalObject()`

If no custom code:
- Pass empty `{}` for formulas and actions

---

## API Redirect During SSR

During page body rendering, any API can throw a `RedirectError` which short-circuits the SSR pipeline:

1. API evaluates its redirect rules against response data
2. If a rule formula returns a valid URL string → throws `RedirectError`
3. Page handler catches the error
4. Sets diagnostic headers:
   - `x-nordcraft-redirect-api-name`: The API that triggered the redirect
   - `x-nordcraft-redirect-component-name`: The component containing the API
5. Returns HTTP redirect with the specified status code (default: `302`)

This enables patterns like: fetch user session API → if unauthorized → redirect to login page.

---

## Data Models

### Route Parameters

Extracted from matched route and made available in formula context:

```
{
  path: Record<string, string>,   // Dynamic path segments
  query: Record<string, string>,  // Query parameters with defaults applied
}
```

Query parameter defaults come from the route's `query` definitions, providing fallback values for missing parameters.

### Path Segments

| Type | Matching Behavior |
|------|------------------|
| Static (`type: 'static'`) | Exact string match required |
| Dynamic (`type: 'param'`) | Matches any non-empty segment |
| Optional (`optional: true`) | Can be absent from URL |

---

## Edge Cases

- **Multiple routes matching same URL:** Most specific route wins (most static segments, then shortest)
- **Optional trailing segments:** Route `/docs/:page?` matches both `/docs` and `/docs/intro`
- **URL longer than route:** Rejected — `pathSegments.length <= route.path.length` required
- **Route formula evaluation error:** Silently treated as non-match (route skipped)
- **Redirect to same URL:** Blocked — destination must differ from source
- **Rewrite to same origin:** Blocked — destination must be external
- **Non-GET redirect:** Returns 405 (only GET requests can be redirected)
- **Nested rewrites:** Blocked by `x-nordcraft-rewrite` header check
- **Missing page component:** `pageLoader` returns undefined → falls through to 404
- **Component without route property:** Fails `isPageComponent()` check → falls through to 404

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
