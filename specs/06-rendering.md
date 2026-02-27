# 06 — Rendering

Unified rendering pipeline covering both SSR (server-side HTML generation) and runtime DOM rendering (client-side reactive). Implements the formula-to-signal pattern for reactive bindings.

**Packages:** `@layr/ssr` (SSR), `@layr/runtime` (DOM rendering)

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| SSR HTML generation | MVP |
| Runtime DOM rendering | MVP |
| Element / text / slot / component nodes | MVP |
| Conditional rendering | MVP |
| Repeat / list rendering with keyed reconciliation | MVP |
| Attribute and style application | MVP |
| SVG / MathML namespace propagation | MVP |
| HTML escaping and security | MVP |
| CSS custom property stylesheet management | MVP |
| SSR API prefetching | MVP |
| Head construction (meta, fonts, stylesheets) | MVP |
| Hydration data injection | MVP |
| Speculation rules | MVP |

---

## 1. SSR Pipeline (`@layr/ssr`)

### 1.1 Request → HTML Flow

```
Request
  → matchPageForUrl()          — backend route matching (see 09-route-matching.md)
  → getPageFormulaContext()    — build initial data from URL params + cookies
  → takeIncludedComponents()   — collect all component dependencies
  → renderPageBody()           — evaluate APIs, render component tree, collect CSS vars
  → getHeadItems()             — charset, viewport, title, stylesheets, fonts, speculation rules
  → assemble HTML document
  → return Response
```

### 1.2 Formula Context (`getPageFormulaContext`)

| Field | Value |
|-------|-------|
| `Location.page` | Matched page name |
| `Location.path` | URL pathname |
| `Location.params` | Path + query parameters combined |
| `Location.query` | Query parameters with declared defaults (`null` if absent) |
| `Location.hash` | URL hash without `#` |
| `Attributes` | Combined params (path overrides query) |
| `Apis` | `{}` — populated during rendering |
| `Variables` | Evaluated from `initialValue` formulas |
| `Page.Theme` | From formula or `nc-theme` cookie |

### 1.3 API Evaluation During SSR

`evaluateComponentApis()` runs before HTML generation:

1. Sort APIs by dependency order (`sortApiObjects`)
2. Independent APIs (no cross-API `Apis.*` references) → `Promise.all()` in parallel
3. Dependent APIs → sequential, updating `formulaContext.data.Apis` after each fetch
4. Results stored in `apiCache` keyed by `requestHash(url, requestSettings)`

API is fetched during SSR only when:
- `autoFetch` formula evaluates truthy
- `server.ssr.enabled` formula evaluates truthy (default: `false`)

On API error: set error state, continue rendering.
On API redirect (`RedirectError`): set diagnostic headers, return HTTP redirect immediately.

### 1.4 Component Rendering (`renderComponent`)

Renders each node type to an HTML string. Maximum recursion depth: 100.

#### Text Node

```html
<!-- HTML namespace -->
<span data-node-type="text" data-node-id="{id}">{HTML-encoded text}</span>

<!-- SVG/MathML namespace -->
{HTML-encoded text}   <!-- no wrapper element -->
```

#### Element Node

1. Validate tag name against `/^[a-zA-Z][a-zA-Z0-9-]*$/` — falls back to `div`
2. Skip rendering `<script>` tags entirely (not executed server-side)
3. Evaluate attributes via formulas; validate names against `/^[a-zA-Z_][\w\-:.]*$/`
4. Build class list: base hash + conditional classes + instance classes
5. Evaluate custom properties; add to stylesheet map
6. Render children recursively (skip for void elements)
7. Void elements self-close: `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`

Output: `<tag attrs data-id="path" data-node-id="id" class="classes">children</tag>`

For `<style>` tags: render text children directly into `textContent` (no child recursion).

#### Component Node

1. Evaluate attributes from parent formulas
2. Build contexts (parent + current component's exposed formulas)
3. Look up child component (packages first, then project)
4. Evaluate child APIs with full SSR lifecycle
5. Initialize variables; group slotted children by slot name
6. Add instance and variant custom properties
7. Recursively call `renderComponent()` for the child

#### Slot Node

- Slotted content from parent: render that content
- No slotted content: render slot's own `node.children` as fallback

#### Conditional Rendering

Evaluate condition formula → `toBoolean()`. Falsy → skip node entirely (empty string).

#### List Rendering (Repeat)

Evaluate repeat formula → iterate array. Each item rendered with:

```typescript
ListItem: {
  Item: unknown      // Current item value
  Index: number      // Numeric array index
  Key: string        // String key from Object.entries()
  Parent?: ListItem  // Parent ListItem for nested repeats
}
```

### 1.5 Head Construction (`getHeadItems`)

Returned in this order:

| # | Element | Source |
|---|---------|--------|
| 1 | `<meta charset="...">` | `info.charset` formula or `'utf-8'` |
| 2 | `<meta name="viewport" ...>` | Hard-coded |
| 3 | `<title>` | `info.title` formula or page name |
| 4 | `<meta name="description">` | `info.description` formula |
| 5 | `<meta property="og:description">` | Auto-created from description if no explicit OG entry |
| 6 | `<link rel="icon">` | `info.icon` formula |
| 7 | Custom meta/link entries | `info.meta` record |
| 8 | `<link rel="stylesheet" href="/_static/reset.css">` | Hard-coded |
| 9 | `<link rel="stylesheet" href="/_static/{page}.css">` | Page name |
| 10 | `<link rel="stylesheet" href="/.toddle/fonts/...">` | Font declarations |
| 11 | `<style>` blocks | Custom property rules from rendering |
| 12 | `<script type="speculationrules">` | Prerender hints |

Speculation rules:
```json
{
  "prerender": [
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"eager\"]" }, "eagerness": "eager" },
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"moderate\"]" }, "eagerness": "moderate" }
  ]
}
```

### 1.6 HTML Document Assembly

```html
<!doctype html>
<html lang="{lang}" data-nc-theme="{theme}">
  <head>{headItems}</head>
  <body>
    <div id="App">{bodyHtml}</div>
    <script type="application/json" id="layr-data">
      {toddleInternals JSON — </script> escaped to <\/script>}
    </script>
    <script type="module">{hydrationScript}</script>
  </body>
</html>
```

### 1.7 Hydration Data (`toddleInternals`)

Serialized into `<script type="application/json" id="layr-data">`:

| Field | Type | Notes |
|-------|------|-------|
| `project` | `string` | Project short ID |
| `branch` | `string` | Branch name (default: `'main'`) |
| `commit` | `string` | Commit hash (default: `'unknown'`) |
| `pageState` | `ComponentData` | Full component data including API cache |
| `component` | `Component` | Page component — test data stripped |
| `components` | `Component[]` | All included components — test data stripped |
| `isPageLoaded` | `false` | Set to `true` after client hydration |
| `cookies` | `string[]` | Cookie names only (not values) |

### 1.8 Test Data Removal

Before serialization, `removeTestData()` strips editor-only fields:
- `testValue` from attributes, path params, query params
- `dummyEvent` from events
- `description`, `group`, `label` from actions
- `service`, `servicePath` from APIs

---

## 2. Runtime DOM Rendering (`@layr/runtime`)

### 2.1 Entry Point (`renderComponent`)

```typescript
interface RenderContext {
  dataSignal: Signal<ComponentData>
  component: Component
  root: Element
  abortSignal: AbortSignal
}

function renderComponent(ctx: RenderContext): Element[]
```

Looks up `nodes['root']` from the component definition and calls `createNode()`.

Lifecycle hooks batched via `BatchQueue` (single `requestAnimationFrame`):
- `onLoad` — queued once after mount
- `onAttributeChange` — queued on each attribute change (deep equality prevents spurious fires)

### 2.2 Node Dispatch (`createNode`)

Decision tree:

```
node.repeat?      → repeat()       — list rendering with reconciliation
node.condition?   → conditional()  — lazy create/destroy with signal lifecycle
neither?          → create()       — direct node creation

create() dispatch:
  node.type === 'element'   → createElement()
  node.type === 'component' → createComponent()
  node.type === 'text'      → createText()
  node.type === 'slot'      → createSlot()
```

### 2.3 Element Creation (`createElement`)

1. Resolve tag name (may come from formula); validate against `/^[a-zA-Z][a-zA-Z0-9-]*$/`
2. Detect namespace:
   - `svg` tag → `http://www.w3.org/2000/svg`
   - `math` tag → `http://www.w3.org/1998/Math/MathML`
   - Explicit `xmlns` attribute overrides inference
   - Namespace propagates to all children
3. `document.createElementNS()` or `document.createElement()`

Data attributes on every rendered element:

| Attribute | Value |
|-----------|-------|
| `data-node-id` | Node ID from component definition |
| `data-id` | Path string (e.g., `0.1.2`) |
| `data-component` | Component name (non-root components) |
| `class` | Style hash + instance classes |

Path format:
- Root: `"0"` or inherited path
- Child: `${parentPath}.${childIndex}` — e.g., `0.1.2`
- Repeat item: `${parentPath}(${repeatKey})` — e.g., `0.1(abc)`
- Slot child: `${parentPath}.${childIndex}[${slotName}]` — e.g., `0.1.2[header]`

#### Attribute Bindings

```typescript
// Static
setAttribute(element, key, value)

// Dynamic — formula-to-signal pattern
dataSignal.map(data => applyFormula(formula, { data }))
  .subscribe(value => setAttribute(element, key, value))
```

`setAttribute` behavior:
- `null | undefined | false` → `removeAttribute()`
- `true` → `setAttribute(name, '')`
- Other → `setAttribute(name, String(value))`

Special: `autofocus` skipped in preview mode.

#### Class Bindings

```typescript
// Static classes — added directly
// Dynamic classes — one mapped signal per class
dataSignal.map(data => toBoolean(applyFormula(formula)))
  .subscribe(add => add ? classList.add(name) : classList.remove(name))
```

#### Style Variables (Inline)

```typescript
dataSignal.map(data => applyFormula(formula) + unit)
  .subscribe(value => element.style.setProperty('--name', value))
```

#### CSS Custom Properties (Stylesheet Rules)

Managed through `CustomPropertyStyleSheet`:
1. `registerProperty(selector, name)` → returns update function
2. Map-based O(1) `CSSStyleRule` lookup
3. Handles `@media`, `@starting-style`, pseudo-element selectors
4. Variant properties get separate rules per variant
5. SSR hydration: `hydrateFromBase()` indexes SSR-generated rules
6. `unregisterProperty()` called on signal destruction

#### Event Handlers

```typescript
// Events collected from node.events → [eventName, handler] pairs
element.addEventListener(eventName, handler, { signal: abortSignal })
// AbortSignal from component AbortController — auto-removed on unmount
```

DragEvent: handler augments `e.data` with parsed drag transfer data.
ClipboardEvent: handler augments `e.data` with clipboard items keyed by MIME type.

#### Script / Style Tags

Text children concatenated into `textContent` (not individual text nodes). Dynamic text creates signal that rewrites entire `textContent` on change.

#### Child Rendering

Iterates `node.children`, calls `createNode()` for each, appends via `elem.append(...childNodes)`.

#### Cleanup

```typescript
dataSignal.subscribe(() => {}, { destroy: () => elem.parentNode?.removeChild(elem) })
```

### 2.4 Text Node Creation (`createText`)

**Default (non-namespace):**
- Creates `<span>` with `data-node-type="text"`, `data-node-id`, `data-component`, `data-node-type`
- Static text: `innerText` directly
- Dynamic text: `dataSignal.map(data => String(applyFormula(formula))).subscribe(v => elem.innerText = v)`

**SVG/MathML namespace:**
- Creates raw `Text` node via `document.createTextNode()`
- No wrapper element
- Static: sets `nodeValue`; Dynamic: signal subscription updates `nodeValue`

### 2.5 Slot Rendering (`createSlot`)

**With slotted content from parent:**
1. Create child data signal (identity map for lifecycle isolation)
2. Link destruction to parent data signal
3. Render each child with `createNode()`, merging provider context

**Without slotted content:**
Render slot's own `node.children` as placeholder (fallback content).

**Custom element root:**
Create native `<slot name="${slotName}">` for Shadow DOM content projection.

### 2.6 Conditional Rendering

```typescript
// Show signal
showSignal = dataSignal.map(data => toBoolean(applyFormula(condition)))

// Toggle function
subscribe(show => {
  if (show && !elements.length) {
    // Create isolated child data signal, render, insert into DOM
  } else if (!show && elements.length) {
    // Destroy child signal (cascade cleanup), remove elements
  }
})
```

Lifecycle isolation: child content gets its own `dataSignal.map(data => data)` (identity map) — independently destroyable.

First-run optimization: elements created but NOT inserted on initial render (parent `append()` handles that). DOM insertion only on subsequent show/hide toggles.

Insertion point: `getNextSiblingElement(path, parentElement)` parses `data-id` attributes of siblings.

Preview mode: selected hidden nodes have conditions removed to force visibility.

### 2.7 List Rendering (Repeat)

```typescript
repeatSignal = dataSignal.map(data => Object.entries(applyFormula(repeat)))
// Returns [key, value] pairs — works with arrays and objects
```

Keyed reconciliation — maintains `Map<key, { dataSignal, cleanup, elements }>`:

| Step | Action |
|------|--------|
| 1 | Evaluate keys: `repeatKey` formula or array index |
| 2 | Reuse existing: update item's `dataSignal` with new `ListItem` data (no DOM re-creation) |
| 3 | Create new: new child signal, subscribe to parent, render nodes |
| 4 | Cleanup removed: `cleanup()`, destroy signal, remove DOM elements |
| 5 | Reorder: `ensureEfficientOrdering()` — processes in reverse, only calls `insertBefore()` where needed |

Duplicate keys: `console.warn("Duplicate key")`, fall back to array index, disable optimization.

Empty repeat (null/undefined/empty): clean up all items.

### 2.8 Component Instance Creation (`createComponent`)

1. Look up component by `package/name` in `ctx.components`
2. Create attribute signal: map parent data to evaluate attribute formulas
3. Subscribe to CSS custom property signals
4. Create component data signal with `Location`, `Attributes`, `Apis` (loading/idle)
5. Subscribe to ancestor context providers
6. Evaluate `initialValue` formulas for variables
7. Create AbortController linked to signal destruction
8. Create APIs (sorted by dependency order)
9. Register context provider if component exposes formulas/workflows
10. Group slotted children by slot name
11. Subscribe to global theme signal
12. Subscribe attribute signal to link parent → component data
13. Call `renderComponent()` with new context

### 2.9 Formula-to-Signal Pattern

Every dynamic value follows this pattern:

```
1. dataSignal.map(data → applyFormula(formula, { data, ... }))
2. .subscribe(value → updateDOM(value))
3. Parent signal destruction → child signal destruction → subscriber cleanup (automatic)
```

---

## 3. Security and Sanitization

### HTML Escaping

```typescript
// Content encoding
escapeHtml(str): replaces &, <, >, ", '

// Attribute value encoding
escapeAttrValue(value): replaces &, ", <, >

// Text with newline support
toEncodedText(value): escapeHtml + \n → <br />
```

### Tag and Attribute Validation

| Validation | Pattern | Fallback |
|-----------|---------|---------|
| Tag name | `/^[a-zA-Z][a-zA-Z0-9-]*$/` | `div` |
| Attribute name | `/^[a-zA-Z_][\w\-:.]*$/` | Skip attribute |

### Script Tag Injection Prevention

`escapeScriptTags(json)`: replaces `</script` with `<\/script` in injected JSON.

### URL Parameter Sanitization

`escapeSearchParameters(params)`: HTML-entity encodes all URL search parameter values before formula context injection.

### Header Sanitization

Removed from forwarded/proxied requests:

| Category | Headers |
|----------|---------|
| Hop-by-hop | `connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade` |
| Layr-internal | `x-layr-url`, `x-layr-templates-in-body`, `x-layr-rewrite`, `x-layr-redirect-*` |
| Sensitive | `cookie` (never forwarded to external APIs) |

### Cookie Template Substitution

Pattern: `{{ cookies.<name> }}` applied to API request URLs and headers.
Missing cookie → empty string (not `undefined`) — prevents template syntax leak.

---

## 4. TypeScript Interfaces

```typescript
// SSR
interface RenderResult {
  html: string
  apiCache: Record<string, ApiStatus>
  customProperties: Record<string, string>
}

interface SSROptions {
  getComponent?: (name: string, packageName?: string) => Component | undefined
}

// Runtime
interface RenderContext {
  dataSignal: Signal<ComponentData>
  component: Component
  root: Element
  abortSignal: AbortSignal
}
```

---

## 5. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Component not found | Return empty array; `console.warn` |
| Node not in nodes record | Skip node; `console.warn` |
| Slot has no content or fallback | Render nothing |
| Namespace unknown | Default to HTML; `console.warn` |
| `<script>` during SSR | Return empty string |
| Void elements | Self-closing, no children |
| SVG/MathML namespace | Propagates to all descendants |
| `condition` + `repeat` on same node | Repeat is outer; each item can be individually conditional |
| Empty repeat formula result | Clean up all rendered items |
| Duplicate repeat keys | Fall back to index; `console.warn` |
| Recursive component render | Depth capped at 100 (SSR); signal cascade cleanup (runtime) |
| Variables re-init on client | Client may differ from SSR (e.g., localStorage) — expected |
| Non-body response codes (101, 204, 205, 304) | Skip body in response |

---

## 6. Cross-References

| Spec | Relationship |
|------|-------------|
| `11-page-lifecycle.md` | Entry points that call `renderComponent()`; hydration sequence |
| `07-event-system.md` | Event binding in `createElement()` |
| `10-api-system.md` | API evaluation during SSR; SSR cache hydration |
| `09-route-matching.md` | Page matching before SSR pipeline |
