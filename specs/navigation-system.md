# Navigation System Specification

## Purpose

The Navigation System manages client-side URL state, browser history integration, URL construction from location objects, scroll state preservation, view transitions, and dynamic `<head>` updates. It complements the [Routing spec](./routing.md) which covers server-side URL matching — this spec covers the client-side lifecycle after a page has loaded.

### Jobs to Be Done

- Maintain a reactive `Location` signal that represents the current URL state
- Build URLs from location objects with proper encoding of path segments, query parameters, and hash fragments
- Parse incoming URLs into structured location data (path params, query params, hash)
- Integrate with the browser History API (`pushState`, `replaceState`, `popstate`)
- Provide `SetURLParameter` and `SetURLParameters` actions for declarative URL manipulation
- Provide `goToURL` action for full-page navigation
- Preserve and restore scroll positions across navigations
- Support View Transitions API for animated page transitions
- Dynamically update `<head>` elements (title, description, meta tags, language) on client-side state changes

---

## Data Models

### Location

The reactive state object representing the current URL. Stored as a `Signal<Location>` on the global `toddle` object.

| Field | Type | Description |
|-------|------|-------------|
| `route` | `Component['route']` | The page's route declaration (path segments + query definitions) |
| `page` | `string?` | Legacy: URL pattern string (e.g., `/projects/:id`). Used only for V1 routing |
| `path` | `string` | Current `window.location.pathname` |
| `params` | `Record<string, string \| null>` | Extracted path and route parameters (both static and dynamic segments) |
| `query` | `Record<string, string \| string[] \| null>` | Parsed query parameters. `null` for declared-but-absent parameters |
| `hash` | `string?` | URL hash fragment (without the `#` prefix) |

**Source:** `packages/runtime/src/types.d.ts:30-37`

### LocationSignal

```typescript
type LocationSignal = Signal<Location>
```

The location signal is accessible at `window.toddle.locationSignal`. Any component can subscribe to it for reactive URL state updates.

---

## URL Parsing

### parseUrl (page.main.ts:308-345)

Called during page initialization and on `popstate` events to extract structured location data from the browser URL.

**Algorithm:**

1. Split `window.location.pathname` into path segments
2. **V2 routing (has `route`):** iterate `component.route.path` segments:
   - Static segments: set `params[name] = name` (name is the literal segment)
   - Dynamic segments: set `params[name] = decodeURIComponent(path[i])`, or `null` if missing/empty
3. **V1 routing (has `page`):** use `path-to-regexp`'s `match()` to extract params from the URL pattern
4. Extract hash: `window.location.hash.split('?')[0].slice(1)` (strips `#` prefix, ignores query after hash)
5. Parse query string into key-value pairs via `parseQuery()`
6. Initialize all declared query parameters to `null` by default, then overlay actual values

**Business Rules:**
- Dynamic path segment values are `decodeURIComponent()`-decoded
- All declared query parameters (from `route.query`) exist in the result, defaulting to `null` if absent
- Query string parsing uses `decodeURIComponent()` on both keys and values
- Hash is extracted without the `#` prefix

### parseQuery (page.main.ts:347-356)

Parses a raw query string into a key-value record.

**Algorithm:**
1. Strip leading `?`
2. Split by `&`
3. Filter empty pairs
4. Split each pair by `=` and `decodeURIComponent()` both key and value

**Edge cases:**
- Empty query string → empty object
- Parameter without value (e.g., `?flag`) → key with empty string value
- Duplicate keys → last value wins (via `Object.fromEntries`)

---

## URL Construction

### getLocationUrl (runtime/src/utils/url.ts:5-45)

Builds a URL string from a `Location` object.

**Algorithm:**

1. **Path building:**
   - **V2 (has `route`):** iterate route path segments
     - Static segments: append `segment.name`
     - Dynamic segments: append `params[segment.name]`, break on first missing param
     - Join with `/`, prepend `/`
   - **V1 (has `page`):** use `path-to-regexp`'s `compile()` with `encodeURIComponent`
2. **Hash:** append `#hash` if non-empty (hash is NOT URL-encoded)
3. **Query string:**
   - Filter out entries with `null` values
   - Map query key using `route.query[key].name` if available (supports key aliasing), else use key directly
   - `encodeURIComponent()` both key and value
   - Join with `&`, prepend `?`
4. Return `path + hash + queryString`

**Business Rules:**
- Hash comes BEFORE the query string in the output URL (non-standard but matches implementation)
- Null query values are excluded from the URL
- Query keys can be aliased: the route declaration's `query[key].name` provides the actual URL parameter name
- Path construction stops at the first missing dynamic segment parameter

### validateUrl (core/src/utils/url.ts:9-34)

Validates and normalizes a URL string.

**Input:** `{ path: string?, origin: string? }`
**Output:** `URL | false`

**Algorithm:**
1. Reject non-string `path`
2. Construct `new URL(path, origin)` — leverages platform URL parser
3. Re-encode search parameters (iterate, delete all, re-append) to fix improper encoding
4. Return normalized `URL` object, or `false` on any error

### Localhost Detection (core/src/utils/url.ts:1-7)

| Function | Check |
|----------|-------|
| `isLocalhostUrl(href)` | Starts with `http://localhost:54404` or `http://preview.localhost:54404` |
| `isLocalhostHostname(hostname)` | Is `localhost` or `127.0.0.1` |

---

## Browser History Integration

### Initialization (page.main.ts:102-109)

On page load, the location signal is initialized from the current browser URL:

```typescript
toddle.locationSignal = signal({
  route: component.route,
  page: component.page,
  path: window.location.pathname,
  params,
  query,
  hash,
})
```

### popstate Listener (page.main.ts:142-157)

Listens for browser back/forward navigation and updates the location signal:

```typescript
window.addEventListener('popstate', () => {
  const { params, hash, query } = parseUrl(component)
  window.toddle.locationSignal.update(() => ({
    route: component.route,
    page: component.page,
    path: window.location.pathname,
    params, query, hash,
  }))
})
```

### Route → Data Signal Bridge (page.main.ts:159-189)

The route signal (derived from the location signal) feeds into the page component's data signal:

```typescript
const routeSignal = toddle.locationSignal.map(({ query, params }) => ({
  ...query, ...params
}))

routeSignal.subscribe((route) =>
  dataSignal.update((data) => ({
    ...data,
    'URL parameters': route,
    Attributes: route,
  }))
)
```

This means URL parameter changes automatically propagate to the component's `Attributes` and `URL parameters` data, triggering reactive formula recalculations.

---

## Navigation Actions

### SetURLParameter (handleAction.ts:106-166)

Updates a single URL parameter (path or query).

**Algorithm:**
1. Evaluate the `data` formula to get the new value
2. Determine if the parameter matches a path segment or query parameter:
   - **Path parameter:** default `historyMode = 'push'`, update `params`
   - **Query parameter:** default `historyMode = 'replace'`, update `query` (remove key if value is `undefined`)
3. Build URLs from old and new location via `getLocationUrl()`
4. If URLs differ, call `history.pushState()` or `history.replaceState()` based on `historyMode`
5. Update the location signal

**Business Rules:**
- Path parameter changes default to `push` (new history entry)
- Query parameter changes default to `replace` (no new history entry)
- The `historyMode` property on the action can override the default
- Setting a query parameter to `undefined` removes it from the URL
- If the parameter name doesn't match any declared path or query parameter, the location is unchanged

### SetURLParameters (handleAction.ts:168-250)

Updates multiple URL parameters atomically.

**Algorithm:**
1. Evaluate all parameter formulas
2. Classify each parameter as path or query based on route declaration:
   - Path: only `type === 'param'` segments match (stricter than `SetURLParameter`)
   - Query: must exist in `route.query`
3. If any path parameter is updated, default `historyMode = 'push'`; otherwise `replace`
4. Build new location, deep-compare with current via `fastDeepEqual`
5. If changed, update history and location signal

**Business Rules:**
- Requires a valid `route` to exist (returns unchanged for V1 routing)
- Uses strict parameter validation (only `type: 'param'` for paths, must exist in query declarations)
- Atomic update: all parameters change in a single history entry
- No-op if `fastDeepEqual` shows no change

### goToURL (lib/actions/gotToURL/handler.ts)

Full-page navigation action from the standard library.

**Behavior:**
- **Normal mode:** `window.location.href = url` — triggers full page reload
- **Preview mode:** `window.parent.postMessage({ type: 'blockedNavigation', url }, '*')` — notifies parent frame instead of navigating

**Business Rule:** Only accepts string URLs. Non-string values are silently ignored.

---

## Scroll State Management

### storeScrollState (runtime/src/utils/storeScrollState.ts:10-40)

Captures scroll positions of all scrollable elements and the window before navigation.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `key` | `string` | `''` | Storage key identifier |
| `querySelector` | `string` | `'[data-id]'` | CSS selector for scrollable elements |
| `comparerFn` | `(node: Element) => string?` | `node.getAttribute('data-id')` | ID extraction function |

**Algorithm:**
1. Query all elements matching `querySelector`
2. For each element with non-zero `scrollTop` or `scrollLeft`, record `{ x, y }` keyed by `data-id`
3. Always record `__window` scroll position (`scrollX`, `scrollY`)
4. Store as JSON in `sessionStorage` under key `scroll-position({key})`
5. Return a restorer function

**Storage format:**
```json
{
  "__window": { "x": 0, "y": 150 },
  "element-id-1": { "x": 0, "y": 300 }
}
```

### getScrollStateRestorer (runtime/src/utils/storeScrollState.ts:42-66)

Returns a function that restores previously saved scroll positions.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Storage key to read from |

**Returns:** `(selectorFn: (id: string) => HTMLElement | null) => void`

**Algorithm:**
1. Read scroll positions from `sessionStorage`
2. For each element ID, look up the DOM node via `selectorFn`
3. Restore `scrollTop` and `scrollLeft`
4. Restore window scroll via `window.scrollTo(x, y)`

**Business Rules:**
- Uses `sessionStorage` (not `localStorage`) — positions are per-tab and cleared on tab close
- The `__window` key is always present; if missing, restoration is skipped entirely
- Only non-zero scroll positions are stored (saves space)

---

## View Transitions

### tryStartViewTransition (runtime/src/utils/tryStartViewTransition.ts)

Wraps the View Transitions API with graceful degradation.

**Signature:**
```typescript
function tryStartViewTransition(
  updateCallback: () => void,
  options?: { skipPrefersReducedMotionCheck?: boolean }
): { finished: Promise<void> }
```

**Algorithm:**
1. Check if `document.startViewTransition` exists
2. Check `prefers-reduced-motion: reduce` media query (unless `skipPrefersReducedMotionCheck` is set)
3. If API is unavailable or reduced motion is preferred: execute `updateCallback()` synchronously, return resolved promise
4. Otherwise: call `document.startViewTransition(updateCallback)` and return its result

**Return value:**
- `finished`: Promise that resolves when the transition animation completes
- (The full API also provides `ready` and `updateCallbackDone` — available when using the native API)

**Business Rules:**
- Respects user's `prefers-reduced-motion` setting by default
- Falls back to immediate (non-animated) updates when the API is unavailable
- The `skipPrefersReducedMotionCheck` option allows forcing transitions even for reduced-motion users

---

## Dynamic Head Updates

### setupMetaUpdates (page.main.ts:358-546)

After the page is hydrated, subscribes to the data signal to dynamically update `<head>` elements when component data changes.

**Updates applied:**

| Element | Source | Trigger |
|---------|--------|---------|
| `<html lang>` | `route.info.language.formula` | Language formula is non-static |
| `<title>` | `route.info.title.formula` | Title formula is non-static |
| `<meta name="description">` | `route.info.description.formula` | Description formula is non-static |
| `<meta property="og:description">` | Auto-synced with description | If no explicit og:description meta entry exists |
| Custom meta entries | `route.info.meta[id].attrs` | Any attribute formula is non-static |

**Algorithm for meta updates:**
1. Detect which formulas are dynamic (type !== `'value'`)
2. For each dynamic formula, create a derived signal from the data signal
3. Subscribe to changes and update the DOM:
   - Find existing element by `data-toddle-id` attribute (for custom entries) or by `name`/`property` attribute
   - If not found, create a new element and append to `<head>`
   - Apply all computed attribute values

**Business Rules:**
- Only non-static (dynamic) formulas trigger subscriptions — static values were already rendered in SSR
- `og:description` is auto-synced with `description` unless explicitly defined in meta entries
- Meta elements are identified by their `name` or `property` attribute for matching
- Custom meta entries use `data-toddle-id` for precise matching

---

## Edge Cases and Error Handling

### Missing Route Parameters
- `getLocationUrl()` stops building the path at the first missing dynamic segment — partial URLs are valid
- `SetURLParameter` with an unrecognized parameter name is a no-op

### Duplicate Query Parameters
- `parseQuery()` uses `Object.fromEntries()` — last value wins for duplicate keys
- Array query values are not natively supported in parsing (though the `Location.query` type allows `string[]`)

### Hash-Before-Query Ordering
- `getLocationUrl()` places the hash BEFORE the query string (`path#hash?query`). This is non-standard (RFC 3986 specifies `path?query#fragment`) but browsers generally handle both

### V1 vs V2 Routing
- V1 routing uses `path-to-regexp`'s `match()` and `compile()` for URL parsing and construction
- V2 routing uses the structured `route.path` segments directly
- The system detects which mode to use based on the presence of `component.route`

### popstate Without Component
- If `component` is undefined during a `popstate` event, the handler returns immediately without updating the location signal

### Preview Mode Navigation
- In preview mode (`runtime: 'preview'`), `goToURL` posts a message to the parent frame instead of navigating — prevents navigation inside the editor preview iframe

---

## External Dependencies

| Package | Version | Used For |
|---------|---------|----------|
| `path-to-regexp` | 6.3.0 | V1 URL pattern matching and compilation |
| `fast-deep-equal` | 3.1.3 | Deep comparison for `SetURLParameters` no-op detection |

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [Routing](./routing.md) | Server-side URL matching; this spec covers client-side URL state |
| [Reactive Signal System](./reactive-signal-system.md) | Location is stored as a `Signal<Location>` |
| [Action System](./action-system.md) | `SetURLParameter`, `SetURLParameters`, `goToURL` are action types |
| [Page Lifecycle](./page-lifecycle.md) | Page initialization creates the location signal and sets up popstate |
| [Hydration System](./hydration-system.md) | Client-side URL parsing runs during hydration |
| [Component System](./component-system.md) | Route/query params feed into `ComponentData.Attributes` and `URL parameters` |
| [SEO & Web Standards](./seo-web-standards.md) | Dynamic head updates maintain SEO correctness on client-side navigation |
