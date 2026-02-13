# SEO & Web Standards Endpoints

## 1. Overview

### Purpose
The SEO and web standards endpoint system serves standard web resource files (sitemap, robots.txt, manifest, favicon, service worker) required for search engine optimization, Progressive Web App support, and browser interoperability. Each endpoint follows a formula-based configuration pattern: check for a user-configured external URL, fetch and stream that resource if available, or generate a sensible fallback.

### Jobs to Be Done
- **Serve sitemap.xml** — either from an external URL or auto-generated from project routes
- **Serve robots.txt** — either from an external URL or auto-generated with safe defaults
- **Serve manifest.json** — proxied from an external URL for PWA support
- **Serve favicon.ico** — proxied from a configured icon URL (supports relative paths)
- **Serve serviceWorker.js** — proxied from an external URL for PWA support
- **Inject speculation rules** — prerender/prefetch hints for browser performance optimization

### Scope
- Five HTTP endpoints registered on the Hono backend
- Formula-based URL configuration for each endpoint
- Fallback generation for sitemap and robots
- Speculation Rules API integration via SSR head injection
- Middleware-injected context for project configuration and routes

---

## 2. Architecture

### Registration

All five endpoints are registered as GET handlers in the Hono app:

```
GET /sitemap.xml    → sitemap handler
GET /robots.txt     → robots handler
GET /manifest.json  → manifest handler
GET /favicon.ico    → favicon handler
GET /serviceWorker.js → serviceWorker handler
```

### Middleware Chain

Before any endpoint handler executes, the following middleware runs:

1. **timing()** — Performance timing headers
2. **earlyMiddleware** — Custom early middleware array
3. **poweredBy()** — Sets `X-Powered-By: Layr` header
4. **Static router** — Serves static files (short-circuits if matched)
5. **Font router** — Serves fonts at `/.toddle/fonts` (short-circuits if matched)
6. **fileLoaders** — Injects `project`, `config`, and `routes` into Hono context:
   - `loadProjectInfo` — loads `./project.js`, sets `ctx.project` and `ctx.config`
   - `routesLoader` — loads `./routes.js`, sets `ctx.routes`

### Configuration Model

All endpoint URLs are configured via formulas in the project config:

```typescript
config?: {
  meta?: {
    icon?: { formula: Formula }
    robots?: { formula: Formula }
    sitemap?: { formula: Formula }
    manifest?: { formula: Formula }
    serviceWorker?: { formula: Formula }
  }
}
```

Each formula is evaluated with `undefined` context (value-only formulas — no dynamic data needed for static configuration URLs).

### Common Pattern

All endpoints follow the same fetch-and-stream pattern:

```
1. Extract formula from config.meta.{endpoint}.formula
2. Evaluate formula → URL string
3. Validate URL
4. Fetch external resource
5. If successful: stream response body with cache headers
6. If failed: generate fallback (if available) or return 404
```

---

## 3. Endpoint Specifications

### 3.1 Sitemap (`/sitemap.xml`)

**Context required:** `HonoProject & HonoRoutes`

#### External Sitemap Path

1. Extract formula from `config.meta.sitemap.formula`
2. Evaluate formula with `applyFormula(formula, undefined)`
3. Validate URL with `validateUrl()`
4. Fetch the external sitemap
5. If successful (`ok && body`): stream response with `Cache-Control: public, max-age=3600`
6. If failed: fall through to fallback generation

#### Fallback Generation

When no external sitemap is configured or fetch fails, generates an XML sitemap from project routes:

**Filtering:**
- Only `PageComponent` types (components with a `route` property)
- Only static routes: every path segment must have `type === 'static'`
- Dynamic routes (with `type === 'param'` segments) are excluded
- Limit: first 1000 pages

**Sorting:**
- Ascending by path segment count (shortest paths first)
- Parent routes appear before child routes

**Output format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{origin}/{path}</loc>
  </url>
  <!-- ... -->
</urlset>
```

- Origin derived from `new URL(c.req.url).origin`
- Path constructed from route segments: `segment.name` joined with `/`

**Cache:** `Cache-Control: public, max-age=3600`

#### Error Handling
- Try-catch around entire handler
- Console error logging
- Returns 404 on any error

---

### 3.2 Robots.txt (`/robots.txt`)

**Context required:** `HonoProject`

#### External Robots Path

1. Extract formula from `config.meta.robots.formula`
2. Evaluate formula with `applyFormula(formula, undefined)`
3. Validate URL with `validateUrl()`
4. Fetch the external robots.txt
5. If successful: stream response with `Cache-Control: public, max-age=3600`
6. If failed: fall through to fallback generation

#### Fallback Generation

Generates a default robots.txt with safe rules:

```
Sitemap: {origin}/sitemap.xml

User-agent: *
Disallow: /_toddle
Disallow: /_toddle/
Disallow: /.toddle
Disallow: /.toddle/
Disallow: /.nordcraft
Disallow: /.nordcraft/
Disallow: /_api
Disallow: /_api/
Allow: /cdn-cgi/imagedelivery/*
Disallow: /cdn-cgi/
```

**Disallow rules explained:**

| Path | Reason |
|------|--------|
| `/_toddle`, `/_toddle/` | Legacy Layr internal paths |
| `/.toddle`, `/.toddle/` | Layr configuration and font paths |
| `/.nordcraft`, `/.nordcraft/` | Layr runtime and asset paths |
| `/_api`, `/_api/` | API proxy endpoints |
| `/cdn-cgi/` | Cloudflare CDN internal paths |

**Allow rules:**

| Path | Reason |
|------|--------|
| `/cdn-cgi/imagedelivery/*` | Cloudflare image optimization URLs should be indexable |

**Sitemap reference:** Always points to `{origin}/sitemap.xml` regardless of whether a custom sitemap is configured.

**Cache:** `Cache-Control: public, max-age=3600`

#### Error Handling
- Try-catch around entire handler
- Console error logging
- Returns 404 on any error

---

### 3.3 Manifest (`/manifest.json`)

**Context required:** `HonoProject`

**Content-Type:** `application/manifest+json`

#### External Manifest Only (No Fallback)

1. Extract formula from `config.meta.manifest.formula`
2. Evaluate formula with `applyFormula(formula, undefined)`
3. Type check: `typeof result === 'string'`
4. Fetch the external manifest
5. If successful: stream response with `Cache-Control: public, max-age=3600`
6. If failed or not configured: return 404

**Key difference:** No fallback generation. A manifest must be explicitly configured to be served.

#### Error Handling
- Try-catch around entire handler
- Console error logging
- Returns 404 on any error or missing configuration

---

### 3.4 Favicon (`/favicon.ico`)

**Context required:** `HonoProject`

#### External Icon with Origin Resolution

1. Extract formula from `config.meta.icon.formula`
2. Evaluate formula → icon path (may be relative)
3. Resolve URL with origin: `validateUrl({ path: iconUrl, origin: requestUrl.origin })`
4. Fetch the icon
5. Extract `content-type` header from response (preserves original format — PNG, SVG, ICO, etc.)
6. If content-type available: set it on the response
7. Stream body with `Cache-Control: public, max-age=3600`
8. On failure: return 404 with `Content-Type: image/x-icon`

**Key features:**
- **Relative path support** — unlike other endpoints, favicon passes both `path` and `origin` to `validateUrl()`, allowing paths like `/icon.png` to resolve against the request origin
- **Dynamic content-type** — preserves the original image format from the fetched resource
- **Fallback content-type** — returns `image/x-icon` on error (standard favicon MIME type)

#### Error Handling
- Try-catch around entire handler
- Console error logging
- Returns 404 with `image/x-icon` content type

---

### 3.5 Service Worker (`/serviceWorker.js`)

**Context required:** `HonoProject`

**Content-Type:** `text/javascript`

#### External Service Worker Only (No Fallback)

1. Check `isDefined(config.meta.serviceWorker)` — must be explicitly configured
2. Extract formula from `config.meta.serviceWorker.formula`
3. Evaluate formula → service worker URL
4. Validate URL
5. Fetch the service worker script
6. If successful: stream response body
7. If failed or not configured: return 404

**Key differences:**
- **No cache headers** — unlike all other endpoints, the service worker response has no `Cache-Control` header. This is intentional: browsers handle service worker caching via their own update mechanism, and stale cache headers would prevent updates.
- **Existence check** — uses `isDefined()` helper before attempting formula evaluation, unlike other endpoints that rely on optional chaining

#### Error Handling
- Try-catch around entire handler
- Console error logging
- Returns 404 on any error or missing configuration

---

## 4. Speculation Rules

### Purpose
Enables browsers to prerender or prefetch pages ahead of user navigation using the Speculation Rules API.

### Configuration

Hardcoded default speculation rules (not configurable per-project):

```json
{
  "prerender": [
    {
      "source": "document",
      "where": {
        "selector_matches": "[data-prerender=\"eager\"]"
      },
      "eagerness": "eager"
    },
    {
      "source": "document",
      "where": {
        "selector_matches": "[data-prerender=\"moderate\"]"
      },
      "eagerness": "moderate"
    }
  ]
}
```

### Eagerness Levels

| Level | Behavior | Trigger |
|-------|----------|---------|
| `eager` | Prerender immediately when link is visible in viewport | Link appears on page |
| `moderate` | Prerender when user hovers or focuses the link | User intent signal |

### Integration

Injected into every page's `<head>` during SSR as an inline script:

```html
<script type="speculationrules">{"prerender":[...]}</script>
```

Part of the default head items generated by `getHeadItems()`.

### Usage

Developers add `data-prerender` attributes to link elements:

```html
<a href="/products" data-prerender="eager">Products</a>
<a href="/about" data-prerender="moderate">About</a>
```

Links without the `data-prerender` attribute are not prerendered.

---

## 5. Data Models

### Route Types

```typescript
interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, Route>
}

interface RouteDeclaration {
  path: Array<StaticPathSegment | DynamicPathSegment>
  query: Record<string, { name: string; testValue: any }>
}

interface StaticPathSegment {
  type: 'static'
  optional?: boolean | null
  testValue?: never | null
  name: string
}

interface DynamicPathSegment {
  type: 'param'
  testValue: string
  optional?: boolean | null
  name: string
}
```

### Hono Environment Types

```typescript
interface HonoEnv<T = never> {
  Variables: T
}

interface HonoProject {
  project: ToddleProject
  config: ProjectFiles['config']
}

interface HonoRoutes {
  routes: Routes
}
```

Context variables accessed via `c.var.*`:
- `c.var.project` — project definition
- `c.var.config` — project configuration (contains meta formulas)
- `c.var.routes` — route declarations

### File Loading

Project and route data are loaded via `loadJsFile<T>()`:
- In-memory cache using `Map<string, any>`
- Dynamic import with lowercase path normalization
- Extracts `default` export
- Caches `undefined` on failure (prevents retry loops)

---

## 6. Endpoint Summary Matrix

| Endpoint | Config Key | Required | Has Fallback | Cache | Content-Type |
|----------|-----------|----------|-------------|-------|-------------|
| `/sitemap.xml` | `meta.sitemap` | No | Yes (from routes) | 1h | `application/xml` (implicit) |
| `/robots.txt` | `meta.robots` | No | Yes (default rules) | 1h | `text/plain` (implicit) |
| `/manifest.json` | `meta.manifest` | Yes | No (404) | 1h | `application/manifest+json` |
| `/favicon.ico` | `meta.icon` | Yes | No (404) | 1h | Dynamic from fetch |
| `/serviceWorker.js` | `meta.serviceWorker` | Yes | No (404) | None | `text/javascript` |

### Cache Behavior

- All endpoints except service worker: `Cache-Control: public, max-age=3600` (1 hour)
- Service worker: No cache headers (browser handles SW update lifecycle)
- Cache applies to both external fetched resources and locally generated fallbacks

---

## 7. URL Validation

### validateUrl Function

```typescript
function validateUrl({
  path,
  origin,
}: {
  path: string | null | undefined
  origin: string | undefined
}): URL | false
```

**Algorithm:**
1. Type guard: return `false` if path is not a string
2. Construct `new URL(path, origin)` — supports both absolute and relative URLs
3. Fix search param encoding: copy all params to new `URLSearchParams` to trigger proper encoding
4. Return `URL` object (truthy) or `false` on error

**Usage variations:**
- **Favicon:** passes both `path` and `origin` — supports relative paths like `/icon.png`
- **Other endpoints:** pass URL string — only absolute URLs work

---

## 8. Error Handling

All endpoints follow the same error handling pattern:

1. **Single try-catch** around entire handler logic
2. **Console error logging** for debugging
3. **404 response** on any error (no error details exposed to client)
4. **No error propagation** to Hono framework

Errors can occur at:
- Formula evaluation (malformed formula)
- URL validation (invalid URL string)
- Fetch (network error, DNS failure, timeout)
- Response streaming (connection dropped)

---

## 9. External Dependencies

| Dependency | Usage |
|------------|-------|
| Hono framework | HTTP routing, context variables, response helpers |
| `applyFormula()` | Evaluate configuration formulas to URL strings |
| `validateUrl()` | URL validation and normalization |
| `isDefined()` | Null/undefined type guard |
| Native `fetch()` | Retrieve external resources |
| `loadJsFile()` | Load project and route configuration from filesystem |
| Speculation Rules API | Browser-native prerendering (no runtime dependency) |

---

## 10. Business Rules

1. **Sitemap limits to 1000 pages** — prevents oversized sitemaps for large projects
2. **Sitemap excludes dynamic routes** — only fully static paths are included (no `:param` segments)
3. **Robots.txt always references /sitemap.xml** — regardless of whether a custom sitemap is configured
4. **Internal paths are always blocked** — `/_toddle`, `/.toddle`, `/.nordcraft`, `/_api` blocked in default robots.txt
5. **Cloudflare image delivery is allowed** — exception to the `/cdn-cgi/` block
6. **Service workers have no cache** — intentional for SW update lifecycle compliance
7. **Manifest and service worker require explicit configuration** — no sensible defaults can be generated
8. **Favicon supports relative paths** — resolved against request origin
9. **Speculation rules are not configurable** — hardcoded eager/moderate prerender rules applied to all pages
10. **All formulas evaluated without context** — configuration URLs must be static values, not data-dependent expressions

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
