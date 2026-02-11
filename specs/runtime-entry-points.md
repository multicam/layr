# Runtime Entry Points Specification

## Purpose

The Layr runtime has three distinct entry points for different execution contexts: production page rendering, editor preview, and web component initialization. Each entry point sets up the global `window.toddle` object, registers standard library plugins, and initializes the component rendering pipeline with context-appropriate configuration.

### Jobs to Be Done

- Initialize the runtime environment with correct configuration per context
- Register standard library formulas and actions
- Parse URL parameters and set up location signals (page runtime)
- Hydrate SSR-rendered content with client-side interactivity (page runtime)
- Set up bidirectional PostMessage communication (editor preview)
- Export web components with self-contained rendering (custom element)
- Manage component lifecycle (mount, update, unmount)

---

## Entry Point Comparison

| Feature | page.main.ts | editor-preview.main.ts | custom-element.main.ts |
|---------|-------------|----------------------|----------------------|
| **Size** | ~17.5 KB | ~65 KB | Minimal |
| **Runtime value** | `'page'` | `'preview'` | N/A (uses host) |
| **Component source** | `window.__toddle.component` | PostMessage | Custom element attributes |
| **Data initialization** | SSR hydration state | Empty `EMPTY_COMPONENT_DATA` | Attribute values |
| **URL parsing** | Yes (route params, query) | No | No |
| **API triggering** | Auto on mount | Manual via message | None |
| **Navigation** | `popstate` listener | None | None |
| **Meta tag updates** | Dynamic subscriptions | Static | None |
| **PostMessage** | None | Bidirectional (28 in, 16 out) | None |
| **Keyboard forwarding** | No | Yes | No |
| **Log state** | `initLogState()` | None | None |
| **Theme subscription** | Auto | Manual via message | None |
| **Body attributes** | None | `data-mode` | None |
| **Exports** | `initGlobalObject`, `createRoot` | `initGlobalObject`, `createRoot` | `defineComponents`, `loadCorePlugins` |

---

## Page Entry Point (page.main.ts)

### Initialization Sequence

#### Phase 1: Global Object Setup

1. Parse URL for path params, query params, and hash
2. Create environment object with `runtime: 'page'`
3. Create `window.toddle` with:
   - `isEqual`: `fastDeepEqual`
   - `errors`: Empty array
   - `formulas`, `actions`: Empty objects
   - `locationSignal`: Signal from parsed URL (params, query, hash)
4. Register std-lib formulas as `@toddle/{name}` (97 formulas)
5. Register std-lib actions as `@toddle/{name}` (19 actions)

The `initGlobalObject()` function accepts optional `formulas` and `actions` parameters for custom code injection.

#### Phase 2: Root Creation

1. Add `popstate` event listener for browser navigation
2. Create route signal derived from location signal
3. Create data signal from SSR hydration state (`window.__toddle.pageState`)
4. Re-initialize variables with `initValue` formulas (not SSR values)
5. Register component to log state via `initLogState()`
6. Subscribe route signal to update data on navigation
7. Create abort controller for component lifecycle
8. Create component context with API handlers
9. Sort and create APIs (respecting dependency order)
10. Trigger API auto-fetch actions
11. Set up context providers if component defines them
12. Subscribe theme signal to update `data-theme` attribute
13. Render component via `renderComponent()`
14. Set `window.__toddle.isPageLoaded = true`

### URL Parsing

The `parseUrl()` function extracts route parameters from the URL:

1. Match URL pathname against page route definition
2. Extract dynamic path segments as `path` parameters
3. Parse query string into `query` parameters
4. Extract hash fragment
5. Apply defaults from route's `query` definitions for missing params
6. Uses `path-to-regexp` for non-route page matching

### Dynamic Meta Tag Updates

After initialization, the page subscribes to data changes for reactive meta updates:

- **Title:** Subscribes to `page.route.info.title` formula, updates `document.title`
- **Description:** Subscribes to `page.route.info.description`, updates `<meta name="description">`
- **Language:** Subscribes to `page.route.info.language`, updates `document.documentElement.lang`
- **Theme:** Subscribes to theme formula, updates `data-nc-theme` attribute
- **Open Graph:** Auto-generates `og:title`, `og:description`, `og:url` meta tags
- **Custom meta:** Iterates `page.route.info.meta` for additional tags

### Navigation Handling

On `popstate` event:
1. Re-parse URL
2. Update location signal with new params/query/hash
3. Route signal recomputes, triggering data signal update
4. Component re-renders with new route data

---

## Editor Preview Entry Point (editor-preview.main.ts)

### Initialization Sequence

#### Phase 1: Global Object Setup

1. Create environment with `runtime: 'preview'`
2. Create `window.toddle` with empty location signal
3. Register std-lib plugins (same as page)

#### Phase 2: Root Creation

1. Create data signal with `EMPTY_COMPONENT_DATA`
2. Initialize state variables:
   - `mode`: `'design'` or `'test'`
   - `selectedNodeId`, `highlightedNodeId`
   - `styleVariantSelection`
   - `animationState`
   - `altKey`, `metaKey` modifier tracking
   - `dragState`
3. Set `document.body` attribute `data-mode="design"`
4. Set `window.toddle._preview = { showSignal }` for conditional element display
5. Subscribe data signal to send updates to editor via PostMessage
6. Add `message` event listener for incoming editor commands
7. Add `beforeunload` listener for scroll state preservation
8. Initialize keyboard listeners (forwarding to parent)
9. Start overlay rect synchronization loop (`requestAnimationFrame`)

### Component Lifecycle

Components are received and updated entirely through PostMessage. The `update()` function:

1. Deep-clones component with `structuredClone()` to avoid mutations
2. In design mode, removes `condition` from selected nodes to force visibility
3. Diffs against previous state to determine what changed
4. Updates styles, APIs, and DOM as needed
5. Fires `onLoad` actions after DOM update

See [Editor Preview System](editor-preview-system.md) for full PostMessage protocol.

---

## Custom Element Entry Point (custom-element.main.ts)

### Initialization Sequence

The minimal entry point exports two functions:

#### `loadCorePlugins(toddle?)`

1. Set `toddle.isEqual = fastDeepEqual`
2. Register std-lib formulas as `@toddle/{name}`
3. Register std-lib actions as `@toddle/{name}`
4. Accepts optional external `toddle` object (for host page integration)

#### `defineComponents()`

Calls the custom element definition system to register web components. Each component manages its own lifecycle independently — no global routing, no API management, no PostMessage.

### Usage Context

Custom elements are exported as standalone web components for use outside Layr applications. They receive data through HTML attributes and emit events through standard DOM events.

---

## Shared Infrastructure

### Standard Library Registration

All three entry points register the standard library identically:

```
formulas: @toddle/{formulaName} → 97 formulas
actions: @toddle/{actionName} → 19 actions
```

Registration also includes `getArgumentInputData` per formula for input suggestions in the editor.

### Global Object Structure

```
window.toddle = {
  isEqual: fastDeepEqual,
  errors: [],
  formulas: { '@toddle/add': {...}, ... },
  actions: { '@toddle/goToURL': {...}, ... },
  locationSignal: Signal<{ params, query, hash }>,
  env: ToddleEnv,
  // page only:
  pageState: ComponentData,
  // preview only:
  _preview: { showSignal: Signal<{ displayedNodes: string[] }> },
}
```

### Hydration Data (page only)

The SSR pipeline injects `window.__toddle` with:

```
window.__toddle = {
  project: string,          // Project short ID
  branch: string,           // Branch name
  commit: string,           // Commit hash
  pageState: ComponentData, // SSR-computed component data (including API cache)
  component: Component,     // Page component (test data stripped)
  components: Component[],  // All included components (test data stripped)
  isPageLoaded: boolean,    // Set to true after hydration
  cookies: string[],        // Cookie names available server-side
}
```

---

## View Transitions Integration

### Utility: `tryStartViewTransition()`

Wraps the browser View Transitions API with:

1. **Feature detection:** Checks for `document.startViewTransition`
2. **Accessibility:** Respects `prefers-reduced-motion: reduce` media query (can be overridden)
3. **Graceful fallback:** Executes callback immediately if API unavailable
4. **Return value:** `{ finished: Promise<void> }` for cleanup coordination

### Usage in Drag-Drop

View transitions animate DOM reordering during drag operations:

**Reorder mode:** Sets `view-transition-name` on siblings, triggers transition during `insertBefore`, cleans up after `finished`.

**Drag end:** Animates element into final position (insert or cancel). Only assigns `view-transition-name` to viewport-visible elements for performance.

---

## BatchQueue System

### Purpose

Coalesces multiple lifecycle callbacks into a single `requestAnimationFrame` cycle.

### Implementation

```
class BatchQueue {
  private batchQueue: Array<() => void>
  private isProcessing: boolean

  add(callback): void
    1. Push callback to queue
    2. Schedule processBatch() if not already scheduled

  processBatch(): void
    1. Guard against re-entry (isProcessing flag)
    2. requestAnimationFrame(() => {
         3. Drain queue synchronously via while loop
         4. Reset isProcessing
       })
}
```

### Usage

Global singleton shared across all components. Used to batch `onLoad` and `onAttributeChange` lifecycle hooks:

1. Component DOM created synchronously in `renderComponent()`
2. Lifecycle hooks queued via `BATCH_QUEUE.add()`
3. After call stack clears, single RAF fires
4. All queued hooks execute together after full DOM tree constructed

### Trade-offs

- Reduces N RAF calls to 1 for N components mounting simultaneously
- Defers lifecycle hooks by 1 frame (~16ms at 60fps)
- No error handling — error in one callback aborts remaining batch (intentional)
- No cancellation mechanism

---

## Formula Cache System

### Purpose

Per-component memoization that caches formula results based on data dependency tracking.

### Cache Creation

For each formula with `memoize: true`:

1. Analyze formula AST to find all `path` operations (data accesses)
2. Exclude `Args` paths (formula parameters, not dependencies)
3. Validate `apply` operations reference only memoized formulas
4. Deduplicate paths (keep shortest prefix paths only)
5. Create closure with `get`/`set` methods

### Cache Hit Logic

1. Check `canCache` flag
2. Verify previous input exists (first call always misses)
3. Compare all dependency keys via reference equality (`===`)
4. Return cached result if all keys match

### Cache Invalidation

Cache invalidates when any dependency key's reference changes. Relies on the signal system's immutability guarantee (new object = new reference).

### Limitations

- Single cache entry per formula (no argument-based multi-cache)
- No LRU eviction
- No cross-component sharing
- Non-memoized `apply` dependencies disable caching entirely

---

## Edge Cases

- **SSR hydration mismatch:** Page runtime re-initializes variables with `initValue` formulas rather than using SSR values, ensuring client-side state is fresh
- **Missing component in hydration data:** `window.__toddle.component` undefined causes render failure — server must always provide valid component
- **Browser navigation during API fetch:** Abort controller cancels in-flight requests on unmount
- **Custom element without host toddle:** `loadCorePlugins()` accepts optional toddle object, falls back to creating its own
- **Preview iframe reload:** `reload` command triggers full page reload, requiring editor to re-send all component data
