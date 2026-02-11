# Backend Middleware System Specification

## Purpose

The Backend Middleware System provides the infrastructure that loads and caches project data for all request handlers. It consists of four specialized middleware components built on Hono that prepare context variables (routes, project config) consumed by route handlers, page renderers, and resource endpoints. Different entry points (Cloudflare Workers, Bun, Node.js, Preview) compose these middleware with platform-specific handlers.

### Jobs to Be Done

- Load compiled project configuration (`project.js`) and make it available to all handlers
- Load route definitions (`routes.js`) and make them available for URL matching
- Cache loaded files to avoid redundant disk I/O and compilation overhead
- Render custom 404 pages when no route matches, with graceful fallback
- Support four deployment targets with a unified middleware composition pattern
- Provide platform-specific file loading strategies (disk vs Durable Objects)

---

## Middleware Components

### 1. jsLoader — File Import & Caching Utility

**Not middleware itself** — a shared utility used by middleware and entry points.

#### Behavior

- Maintains an in-memory `Map<string, any>` cache that persists for the process lifetime
- Converts file paths to lowercase before importing (case normalization)
- On successful import, caches the default export
- On import failure, caches `undefined` to prevent repeated failed attempts
- Logs errors to console with file path and error message

#### Function Signature

```
loadJsFile<T>(path: string): Promise<T | undefined>
```

#### Caching Strategy

| Scenario | Cache Entry | Subsequent Calls |
|----------|-------------|-----------------|
| Successful import | Stores parsed default export | Returns cached value immediately |
| Failed import | Stores `undefined` | Returns `undefined` (no retry) |
| Not yet loaded | No entry | Triggers `import()` call |

**Cache eviction:** None. Cache persists for process lifetime. Server restart required to reload files.

---

### 2. projectInfo — Project Configuration Loader

#### Context Variables Set

| Variable | Type | Description |
|----------|------|-------------|
| `project` | `ToddleProject` | Contains sitemap, robots, icon metadata |
| `config` | `ProjectFiles['config']` | Project-level configuration (meta tags, manifest, etc.) |

#### Behavior

1. Start performance timer (`projectInfo` timing key)
2. Call `loadJsFile<HonoProject>('./project.js')`
3. End performance timer
4. If undefined → return `404 "Project configuration not found"`
5. Set `project` and `config` on Hono context
6. Call `next()` to proceed to downstream middleware

#### Error Handling

- Returns HTTP 404 text response if `project.js` cannot be loaded
- Stops middleware chain (no downstream handlers execute)

#### Dependencies

- Must run after `timing` middleware (uses `startTime`/`endTime`)

---

### 3. routesLoader — Route Definitions Loader

#### Context Variables Set

| Variable | Type | Description |
|----------|------|-------------|
| `routes` | `Routes` | Contains `pages` and `routes` mappings |

#### Routes Type

```
interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, Route>
}
```

#### Behavior

1. Check module-level singleton variable
2. If not yet loaded → call `loadJsFile<Routes>('./routes.js')`
3. If undefined → return `404 "Route declarations for project not found"`
4. Store in module-level singleton (never reloaded)
5. Set `routes` on Hono context
6. Call `next()` to proceed

#### Caching Strategy

Uses a module-level singleton variable (separate from jsLoader's Map cache). Loaded once on first request; all subsequent requests reuse the same object. No time-based expiration.

#### Error Handling

- Returns HTTP 404 text response on first failed load
- Stops middleware chain

---

### 4. notFoundLoader — 404 Page Handler

Registered as Hono's `notFound` handler (final fallback).

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageLoader` | `PageLoader` | Platform-specific function to load component files |
| `options` | `PageLoaderUrls` | URL generators for stylesheets and custom code |

#### Behavior

1. Call `pageLoader({ name: '404' })` to load the 404 component
2. Extract the `'404'` component from loaded files
3. Validate with `isPageComponent()` check
4. If valid → render full SSR page with status 404 via `nordcraftPage()`
5. If invalid or missing → return plain text `"Not Found"` with status 404

#### Context Variables Consumed

- `ctx.var.project` (set by projectInfo)
- `ctx.var.routes` (set by routesLoader, used internally by pageLoader)

---

## Middleware Chain Ordering

The middleware chain is composed in `getApp()` and ordering is critical because downstream handlers depend on context variables set by upstream middleware.

| Order | Component | Type | Context Requires | Context Sets |
|-------|-----------|------|-----------------|--------------|
| 1 | timing | Middleware | — | Performance tracking |
| 2 | earlyMiddleware | Middleware[] | — | — |
| 3 | poweredBy | Middleware | — | `X-Powered-By` header |
| 4 | staticRouter | Middleware (optional) | — | — |
| 5 | Font Router | Route | — | — |
| 6 | API Proxy | Route | — | — |
| 7 | Cookie Handler | Route | — | — |
| 8 | **fileLoaders** | **Middleware[]** | — | **routes, project, config** |
| 9 | Custom Element | Route | routes, project | — |
| 10 | Stylesheet (preview) | Route (optional) | files | — |
| 11 | Custom Code (preview) | Route (optional) | files | — |
| 12 | routeHandler | Handler | routes, project | — |
| 13 | Resource Handlers | Routes | routes, config | — |
| 14 | pageHandler | Handler | routes, project | — |
| 15 | notFoundLoader | NotFound | routes, project | — |

### Critical Ordering Constraint

**fileLoaders (step 8) must run before all handlers that access `ctx.var.routes`, `ctx.var.project`, or `ctx.var.config`.**

Steps 5–7 (fonts, API proxy, cookies) run before fileLoaders because they don't need project data, which avoids unnecessary file loading for these dedicated endpoints.

---

## Entry Point Configurations

### getApp() Factory

All entry points call `getApp()` with platform-specific options:

```
interface AppOptions {
  getConnInfo: (c: Context) => ConnInfo
  fileLoaders: MiddlewareHandler[]
  pageLoader: {
    loader: PageLoader
    urls: PageLoaderUrls
  }
  staticRouter?: { path: string; handler: MiddlewareHandler }
  earlyMiddleware?: MiddlewareHandler[]
  stylesheetRouter?: { path: string; handler: Handler }
  customCodeRouter?: { path: string; handler: Handler }
}
```

### Platform Comparison

| Feature | Cloudflare Workers | Bun | Node.js | Preview |
|---------|-------------------|-----|---------|---------|
| **Static files** | Cloudflare CDN | `serveStatic({ root: './assets' })` | `serveStatic({ root: './assets' })` | None (in-memory) |
| **Compression** | Cloudflare edge | `compress()` middleware | `compress()` middleware | Cloudflare edge |
| **File loading** | `loadJsFile` from disk | `loadJsFile` from disk | `loadJsFile` from disk | Durable Objects |
| **Timing on pageLoad** | Yes (explicit) | No (uses global) | No (uses global) | No |
| **Asset URLs** | `/_static/{name}.css` | `/_static/{name}.css` | `/_static/{name}.css` | `/.toddle/stylesheet/{name}.css` |
| **Custom code URLs** | `/_static/cc_{name}.js` | `/_static/cc_{name}.js` | `/_static/cc_{name}.js` | `/.toddle/custom-code/{name}.js` |
| **Extra context vars** | — | — | — | `files` |
| **Server startup** | Worker handler export | Bun built-in | `serve(app)` | Durable Object binding |

### Cloudflare Workers Entry

- No static file serving (relies on Cloudflare Workers Assets)
- No compression middleware (handled by Cloudflare at edge)
- PageLoader includes per-page performance timing
- Uses `getConnInfo` from `hono/cloudflare-workers`

### Bun Runtime Entry

- Static files served from `./assets` directory via Hono's Bun `serveStatic`
- Compression middleware enabled (`compress()`)
- Simpler pageLoader without timing tracking

### Node.js Runtime Entry

- Nearly identical to Bun
- Uses `@hono/node-server` packages
- Explicitly starts HTTP server with `serve(app)`

### Preview Mode Entry (Cloudflare Durable Objects)

The most complex entry point. Loads project data from Cloudflare Durable Objects instead of compiled files.

#### Custom File Loader Middleware

1. Read `PROJECT_SHORT_ID` and `BRANCH_NAME` from Cloudflare environment bindings
2. If missing → return `400 "Project short ID and branch name are required"`
3. Call `loadProject()` to fetch data from Durable Objects
4. Set `routes`, `project`, `config`, and `files` on context
5. If error → return `500 "Error loading project: {error}"`

#### Durable Objects Integration

- Uses `BRANCH_STATE.idFromName('/projects/{shortId}/branch/{branchName}')` to locate branch state
- Calls `branchState.getFiles(projectShortId, branchName)` to retrieve project data
- Splits retrieved data into routes, project metadata, and component files

#### Preview Cache Strategy

| Property | Value |
|----------|-------|
| Cache type | Module-level promise with timestamp |
| TTL | 10 seconds |
| Invalidation | Time-based (automatic) |
| Deduplication | Promise-based (concurrent requests share same load) |

The 10-second cache balances responsiveness (preview changes propagate quickly) with performance (avoids hitting Durable Objects on every request).

#### Extra Route Handlers

Preview mode adds two dynamic handlers:
- **Stylesheet handler** (`/.toddle/stylesheet/:pageName{.+.css}`) — generates CSS from in-memory files
- **Custom code handler** (`/.toddle/custom-code/:pageName{.+.js}`) — generates JS from in-memory files

---

## Context Variable Consumption

### Where Context Variables Are Used

| Handler | `routes` | `project` | `config` | `files` |
|---------|----------|-----------|----------|---------|
| routeHandler | `routes.routes` for matching | — | — | — |
| pageHandler | `routes.pages` for matching | Passed to `nordcraftPage()` | — | — |
| sitemap | `routes.pages` for enumeration | — | `config` for sitemap formula | — |
| robots | — | — | `config.meta.robots` | — |
| manifest | — | — | `config.meta.manifest` | — |
| favicon | — | — | `config.meta.icon` | — |
| notFoundLoader | (via pageLoader) | Passed to `nordcraftPage()` | — | — |
| preview.stylesheet | — | — | — | `files` for CSS generation |
| preview.customCode | — | `project` for filtering | — | `files` for JS generation |

---

## Type System

### HonoEnv

Base environment type for all middleware and handlers:

```
interface HonoEnv<T = never> {
  Variables: T
}
```

### HonoProject

```
interface HonoProject {
  project: ToddleProject
  config: ProjectFiles['config']
}
```

### HonoRoutes

```
interface HonoRoutes {
  routes: Routes
}
```

### PreviewHonoEnv

Extends `HonoEnv` with Cloudflare Durable Object bindings:

```
interface PreviewHonoEnv<T = never> extends HonoEnv<T> {
  Bindings: {
    BRANCH_STATE: DurableObjectNamespace<BranchStateObject>
    PROJECT_SHORT_ID: string
    BRANCH_NAME: string
  }
}
```

### PageLoader

```
type PageLoader<T = any> = ({
  name: string
  ctx: Context<HonoEnv<T>>
}) => MaybePromise<ProjectFilesWithCustomCode | undefined>

interface PageLoaderUrls {
  pageStylesheetUrl: (name: string) => string
  customCodeUrl: (name: string) => string
}
```

### Type Composition Pattern

Middleware and handlers declare their context requirements through type intersections:

- **projectInfo** middleware: `createMiddleware<HonoEnv<HonoProject>>`
- **routesLoader** middleware: `createMiddleware<HonoEnv<HonoRoutes>>`
- **routeHandler**: `Handler<HonoEnv<HonoRoutes & HonoProject>>`
- **pageHandler**: `MiddlewareHandler<HonoEnv<HonoRoutes & HonoProject>>`
- **notFoundLoader**: `NotFoundHandler<HonoEnv<HonoRoutes & HonoProject>>`

This ensures handlers only compile when all required context variables are set by upstream middleware.

---

## Error Handling Summary

| Middleware | Error Condition | Response | Chain Continues? |
|-----------|----------------|----------|-----------------|
| jsLoader | `import()` fails | Returns `undefined`, logs error | N/A (utility) |
| projectInfo | `project.js` not found | 404 text | No |
| routesLoader | `routes.js` not found | 404 text | No |
| notFoundLoader | 404 component invalid/missing | 404 text | No (final handler) |
| notFoundLoader | 404 component valid | 404 SSR page | No (final handler) |
| preview middleware | Missing env bindings | 400 text | No |
| preview middleware | Durable Object error | 500 text with error details | No |

---

## Performance Considerations

### Caching Layers

| Layer | Scope | Lifetime | Eviction |
|-------|-------|----------|----------|
| jsLoader Map | All imported files | Process lifetime | None (permanent) |
| routesLoader singleton | `routes.js` only | Process lifetime | None (permanent) |
| Preview project cache | Durable Object data | 10 seconds | Time-based |

### Performance Tracking

All middleware use Hono's `timing` middleware for server-timing headers:

| Timing Key | Measured By |
|------------|-------------|
| `projectInfo` | projectInfo middleware |
| `pageLoader:{name}` | Cloudflare entry point (per-page loading) |
| `apiProxyFetch` | API proxy handler |

---

## Edge Cases

- **First request cold start:** All caches are empty. `loadJsFile` performs actual `import()` calls. Subsequent requests are fast.
- **Failed file import cached as `undefined`:** If a file fails to import once (e.g., syntax error in compiled JS), it will never be retried without a server restart. This is intentional to prevent repeated expensive failures.
- **Preview concurrent requests:** The promise-based cache in preview mode ensures concurrent requests during a cache miss share a single Durable Object fetch, preventing thundering herd.
- **Missing 404 component:** The system gracefully falls back to plain text "Not Found" if no custom 404 page is defined.
- **Routes loaded before project:** The `fileLoaders` array order determines load sequence. Both run before any handler that needs them, but they execute sequentially within the middleware chain.
