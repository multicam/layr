# 08 — Navigation

Client-side URL state management: URL parsing, History API integration, scroll state preservation, View Transitions API, and dynamic `<head>` updates.

**Package:** `@layr/runtime`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| `Location` signal (reactive URL state) | MVP |
| URL parsing (V2 route segments + V1 path-to-regexp) | MVP |
| Query string parsing | MVP |
| URL construction (`getLocationUrl`) | MVP |
| URL validation (`validateUrl`) | MVP |
| `popstate` listener for back/forward navigation | MVP |
| Route signal → data signal bridge | MVP |
| `SetURLParameter` action | MVP |
| `SetURLParameters` action | MVP |
| `goToURL` action (full-page navigation) | MVP |
| Scroll state preservation (`sessionStorage`) | MVP |
| View Transitions API (with reduced-motion fallback) | MVP |
| Dynamic `<head>` updates (title, description, lang, meta) | MVP |

---

## 1. Location Model

```typescript
interface Location {
  route?: {
    path: Array<{ type: 'static' | 'param'; name: string }>
    query?: Record<string, { name: string }>
  }
  page?: string            // V1 routing only — URL pattern string (e.g., '/projects/:id')
  path: string             // window.location.pathname
  params: Record<string, string | null>    // extracted path parameters
  query: Record<string, string | string[] | null>  // parsed query params; null = declared but absent
  hash: string | null      // URL hash without '#'
}

type LocationSignal = Signal<Location>
```

Accessible at `window.toddle.locationSignal`. Any component can subscribe for reactive URL updates.

---

## 2. URL Parsing

### 2.1 `parseUrl(component)`

Called on page initialization and on `popstate` events.

**V2 routing (component has `route`):**
1. Split `window.location.pathname` into segments
2. Iterate `component.route.path`:
   - Static segment: `params[name] = name`
   - Dynamic segment: `params[name] = decodeURIComponent(segments[i])` or `null` if missing/empty
3. Malformed URI component → use raw value (no throw)

**V1 routing (component has `page`):**
- Uses `path-to-regexp`'s `match()` against `window.location.pathname`
- Extracts named parameters from pattern

**Hash:**
```
window.location.hash.split('?')[0].slice(1)   // strips '#'; ignores query-after-hash
```

**Query:**
1. Initialize all declared query params (`route.query` keys) to `null`
2. Parse actual query string via `parseQuery()`
3. Overlay parsed values over defaults

### 2.2 `parseQuery(queryString)`

```typescript
function parseQuery(queryString: string): Record<string, string>
```

1. Strip leading `?`
2. Split by `&`; filter empty pairs
3. Split each pair by `=`; `decodeURIComponent()` both key and value

| Edge Case | Behavior |
|-----------|----------|
| Empty string | Returns `{}` |
| `?flag` (no value) | `{ flag: '' }` |
| Duplicate keys | Last value wins (via `Object.fromEntries`) |
| Malformed URI component | Catches error, continues with empty query |

---

## 3. URL Construction

### 3.1 `getLocationUrl(location)`

Builds URL string from a `Location` object.

**Path building:**

| Routing | Algorithm |
|---------|-----------|
| V2 (`route`) | Iterate route path segments: static → append name; dynamic → append `params[name]` or break if `null` |
| V1 (`page`) | `path-to-regexp.compile()` with `encodeURIComponent` |
| Neither | Use `location.path` as-is |

**Query string:**
- Filter entries with `null` values
- Map key through `route.query[key].name` if available (key aliasing)
- `encodeURIComponent()` both key and value
- Prepend `?`

**Hash:**
- Append `#hash` if non-empty (hash is NOT URL-encoded)

Final order: `path + query + hash`

Note: This places query before hash, matching RFC 3986 (`path?query#fragment`).

**Rules:**
- Path construction stops at first missing dynamic segment — partial URLs are valid
- Null query values excluded from output
- Query key aliasing: `route.query[key].name` provides the actual URL parameter name used in the URL

### 3.2 `validateUrl(options)`

```typescript
function validateUrl(options: {
  path: string | null | undefined
  origin?: string
}): URL | false
```

1. Reject non-string `path`
2. `new URL(path, origin)` — uses platform URL parser
3. Re-encode search parameters (iterate, delete all, re-append)
4. Return normalized `URL` or `false` on any error

### 3.3 Localhost Detection

| Function | Check |
|----------|-------|
| `isLocalhostUrl(href)` | Starts with `http://localhost:54404` or `http://preview.localhost:54404` |
| `isLocalhostHostname(hostname)` | Is `localhost` or `127.0.0.1` |

---

## 4. Browser History Integration

### 4.1 Initialization

On page load, location signal initialized from `window.location`:

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

### 4.2 popstate Listener

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

If `component` is undefined → handler returns immediately.

### 4.3 Route → Data Signal Bridge

```typescript
const routeSignal = locationSignal.map(({ query, params }) => ({ ...query, ...params }))

routeSignal.subscribe(route =>
  dataSignal.update(data => ({
    ...data,
    'URL parameters': route,
    Attributes: route,
  }))
)
```

URL parameter changes automatically propagate to `Attributes` and `URL parameters`, triggering reactive formula recalculations.

### 4.4 `navigate(location, locationSignal, mode)`

```typescript
function navigate(
  location: Location,
  locationSignal: LocationSignal,
  mode: 'push' | 'replace' = 'push'
): void
```

1. Compute new URL via `getLocationUrl(location)`
2. Compare to current URL — no-op if equal
3. Validate URL via `validateUrl()` — warns and aborts if invalid
4. `history.pushState()` or `history.replaceState()`
5. `locationSignal.set(location)`

---

## 5. Navigation Actions

### 5.1 SetURLParameter

Updates a single URL parameter (path or query).

| Parameter Type | Default `historyMode` | Update Target |
|---------------|----------------------|---------------|
| Path (`type === 'param'`) | `push` | `params` |
| Query (in `route.query`) | `replace` | `query` (remove key if value is `undefined`) |

`historyMode` on the action overrides the default.
Unrecognized parameter name → no-op (location unchanged).

### 5.2 SetURLParameters

Updates multiple URL parameters atomically.

| Condition | Default `historyMode` |
|-----------|-----------------------|
| Any path param changed | `push` |
| Query-only changes | `replace` |

Strict classification: path params must have `type === 'param'`; query params must exist in `route.query`.
`fastDeepEqual` check — no-op if no change.
Requires valid `route` — no-op for V1 routing.

### 5.3 goToURL

Full-page navigation from the standard library.

| Runtime | Behavior |
|---------|----------|
| Normal | `window.location.href = url` — full page reload |
| Preview iframe | `window.parent.postMessage({ type: 'blockedNavigation', url }, '*')` — prevents navigation in editor |

Non-string URLs → silently ignored.

---

## 6. Scroll State Management

### 6.1 `storeScrollState`

```typescript
function storeScrollState(
  key?: string,                              // default: ''
  querySelector?: string,                   // default: '[data-id]'
  getId?: (node: Element) => string | null  // default: getAttribute('data-id')
): () => void                               // returns restorer function
```

1. Query all matching elements
2. Record `{ x: scrollLeft, y: scrollTop }` for elements with non-zero scroll
3. Always record `__window` scroll position
4. Store as JSON in `sessionStorage` under `scroll-position({key})`

Storage format:
```json
{
  "__window": { "x": 0, "y": 150 },
  "element-data-id": { "x": 0, "y": 300 }
}
```

### 6.2 `restoreScrollState`

```typescript
function restoreScrollState(
  key?: string,
  getId?: (id: string) => HTMLElement | null
): void
```

1. Read from `sessionStorage`
2. If `__window` key missing → abort entirely
3. Restore element scroll positions via `scrollLeft` / `scrollTop`
4. Restore window scroll via `window.scrollTo(x, y)`

**Rules:**
- Uses `sessionStorage` — per-tab, cleared on tab close
- Only non-zero scroll positions are stored
- Missing `__window` key skips restoration

---

## 7. View Transitions

### 7.1 `tryStartViewTransition`

```typescript
function tryStartViewTransition(
  updateCallback: () => void,
  options?: { skipPrefersReducedMotionCheck?: boolean }
): { finished: Promise<void> }
```

| Condition | Behavior |
|-----------|----------|
| `document.startViewTransition` unavailable | Run callback synchronously, return resolved promise |
| `prefers-reduced-motion: reduce` (unless `skipPrefersReducedMotionCheck`) | Run callback synchronously, return resolved promise |
| API available + motion OK | `document.startViewTransition(updateCallback)` |

Returns `{ finished: Promise<void> }` for cleanup coordination.

---

## 8. Dynamic Head Updates

After hydration, reactive subscriptions update `<head>` when component data changes.

| Element | Source | Trigger |
|---------|--------|---------|
| `<html lang>` | `route.info.language.formula` | Formula is non-static |
| `<title>` | `route.info.title.formula` | Formula is non-static |
| `<meta name="description">` | `route.info.description.formula` | Formula is non-static |
| `<meta property="og:description">` | Auto-synced with description | If no explicit OG description entry |
| Custom meta entries | `route.info.meta[id].attrs` | Any attribute formula is non-static |

Algorithm:
1. Detect which formulas are dynamic (`type !== 'value'`)
2. For each dynamic formula, create a derived signal from the data signal
3. On change: find existing element by `data-toddle-id` → by `property` → by `name` → create if not found
4. Apply all computed attribute values

Static values already rendered in SSR — no subscription needed.

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Missing dynamic path segment | `getLocationUrl()` stops at first missing — partial URL valid |
| Unrecognized `SetURLParameter` name | No-op |
| Duplicate query keys | Last value wins |
| `popstate` with undefined component | Return immediately; no signal update |
| Preview mode `goToURL` | PostMessage to parent iframe instead of navigating |
| `Array` query values | Supported in `Location.query` type but `parseQuery()` returns last value for duplicates |
| Hash navigation changes | `popstate` not triggered by hash-only changes; actions must explicitly update `locationSignal` |

---

## 10. Cross-References

| Spec | Relationship |
|------|-------------|
| `09-route-matching.md` | Server-side URL matching; this spec covers client-side URL state |
| `07-event-system.md` | `SetURLParameter`, `SetURLParameters` are action types in `handleAction()` |
| `11-page-lifecycle.md` | Location signal initialized in `initGlobalObject()`; `popstate` listener in `createRoot()` |
| `06-rendering.md` | Dynamic head updates after hydration in `setupMetaUpdates()` |
