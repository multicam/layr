# API Service Management Specification

## Purpose

The API Service Management system provides a two-tier abstraction for API configuration: reusable service definitions (`ApiService`) that capture base URLs, API keys, and provider-specific settings, and component-level API requests (`ApiRequest`) that reference these services. Wrapper classes expose generator-based formula traversal for linting, tree-shaking, and dependency analysis. Services integrate with the proxy system for secure server-side credential injection and the SSR pipeline for autofetch during rendering.

### Jobs to Be Done

- Define reusable service configurations with formula-based URLs and API keys
- Support provider-specific service types (Supabase, Xano, Custom)
- Enable generator-based formula traversal for linting and dependency analysis
- Proxy client-side API requests through the backend for secure cookie injection
- Evaluate API autofetch during SSR with dependency ordering
- Strip editor-only service metadata before runtime deployment

---

## Service Configuration

### ApiService Type

```
BaseApiService = {
  name: string
  baseUrl?: Formula        // Dynamic base URL
  docsUrl?: Formula        // Documentation URL (editor-only)
  apiKey?: Formula         // API key (sensitive, formula-based)
  meta?: Record<string, unknown>
}

SupabaseApiService extends BaseApiService {
  type: 'supabase'
  meta?: { projectUrl?: Formula }
}

XanoApiService extends BaseApiService {
  type: 'xano'
}

CustomApiService extends BaseApiService {
  type: 'custom'
}

ApiService = SupabaseApiService | XanoApiService | CustomApiService
```

All configuration fields accept `Formula` types for dynamic evaluation. Services are stored in `ProjectFiles.services: Record<string, ApiService>`.

### Service Reference in API Requests

Component APIs reference services via two editor-only fields:
- `service: string` — Name of the service in `ProjectFiles.services`
- `servicePath: string` — File path to service definition

These fields are **removed before runtime** by `removeTestData()`. The `ApiRequest.url` formula already contains the fully-resolved service base URL merged during editing. Services exist for authoring convenience, not runtime dependency injection.

---

## ToddleApiService Wrapper

### Constructor

```
ToddleApiService({ service: ApiService, globalFormulas: GlobalFormulas })
```

### formulasInService() Generator

Yields every formula in the service configuration with path annotations:

1. Traverse `service.baseUrl` → path `['baseUrl']`
2. Traverse `service.docsUrl` → path `['docsUrl']`
3. Traverse `service.apiKey` → path `['apiKey']`
4. If `type === 'supabase'`: traverse `service.meta.projectUrl` → path `['meta', 'projectUrl']`

Uses `getFormulasInFormula()` from the core formula utilities for recursive AST traversal with cycle prevention.

### Getters

Direct property proxies: `name`, `baseUrl`, `docsUrl`, `apiKey`, `meta`.

---

## ToddleRoute Wrapper

### Route Types

```
BaseRoute = {
  source: RouteDeclaration      // URL pattern to match
  destination: ApiBase           // Target URL with formula-based construction
  enabled?: { formula: Formula } // Conditional enablement
}

RewriteRoute extends BaseRoute { type: 'rewrite' }
RedirectRoute extends BaseRoute { type: 'redirect', status?: RedirectStatusCode }

Route = RewriteRoute | RedirectRoute
```

### formulasInRoute() Generator

Yields formulas from route destination configuration:

1. `destination.url` → path `['destination', 'url']`
2. Each `destination.path[key].formula` → path `['destination', 'path', key, 'formula']`
3. Each `destination.queryParams[key].formula` → path `['destination', 'queryParams', key, 'formula']`
4. Each `destination.queryParams[key].enabled` → path `['destination', 'queryParams', key, 'enabled']`

---

## Proxy Architecture

### Client-Side Flow

1. Evaluate `api.server.proxy.enabled.formula`
2. If truthy, construct proxy URL: `/.toddle/omvej/components/{componentName}/apis/{apiName}`
3. Set `x-layr-url` header with the actual target URL
4. If `useTemplatesInBody` formula is truthy, set `x-layr-templates-in-body` header
5. POST to proxy URL instead of target

### Server-Side Flow

1. Extract cookies from request
2. Read target URL from `x-layr-url` header
3. Apply template replacement: `{{ cookies.name }}` → actual cookie value
4. Sanitize headers (strip hop-by-hop, Layr-specific, and cookie headers)
5. If `x-layr-templates-in-body` set, replace templates in request body
6. Forward request to resolved URL
7. Stream response back to client

### Template Replacement

Regex-based extraction (`/{{ cookies\.(.+?) }}/gm`) prevents injection attacks. Missing cookies resolve to empty string to avoid leaking template syntax to external APIs.

---

## SSR API Evaluation

### Dependency Ordering

`ToddleApiV2.apiReferences` scans all formulas for `Apis.*` path references. `sortApiEntries()` uses these references to order APIs:

1. APIs with no dependencies → executed in parallel via `Promise.all()`
2. APIs with dependencies → executed sequentially, updating formula context after each fetch

### SSR Enable Logic

An API is fetched during SSR when ALL conditions are met:
- `autoFetch` formula evaluates to truthy
- `server.ssr.enabled` formula evaluates to truthy

### Cache Deduplication

Hash-based caching (`requestHash()` using cyrb53) prevents duplicate requests within a single page render. Cache key includes URL, method, headers (excluding `host`/`cookie`), and body.

---

## Search System Integration

The search/linting system treats services and routes as first-class traversable entities:

1. Iterate `files.services` → wrap each in `ToddleApiService`
2. Call `formulasInService()` → yield each formula as a `formula` node type
3. Apply linting rules to extracted formulas
4. Same pattern for routes via `ToddleRoute.formulasInRoute()`

This enables rules like `unknownApiServiceRule` to validate service references across the project.

---

## Generator-Based Traversal Pattern

All wrapper classes share the same architectural pattern:

```
class ToddleWrapper<Handler> {
  private rawData: DataType
  private globalFormulas: GlobalFormulas<Handler>

  *formulasIn*(): Generator<{ path, formula, packageName? }>
    // Yields path-annotated formulas using getFormulasInFormula()

  get field() → rawData.field
    // Direct property proxies
}
```

- Private storage of raw data + global formula context
- Public generator yields path-annotated formulas for analysis
- Getter proxies for direct field access
- Generic `Handler` parameter: `string` on server (source code), `Function` on client

---

## Edge Cases

- **Service fields stripped at build time:** `service` and `servicePath` removed from `ApiRequest` by `removeTestData()` — runtime never sees service references
- **Missing cookie in template:** Resolves to empty string, not `undefined` — prevents leaking `{{ cookies.name }}` syntax to external APIs
- **Same-origin rewrite blocked:** Rewrite destinations must be external to prevent recursive request handling
- **API dependency cycles:** Not explicitly detected — if API A depends on API B and vice versa, behavior is undefined (sequential ordering may fail)
- **Supabase-specific traversal:** Only `supabase` type services have `meta.projectUrl` traversed; other providers skip provider-specific fields
- **Formula evaluation errors in routes:** Silently caught — route treated as non-matching rather than error

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxCount` | 1,000 | Maximum items processed |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Count limit:** Stop processing

---

## Invariants

1. **I-OP-VALID:** Operations MUST be valid.
2. **I-OP-SAFE:** Operations MUST be safe.
3. **I-OP-DETERMINISTIC:** Results MUST be deterministic.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-VALID | Build | Error: validation |
| I-OP-SAFE | Runtime | Reject operation |
| I-OP-DETERMINISTIC | Testing | CI failure |

---

## Error Handling

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
