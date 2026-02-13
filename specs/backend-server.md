# Backend Server Specification

## Purpose

The Backend Server is a Hono-based HTTP server that serves Layr applications. It handles SSR page rendering, API proxying, font proxying, route matching (redirects/rewrites), custom element exports, resource endpoints, and deploys to Cloudflare Workers, Node.js, Bun, and Docker.

### Jobs to Be Done

- Serve SSR-rendered pages with full hydration support
- Proxy API requests through the backend for cookie injection and CORS bypass
- Proxy Google Fonts for privacy and caching
- Handle custom route redirects and rewrites
- Export components as Web Component JavaScript modules
- Serve resource endpoints (sitemap, robots, manifest, favicon, service worker)
- Support multiple deployment targets with a single codebase

---

## Application Architecture

### Framework

Hono — lightweight web framework with middleware support.

### Middleware Chain (Execution Order)

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | Timing | Tracks request duration via `startTime`/`endTime` |
| 2 | Compression | gzip/deflate (Node.js and Bun only) |
| 3 | Powered-By | Sets `X-Powered-By: Layr` header |
| 4 | Static Router | Serves `/_static/*` files (Node.js and Bun only) |
| 5 | Font Router | Proxies Google Fonts |
| 6 | API Proxy | Proxies API requests |
| 7 | Cookie Handler | Sets secure cookies |
| 8 | File Loaders | Loads routes and project info from compiled JS |
| 9 | Custom Element | Exports Web Component JS modules |
| 10 | Route Handler | Processes redirects and rewrites |
| 11 | Resource Handlers | Sitemap, robots.txt, manifest, favicon, service worker |
| 12 | Page Handler | SSR renders matched pages |
| 13 | Not Found | Renders 404 page component or plain text |

---

## Route Reference

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET/ALL | `/.toddle/fonts/stylesheet/:stylesheet{.*}` | Font Router | Proxy Google Fonts stylesheets |
| GET | `/.toddle/fonts/font/:font{.*}` | Font Router | Proxy Google Font files |
| ALL | `/.toddle/omvej/components/:componentName/apis/:apiName` | API Proxy | Proxy API requests with cookie injection |
| GET | `/.layr/cookies/set-cookie` | Cookie Handler | Set HttpOnly cookies |
| GET | `/.toddle/custom-element/:filename{.+.js}` | Custom Element | Export Web Component module |
| GET | `/.toddle/stylesheet/:pageName{.+.css}` | Stylesheet (preview) | Component stylesheet |
| GET | `/.toddle/custom-code/:pageName{.+.js}` | Custom Code (preview) | Component custom code |
| ALL | `/*` | Route Handler | Route redirects/rewrites |
| GET | `/sitemap.xml` | Sitemap | XML sitemap |
| GET | `/robots.txt` | Robots | Robots.txt |
| GET | `/manifest.json` | Manifest | Web app manifest |
| GET | `/favicon.ico` | Favicon | Favicon |
| GET | `/serviceWorker.js` | Service Worker | Service worker script |
| GET | `/*` | Page Handler | SSR page rendering |
| ALL | `*` | Not Found | 404 page |

---

## Font Proxy

### Stylesheet Proxy

`GET /.toddle/fonts/stylesheet/:stylesheet{.*}`

1. Fetch from `https://fonts.googleapis.com/${stylesheet}${search}`
2. Rewrite `fonts.gstatic.com` URLs to `/.toddle/fonts/font` in response body
3. Forward whitelisted headers: Content-Type, Cache-Control, Expires, Accept-Ranges, Date, Last-Modified, ETag
4. CORS enabled for custom element usage

### Font File Proxy

`GET /.toddle/fonts/font/:font{.*}`

1. Fetch from `https://fonts.gstatic.com/${font}`
2. Forward whitelisted headers
3. Stream font file body

### Request Forwarding

Forward only safe headers: Accept, Accept-Encoding, Accept-Language, Referer, User-Agent.

---

## API Proxy

### Route

`ALL /.toddle/omvej/components/:componentName/apis/:apiName`

### Flow

1. Extract destination URL from `x-layr-url` header
2. Apply cookie templates (`{{ cookies.<name> }}`) to URL
3. Validate URL — return 400 if invalid
4. Sanitize headers: Remove cookie, hop-by-hop, Layr-specific headers
5. Set `accept-encoding: gzip, deflate`
6. If `x-layr-templates-in-body` header set:
   - Apply cookie templates to request body
   - Special handling for `application/x-www-form-urlencoded` (template each value)
7. Execute fetch with 5-second timeout
8. Set `X-Forwarded-For` header with client IP (IPv6 prefix removed)
9. Stream response body, filter headers, set `Vary` header

### Error Responses

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid URL | 400 | `{ error: "The provided URL is invalid: ..." }` |
| Invalid headers | 400 | `{ error: "Proxy validation failed: ..." }` |
| Timeout | 504 | Error message |
| Other fetch error | 500 | Error message |

---

## Cookie Handler

### Route

`GET /.layr/cookies/set-cookie`

### Parameters (Query)

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Cookie name |
| `value` | string | Cookie value |
| `sameSite` | `'Lax' \| 'Strict' \| 'None'` | SameSite attribute |
| `path` | string | Cookie path |
| `ttl` | number? | Time-to-live in seconds |
| `includeSubdomains` | boolean? | Include Domain attribute |

### Behavior

1. Validate all parameters
2. Determine expiration: From `ttl` or from JWT payload `exp` field
3. Build `Set-Cookie` header with: Secure, HttpOnly, SameSite, Path, Expires, Domain

---

## Custom Element Export

### Route

`GET /.toddle/custom-element/:filename{.+.js}`

### Behavior

1. Extract component name from filename
2. Load component files
3. Reject page components (only regular components allowed)
4. Collect included components and themes
5. Generate font stylesheet URL and custom code params
6. Generate JavaScript module containing:
   - JSDoc comment with attributes and events
   - Imports from runtime (`defineComponents`, `loadCorePlugins`)
   - Conditional custom code import
   - Font stylesheet injection into document head
   - Global `toddle` object with formula/action registries
   - Core plugin loading and custom code initialization
   - Custom element definition with component data

### Response Headers

- `Cache-Control: no-cache`
- `Access-Control-Allow-Origin: *`
- `Content-Type: text/javascript`

---

## Route Handler

### Route

`ALL /*`

### Flow

1. Match URL against custom routes via `matchRouteForUrl()`
2. Evaluate destination URL formula
3. **Redirect:** Return HTTP redirect with configured status code (405 for non-GET)
4. **Rewrite:**
   - Check for recursive rewrite (`x-layr-rewrite` header)
   - Sanitize headers, set `Accept: */*` and `Accept-Encoding: gzip, deflate`
   - Mark request with `x-layr-rewrite` header
   - Fetch destination URL
   - Stream response body, copy headers (excluding hop-by-hop and content-encoding)

### Safety Checks

| Scenario | Prevention |
|----------|------------|
| Non-GET redirect | Return 405 Method Not Allowed |
| Recursive rewrite | Check `x-layr-rewrite` header, return 500 |
| Localhost request | Remove `cf-connecting-ip` and `host` headers |
| Non-body status codes | Skip body for 101, 204, 205, 304 |

---

## Page Handler

### Route

`GET /*`

### Flow

1. Match URL against page components via `matchPageForUrl()`
2. Load page content (compiled JS)
3. Validate component exists
4. Render Layr page via full SSR pipeline
5. Return HTML with 404 status if page name is `'404'`

---

## Resource Endpoints

### Sitemap (`/sitemap.xml`)

1. If custom sitemap URL formula defined: Fetch and return
2. Otherwise: Generate from static routes
   - Filter to static-only routes (no dynamic segments)
   - Limit to 1000 pages
   - Sort by path length
   - Generate XML `<url>` entries
3. Cache: `public, max-age=3600`

### Robots.txt (`/robots.txt`)

1. If custom robots URL formula defined: Fetch and return
2. Otherwise: Generate with sitemap reference and `Disallow: /_toddle`
3. Cache: `public, max-age=3600`

### Manifest (`/manifest.json`)

1. Fetch from manifest URL formula
2. Stream response
3. Cache: `public, max-age=3600`
4. Return 404 if no manifest

### Favicon (`/favicon.ico`)

1. Evaluate icon formula
2. Validate URL
3. Fetch and stream with original content-type
4. Cache: `public, max-age=3600`
5. Return 404 with `image/x-icon` if no icon

### Service Worker (`/serviceWorker.js`)

1. Fetch from service worker URL formula
2. Stream with `Content-Type: text/javascript`
3. Return 404 if not defined

---

## File Loading

### Build-Time Asset Synchronization

`syncStaticAssets.ts` generates deployment artifacts:

1. Clean and create `dist/` directory
2. Copy runtime files: `page.main.esm.js`, `custom-element.main.esm.js`, `reset.css`
3. Load `project.json` and split into routes/files
4. Generate CSS file for each component in `_static/`
5. Generate custom code JS for each component (`cc_${name}.js`)
6. Write JS modules: `project.js`, `routes.js`, `components/${name}.js`

### Runtime File Loading

`loadJsFile()` — In-memory cached dynamic import:

1. Check `Map<string, any>` cache
2. If cached: Return immediately
3. If not: `import(path.toLowerCase())` → cache default export
4. On error: Cache `undefined` to prevent retries

### File Types

| File | Content | Loaded By |
|------|---------|-----------|
| `project.js` | Project metadata and config | `loadProjectInfo` middleware |
| `routes.js` | Page and custom route declarations | `loadRoutes` middleware |
| `components/${name}.js` | Component definitions | `pageLoader` |

---

## Deployment Targets

### Cloudflare Workers

- Entry: `dist/index.js`
- Static files: Assets binding (`./dist/assets`)
- No compression middleware (handled by Cloudflare)
- No static file middleware (handled by Assets)
- ESModule rules for `.js` files

### Node.js

- Entry: `src/node.index.ts` (compiled by esbuild)
- Compression middleware enabled
- Static file middleware serves from `./assets`
- `serve(app)` starts HTTP server

### Bun

- Entry: `src/bun.index.ts` (or compiled standalone executable)
- Compression middleware enabled
- Static file middleware serves from `./assets`
- App exported as default

### Docker

- **Build:** `oven/bun:1.3.3-debian` — compiles standalone executable with `bun build --compile --minify --sourcemap`
- **Runtime:** `gcr.io/distroless/base-debian12` (minimal image)
- Port: `APP_PORT` env var (default: 3000)
- `NODE_ENV=production`

### Preview Mode

- Entry: `src/preview.index.ts`
- Project loaded from Durable Object with 10-second cache
- Additional routes: stylesheet and custom code endpoints
- Files loaded from DO, not from disk

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Server port (Docker/Bun/Node) | 3000 |
| `PORT` | Alternative port variable | — |
| `NODE_ENV` | Environment mode | — |
| `PROJECT_SHORT_ID` | Preview mode project ID | — |
| `BRANCH_NAME` | Preview mode branch name | — |

---

## Static Assets

| Path | Content |
|------|---------|
| `/_static/page.main.esm.js` | Client-side page hydration runtime |
| `/_static/custom-element.main.esm.js` | Custom element runtime |
| `/_static/reset.css` | CSS reset styles |
| `/_static/${name}.css` | Component stylesheets |
| `/_static/cc_${name}.js` | Component custom code |

---

## Header Management

### Hop-By-Hop Headers (Always Removed)

`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`

### Layr Custom Headers

| Header | Purpose |
|--------|---------|
| `x-layr-url` | Proxy: destination URL |
| `x-layr-templates-in-body` | Proxy: enable body template injection |
| `x-layr-rewrite` | Rewrite: prevent recursive rewrites |
| `x-layr-redirect-name` | Redirect: route name tracking |
| `x-layr-redirect-api-name` | Redirect: API name tracking |
| `x-layr-redirect-component-name` | Redirect: component name tracking |

---

## Edge Cases

- **No 404 component:** Returns plain text "Not Found"
- **Invalid destination URL:** Returns 500 "Invalid destination"
- **Non-GET redirect:** Returns 405 "Method Not Allowed"
- **Rewrite fetch failure:** Returns 500 with error message
- **Recursive rewrite:** Returns 500 with explicit error message
- **Localhost requests:** Remove `cf-connecting-ip` and `host` headers
- **Custom sitemap overflow:** Limited to 1000 static routes
- **File load failure:** Cached as `undefined` to prevent retry storms
- **API proxy timeout:** 5-second timeout returns 504

---

## System Limits

### Request Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxRequestSize` | 10 MB | Maximum request body size |
| `maxHeaderSize` | 16 KB | Maximum header size |
| `maxUrlLength` | 8,192 | Maximum URL length |
| `maxConcurrentRequests` | 100 | Maximum concurrent requests |

### Response Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxResponseSize` | 50 MB | Maximum response body size |
| `maxSsrTimeout` | 10,000ms | Maximum SSR render time |
| `maxProxyTimeout` | 30,000ms | Maximum proxy request time |

### Cache Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxProjectCacheSize` | 100 | Projects in memory cache |
| `maxProjectCacheTtl` | 10,000ms | Project cache TTL |
| `maxFileCacheSize` | 1,000 | Files in memory cache |

### Enforcement

- **Request size:** 413 Payload Too Large
- **SSR timeout:** 504 Gateway Timeout with error page
- **Concurrent requests:** 429 Too Many Requests

---

## Invariants

### Request Invariants

1. **I-SRV-METHOD-VALID:** HTTP method MUST be supported (GET, POST, etc.).
2. **I-SRV-URL-VALID:** URL MUST be parseable.
3. **I-SRV-HEADERS-SAFE:** Headers MUST NOT contain CRLF injection.

### Response Invariants

4. **I-SRV-STATUS-VALID:** Response status MUST be valid HTTP status.
5. **I-SRV-CONTENT-TYPE:** Response MUST have appropriate Content-Type.
6. **I-SRV-CORS-HEADERS:** CORS headers MUST be set for cross-origin requests.

### Proxy Invariants

7. **I-SRV-PROXY-URL-ABSOLUTE:** Proxy destination MUST be absolute URL.
8. **I-SRV-PROXY-NO-RECURSION:** Rewrites MUST NOT create infinite loops.
9. **I-SRV-PROXY-HEADERS-SANITIZED:** Proxy headers MUST be sanitized.

### Cache Invariants

10. **I-SRV-CACHE-TTL-POSITIVE:** Cache TTL MUST be positive.
11. **I-SRV-CACHE-KEY-DETERMINISTIC:** Same inputs MUST produce same cache key.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-SRV-URL-VALID | Request parsing | 400 Bad Request |
| I-SRV-PROXY-NO-RECURSION | Loop detection | 500 Internal Server Error |
| I-SRV-CACHE-TTL-POSITIVE | Config validation | Use default TTL |

---

## Error Handling

### Error Types

| Error Type | When | Response |
|------------|------|----------|
| `BadRequestError` | Invalid request | 400 Bad Request |
| `NotFoundError` | Route/component missing | 404 Not Found |
| `ServerError` | Internal error | 500 Internal Server Error |
| `TimeoutError` | SSR/proxy timeout | 504 Gateway Timeout |
| `RateLimitError` | Too many requests | 429 Too Many Requests |

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    type: string;
    message: string;
    requestId?: string;
  }
}
```

### Graceful Degradation

When SSR fails:
1. Log error with request context
2. Return static error page (pre-rendered)
3. Include Retry-After header if transient

---

## Health Monitoring

### Health Check Endpoints

| Path | Purpose |
|------|---------|
| `/health` | Basic liveness check |
| `/health/ready` | Readiness check (DB connected) |
| `/health/live` | Liveness with dependencies |

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `request_count` | Counter | Total requests |
| `request_duration` | Histogram | Request latency |
| `error_rate` | Gauge | Error percentage |
| `cache_hit_rate` | Gauge | Cache effectiveness |

---

## Changelog

### Unreleased
- Added System Limits section with request, response, and cache limits
- Added Invariants section with 11 request, response, proxy, and cache invariants
- Added Error Handling section with error types and graceful degradation
- Added Health Monitoring section with health checks and metrics
