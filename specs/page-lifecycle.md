# Page Lifecycle Specification

## Purpose

The Page Lifecycle manages the end-to-end journey of a Layr page from SSR-rendered HTML to a fully interactive client-side application. It handles the bootstrap sequence, SSR hydration, URL routing, navigation, meta tag management, theme handling, and the global `window.toddle` API surface.

### Jobs to Be Done

- Bootstrap a client-side application from SSR-rendered HTML with pre-fetched API data
- Parse URLs into structured route parameters using path segments and query strings
- Handle browser navigation (back/forward) via `popstate` with reactive location updates
- Dynamically update meta tags (title, description, OG tags, language) based on component state
- Manage theme signals with support for formula-based, static, and cookie-based themes
- Expose a global `window.toddle` API for debugging, plugin registration, and component inspection
- Initialize APIs in dependency order with SSR cache hydration to avoid redundant fetches

---

## SSR Data Transfer

### ToddleInternals

The server renders HTML with a `<script type="application/json" id="nordcraft-data">` tag containing serialized state:

| Field | Type | Description |
|-------|------|-------------|
| `project` | `string` | Project short ID |
| `branch` | `string` | Branch name (default: `'main'`) |
| `commit` | `string` | Commit hash (default: `'unknown'`) |
| `pageState` | `ComponentData` | Server-evaluated component data including pre-fetched API responses |
| `component` | `Component` | Page component definition (test data stripped) |
| `components` | `Component[]` | All included components (test data stripped) |
| `isPageLoaded` | `boolean` | Starts `false`, set to `true` after hydration completes |
| `cookies` | `string[]` | Cookie names available on the server |

### HTML Embedding

```html
<script type="application/json" id="nordcraft-data">
  { /* ToddleInternals JSON */ }
</script>
<script type="module">
  import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
  window.__toddle = JSON.parse(document.getElementById('nordcraft-data').textContent);
  window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
  initGlobalObject({ formulas: {}, actions: {} });
  createRoot(document.getElementById("App"));
</script>
```

---

## Bootstrap Sequence

### Phase 1: initGlobalObject()

Sets up the global `window.toddle` API and runtime environment.

1. **Parse URL** — extract path params, query params, and hash from `window.location`
2. **Create environment:**
   ```
   env = { isServer: false, branchName, request: undefined, runtime: 'page', logErrors: true }
   ```
3. **Build window.toddle object** with:
   - Project metadata (`project`, `branch`, `commit`)
   - Plugin registries (`formulas`, `actions`)
   - Legacy registration functions (`registerFormula`, `registerAction`)
   - V2 lookup functions (`getCustomFormula`, `getCustomAction`, `getArgumentInputData`)
   - Location signal (reactive URL state)
   - Error collection array
   - SSR page state reference
4. **Register standard library** — all `@toddle/*` formulas and actions from `@layr/std-lib`

### Phase 2: createRoot(domNode)

Hydrates the SSR-rendered DOM and starts reactive rendering.

**A. Route Signal Setup**
```
routeSignal = locationSignal.map(({ query, params }) → { ...query, ...params })
```

**B. Data Signal Creation**
```
dataSignal = signal({
  ...pageState,           // SSR state (APIs, Location, Page)
  Variables: re-evaluated  // Client-side re-initialization
})
```
Variables are re-evaluated because SSR cannot access client-only APIs (localStorage, geolocation, etc.).

**C. Route → Data Subscription**
```
routeSignal.subscribe(route → dataSignal.update(data → {
  ...data,
  'URL parameters': route,
  Attributes: route
}))
```

**D. AbortController** — linked to data signal destruction for cleanup cascading

**E. Component Context** — full `ComponentContext` built with:
- `isRootComponent: true`
- `providers: {}` (populated in step H)
- `stores: { theme: themeSignal }`
- `apis: {}` (populated in step F)

**F. API Initialization**
- APIs sorted by dependency order
- Legacy and v2 APIs created with appropriate factories
- V2 API actions triggered after all APIs created
- **SSR cache hydration:** APIs with `autoFetch` check `pageState.Apis[requestHash]` before fetching (only when `isPageLoaded === false`)

**G. Context Subscription** — if component consumes ancestor context (unusual for pages but supported)

**H. Context Provider Registration** — if page component exposes formulas/workflows via context

**I. Theme Signal Setup** — see Theme Management section

**J. Meta Tag Setup** — see Meta Tag Management section

**K. Render Component**
1. `renderComponent()` generates DOM elements
2. `domNode.innerText = ''` — clears SSR content
3. Append rendered elements to DOM node

**L. Mark Page Loaded**
```
window.__toddle.isPageLoaded = true
```
After this point, APIs no longer use SSR cache — normal fetch behavior resumes.

---

## URL Routing

### URL Parsing

`parseUrl(component)` extracts structured route data from `window.location`:

**Path Parameters** (two strategies):

1. **New routing system** — iterates `component.route.path` segments:
   - `static` segments: ignored (used for matching)
   - `param` segments: extracted from pathname by position, URL-decoded
   - Missing params set to `null`

2. **Legacy routing** — uses `path-to-regexp` library:
   - Compiles pattern from `component.page` string
   - Matches against `window.location.pathname`
   - Extracts named parameters

**Query Parameters:**
- Parsed from `window.location.search`
- Split by `&`, key-value pairs split by `=`, both URL-decoded
- Declared query params pre-filled with `null` to avoid `undefined`

**Hash:**
- Extracted from `window.location.hash`
- Leading `#` removed

### Location Signal

Reactive signal holding current URL state:

| Field | Type | Description |
|-------|------|-------------|
| `route` | `PageRoute?` | Route definition from component |
| `page` | `string?` | Legacy page path pattern |
| `path` | `string` | Current pathname |
| `params` | `Record<string, string \| null>` | Path parameters |
| `query` | `Record<string, string \| string[] \| null>` | Query parameters |
| `hash` | `string?` | Fragment (without `#`) |

### Navigation Handling

**Browser Back/Forward (`popstate`):**
1. Listener on `window.addEventListener('popstate')`
2. Re-parses URL via `parseUrl(component)`
3. Updates `locationSignal` with new params, query, hash, path
4. Signal change cascades through `routeSignal` → `dataSignal` → DOM updates

**Programmatic Navigation (`getLocationUrl`):**
Builds URLs from location objects:
1. **New routing:** concatenates static/param segments from `route.path`
2. **Legacy routing:** uses `path-to-regexp.compile()` with params
3. Appends hash (if present) as `#{hash}`
4. Appends query params as `?key=value&...` (filters out `null` values)
5. Query keys use declared names from `route.query[key].name` if available

---

## SSR Cache Hydration

### Cache Lookup

When an API has `autoFetch` enabled and `isPageLoaded === false`:
1. Compute request hash from URL and request settings
2. Look up `pageState.Apis[requestHash]`
3. If found:
   - **Error cached:** call `apiError()` with cached error
   - **Data cached:** call `apiSuccess()` with cached data
4. If not found: proceed with normal fetch

### Cache Key

`requestHash(url, requestSettings)` — hash of URL + method + headers + body for unique identification.

### Cache Expiry

Cache is only valid during initial hydration. Once `isPageLoaded = true`, all APIs fetch normally regardless of cache contents.

---

## Meta Tag Management

### Dynamic Language

If `component.route.info.language.formula` is dynamic (not a static value):
```
dataSignal.map(data → applyFormula(langFormula)) → subscribe(newLang → {
  document.documentElement.setAttribute('lang', newLang)
})
```

### Dynamic Title

If `component.route.info.title.formula` is dynamic:
```
dataSignal.map(data → applyFormula(titleFormula)) → subscribe(newTitle → {
  document.title = newTitle
})
```

### Dynamic Description

If `component.route.info.description.formula` is dynamic:
- Updates `<meta name="description">` content
- Auto-populates `<meta property="og:description">` if not explicitly defined

### Custom Meta Tags

For each meta tag in `component.route.info.meta`:
- If any attribute formula is dynamic, creates a mapped signal
- Signal subscription calls `updateMetaElement()` which:
  1. Finds existing element by `data-toddle-id` or `property`/`name` attribute
  2. Creates element if not found
  3. Updates all attributes

### Meta Element Lookup Priority

1. By `data-toddle-id` attribute (stable unique ID)
2. By `property` attribute (Open Graph tags)
3. By `name` attribute (standard meta tags)

---

## Theme Management

Three theme modes based on configuration:

### Formula-Based Theme (Dynamic)

When `component.route.info.theme.formula` is a non-static formula:
```
themeSignal = dataSignal.map(() → applyFormula(themeFormula))
```
Theme updates reactively as component data changes.

### Static Theme

When formula is a static `value` type:
```
themeSignal = signal(staticThemeValue)
```
Theme is fixed for the page lifetime.

### Cookie-Based Theme (Default)

When no theme formula is configured:
1. Read initial theme from `nc-theme` cookie
2. Create signal with cookie value (or `null`)
3. Listen to `cookieStore.change` events for live updates
4. Theme changes when cookie is modified (e.g., by `setTheme` action)

### Theme Application

Theme signal subscription:
1. Updates `dataSignal.Page.Theme` for formula access
2. Sets `data-nc-theme` attribute on `document.documentElement`
3. Removes attribute if theme is `null`

---

## Global window.toddle API

### Structure

| Field | Type | Description |
|-------|------|-------------|
| `project` | `string` | Project ID |
| `branch` | `string` | Branch name |
| `commit` | `string` | Commit hash |
| `errors` | `Error[]` | Accumulated formula/action errors |
| `formulas` | `Record<string, Record<string, PluginFormula>>` | V2 formula registry |
| `actions` | `Record<string, Record<string, PluginActionV2>>` | V2 action registry |
| `isEqual` | `(a, b) → boolean` | `fast-deep-equal` function |
| `registerFormula` | `(name, handler, getArgInputData?) → void` | Legacy formula registration |
| `registerAction` | `(name, handler) → void` | Legacy action registration |
| `getFormula` | `(name) → FormulaHandler?` | Legacy formula lookup |
| `getAction` | `(name) → ActionHandler?` | Legacy action lookup |
| `getCustomFormula` | `(name, pkg?) → PluginFormula?` | V2 formula lookup |
| `getCustomAction` | `(name, pkg?) → PluginActionV2?` | V2 action lookup |
| `getArgumentInputData` | `(name, args, idx, data) → ComponentData` | Autocomplete context |
| `data` | `Record<string, unknown>` | Reserved for custom use |
| `components` | `Component[]` | All project components |
| `locationSignal` | `Signal<Location>` | Reactive URL state |
| `eventLog` | `Array<{ component, node, event, time, data }>` | Event log |
| `pageState` | `ComponentData` | Initial SSR state (used for cache) |
| `env` | `ToddleEnv` | Runtime environment |

### Debug Helpers

- `window.logState()` — outputs all component data signals as console table
- `window.__components` — map of component name → data signal
- `window.signal(value)` — creates a signal from console
- `window.deepEqual(a, b)` — tests deep equality

---

## Variable Re-initialization

After SSR, variables are re-evaluated client-side because:
- SSR cannot access `localStorage`, `sessionStorage`, `geolocation`, etc.
- Browser APIs (DOM measurements, user preferences) unavailable on server
- `initialValue` formulas re-run with full client context

All other SSR state (`Apis`, `Page`, `Location`) is preserved from `pageState`.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing DOM root node | Throws `Error('Cant find root domNode')` |
| Missing components array | Throws `Error('Missing components')` |
| Formula evaluation error | Pushed to `toddle.errors[]`, returns `null` |
| API fetch error | Stored in `data.Apis[name].error`, triggers `onFailed` actions |
| API timeout | `TimeoutError` caught, error message set |
| API abort (unmount) | `AbortError` caught, request silently cancelled |

---

## Edge Cases

### SSR/CSR State Divergence

Variables re-initialized on client may differ from SSR-computed values (e.g., localStorage has data that server didn't). This can cause a brief visual flash if the variable affects rendering.

### Multiple Page Components

Only one page component renders per route. The component is determined by the backend's route matching before SSR.

### Hash Navigation

Hash changes via `window.location.hash` do not trigger `popstate`. Hash updates from actions must explicitly update the `locationSignal`.

### Query Parameter Types

Query params with the same key appearing multiple times are stored as the last value (not arrays). Declared query params from `route.query` are pre-filled with `null` to ensure they appear in formulas even when not present in the URL.

### Theme Cookie Persistence

Theme changes via `setTheme` action set the `nc-theme` cookie. The cookie-based theme signal listens to `cookieStore.change` events for reactivity. Browsers without `cookieStore` API only get the initial cookie value.

---

## Dependencies

- **Signal System** — `locationSignal`, `dataSignal`, `themeSignal` for reactive state
- **Rendering Engine** — `renderComponent()` for DOM generation
- **Formula System** — `applyFormula()` for meta tags, theme, variables
- **Plugin System** — Plugin registration during `initGlobalObject()`
- **API System** — API initialization with SSR cache hydration
- **Context Providers** — Provider registration for page-level context
- **path-to-regexp** — Legacy URL pattern matching
