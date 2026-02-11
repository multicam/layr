# SSR Pipeline Specification

## Purpose

The SSR (Server-Side Rendering) Pipeline generates complete HTML documents from component definitions on the server. It handles formula evaluation, API prefetching, head metadata construction, font preloading, custom code tree-shaking, and client hydration data injection.

### Jobs to Be Done

- Render component trees to HTML strings on the server
- Prefetch API data during rendering and cache for client hydration
- Construct HTML `<head>` with meta tags, stylesheets, fonts, and speculation rules
- Inject hydration data for seamless client-side takeover
- Tree-shake custom code to only what's referenced
- Escape URL parameters for XSS protection
- Remove editor-only test data before sending to client

---

## Full Rendering Pipeline

### Request → HTML Flow

1. **Request arrives** → `nordcraftPage()` route handler
2. **Build formula context** → `getPageFormulaContext()` extracts URL params, cookies, initializes data
3. **Get included components** → `takeIncludedComponents()` finds all dependencies
4. **Render page body** → `renderPageBody()`:
   - Evaluate APIs with caching
   - Recursively render component tree
   - Collect custom CSS properties
5. **Build head items** → `getHeadItems()`:
   - Default meta tags, stylesheets, fonts, speculation rules
6. **Assemble HTML document**
7. **Return response** (404 status if page is `'404'`)

---

## Formula Context (Server-Side)

### `getPageFormulaContext()`

Constructs the initial data context for server-side formula evaluation.

**Data structure:**

| Field | Value |
|-------|-------|
| `Location.page` | Matched page name |
| `Location.path` | URL pathname |
| `Location.params` | Combined path + query parameters |
| `Location.query` | Query parameters with defaults |
| `Location.hash` | URL hash (without `#`) |
| `Attributes` | Combined parameters (path overrides query) |
| `URL parameters` | Flat parameter structure |
| `Apis` | Empty `{}` (populated during rendering) |
| `Variables` | Initialized from variable formulas |
| `Page.Theme` | From formula or cookie value |

### Server Environment (`ToddleServerEnv`)

| Field | Value |
|-------|-------|
| `isServer` | `true` |
| `branchName` | Current branch name |
| `request.headers` | Request headers (Record) |
| `request.cookies` | Request cookies (Record) |
| `request.url` | Request URL string |
| `logErrors` | Error logging flag |

### Parameter Extraction

1. **Query parameters:** Parsed from `URLSearchParams`, escaped via `xss` package
2. **Path parameters:** Matched against route path segments, URL-decoded
3. **Combined:** Path params override query params; all default to `null`

---

## API Evaluation

### `evaluateComponentApis()`

Evaluates all v2 APIs for a component during SSR.

**Process:**

1. Filter to v2 APIs only, sort by dependency order
2. **Independent APIs** (no cross-API references): Fetch in parallel with `Promise.all()`
3. **Dependent APIs**: Fetch sequentially, updating `formulaContext.data.Apis` after each
4. Return combined results

### `fetchApi()` — Per-API Lifecycle

1. Evaluate API inputs as formulas
2. Check `server.ssr.enabled` formula (default: `false`)
3. Check `autoFetch` formula (if disabled: return `{ data: null, isLoading: false, error: null }`)
4. Create request via `createApiRequest()` with default headers: `accept: */*`, `accept-encoding: gzip, deflate`
5. Generate cache key: `requestHash(url, requestSettings)`
6. Return cached response if exists
7. Apply cookie templates (`{{ cookies.* }}`) to URL search params
8. Sanitize headers: Remove `cookie`, hop-by-hop, Layr headers
9. Apply cookie templates to remaining headers
10. Execute fetch

### `fetchApiV2()` — Response Handling

1. Execute fetch with performance tracking (`requestStart`, `responseStart`, `responseEnd`)
2. Parse body based on `parserMode`: JSON, text, or auto-detect from Content-Type
3. Evaluate `isError` formula for custom error detection
4. Build `ApiStatus` object with `data`, `error`, `isLoading`, `response`
5. Evaluate redirect rules — if URL returned, throw `RedirectError` (halts rendering)

### Redirect Handling

If an API throws `RedirectError` during SSR:
- Set `x-nordcraft-redirect-api-name` and `x-nordcraft-redirect-component-name` headers
- Return HTTP redirect response with configured status code (default: 302)

---

## Component Rendering

### `renderPageBody()`

1. Initialize `apiCache` and `customProperties` map
2. Evaluate APIs via `evaluateComponentApis()`
3. Recursively render component tree via `renderComponent()`
4. Format custom property rules: Replace `__RULES__` placeholders with actual property values
5. Return `{ html, apiCache, customProperties }`

### `renderComponent()` — Recursive Renderer

Renders each node type differently:

#### Text Node

- **HTML namespace:** `<span data-node-type="text" data-node-id="{id}">{encodedText}</span>`
- **SVG/MathML namespace:** Raw encoded text (no wrapper)

#### Slot Node

- Check `children?.[node.name ?? 'default']`
- If slotted content exists: Return child content
- Otherwise: Render default slot children

#### Element Node

1. **Namespace handling:** `<svg>` → SVG namespace, `<math>` → MathML namespace
2. **Script tags:** Return empty string (not executed during SSR)
3. **Evaluate attributes** via formulas
4. **Build class list:** Base class hash + conditional classes + instance classes
5. **Evaluate custom properties** and add to stylesheet map
6. **Render children** recursively (skip for `<script>`, `<style>` renders text directly)
7. **Tag name:** V2 components prefix with `{packageName}-` or `{projectId}-`
8. **Output:** `<tag attrs data-id="path" data-node-id="id" class="classes">children</tag>`
9. **Void elements** (`img`, `br`, `input`, etc.): Self-closing, no children

#### Component Node

1. Evaluate attributes from parent formulas
2. Build contexts (parent contexts + current component's exposed formulas)
3. Find child component (packages first, then project)
4. Evaluate child APIs with full SSR lifecycle
5. Initialize variables with attribute values
6. Render children recursively, group by slot name
7. Add instance custom properties and variant custom properties
8. Recursively call `renderComponent()` for the child

### Conditional Rendering

Evaluate condition formula → `toBoolean()`. If falsy, skip node entirely (no DOM output).

### List Rendering (Repeat)

Evaluate repeat formula → iterate array, rendering each item with `ListItem` context (`Item`, `Index`, `Parent`).

---

## Head Construction

### `getHeadItems()`

Returns array of HTML strings for `<head>`.

**Included items (in order):**

1. **Charset:** `<meta charset="utf-8">` (or from `info.charset` formula)
2. **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1">`
3. **Title:** `<title>{evaluated formula or page name}</title>`
4. **Description:** `<meta name="description" content="{...}">`
5. **OG Description:** Auto-created if description exists and no custom OG description
6. **Icon:** `<link rel="icon" href="{...}">`
7. **Custom meta tags:** From `info.meta` (name, property, http-equiv, content, link)
8. **Reset stylesheet:** `<link rel="stylesheet" href="/_static/reset.css">`
9. **Page stylesheet:** `<link rel="stylesheet" href="/_static/{pageName}.css">`
10. **Font stylesheet:** `<link rel="stylesheet" href="/.toddle/fonts/stylesheet/css2?...">`
11. **Custom property styles:** `<style>` blocks from component rendering
12. **Speculation rules:** `<script type="speculationrules">` for browser prerendering

### Speculation Rules

```json
{
  "prerender": [
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"eager\"]" }, "eagerness": "eager" },
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"moderate\"]" }, "eagerness": "moderate" }
  ]
}
```

Enables browser prerendering of links with `data-prerender` attribute.

---

## HTML Document Assembly

```html
<!doctype html>
<html lang="{lang}" data-nc-theme="{theme}">
  <head>{renderedHeadItems}</head>
  <body>
    <div id="App">{renderedBody}</div>
    <script type="application/json" id="nordcraft-data">
      {toddleInternals JSON}
    </script>
    <script type="module">{hydrationScript}</script>
  </body>
</html>
```

### `</script>` Escaping

JSON content replaces `</script>` with `<\/script>` to prevent premature tag closing.

---

## Hydration Data

### `toddleInternals` (injected as JSON)

| Field | Type | Description |
|-------|------|-------------|
| `project` | `string` | Project short ID |
| `branch` | `string` | Branch name (default: `'main'`) |
| `commit` | `string` | Commit hash (default: `'unknown'`) |
| `pageState` | `ComponentData` | Full component data including API cache |
| `component` | `Component` | Page component (test data removed) |
| `components` | `Component[]` | All included components (test data removed) |
| `isPageLoaded` | `false` | Set to `true` after hydration completes |
| `cookies` | `string[]` | Cookie names only (not values) |

### Hydration Script (with custom code)

```javascript
import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
import { loadCustomCode, formulas, actions } from '{customCodeUrl}'

window.__toddle = JSON.parse(document.getElementById('nordcraft-data').textContent);
window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
initGlobalObject({formulas, actions});
loadCustomCode();
createRoot(document.getElementById("App"));
```

### Hydration Script (without custom code)

Same as above, minus the custom code import and `loadCustomCode()` call.

---

## Client Bootstrap Sequence

### `initGlobalObject()`

1. Parse URL parameters, hash, query from `window.location`
2. Create client environment: `{ isServer: false, runtime: 'page', ... }`
3. Build `window.toddle` object with:
   - Formula/action registries and lookup functions
   - Location signal (reactive URL tracking)
   - Page state from SSR
   - Component definitions
4. Register all `@layr/std-lib` formulas and actions

### `createRoot()`

1. Listen to `popstate` event for navigation
2. Create route signal (maps location → combined params)
3. Initialize data signal with SSR page state, **re-initialize variables** (client-side only state)
4. Subscribe route changes to data signal
5. Create abort controller for component lifecycle
6. Build `ComponentContext`
7. Create APIs (sorted by dependency order), use SSR cached data
8. Setup context providers
9. Subscribe to theme updates
10. Setup dynamic meta tag updates (title, description, language)
11. Render components, replace SSR HTML
12. Set `window.__toddle.isPageLoaded = true`

### SSR → CSR Transition

- Variables are re-initialized on client (may differ from SSR if dependent on client-only state)
- APIs use SSR cache on first load, then reactive tracking takes over
- Custom properties hydrate from SSR styles via `CustomPropertyStyleSheet.hydrateFromBase()`

---

## Custom Code Tree-Shaking

### `takeReferencedFormulasAndActions()`

Only includes formulas and actions actually referenced by the component tree:

1. Create `ToddleComponent` wrapper for component
2. Collect `actionReferences` and `formulaReferences` from component and subcomponents
3. Filter packages to only those with references
4. Filter project formulas/actions to only referenced items

### `generateCustomCodeFile()`

Generates JavaScript module for runtime:

- Legacy actions/formulas: Executed immediately in `loadCustomCode()`
- V2 actions/formulas: Wrapped in closures
- `ToddleFormula` definitions: Stored as JSON (evaluated by runtime)
- Package names mapped: `__PROJECT__` → `projectId`

### `hasCustomCode()`

Returns `true` if component uses any custom code formulas or actions.

---

## Cookie Handling

### `getRequestCookies()`

1. Get `Cookie` header from request
2. Parse with `cookie` package
3. Filter out undefined keys/values
4. Return `Record<string, string>`

### Cookie Template Substitution

Template format: `{{ cookies.<cookieName> }}`

Applied to:
- API request URLs (search params)
- API request headers
- API request bodies (when proxy templates enabled)

---

## XSS Protection

### `escapeSearchParameters()`

All URL search parameters are escaped using the `xss` package before being used in formula context. This prevents injection attacks via URL parameters.

---

## Test Data Removal

### `removeTestData()`

Strips editor-only data from components before sending to client:

- `testValue` from attributes, path params, query params
- `dummyEvent` from events
- `description` from actions
- Action `group` and `label`
- `service` and `servicePath` from APIs
- Recursively processes nested formulas/actions

---

## Dynamic Meta Updates (Client-Side)

After hydration, reactive subscriptions update meta tags when data changes:

| Meta | Condition | Updates |
|------|-----------|---------|
| Language | Formula is not static value | `document.documentElement.lang` |
| Title | Formula is not static value | `document.title` |
| Description | Formula is not static value | `<meta name="description">` + auto `og:description` |
| Custom meta | Any dynamic formula | Element attributes via `data-toddle-id` |

---

## Edge Cases

- **No matching page:** Falls through to 404 handler
- **API redirect during SSR:** Throws `RedirectError`, immediately returns HTTP redirect
- **Recursive component rendering:** Child components rendered inline with their own API prefetching
- **Script tags in SSR:** Return empty string (not executed server-side)
- **Void HTML elements:** Self-closing (`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`)
- **Non-body response codes (101, 204, 205, 304):** Skip body in response
- **Localhost requests:** Remove `cf-connecting-ip` and `host` headers
- **Relative image paths:** Converted to absolute URLs via `transformRelativePaths()`
- **Variables re-initialization on client:** Client may compute different initial values than server (e.g., localStorage-dependent)
