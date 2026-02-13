# Dynamic Asset Generation Specification

## Purpose

The Dynamic Asset Generation system provides eight specialized backend routes that generate or proxy runtime assets on demand. These include JavaScript bundles for custom element exports, CSS stylesheets for preview mode, and SEO/PWA resources (sitemap, robots.txt, manifest, favicon, service worker). Most resource endpoints support formula-based configuration that fetches content from external URLs, with sensible fallback defaults.

### Jobs to Be Done

- Generate self-contained JavaScript bundles for exporting components as web components
- Generate CSS stylesheets and custom code bundles dynamically in preview mode
- Serve SEO resources (sitemap, robots.txt) with auto-generation fallbacks
- Serve PWA resources (manifest, service worker, favicon) from configurable URLs
- Strip editor-only test data from components before deployment

---

## Custom Element Bundle Generation

### Route

`GET /.toddle/custom-element/:filename{.+.js}`

### Purpose

Generates a complete, self-contained JavaScript module that exports a Layr component as a standard web component for use outside Layr applications.

### Generation Flow

1. Extract component name from filename (remove `.js` extension)
2. Load component files via `pageLoader`
3. Validate component is not a page component (pages cannot be exported — returns 403)
4. Collect themes, fonts, and recursively included components
5. Generate JavaScript file

### Generated Bundle Structure

The output JavaScript file contains:

1. **Header comment:** Component name, attributes, and events documentation
2. **Imports:** `defineComponents` and `loadCorePlugins` from static runtime bundle. Optionally imports custom code if the component uses custom formulas/actions.
3. **Font loading:** Injects `<link>` stylesheet tag for Google Fonts (shadow DOM support)
4. **Global toddle object:** Creates the runtime context with:
   - Formula and action registries (std-lib + custom)
   - Project metadata (name, branch, commit)
   - Error tracking, location signal, page state
   - Environment flags (`isServer: false`)
5. **Plugin loading:** Loads core std-lib plugins and custom code
6. **Component definition:** Calls `defineComponents()` with transformed component data

### Component Transformations

Components undergo a three-step transformation pipeline before inclusion:

1. **Tag replacement:** Replace component tag names with safe custom element names (`safeCustomElementName()`)
2. **Test data removal:** Strip editor-only data via `removeTestData()`
3. **Path absolutization:** Convert relative paths to absolute using the request origin (`transformRelativePaths()`)

### Response

| Header | Value |
|--------|-------|
| `Content-Type` | `text/javascript` |
| `Cache-Control` | `no-cache` |
| `Access-Control-Allow-Origin` | `*` |

### Error Responses

| Condition | Status | Response |
|-----------|--------|----------|
| Component not found | 404 | JSON with error message and docs link |
| Page component (forbidden) | 403 | JSON with error message and docs link |
| Generation error | 404 | JSON with error message |

---

## Preview Mode Assets

### Preview Stylesheet

**Route:** `GET /.toddle/stylesheet/:pageName{.+.css}`

Generates CSS for a page component from in-memory project files during preview mode.

**Flow:**
1. Extract page name (remove `.css` extension)
2. Validate page exists and is a page component
3. Resolve themes from project config
4. Collect all included components recursively
5. Generate stylesheet via `createStylesheet()` (without reset styles or font faces — these are loaded separately)

**Response:** `Content-Type: text/css`, status 200

### Preview Custom Code

**Route:** `GET /.toddle/custom-code/:pageName{.+.js}`

Generates JavaScript containing custom formulas and actions referenced by a component during preview mode.

**Flow:**
1. Extract page name (remove `.js` extension)
2. Look up component in project files
3. Analyze component to find all referenced custom formulas and actions
4. Generate JavaScript file with exports

**Response:** `Content-Type: text/javascript`, `Access-Control-Allow-Origin: *`

---

## SEO Resource Endpoints

### Sitemap

**Route:** `GET /sitemap.xml`

**Response:** `Content-Type: application/xml`

**Strategy:**

1. **Custom formula:** If `config.meta.sitemap.formula` is defined, evaluate it to get a URL. Fetch and stream the remote sitemap.
2. **Auto-generation fallback:** Generate sitemap from page routes:
   - Include only pages with all-static path segments (no dynamic parameters)
   - Limit to first 1000 pages
   - Sort by path length (shortest first)
   - Generate XML with `<url><loc>` entries using full origin + path

**Caching:** `Cache-Control: public, max-age=3600` (1 hour)

### Robots.txt

**Route:** `GET /robots.txt`

**Response:** `Content-Type: text/plain`

**Strategy:**

1. **Custom formula:** If `config.meta.robots.formula` is defined, fetch from that URL.
2. **Default fallback:**
   ```
   Sitemap: {origin}/sitemap.xml

   User-agent: *
   Disallow: /_toddle
   Disallow: /_toddle/
   Disallow: /.toddle
   Disallow: /.toddle/
   Disallow: /.layr
   Disallow: /.layr/
   Disallow: /_api
   Disallow: /_api/
   Allow: /cdn-cgi/imagedelivery/*
   Disallow: /cdn-cgi/
   ```

**Caching:** `Cache-Control: public, max-age=3600` (1 hour)

---

## PWA Resource Endpoints

### Web App Manifest

**Route:** `GET /manifest.json`

**Response:** `Content-Type: application/manifest+json`

Evaluates `config.meta.manifest.formula` to get a URL, fetches the manifest JSON, and streams it back.

**Caching:** `Cache-Control: public, max-age=3600` (1 hour)

Returns 404 if no formula configured or fetch fails.

### Service Worker

**Route:** `GET /serviceWorker.js`

**Response:** `Content-Type: text/javascript`

Evaluates `config.meta.serviceWorker.formula` to get a URL, fetches the JavaScript, and streams it.

**No caching headers set** — service workers must receive fresh code for browser cache invalidation to work correctly.

Returns 404 if no formula configured or fetch fails.

### Favicon

**Route:** `GET /favicon.ico`

Evaluates `config.meta.icon.formula` to get a URL (supports both relative and absolute paths using request origin for resolution). Fetches the icon and streams it back, preserving the original `Content-Type` from the fetched resource.

**Caching:** `Cache-Control: public, max-age=3600` (1 hour)

Returns 404 with `Content-Type: image/x-icon` if fetch fails.

---

## Common Patterns

### Formula-Based Remote Content

Five endpoints (manifest, sitemap, robots, service worker, favicon) share the same pattern:

1. Evaluate formula from `config.meta.{resource}.formula` without context (value formulas only)
2. Validate resulting URL
3. Fetch remote content
4. Stream response body directly (no buffering)
5. Apply caching headers

Formulas are evaluated with `undefined` context because they must be value formulas (no component data available at these endpoints).

### Error Handling

All resource endpoints follow the same pattern:
- `try/catch` wrapper around entire handler
- Console log errors for server-side debugging
- Return 404 on any failure

### Caching Strategy

| Resource Type | Cache Duration | Rationale |
|---------------|---------------|-----------|
| Custom element bundles | `no-cache` | Must reflect latest component version |
| Preview assets | Not set | Preview changes need immediate reflection |
| SEO resources | 1 hour | Balances freshness with performance |
| PWA manifest | 1 hour | Changes infrequently |
| Service worker | Not set | Browser requires fresh code for update detection |
| Favicon | 1 hour | Changes infrequently |

---

## Test Data Stripping

### Function: `removeTestData(component)`

Recursively strips editor-only data from component definitions before runtime deployment.

### Data Removed

| Data | Location | Purpose in Editor |
|------|----------|------------------|
| `testValue` | Attributes, route path/query params, formula arguments | Preview/test values for editor display |
| `dummyEvent` | Event definitions | Editor-generated test events |
| `description` | Custom actions, action arguments | Human-readable documentation |
| `group` | Custom actions | UI categorization |
| `label` | Custom actions | UI display labels |
| `type` | Action arguments | Type information for editor |
| `service` | Non-legacy APIs | Editor-only API metadata |
| `servicePath` | Non-legacy APIs | Editor-only API path metadata |

### Stripping Scope

The function recursively processes:

1. **Component level:** Attributes, events, route parameters
2. **Node level:** Element event actions (recursive through action tree)
3. **Formula level:** Formula arguments and nested formula trees
4. **Workflow level:** Workflow test values, parameters, callbacks, actions
5. **API level:** Service metadata
6. **Lifecycle hooks:** `onLoad` and `onAttributeChange` actions

### Why Stripping Matters

- **Security:** Test values may contain sensitive data not intended for production
- **Bundle size:** Removing unused metadata reduces JavaScript payload
- **Clean separation:** Editor concerns don't leak into runtime code

---

## Configuration Sources

All resource endpoints read configuration from project config:

| Config Path | Used By |
|------------|---------|
| `config.meta.manifest.formula` | Manifest endpoint |
| `config.meta.sitemap.formula` | Sitemap endpoint |
| `config.meta.robots.formula` | Robots.txt endpoint |
| `config.meta.serviceWorker.formula` | Service worker endpoint |
| `config.meta.icon.formula` | Favicon endpoint |
| `config.theme` | Default theme (custom element, stylesheet) |

---

## Edge Cases

- **Page component export attempt:** Returns 403 with documentation link — only non-page components can be exported as custom elements
- **No custom formula defined:** SEO resources fall back to auto-generation; PWA resources return 404
- **Remote fetch failure:** All endpoints return 404 (no partial content)
- **Dynamic route pages in sitemap:** Excluded from auto-generated sitemap (only static paths)
- **Sitemap page limit:** Maximum 1000 pages to prevent oversized sitemaps
- **Custom element without custom code:** Bundle imports empty formula/action objects
- **Relative favicon path:** Resolved against request origin for correct URL construction
- **Service worker no-cache:** Intentionally omits cache headers so browsers can detect updates

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
