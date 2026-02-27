# Backend Server

Hono-based HTTP server that loads `project.json` files from `/projects/`, SSR-renders pages, proxies APIs and fonts, manages HttpOnly cookies, and handles Cloudflare image CDN transformations.

**Implementing packages:** `@layr/backend`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Hono server with CORS, logger, error handler middleware | MVP |
| Project loader from `/projects/{id}/project.json` | MVP |
| Path traversal protection | MVP |
| Page route matching and SSR rendering | MVP |
| Project listing endpoint (`GET /api/projects`) | MVP |
| Static asset serving (`/_static/*`) | MVP |
| Health check endpoint | MVP |
| API proxy with cookie template substitution | MVP |
| Font proxy (Google Fonts) | MVP |
| HttpOnly cookie endpoint (`/.layr/cookies/set-cookie`) | MVP |
| Formula cache (`createFormulaCache`) | MVP |
| BatchQueue for DOM update coalescing | MVP |
| Cloudflare image CDN utilities | MVP |
| Relative `src` path transformation during SSR | MVP |
| `sitemap.xml`, `robots.txt`, `manifest.json` dynamic routes | Phase 2 |
| Cloudflare Workers / Node.js / Docker deployment targets | Phase 2 |
| Preview mode (Durable Objects) | Phase 2 |

---

## Server Architecture

**Framework:** Hono 4.x — lightweight, edge-compatible web framework.

**Entry point:** `packages/backend/src/server.ts`

**Start command:** `bun src/server.ts` (production), `bun --watch src/server.ts` (dev)

**Port:** `process.env.PORT || 3000`

### Middleware Stack

```typescript
const app = new Hono();
app.use('*', cors());          // CORS — all origins, standard methods
// routes below
```

| Order | Middleware/Route | Purpose |
|-------|-----------------|---------|
| 1 | `cors()` | CORS headers on all requests |
| 2 | `GET /health` | Liveness check |
| 3 | `GET /api/projects` | Project listing |
| 4 | `/_static/*` | Static file serving |
| 5 | `GET /:projectId/*` | Page SSR handler |
| 6 | `GET /` | Project index / redirect |

### CORS Middleware

`corsMiddleware()` in `packages/backend/src/middleware/index.ts`:

- Default origin: `*`
- Default methods: `GET, POST, PUT, DELETE, OPTIONS`
- Default headers: `Content-Type, Authorization`
- Preflight (`OPTIONS`): returns `204 No Content`
- Array of origins: sets `Vary: Origin`, reflects matched origin

### Logger Middleware

`loggerMiddleware()` — logs `METHOD PATH STATUS TIMEms` to stdout on each response.

### Error Handler Middleware

`errorHandlerMiddleware()` — wraps next() in try/catch:
- Development (`NODE_ENV !== 'production'`): returns error message
- Production: returns `"Internal Server Error"`
- Response: `{ error: string }` with status 500

### Request ID Middleware

`requestIdMiddleware()` — generates `crypto.randomUUID()`, attaches as `X-Request-ID` header and Hono context variable `requestId`.

---

## Route Reference

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/health` | inline | `{ status: "ok" }` |
| GET | `/api/projects` | `listProjects()` | List all available project IDs |
| ALL | `/_static/*` | `staticMiddleware` | Serve `packages/backend/../../static/` |
| GET | `/:projectId/*` | `handlePage()` | SSR render matched page |
| GET | `/` | inline | Redirect if 1 project; list otherwise |

---

## Project Loader

**Source:** `packages/backend/src/loader/project.ts`

**Projects directory:** `path.join(import.meta.dir, '..', '..', '..', '..', 'projects')` — resolves to monorepo root `/projects/`.

### `loadProject(projectId: string): LoadedProject | null`

```typescript
interface LoadedProject {
  id: string;
  project: Project;  // Parsed project.json
  path: string;      // Absolute filesystem path
}
```

**Algorithm:**
1. Reject if `projectId` contains `/`, `\`, or equals `..` or `.`
2. Build path: `PROJECTS_DIR/{projectId}/project.json`
3. Resolve both `PROJECTS_DIR` and the target path
4. Reject if resolved path does not start with `resolvedProjectsDir + '/'` (defense-in-depth)
5. Return `null` if file does not exist
6. `readFileSync` + `JSON.parse`, return `LoadedProject`
7. On parse error: log and return `null`

**Security:** Two-layer path traversal protection — string check first, then `path.resolve()` comparison.

### `listProjects(): string[]`

Reads `PROJECTS_DIR` with `readdirSync`, filters to entries where `{name}/project.json` exists.

### `getProjectMtime(projectId: string): number`

Returns `stat.mtimeMs` for cache invalidation. Returns `0` on any error or invalid path.

---

## Page Handler

**Source:** `packages/backend/src/routes/page.ts`

### `handlePage(c: Context, projectId: string): Promise<Response>`

1. `loadProject(projectId)` — returns 404 HTML if not found
2. Strip `/{projectId}` prefix from `c.req.path` to get page pathname
3. `matchRoute(project, pathname)` — try all page components with `route` field
4. If no match: try `/404` page component; if none, return plain 404
5. `renderPage(project, pageName, params)` → HTML string → `c.html(html)`

### `matchPath(pattern, pathname)`

Supports:
- Static segments: `/about`
- Named params: `/users/:id`
- Wildcard: `/docs/*` (captures remainder as `params['*']`)

Returns `{ params: Record<string, string | null> }` or `null` on mismatch.

### `renderPage(project, pageName, params)`

1. Look up `project.files.components[pageName]`
2. `renderPageBody(page, { getComponent })` from `@layr/ssr`
3. Wraps body HTML in full `<!DOCTYPE html>` document
4. Embeds `<script type="application/json" id="layr-data">` with project short_id, page name, route params
5. HTML-escapes dynamic values via `escapeHtml()`
6. JSON serializes data and replaces `<` with `\u003c` to prevent script injection

---

## API and Font Proxy

**Source:** `packages/backend/src/proxy/index.ts`

### `createProxy(config: ProxyConfig)`

```typescript
interface ProxyConfig {
  target: string;
  changeOrigin?: boolean;  // default: true
  headers?: Record<string, string>;
  timeout?: number;        // default: 30000ms
}
```

**Algorithm:**
1. Build target URL from `config.target` + request pathname + search
2. Forward safe headers only: `accept`, `accept-language`, `accept-encoding`, `content-type`, `content-length`, `user-agent`, `if-none-match`, `if-modified-since`, `range`
3. Set `Host` header if `changeOrigin: true`
4. `AbortController` with configured timeout
5. On timeout (`AbortError`): return 504 Gateway Timeout
6. On other errors: return 502 Bad Gateway
7. Stream response body with original status and headers

### Font Proxy

| Route | Target |
|-------|--------|
| `/.toddle/fonts/stylesheet/*` | `https://fonts.googleapis.com` |
| `/.toddle/fonts/font/*` | `https://fonts.gstatic.com` |

`fontProxy()` and `fontStaticProxy()` are pre-configured `createProxy()` instances.

---

## Cookie Management

**Source:** `packages/backend/src/cookies/index.ts`

### Cookie Categories

| Category | Set By | JS Accessible | Mechanism |
|----------|--------|---------------|-----------|
| Client cookie | `setCookie` action (client-side) | Yes | `document.cookie` |
| HttpOnly cookie | `setHttpOnlyCookie` action → server endpoint | No | `Set-Cookie: HttpOnly` |

### `/.layr/cookies/set-cookie` Endpoint

The `createCookieHandler()` factory returns a handler for `POST /.layr/cookies/set-cookie`.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | required | Cookie name |
| `value` | string | required | Cookie value |
| `sameSite` | `Lax\|Strict\|None` | `Lax` | SameSite attribute |
| `path` | string | `/` | Cookie path |
| `ttl` | number | — | TTL in seconds |
| `includeSubdomains` | boolean | `true` | Add `Domain` attribute |

**Expiration logic:**
1. `ttl > 0`: `Expires = now + ttl seconds`
2. `ttl === 0`: `Max-Age=0` (deletes cookie)
3. `ttl` not provided: attempt to decode `value` as JWT, use `exp` claim
4. No TTL and not a JWT: session cookie (no expiry)

**Always set:** `Secure`, `HttpOnly`

**Validation errors (400):**
- Name not a non-empty string
- Value not a string
- SameSite not one of `Lax|Strict|None`
- Path not a string or doesn't start with `/`
- TTL is non-numeric

### `decodeToken(token: string)`

JWT payload decoder for extracting `exp` claim:
- Converts Base64url to Base64 (`-` → `+`, `_` → `/`)
- Decodes second segment (payload)
- Returns `{ exp?: number }` or `undefined` on any failure
- Non-throwing

### Cookie Template Substitution

The `{{ cookies.<name> }}` pattern is resolved in the API proxy before forwarding to upstream services.

**`applyTemplateValues(input, cookies)`:**
1. Find all `{{ cookies.<name> }}` occurrences via regex
2. Replace each with the cookie value or empty string if not found
3. Prevents template syntax leaking to external services

**Applied to:**
- Proxy target URL (from `x-layr-url` header)
- Forwarded request headers
- Request body when `x-layr-templates-in-body` header is set

---

## Caching and Performance

**Source:** `packages/backend/src/cache/index.ts`

### JS File Loader Cache

```typescript
const fileCache = new Map<string, unknown>();

async function loadJsFile<T>(path: string): Promise<T | undefined>
```

- **Global singleton:** Module-level `Map`, persists across requests
- **Negative caching:** Failed loads stored as `undefined`, no retries
- **Path normalization:** `path.toLowerCase()` for case-insensitive FS compatibility
- **Dynamic import:** Uses `import()` for ES module loading

```typescript
// Usage
const project = await loadJsFile<HonoProject>('./project.js');
const routes  = await loadJsFile<Routes>('./routes.js');
const page    = await loadJsFile<ProjectFiles>(`./components/${name}.js`);
```

### Formula Cache

`createFormulaCache(formulas?)` — per-component memoization for formulas with `memoize: true`.

```typescript
type FormulaCache = Record<string, FormulaCacheEntry>

interface FormulaCacheEntry {
  get: (data: Record<string, unknown>) => { hit: true; data: unknown } | { hit: false }
  set: (data: Record<string, unknown>, result: unknown) => void
}
```

**Algorithm:**
1. Walk formula AST to extract dependency paths (`PathOperation` where `path[0] !== 'Args'`)
2. Deduplicate paths — remove keys that are prefixes of longer keys
3. Cache hit: all dependency paths compare `===` between current data and cached data
4. Cache miss: store new `cacheInput` (shallow copy) and `cacheData`

### BatchQueue

`BatchQueue` — coalesces multiple DOM update callbacks into a single `requestAnimationFrame`.

```typescript
class BatchQueue {
  add(callback: () => void): void  // Enqueue + schedule RAF
}
```

- Multiple `add()` calls in the same tick schedule a single RAF
- Full queue drain per frame (FIFO, re-entrant safe)
- Falls back to `setTimeout(fn, 0)` if `requestAnimationFrame` is unavailable (SSR environment)

### Cache Control Headers

```typescript
const CachePresets = {
  noCache:   { noCache: true },
  noStore:   { noStore: true },
  oneHour:   { public: true, maxAge: 3600 },
  oneDay:    { public: true, maxAge: 86400 },
  immutable: { public: true, maxAge: 31536000, immutable: true },
}
```

`getCacheControlHeader(options: CacheOptions): string` generates `Cache-Control` header values.

---

## Image CDN (Cloudflare)

**Source:** `packages/backend/src/image/index.ts`

### Cloudflare Image URL Format

```
/cdn-cgi/imagedelivery/{accountHash}/{imageId}/{variant}
```

`isCloudflareImagePath(path)` — type guard, returns `true` for paths starting with `/cdn-cgi/imagedelivery/`.

### Responsive Icon Generation

When `config.meta.icon` is a Cloudflare image:

| Tag | Variant | HTML |
|-----|---------|------|
| 16x16 favicon | `/16` | `<link rel="icon" sizes="16x16" href="{base}/16" />` |
| 32x32 favicon | `/32` | `<link rel="icon" sizes="32x32" href="{base}/32" />` |
| Default shortcut | `/48` | `<link rel="shortcut icon" href="{base}/48" />` |

Non-Cloudflare icon: single `<link rel="icon">` tag, path unchanged.

```typescript
function generateIconUrls(iconPath: string): { icon16, icon32, icon48 } | null
function generateFaviconTags(iconPath: string, origin?: string): string[]
```

### Thumbnail Generation (og:image)

For packages with a `thumbnail` field:

```typescript
function generateThumbnailUrl(
  thumbnailPath: string | null | undefined,
  origin?: string
): string | null
```

- Cloudflare image: replaces last variant segment with `/256`, prepends origin
- Non-Cloudflare: returns path as-is

### Relative `src` Path Transformation (SSR)

`transformRelativePaths(urlOrigin)` — curried transformer applied during SSR to fix image loading.

```typescript
function transformRelativePaths(urlOrigin: string): (component: Component) => Component
```

**Transforms:** `src` attributes that are static (`type: 'value'`) string formulas and do not start with `http` or `data:`.

**Uses:** `new URL(value, urlOrigin).href`

| Attribute | Transformed |
|-----------|-------------|
| `src` static string | Yes |
| `src` dynamic formula | No (runtime evaluation) |
| `href` | No |
| `poster`, `srcset` | No |

### Image Variant Constants

```typescript
const IMAGE_VARIANTS = {
  THUMBNAIL: '256',
  ICON_SMALL: '16',
  ICON_MEDIUM: '32',
  ICON_LARGE: '48',
  SMALL: '320',
  MEDIUM: '640',
  LARGE: '1024',
  PUBLIC: 'public',
}
```

### Robots.txt Rules for Cloudflare

```
Allow: /cdn-cgi/imagedelivery/*
Disallow: /cdn-cgi/
```

---

## Static Assets

**Middleware:** `staticMiddleware` serves from `packages/backend/../../../static/` (monorepo root `static/` directory).

| Path | Content |
|------|---------|
| `/_static/page.main.esm.js` | Client-side page hydration runtime |
| `/_static/custom-element.main.esm.js` | Web Component runtime |
| `/_static/reset.css` | CSS reset styles |
| `/_static/{name}.css` | Per-component stylesheets |
| `/_static/cc_{name}.js` | Per-component custom code |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | — |

---

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Project not found | 404 | HTML error page |
| Page not found | 404 | 404 component HTML or plain HTML |
| Invalid cookie params | 400 | `{ error: "..." }` JSON |
| Proxy timeout (30s) | 504 | `"Gateway Timeout"` |
| Proxy fetch error | 502 | `"Bad Gateway"` |
| Internal error | 500 | `{ error: "Internal Server Error" }` |
| Path traversal attempt | null (404) | `loadProject` returns null |

---

## Deployment [Phase 2]

The following deployment targets are not yet implemented:

- **Cloudflare Workers:** `wrangler.toml`, `dist/index.js`, static assets binding, ES module project data
- **Node.js:** `@hono/node-server`, `hono/node-server/serve-static`
- **Bun standalone:** `bun build --compile --minify --sourcemap`
- **Docker:** multi-stage (`oven/bun:1.3.3-debian` build + `gcr.io/distroless/base-debian12` runtime)
- **Preview mode:** Cloudflare Durable Objects (`BRANCH_STATE`), branch-scoped project data
- **Dynamic resource routes:** `sitemap.xml`, `robots.txt`, `manifest.json`, `favicon.ico`, `serviceWorker.js` with formula evaluation
