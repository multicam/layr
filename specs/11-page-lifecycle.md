# 11 — Page Lifecycle

Component mount/unmount callbacks, attribute change detection, cleanup functions, the `window.toddle` global object, SSR hydration, and runtime entry points (page, preview, custom-element).

**Package:** `@layr/runtime`

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| `onLoad` lifecycle callback | MVP |
| `onAttributeChange` lifecycle callback | MVP |
| Cleanup functions (instance-scoped) | MVP |
| `BatchQueue` for lifecycle hook batching | MVP |
| `window.toddle` global object | MVP |
| SSR data reading (`readSSRData`) | MVP |
| SSR cache hydration in `createRoot()` | MVP |
| `hydratePage()` — event attachment to SSR DOM | MVP |
| Variables re-initialization on client | MVP |
| Page entry point (`page.main.ts`) | MVP |
| Editor preview entry point (`editor-preview.main.ts`) | MVP |
| Theme management (formula, static, cookie-based) | MVP |
| Dynamic meta tag updates | MVP |
| Formula cache (per-component memoization) | MVP |
| Custom element entry point (`custom-element.main.ts`) | Deferred |

---

## 1. Component Lifecycle

### 1.1 Hooks

Two declarative lifecycle events per component:

| Hook | When | Timing |
|------|------|--------|
| `onLoad` | Once after mount and root node created | Batched via `BatchQueue` — deferred to next RAF |
| `onAttributeChange` | When any attribute changes value | Batched; deep equality (`fastDeepEqual`) prevents spurious fires |

`onLoad` implementation:
```typescript
BATCH_QUEUE.add(() => {
  component.onLoad?.actions?.forEach(action =>
    handleAction(action, dataSignal.get(), ctx)
  )
})
```

`onAttributeChange` implementation:
```typescript
dataSignal.map(data => data.Attributes).subscribe(props => {
  if (prev) {
    // Build CustomEvent('attribute-change')
    // detail: { [attrName]: { current, new } } — only changed attributes
    handleAction(action, dataSignal.get(), ctx, changeEvent)
  }
  prev = props
})
```

Attribute name in detail: uses `attribute.name` field, not the record key.
Only attributes changed per `fastDeepEqual` are included in the event detail.

### 1.2 Instance-Scoped Lifecycle Manager

```typescript
interface ComponentLifecycleAPI {
  onMount(cb: LifecycleCallback): () => void       // returns deregistration fn
  onUnmount(cb: LifecycleCallback): () => void
  onAttributesChange(cb: (attrs) => void): () => void
  initialize(): Promise<void>   // fires onLoad + mount callbacks + sets up attr subscription
  destroy(): void               // fires only instance-scoped unmount callbacks; aborts controller
  handleAttributeChange(newAttrs): void
}

function createComponentLifecycle(options: ComponentLifecycleOptions): ComponentLifecycleAPI
```

Instance-scoping: each component instance has its own callback arrays. `destroy()` fires only callbacks registered to that instance, not global callbacks.

### 1.3 Cleanup Functions

Custom action handlers returning a function register cleanup on signal destroy:
```typescript
ctx.dataSignal.subscribe(() => {}, { destroy: cleanup })
// cleanup() called when component unmounts
// Async: if handler returns Promise<function>, resolved function called on unmount
```

AbortController per component:
- Linked to signal destruction
- Aborts all `addEventListener` calls (via `{ signal: abortSignal }`)
- Cancels in-flight API fetches on unmount

Signal cleanup cascade:
```
Component unmount
  ├── AbortController.abort() → cancels pending fetches + event listeners
  ├── Derived signals destroyed (leaf-to-root order)
  ├── Context subscriptions cleared
  └── DOM elements removed via dataSignal destroy callback
```

---

## 2. BatchQueue

```typescript
class BatchQueue {
  add(callback: () => void): void
  processBatch(): void
}
```

Global singleton shared across all components.

Behavior:
1. `add(callback)` → push to queue; schedule `processBatch()` if not already scheduled
2. `processBatch()` → re-entrancy guard (`isProcessing` flag) → single `requestAnimationFrame` → drain queue synchronously

Trade-offs:
- Reduces N RAF calls to 1 for N components mounting simultaneously
- Defers lifecycle hooks by ~1 frame (~16ms at 60fps)
- No error handling: error in one callback aborts remaining batch
- No cancellation mechanism

---

## 3. `window.toddle` Global Object

### 3.1 Structure

```typescript
interface ToddleGlobal {
  project: string
  branch: string
  commit: string
  errors: Error[]
  formulas: Record<string, Record<string, PluginFormula>>
  actions: Record<string, Record<string, PluginActionV2>>
  isEqual: (a, b) => boolean    // fastDeepEqual
  getCustomFormula: (name, pkg?) => PluginFormula | undefined
  getCustomAction: (name, pkg?) => PluginActionV2 | undefined
  getArgumentInputData: (name, args, idx, data) => ComponentData
  data: Record<string, unknown>  // reserved for custom use
  components: Component[]
  locationSignal: Signal<Location>
  eventLog: Array<{ component, node, event, time, data }>
  pageState: ComponentData       // initial SSR state (used for cache)
  env: ToddleEnv
}
```

### 3.2 Environment

```typescript
interface ToddleEnv {
  isServer: boolean
  branchName?: string
  request?: Request
  runtime: 'page' | 'preview' | 'custom-element'
  logErrors: boolean
}
```

### 3.3 Debug Helpers

- `window.logState()` — outputs component data signals as console table
- `window.__components` — map of component name → data signal
- `window.signal(value)` — creates a signal from console
- `window.deepEqual(a, b)` — tests deep equality

---

## 4. SSR Data Transfer

### 4.1 `toddleInternals` (hydration payload)

Injected as `<script type="application/json" id="layr-data">`:

| Field | Type | Notes |
|-------|------|-------|
| `project` | `string` | Project short ID |
| `branch` | `string` | Default: `'main'` |
| `commit` | `string` | Default: `'unknown'` |
| `pageState` | `ComponentData` | Server-computed state including API cache |
| `component` | `Component` | Page component (test data stripped) |
| `components` | `Component[]` | All included components (test data stripped) |
| `isPageLoaded` | `false` | Set to `true` after hydration |
| `cookies` | `string[]` | Cookie names only (not values) |

`</script>` in JSON escaped to `<\/script>`.

### 4.2 `readSSRData(document, id?)`

```typescript
function readSSRData(document: Document, id: string = 'layr-data'): ComponentData | null
```

Reads `script#layr-data`, parses JSON, clears `textContent` after reading to prevent data leakage. Returns `null` on failure.

### 4.3 Test Data Removal

Before serialization, `removeTestData()` strips editor-only fields:
- `testValue` from attributes, path params, query params
- `dummyEvent` from events
- `description`, `group`, `label` from actions
- `service`, `servicePath` from APIs

---

## 5. Hydration

### 5.1 `hydratePage(component, initialData, root)`

```typescript
interface HydrationResult {
  dataSignal: Signal<ComponentData>
  cleanup: () => void
}

function hydratePage(
  component: Component,
  initialData: ComponentData,
  root: Element
): HydrationResult
```

Attaches event handlers to the existing SSR-rendered DOM without re-creating elements:
1. Walk DOM tree via `data-node-id` attributes
2. For each matching node: attach event listeners from `nodeModel.events`
3. Event listeners registered with `abortSignal` for cleanup
4. Returns `cleanup()` → `abortController.abort()`

### 5.2 SSR Cache Hydration

During `createRoot()`, when `isPageLoaded === false`:

1. Compute request hash for each API with `autoFetch`
2. Look up `pageState.Apis[requestHash]`
3. If hit:
   - Error cached → `apiError()` with cached error
   - Data cached → `apiSuccess()` with cached data
4. Miss → normal fetch

Cache valid only during initial hydration. `window.__toddle.isPageLoaded = true` disables cache lookups — all subsequent fetches are live.

### 5.3 `autoHydrate(component, selector?)`

```typescript
function autoHydrate(component: Component, selector: string = '#App'): HydrationResult | null
```

Convenience wrapper: finds root element, reads SSR data, calls `hydratePage()`.

---

## 6. Entry Points

### 6.1 Comparison

| Feature | page | editor-preview | custom-element |
|---------|------|----------------|----------------|
| Runtime value | `'page'` | `'preview'` | `'custom-element'` |
| Component source | `window.__toddle.component` | PostMessage | HTML attributes |
| Data initialization | SSR hydration state | `EMPTY_COMPONENT_DATA` | Attribute values |
| URL parsing | Yes (route params, query) | No | No |
| API triggering | Auto on mount | Manual via PostMessage | None |
| Navigation | `popstate` listener | None | None |
| Meta tag updates | Dynamic subscriptions | Static | None |
| PostMessage | None | Bidirectional | None |
| Keyboard forwarding | No | Yes | No |
| Theme subscription | Auto | Manual via PostMessage | None |
| Exports | `initGlobalObject`, `createRoot` | `initGlobalObject`, `createRoot` | `defineComponents`, `loadCorePlugins` |
| Phase | MVP | MVP | Deferred |

### 6.2 Page Entry Point (`page.main.ts`)

**Phase 1: `initGlobalObject({ formulas, actions })`**

1. Parse URL → path params, query params, hash
2. Create environment: `{ isServer: false, branchName, request: undefined, runtime: 'page', logErrors: true }`
3. Build `window.toddle` with metadata, plugin registries, lookup functions, location signal, errors array
4. Register standard library: 97 formulas as `@toddle/{name}`, 19 actions as `@toddle/{name}`
5. Apply optional custom `formulas` and `actions` from custom code injection

**Phase 2: `createRoot(domNode)`**

```
A. Route signal:   locationSignal.map(({ query, params }) => ({ ...query, ...params }))
B. Data signal:    signal({ ...pageState, Variables: re-evaluated })
   → Variables re-initialized (not SSR values) — client may access localStorage, etc.
C. Route → Data:  routeSignal.subscribe(route => dataSignal.update(...))
D. AbortController linked to data signal destruction
E. ComponentContext built
F. API initialization:
   - Sort by dependency order
   - Create legacy and V2 APIs
   - Trigger V2 API auto-fetch actions
   - SSR cache hydration for autoFetch APIs
G. Context subscription (if component consumes context)
H. Context provider registration (if component exposes context)
I. Theme signal setup
J. Meta tag subscriptions (dynamic only)
K. renderComponent() → clear SSR HTML → append new DOM
L. window.__toddle.isPageLoaded = true
```

### 6.3 Editor Preview Entry Point (`editor-preview.main.ts`) [MVP]

**Phase 1:**
1. Create environment: `{ runtime: 'preview' }`
2. Create `window.toddle` with empty location signal
3. Register std-lib plugins

**Phase 2: `createRoot()`**
1. Create data signal with `EMPTY_COMPONENT_DATA`
2. Initialize internal state: `mode`, `selectedNodeId`, `highlightedNodeId`, `styleVariantSelection`, `animationState`, `altKey`, `metaKey`, `dragState`
3. Set `document.body.dataset.mode = 'design'`
4. Set `window.toddle._preview = { showSignal }` for conditional element display
5. Subscribe data signal → send updates to editor via PostMessage
6. `message` event listener for incoming editor commands
7. `beforeunload` listener for scroll state
8. Keyboard listeners (forwarding to parent)
9. Overlay rect sync loop via `requestAnimationFrame`

Component updates received entirely through PostMessage:
1. `structuredClone()` component to avoid mutations
2. In design mode: remove `condition` from selected nodes to force visibility
3. Diff against previous state → update styles, APIs, DOM
4. Fire `onLoad` actions after DOM update

### 6.4 Custom Element Entry Point (`custom-element.main.ts`) [Deferred]

Exports two functions:

**`loadCorePlugins(toddle?)`**
1. Set `toddle.isEqual = fastDeepEqual`
2. Register std-lib formulas and actions
3. Accepts optional external `toddle` object for host page integration

**`defineComponents()`**
Registers web components. Each component manages its own lifecycle independently — no global routing, no API management, no PostMessage.

Custom elements receive data through HTML attributes and emit via standard DOM events.

---

## 7. Theme Management

Three modes:

| Mode | Condition | Implementation |
|------|-----------|----------------|
| Formula-based | `info.theme.formula` is non-static | `themeSignal = dataSignal.map(() => applyFormula(themeFormula))` |
| Static | Formula is `type: 'value'` | `themeSignal = signal(staticValue)` |
| Cookie-based (default) | No theme formula | Read `nc-theme` cookie; listen to `cookieStore.change` events |

Theme application:
1. Update `dataSignal.Page.Theme`
2. Set `data-nc-theme` on `document.documentElement`
3. Remove attribute if theme is `null`

Cookie-based: browsers without `cookieStore` API get initial cookie value only (no reactive updates).

---

## 8. Dynamic Meta Updates (Client-Side)

After hydration, reactive subscriptions update `<head>` when data changes:

| Element | Source | Subscription condition |
|---------|--------|----------------------|
| `<html lang>` | `route.info.language.formula` | Formula is non-static |
| `<title>` | `route.info.title.formula` | Formula is non-static |
| `<meta name="description">` | `route.info.description.formula` | Formula is non-static |
| `<meta property="og:description">` | Auto-synced with description | If no explicit OG entry |
| Custom meta | `route.info.meta[id].attrs` | Any attribute formula is non-static |

Meta element lookup priority:
1. By `data-toddle-id` attribute (stable ID)
2. By `property` attribute (OG tags)
3. By `name` attribute (standard meta tags)
4. Create new element if not found

Static values rendered in SSR — no subscription created.

---

## 9. Formula Cache (Per-Component Memoization)

For formulas with `memoize: true`:

**Cache creation:**
1. Analyze formula AST for `path` operations (data accesses)
2. Exclude `Args` paths (formula parameters, not dependencies)
3. Validate `apply` operations reference only memoized formulas
4. Deduplicate paths (keep shortest prefix paths only)
5. Create closure with `get`/`set` methods

**Cache hit logic:**
1. Check `canCache` flag
2. Verify previous input exists (first call always misses)
3. Compare all dependency keys via reference equality (`===`)
4. Return cached result if all keys match

**Invalidation:** Any dependency key reference change invalidates cache.

**Limitations:**
- Single entry per formula (no argument-based multi-cache)
- No LRU eviction
- No cross-component sharing
- Non-memoized `apply` dependencies disable caching entirely

---

## 10. Standard Library Registration

All three entry points register identically:

```
formulas: @toddle/{formulaName}  → 97 formulas
actions:  @toddle/{actionName}   → 19 actions
```

Includes `getArgumentInputData` per formula for editor input suggestions.

---

## 11. Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing DOM root node | Throws `Error('Cant find root domNode')` |
| Missing components array | Throws `Error('Missing components')` |
| Formula evaluation error | Pushed to `toddle.errors[]`, returns `null` |
| API fetch error | Stored in `data.Apis[name].error`, triggers `onFailed` actions |
| API timeout | `TimeoutError` caught, error message set |
| API abort (unmount) | `AbortError` caught, silently cancelled |
| Lifecycle callback error | Aborts remaining batch (intentional, no recovery) |

---

## 12. Variable Re-initialization

After SSR, variables re-evaluated client-side because:
- SSR cannot access `localStorage`, `sessionStorage`, `geolocation`
- Browser APIs (DOM measurements, user preferences) unavailable on server
- `initialValue` formulas re-run with full client context

All other SSR state (`Apis`, `Page`, `Location`) preserved from `pageState`.

May cause brief visual flash if variable affects rendering and value differs from SSR.

---

## 13. Edge Cases

| Scenario | Behavior |
|----------|----------|
| SSR/CSR state divergence | Variables re-initialized; Apis from cache; expected — not an error |
| Hash navigation | `popstate` not triggered; actions must explicitly update `locationSignal` |
| Query param type | Same key multiple times → last value wins; declared params pre-filled `null` |
| Missing `window.__toddle.component` | Render failure — server must always provide valid component |
| Browser navigation during API fetch | AbortController cancels in-flight requests on unmount |
| Preview iframe reload | `reload` PostMessage triggers full page reload |
| Theme cookie persistence | `setTheme` action sets `nc-theme` cookie; `cookieStore.change` triggers reactive update |
| Custom element without host toddle | `loadCorePlugins()` falls back to creating its own object |

---

## 14. Cross-References

| Spec | Relationship |
|------|-------------|
| `06-rendering.md` | `renderComponent()` called from `createRoot()`; lifecycle hooks in rendering |
| `07-event-system.md` | `handleAction()` executes `onLoad`/`onAttributeChange` actions; `BatchQueue` |
| `08-navigation.md` | Location signal initialized here; `popstate` listener in `createRoot()` |
| `10-api-system.md` | API initialization and SSR cache hydration in `createRoot()` |
