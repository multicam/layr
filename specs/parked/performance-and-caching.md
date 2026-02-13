# Performance & Caching System Specification

## Purpose

This specification documents the performance optimization mechanisms built into Layr — formula memoization, DOM update batching, server-side file caching, and the CSS custom property stylesheet. These systems reduce redundant computation, minimize layout thrashing, and enable efficient runtime style management.

### Jobs to Be Done

- Memoize component formula results to avoid redundant computation on reactive updates
- Batch DOM updates into single `requestAnimationFrame` callbacks to minimize layout thrashing
- Cache server-side file loads to avoid re-parsing project data on every request
- Provide efficient CSS custom property management via a dedicated `CSSStyleSheet` API

---

## Formula Caching

### Overview

Component formulas marked with `memoize: true` have their results cached. The cache uses dependency-path tracking — it walks the formula AST to discover which data paths it reads, and only invalidates when those specific paths change.

**Source:** `packages/runtime/src/utils/createFormulaCache.ts`

### FormulaCache Type

```typescript
type FormulaCache = Record<string, {
  get: (data: ComponentData) => { hit: true; data: any } | { hit: false }
  set: (data: ComponentData, result: any) => void
}>
```

Each component formula gets its own cache entry, keyed by formula name.

### createFormulaCache (line 13-48)

**Input:** `Component`
**Output:** `FormulaCache` — one cache entry per formula

**Algorithm:**
1. If the component has no formulas, return empty `{}`
2. For each formula with `memoize: true`:
   a. Call `getFormulaCacheConfig()` to extract dependency paths
   b. Create a single-entry cache with closure-based `cacheInput` and `cacheData`
3. For formulas without `memoize`, create a no-op cache (`canCache: false`)

### Cache Hit Logic

```typescript
get: (data: ComponentData) => {
  if (canCache && cacheInput &&
      keys.every((key) => get(data, key) === get(cacheInput, key))) {
    return { hit: true, data: cacheData }
  }
  return { hit: false }
}
```

**Comparison:** Uses `===` (reference equality) on each dependency path. This is intentionally not deep-equal — it relies on the signal system's immutable update pattern where changed values get new references.

### Dependency Path Extraction

**Function:** `getFormulaCacheConfig()` (line 50-96)

Walks the formula AST to discover all data paths the formula reads.

**Algorithm:**
1. Recursively visit all formula operations
2. Collect `PathOperation` entries where `path[0] !== 'Args'` (arguments are function parameters, not reactive state)
3. For `apply` operations (calls to other component formulas): recursively visit the referenced formula. If that formula is NOT also memoized, throw — the cache is invalid
4. Sort collected paths by length (shortest first)
5. Deduplicate by removing paths that are prefixes of longer paths (e.g., if `["Variables", "count"]` exists, don't also track `["Variables"]`)
6. Return `{ canCache: true, keys: [...] }`

**Edge cases:**
- If an `apply` operation references a non-memoized formula, `canCache` is set to `false` for the entire formula (the recursive visit throws, caught at line 76-81)
- Empty dependency set: always returns cache hit (formula is constant)

### Cache Lifecycle

| Event | Effect |
|-------|--------|
| Component creation | `createFormulaCache(component)` called once |
| Formula evaluation | `cache.get(data)` checked before computing |
| Formula result computed | `cache.set(data, result)` stores the result |
| Component destruction | Cache is garbage collected with the component context |

### Integration Points

- **`createComponent.ts:181`** — creates the cache when a component is instantiated
- **`applyFormula()` in `formula.ts:371-382`** — the `apply` operation checks the cache before evaluating:
  ```
  const cache = ctx.formulaCache?.[formula.name]?.get(data)
  if (cache?.hit) return cache.data
  ```
- **Editor preview (`editor-preview.main.ts:1575`)** — creates caches for preview rendering

---

## DOM Update Batching

### Overview

The `BatchQueue` class coalesces multiple DOM update callbacks into a single `requestAnimationFrame` cycle. This prevents layout thrashing when multiple reactive signals fire in quick succession.

**Source:** `packages/runtime/src/utils/BatchQueue.ts`

### BatchQueue Class

```typescript
class BatchQueue {
  private batchQueue: Array<() => void>
  private isProcessing: boolean

  public add(callback: () => void): void
}
```

### Algorithm

1. `add(callback)`: push callback onto the queue, then call `processBatch()`
2. `processBatch()`: if not already processing, set flag and schedule a `requestAnimationFrame`
3. Inside the RAF callback: drain the entire queue by shifting and executing each callback
4. After draining, clear the `isProcessing` flag

**Key properties:**
- **Coalescing:** Multiple `add()` calls in the same synchronous execution context result in a single RAF
- **FIFO ordering:** Callbacks execute in the order they were added
- **Full drain:** All queued callbacks are processed in a single frame, not one per frame
- **Re-entrancy safe:** Callbacks added during processing are included in the current drain cycle (since `while` loop checks `length`)

### Usage

A single global `BatchQueue` instance exists per page:

```typescript
// renderComponent.ts:53
const BATCH_QUEUE = new BatchQueue()
```

Used in `renderComponent` to batch reactive DOM updates (attribute changes, style updates, child reconciliation) into single frames.

---

## Server-Side File Caching

### JS File Loader Cache

**Source:** `packages/backend/src/middleware/jsLoader.ts`

```typescript
const fileCache = new Map<string, any>()

export const loadJsFile = async <T>(path: string): Promise<T | undefined> => {
  if (fileCache.has(path)) {
    return fileCache.get(path) as T
  }
  try {
    const content = await import(path.toLowerCase())
    const parsed = content.default as T
    fileCache.set(path, parsed)
    return parsed
  } catch (e) {
    fileCache.set(path, undefined)
  }
}
```

**Key properties:**
- **Global singleton:** Module-level `Map` persists across requests
- **Negative caching:** Failed loads are cached as `undefined` to prevent retries
- **Path normalization:** Paths are lowercased for case-insensitive filesystem compatibility
- **Dynamic import:** Uses `import()` for ES modules (faster than JSON.parse in V8)
- **No eviction:** Cache grows monotonically — suitable for fixed-size project data

**Cached data types:**
| Path pattern | Type | Description |
|-------------|------|-------------|
| `./project.js` | `HonoProject` | Project metadata + config |
| `./routes.js` | `Routes` | Page routes + custom routes |
| `./components/{name}.js` | `ProjectFilesWithCustomCode` | Per-page component bundles |

### Route & Project Middleware Caching

The `routesLoader` and `loadProjectInfo` middlewares use `loadJsFile` internally and cache via its file cache. Additionally, they store results in Hono context variables for per-request access:

```typescript
// routesLoader.ts — loads once, caches in closure
let routes: Routes | undefined
if (!routes) {
  routes = await loadJsFile<Routes>('./routes.js')
}
ctx.set('routes', routes)
```

---

## CustomPropertyStyleSheet

### Overview

Manages CSS custom properties via a dedicated `CSSStyleSheet`, providing an API as fast as setting inline styles but with proper cascade and media query support.

**Source:** `packages/runtime/src/styles/CustomPropertyStyleSheet.ts`

### Purpose

When component nodes have dynamic CSS custom properties (style variables), these need to be updated efficiently as reactive state changes. Instead of manipulating inline styles or DOM attributes, `CustomPropertyStyleSheet` inserts rules into a `CSSStyleSheet` and returns direct setter functions.

### Constructor

```typescript
constructor(root: Document | ShadowRoot, styleSheet?: CSSStyleSheet)
```

- If a `styleSheet` is provided (e.g., from SSR hydration), it is adopted
- Otherwise, creates a new `CSSStyleSheet` and pushes it to `root.adoptedStyleSheets`

### registerProperty

```typescript
registerProperty(
  selector: string,
  name: string,
  options?: { mediaQuery?: MediaQuery; startingStyle?: boolean }
): (newValue: string) => void
```

**Algorithm:**
1. Lazy-initialize `ruleMap` by hydrating from existing stylesheet rules
2. Build full selector (with optional `@media` and `@starting-style` wrappers)
3. If selector doesn't exist in map, insert a new CSS rule
4. Navigate to the innermost `CSSStyleRule` (unwrap media/grouping rules)
5. Return a closure: `(value) => rule.style.setProperty(name, value)`

**Performance:** The returned setter function directly calls `CSSStyleDeclaration.setProperty()` — no DOM manipulation, no selector lookup on update. Only the initial `registerProperty` call does selector work.

### unregisterProperty

```typescript
unregisterProperty(
  selector: string,
  name: string,
  options?: { mediaQuery?: MediaQuery; startingStyle?: boolean; deepClean?: boolean }
): void
```

Removes a property from the stylesheet rule. If `deepClean` is enabled and the rule has no remaining properties, the entire rule is deleted.

**Business Rule:** `deepClean` is only used in the editor preview environment (dynamic component creation/destruction). Production builds skip deep cleaning for performance.

### hydrateFromBase (line 116-132)

Indexes all existing CSS rules by selector. Called once (lazily) when the first `registerProperty` call occurs. This maps SSR-rendered custom property rules to their `CSSStyleRule` objects for efficient updates.

### Selector Construction

Selectors are built from:
- Base CSS selector (e.g., `[data-node-id="abc"]`)
- Optional `@media` wrapper for responsive properties
- Optional `@starting-style` wrapper for CSS transition starting states

Example full selector: `@media (min-width: 768px) { [data-node-id="abc"] { } }`

---

## Asset Caching Strategy

### Cache-Busting

Static assets served by the backend use content-addressable URLs or version-based paths to ensure cache invalidation on updates:

| Asset Type | URL Pattern | Cache Strategy |
|-----------|-------------|----------------|
| Runtime JS | `/_static/page.main.esm.js` | Versioned at release time |
| Component CSS | `/_static/{name}.css` | Regenerated per build |
| Custom code | `/_static/cc_{name}.js` | Regenerated per build |
| Fonts | `/.toddle/fonts/font/...` | Rewritten from Google Fonts CDN URLs |

### Font Serving

Google Font URLs are rewritten from `https://fonts.gstatic.com/...` to `/.toddle/fonts/font/...` for self-hosting. This provides:
- Eliminates third-party requests (privacy, performance)
- Consistent availability regardless of CDN status
- Font files served with appropriate `Cache-Control` headers

---

## Edge Cases

### Formula Cache with Non-Memoized Dependencies
If a memoized formula calls another component formula via `apply` that is NOT itself memoized, the entire cache entry is disabled (`canCache: false`). This prevents stale results from non-tracked dependencies.

### BatchQueue Callback Errors
If a queued callback throws, the error propagates and remaining callbacks in the queue are NOT executed in that cycle. The `isProcessing` flag is NOT reset inside a try/catch, so subsequent `add()` calls would schedule a new RAF.

### Empty Formula Dependency Set
A memoized formula with no data path dependencies (e.g., a constant formula) always returns a cache hit after the first computation.

### StyleSheet Hydration Mismatch
If the server-rendered CSS rules don't match expected selectors (e.g., due to version mismatch), `hydrateFromBase` may miss rules. New rules will be inserted, potentially causing duplicates. The impact is cosmetic (duplicate CSS properties resolve by cascade order).

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [Formula System](./formula-system.md) | Formula caching integrates with `applyFormula()` via the `apply` operation |
| [Reactive Signal System](./reactive-signal-system.md) | Signal updates trigger formula re-evaluation; BatchQueue coalesces resulting DOM updates |
| [Rendering Engine](./rendering-engine.md) | Uses BatchQueue for batched DOM updates |
| [Styling and Theming](./styling-and-theming.md) | CustomPropertyStyleSheet manages runtime theme/style variable updates |
| [Build and Deployment](./build-and-deployment.md) | Static asset generation and cache-busting strategy |
| [Backend Server](./backend-server.md) | JS file loader caching for project data |
| [Hydration System](./hydration-system.md) | CustomPropertyStyleSheet hydrates from SSR-rendered CSS rules |

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxDepth` | 100 | Maximum nesting depth |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Depth limit:** Throw `LimitExceededError`

---

## Invariants

### Operation Invariants

1. **I-OP-ATOMIC:** Operations MUST be atomic.
2. **I-OP-ISOLATED:** Operations MUST be isolated.
3. **I-OP-CLEANUP:** Cleanup MUST be guaranteed.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-ATOMIC | Runtime | Rollback |
| I-OP-ISOLATED | Runtime | Sandbox |
| I-OP-CLEANUP | Runtime | Force cleanup |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section with operation limits
- Added Invariants section with 3 operation invariants
- Added Error Handling section with error types
