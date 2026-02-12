# Deep Review: Group E - API Layer

**Review Date:** 2026-02-12
**Priority:** High
**Complexity:** High
**Specs Reviewed:** API Integration, API Proxy System, API Request Construction, API Service Management, Client API System, Cookie Management

---

## Executive Summary

The API Layer is Layr's data fetching infrastructure with impressive capabilities:

- **Dual pathways** - Client-side proxy and SSR pre-fetching with shared construction logic
- **Streaming support** - SSE, JSON-stream, and text streaming with progressive UI updates
- **Secure cookie injection** - HttpOnly cookies via server-side template substitution
- **Dependency-aware SSR** - Parallel independent APIs, sequential dependent APIs
- **Formula-driven configuration** - Every aspect (URL, headers, debounce, error detection) is dynamic

The system is comprehensive but reveals gaps in retry logic, offline handling, and request deduplication.

**Overall Assessment:** 8.5/10 - Excellent data layer with gaps in resilience patterns.

---

## Gap Analysis

### 1. API Integration (Core)

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No retry mechanism** | High | Failed requests have no automatic retry. User must manually re-trigger. |
| **No offline detection** | High | Network failures not distinguished from API errors. No offline queue. |
| **No request deduplication (client)** | Medium | Same request from multiple components makes multiple network calls. SSR has caching but client doesn't. |
| **Circular dependency detection** | Medium | API A depends on B, B depends on A. Not detected, could cause issues. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| v1 vs v2 feature matrix | Low | Complex migration path not clearly documented. |
| WebSocket support | Low | `type: 'ws'` mentioned in schema but not documented. |
| API versioning | Low | No way to version APIs for backward compatibility. |

#### Recommendations

```markdown
1. Add retry mechanism:
   ```typescript
   interface ApiRetryConfig {
     maxAttempts: number;
     backoff: 'fixed' | 'exponential';
     initialDelay: number;
     maxDelay: number;
     retryOn: (error: unknown, attempt: number) => boolean;
   }
   ```

2. Add offline detection:
   ```typescript
   interface ApiOfflineConfig {
     enabled: boolean;
     queueWhileOffline: boolean;
     onOnline: 'replay' | 'discard';
   }
   
   // In ApiStatus
   isOffline: boolean;
   queuedAt?: number;
   ```

3. Add client-side request deduplication:
   ```typescript
   const pendingRequests = new Map<string, Promise<ApiStatus>>();
   
   function deduplicatedFetch(key: string, fetcher: () => Promise<ApiStatus>) {
     if (pendingRequests.has(key)) {
       return pendingRequests.get(key);
     }
     const promise = fetcher().finally(() => pendingRequests.delete(key));
     pendingRequests.set(key, promise);
     return promise;
   }
   ```

4. Detect circular API dependencies:
   ```typescript
   function detectCycles(apis: Record<string, ApiV2>): string[][] {
     // Use DFS to find cycles
     // Warn if found
   }
   ```
```

---

### 2. API Proxy System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **5-second timeout is hardcoded** | High | No way to configure timeout per-proxy or per-request. |
| **No request queuing** | Medium | Multiple concurrent requests to same API have no throttling. |
| **Proxy health monitoring** | Low | No visibility into proxy performance or failures. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Error response format | Low | Error JSON format documented but could change upstream. |
| Localhost detection | Low | `cf-connecting-ip` removal for localhost is implicit. |

#### Recommendations

```markdown
1. Make timeout configurable:
   ```typescript
   interface ProxyConfig {
     timeout?: number;  // Override default 5000ms
   }
   
   // In API definition
   server: {
     proxy: {
       enabled: { formula: Formula };
       timeout?: { formula: Formula };  // Per-API timeout
     }
   }
   ```

2. Add request throttling:
   ```typescript
   interface ProxyThrottle {
     maxConcurrent: number;
     queueOverflow: 'reject' | 'drop-oldest';
   }
   ```

3. Add proxy metrics:
   ```typescript
   interface ProxyMetrics {
     requestsTotal: number;
     requestsFailed: number;
     averageLatency: number;
     p95Latency: number;
   }
   ```
```

---

### 3. API Request Construction

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No request validation** | Medium | Invalid URLs/headers only fail at fetch time. Could validate earlier. |
| **Body size limit** | Medium | No limit on request body size. Could OOM or hit upstream limits. |
| **Header injection risk** | Medium | User formulas generate headers. Could enable header injection. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| FormData arrays | Low | Arrays in FormData handled differently than URL-encoded. |
| Hash algorithm stability | Low | cyrb53 not cryptographically stable. Could change between versions. |

#### Recommendations

```markdown
1. Add early request validation:
   ```typescript
   interface ValidationResult {
     valid: boolean;
     errors: Array<{ field: string; message: string }>;
   }
   
   function validateApiRequest(api: ApiRequest, context: FormulaContext): ValidationResult;
   ```

2. Add body size limits:
   ```typescript
   const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024;  // 10MB
   
   if (body && body.length > MAX_REQUEST_BODY_SIZE) {
     throw new Error('Request body exceeds maximum size');
   }
   ```

3. Sanitize user-generated headers:
   ```typescript
   function sanitizeHeader(value: string): string {
     // Remove CRLF to prevent header injection
     return value.replace(/[\r\n]/g, '');
   }
   ```
```

---

### 4. Client API System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Stale-while-revalidate** | High | No SWR pattern. Cache only used during hydration. |
| **Background refetch** | Medium | No periodic refetch or window focus refetch. |
| **Optimistic updates** | Medium | No built-in support for optimistic UI updates. |
| **Mutation invalidation** | Low | No way to invalidate cache after mutation. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Debounce timer cleanup | Low | Timer not cleared on destroy. Minor memory leak. |
| Streaming abort | Low | Partial data may persist in state on abort. |

#### Recommendations

```markdown
1. Add SWR pattern:
   ```typescript
   interface SwrConfig {
     enabled: boolean;
     staleTime: number;      // Return stale data, refetch in background
     cacheTime: number;      // How long to keep unused data
     refetchOnWindowFocus: boolean;
     refetchInterval?: number;
   }
   ```

2. Add optimistic updates:
   ```typescript
   interface MutationConfig {
     optimisticUpdate: (variables: unknown) => unknown;  // Apply immediately
     rollbackOnError: boolean;
     onSuccess: (data: unknown) => void;
   }
   ```

3. Add cache invalidation:
   ```typescript
   interface ApiCache {
     invalidate(apiName: string): void;
     invalidateAll(): void;
     invalidateMatching(pattern: RegExp): void;
   }
   ```

4. Fix debounce cleanup:
   ```typescript
   destroy() {
     if (this.debounceTimer) {
       clearTimeout(this.debounceTimer);
     }
     // ... rest of cleanup
   }
   ```
```

---

### 5. API Service Management

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Service credentials rotation** | High | API keys in formulas. No secure rotation mechanism. |
| **Environment-specific config** | Medium | Same service URL for all environments. No dev/staging/prod. |
| **Service health checks** | Low | No way to mark service as down/unavailable. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Service type extensibility | Low | Only 3 types (Supabase, Xano, Custom). Not extensible. |
| docsUrl is editor-only | Low | Documentation link not available at runtime. |

#### Recommendations

```markdown
1. Add credential rotation support:
   ```typescript
   interface ApiService {
     credentials: {
       type: 'formula' | 'env' | 'secret';
       key: string;  // Formula or env var name or secret ID
       rotation?: {
         enabled: boolean;
         refreshBeforeExpiry: number;  // seconds
       }
     }
   }
   ```

2. Add environment-specific configuration:
   ```typescript
   interface ApiService {
     environments: {
       development?: Partial<ApiServiceConfig>;
       staging?: Partial<ApiServiceConfig>;
       production?: Partial<ApiServiceConfig>;
     }
     currentEnvironment: 'development' | 'staging' | 'production';
   }
   ```

3. Add service health tracking:
   ```typescript
   interface ServiceHealth {
     status: 'healthy' | 'degraded' | 'down';
     lastCheck: number;
     errorRate: number;
     averageLatency: number;
   }
   ```
```

---

## Cross-Cutting Concerns

### 1. Error Handling Philosophy

**Issue:** Multiple error handling patterns (HTTP status, isError formula, redirect rules). Not clearly unified.

**Recommendation:** Document error handling cascade:
```markdown
## Error Handling Cascade

1. **Network error** → `error` field set to error message, `data` = null
2. **HTTP status >= 400** → Check `isError` formula
3. **isError formula returns truthy** → Treat as error
4. **isError formula returns falsy/null** → Use HTTP status (>= 400 = error)
5. **On error** → Fire `onFailed` actions
6. **After any response** → Evaluate redirect rules
```

### 2. Caching Strategy

**Issue:** SSR cache used during hydration, then discarded. No persistent client cache.

**Recommendation:** Define caching strategy:
```markdown
## Caching Strategy

| Layer | Scope | TTL | Use Case |
|-------|-------|-----|----------|
| SSR cache | Per-render | Request lifetime | Avoid duplicate SSR fetches |
| Hydration cache | Per-page-load | Until isPageLoaded | Avoid duplicate hydration fetches |
| (Missing) Client cache | Session | Configurable | SWR, offline support |

Recommended additions:
- In-memory cache with TTL
- LocalStorage cache for offline
- IndexedDB for large responses
```

### 3. Security Model

**Issue:** Proxy provides security but not clearly documented what threats it mitigates.

**Recommendation:** Document security model:
```markdown
## Security Model

| Threat | Mitigation |
|--------|------------|
| Credential exposure | HttpOnly cookies never reach JS |
| CORS restrictions | Server-side proxy bypasses |
| Header injection | CRLF stripped from headers |
| Cookie leakage | Only templated cookies forwarded |
| SSRF | URL validation before fetch |

| Threat (unmitigated) | Recommendation |
|---------------------|----------------|
| Request forgery | Add CSRF token support |
| Rate limiting | Add per-API rate limits |
| Request signing | Add HMAC signature support |
```

---

## Consistency Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Timeout configuration | Proxy vs API | Proxy has 5s hardcoded, API has formula-based timeout. Different mechanisms. |
| Error format | SSR vs CSR | Error structure could differ between server and client paths. |
| Header handling | Construction vs Proxy | Construction adds defaults, proxy strips some. Order matters. |
| Streaming vs non-streaming | Response handling | Different code paths, different error handling. |

---

## Documentation Quality

| Spec | Clarity | Completeness | Examples |
|------|---------|--------------|----------|
| API Integration | 9/10 | 8/10 | Good v1/v2 comparison |
| API Proxy System | 9/10 | 9/10 | Excellent flow documentation |
| API Request Construction | 8/10 | 9/10 | Good algorithm detail |
| API Service Management | 7/10 | 7/10 | Missing runtime behavior |
| Client API System | 9/10 | 9/10 | Excellent lifecycle documentation |

---

## Action Items

### Must Fix (Before 1.0)

1. [ ] Add configurable timeout for proxy requests
2. [ ] Add request body size limit
3. [ ] Add header value sanitization (CRLF prevention)
4. [ ] Fix debounce timer cleanup on destroy

### Should Fix

5. [ ] Add retry mechanism with configurable backoff
6. [ ] Add client-side request deduplication
7. [ ] Add SWR pattern support
8. [ ] Add environment-specific service configuration

### Nice to Have

9. [ ] Add offline detection and queueing
10. [ ] Add optimistic update support
11. [ ] Add cache invalidation API
12. [ ] Add credential rotation mechanism

---

## Conclusion

The API Layer is comprehensive and well-designed with excellent SSR integration and streaming support. The main areas requiring attention are:

1. **Resilience patterns** - Retry, offline, deduplication, SWR
2. **Security hardening** - Timeout configuration, header sanitization, body limits
3. **Configuration flexibility** - Environment-specific config, credential rotation

The dual-pathway architecture (proxy + SSR) is elegant and the formula-driven configuration provides excellent flexibility.
