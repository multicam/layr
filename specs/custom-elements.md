# Custom Elements (Web Components) Specification

## Purpose

The Custom Elements system exports Layr components as standards-compliant Web Components that can be embedded in any web page. Components are wrapped in Shadow DOM for style isolation, support attribute observation (including complex JavaScript values), and integrate with the full component runtime including signals, APIs, context providers, and the standard library.

### Jobs to Be Done

- Export any non-page component as a self-contained custom element usable on any website
- Provide Shadow DOM encapsulation so component styles don't leak and external styles don't interfere
- Support both simple HTML attributes (strings/numbers) and complex JavaScript values (objects/arrays)
- Emit events that cross the shadow boundary for parent document integration
- Dynamically generate JavaScript bundles with all dependencies resolved
- Handle fonts, themes, custom code, and the full standard library within the bundle

---

## Data Models

### ToddleComponent (extends HTMLElement)

The Web Component wrapper class.

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `toddle` | `Toddle` | public | Toddle instance (debugging access via `element.toddle.errors`) |
| `#component` | `Component` | private | The wrapped Layr component definition |
| `#ctx` | `ComponentContext` | private | Full component rendering context |
| `#shadowRoot` | `ShadowRoot` | private | Shadow DOM root (mode: open) |
| `#signal` | `Signal<ComponentData>` | private | Root reactive signal for component state |
| `#files` | `{ themes }` | private | Theme definitions |

### Custom Element Bundle

Generated dynamically by the backend for each exported component.

| Section | Description |
|---------|-------------|
| JSDoc comment | Lists component name, attributes, and events |
| Runtime import | Imports `defineComponents` and `loadCorePlugins` from static ESM bundle |
| Custom code import | Conditionally imports project custom code |
| Font loading | Injects font `<link>` stylesheet in document head |
| Toddle instance | Creates isolated toddle object with formula/action registries |
| Plugin loading | Registers standard library formulas and actions |
| Custom code loading | Registers project-specific custom formulas and actions |
| Component definition | Calls `defineComponents()` with transformed component definitions |

---

## Custom Element Naming

Components are converted to valid custom element names:

1. Convert to lowercase
2. Remove whitespace
3. If no hyphen present, add `toddle-` prefix (Web Components spec requires at least one hyphen)

**Examples:**
- `MyCounter` → `toddle-mycounter`
- `my-counter` → `my-counter`
- `Shopping Cart` → `toddle-shoppingcart`

---

## Lifecycle

### Definition Phase

1. Browser loads the bundle script: `<script type="module" src="/.toddle/custom-element/counter.js">`
2. `loadCorePlugins(toddle)` registers all standard library formulas and actions
3. Custom code loads (if present) and registers custom formulas/actions
4. `defineComponents()` calls `customElements.define()` for each component
5. `observedAttributes` set to lowercased attribute keys (HTML attributes are case-insensitive)

### Construction Phase

1. Element created via HTML parsing or `document.createElement()`
2. Constructor:
   - Calls `attachInternals()` (future declarative shadow DOM / form participation)
   - Creates Shadow DOM via `attachShadow({ mode: 'open' })`
   - Creates component data signal with initial state
   - Creates abort controller for lifecycle management
   - Builds full `ComponentContext`

### Connection Phase (connectedCallback)

1. **API initialization:** APIs sorted by dependency, initialized in order
2. **API v2 actions:** `onCompleted`/`onFailed` actions triggered for v2 APIs
3. **Context provider setup:** If component exposes context, registers formula signals in providers
4. **Theme subscription:** Subscribes to theme signal, updates `data-nc-theme` attribute
5. **Render:** Calls internal `render()` method

### Render

1. `renderComponent()` generates DOM elements using the standard component rendering pipeline
2. Shadow root cleared (`innerHTML = ''`)
3. Stylesheet created with options:
   - `includeResetStyle: true` — includes CSS reset (flexbox defaults, margin removal, etc.)
   - `createFontFaces: false` — font faces loaded separately in document head
4. Style element appended to shadow root
5. Rendered elements appended to shadow root
6. Lifecycle hooks (`onLoad`, `onAttributeChange`) deferred via `BatchQueue`

### Update Phase

Attribute changes propagate through two paths:

**HTML attribute changes** (e.g., `element.setAttribute('name', 'Alice')`):
1. `attributeChangedCallback(name, oldValue, newValue)` fires
2. Case-insensitive attribute name resolution
3. Skip if value is object placeholder `[Object object]`
4. Skip if value was just set as number (already handled)
5. Update signal with new string value

**Complex value changes** (e.g., `element.setAttribute('data', { foo: 'bar' })`):
1. `setAttribute()` override detects non-string type
2. Sets placeholder HTML attribute: `[Object ${typeof value}]`
3. Updates signal directly with actual JavaScript value
4. `attributeChangedCallback` skips placeholder values

### Disconnection Phase (disconnectedCallback)

1. `this.#signal.destroy()` cascades:
   - All subscriber destroy callbacks fire
   - Derived signals destroyed
   - AbortController aborted (cancels pending API requests)
   - Event listeners removed via abort signal
   - DOM elements removed from shadow root

---

## Attribute Handling

### Dual-Value System

HTML attributes only store strings. Layr components need to accept any JavaScript value. The system maintains a dual-value approach:

| Value Type | HTML Attribute | Signal | Source of Truth |
|------------|---------------|--------|-----------------|
| `string` | Actual value | Updated via `attributeChangedCallback` | HTML attribute → signal |
| `number` | String representation | Updated directly in `setAttribute` override | Signal (HTML attribute is derivative) |
| `object` / `array` / `function` | Placeholder `[Object object]` | Updated directly in `setAttribute` override | Signal (HTML attribute is placeholder) |

### getAttribute Override

Returns value from signal first; falls back to native HTML attribute if not in signal. Supports generic type parameter for TypeScript consumers.

### Case-Insensitive Matching

HTML attributes are case-insensitive. `observedAttributes` are registered as lowercase versions of component attribute keys. `getAttributeCaseInsensitive()` resolves the actual key when `attributeChangedCallback` fires.

---

## Event Emission

Components emit events via the `dispatch()` method, mapped to the `triggerEvent` function in the component context:

```
dispatch(eventName, data) → new CustomEvent(eventName, {
  detail: data,
  bubbles: true,      // Propagates up DOM tree
  composed: true       // Crosses shadow DOM boundary
})
```

**Usage from parent document:**
```html
<toddle-counter></toddle-counter>
<script>
  document.querySelector('toddle-counter')
    .addEventListener('increment', (e) => console.log(e.detail))
</script>
```

---

## Backend Bundle Generation

### Endpoint

`GET /.toddle/custom-element/:filename.js`

### Process

1. **Component lookup:** Extract name from filename, load via `pageLoader()`
2. **Validation:** Return 404 if not found, 403 if component is a page
3. **Dependency resolution:** Recursively collect all included components (project + packages) via `takeIncludedComponents()`
4. **Font resolution:** Generate font stylesheet URL for all fonts used
5. **Code generation:** Assemble JavaScript module with all sections

### Component Transformations

Before serialization into the bundle, components are transformed:

| Transform | Purpose |
|-----------|---------|
| `replaceTagInNodes(elementName, 'div')` | Replaces recursive self-references with `div` to prevent infinite rendering loops |
| `removeTestData()` | Strips test values from attributes, events, and other schema fields |
| `transformRelativePaths(origin)` | Converts relative image/asset paths to absolute URLs |

### Response Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `no-cache` | Ensures fresh bundles during development |
| `Access-Control-Allow-Origin` | `*` | Allows cross-origin embedding on any domain |
| `Content-Type` | `text/javascript` | Correct MIME type for ES module |

### Error Responses

Errors return JSON with:
- `ok: false`
- `error` message
- `link` to documentation (help center URL)
- CORS headers included on errors for debugging visibility

---

## Font Handling

Fonts cannot be reliably loaded inside Shadow DOM (browser support varies). Instead:

1. Backend generates font stylesheet URL from project font configuration
2. Bundle includes code to inject a `<link rel="stylesheet">` in `document.head`
3. Fonts load with `display=swap` strategy
4. Multiple custom elements on the same page share the same font stylesheet (injected once)

---

## Style Isolation

### Shadow DOM Encapsulation

- Component styles are scoped to the shadow root
- External page styles do not affect the custom element's content
- Shadow DOM mode is `open` (allows `element.shadowRoot` access for debugging)

### Reset Styles

A CSS reset layer is included in every custom element:
- Sets `box-sizing: border-box` on all elements
- Removes default margins/padding
- Sets flexbox defaults for layout
- Normalizes form elements

### Theme Support

- Custom element subscribes to a theme signal
- Sets `data-nc-theme` attribute on the host element for theme-based CSS variable scoping
- If project has no themes, a `defaultTheme` with empty values is used

---

## Business Rules

1. **Pages cannot be exported as custom elements.** The backend returns 403 for page components. Custom elements set `Location: undefined` in their data signal.
2. **Custom elements are always root components.** They do not receive context from outside their shadow boundary. `isRootComponent: true` is set in the context.
3. **Package is undefined.** Custom elements are project-level, so `ctx.package` is `undefined`.
4. **One toddle instance per bundle.** Each custom element bundle creates its own isolated toddle instance with separate formula/action registries.
5. **Recursive self-reference prevention.** If a component's nodes reference its own custom element tag, those references are replaced with `div` to prevent infinite rendering.

---

## Edge Cases

### Multiple Custom Elements on Same Page

Each custom element type has its own bundle and toddle instance. However:
- Font stylesheets may be injected multiple times (no deduplication built-in)
- `globalThis.toddle.isEqual` is shared (set once, checked before overwrite)
- Standard library is loaded independently in each bundle

### Complex Attribute Serialization

When setting an object attribute, the HTML attribute shows `[Object object]` as a placeholder. This is intentional — the actual value lives in the signal. Inspecting HTML attributes in DevTools will show placeholders for complex values.

### Custom Code Dependencies

Custom code is loaded as a separate module from `/.toddle/custom-code.js?entry=<componentName>`. If custom code fails to load:
- The custom element still renders
- Custom formulas/actions will be undefined
- Errors appear in `toddle.errors` array

### Attribute Type Coercion

Numbers set via `setAttribute('count', 42)` are stored as numbers in the signal but as strings in the HTML attribute. `attributeChangedCallback` detects this by comparing `parseFloat(newValue)` with the current raw value to avoid double-processing.

---

## Dependencies

- **Signal System** — Component data signal and reactive updates
- **Component System** — `renderComponent()` for DOM generation
- **Styling System** — `createStylesheet()` for scoped CSS generation
- **Standard Library** — Loaded via `loadCorePlugins()`
- **SSR Utilities** — `takeIncludedComponents()`, `replaceTagInNodes()`, `removeTestData()`, `transformRelativePaths()`
- **Backend** — Hono route handler for dynamic bundle generation
