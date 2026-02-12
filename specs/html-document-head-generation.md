# HTML Document & Head Generation Specification

## Purpose

The HTML Document & Head Generation system constructs complete HTML documents for server-side rendered pages. It assembles the `<head>` section with meta tags, stylesheets, fonts, icons, speculation rules, and custom code imports, then combines them with the rendered body and hydration data into a final HTML response. On the client side, it reactively updates dynamic `<head>` elements (title, description, meta tags, language) as component data changes.

### Jobs to Be Done

- Assemble complete HTML documents from rendered body, head items, and hydration data
- Generate ordered, deduplicated `<head>` items including meta tags, stylesheets, fonts, and scripts
- Compute page title, description, language, charset, and theme from route formulas
- Handle icon/favicon resolution with Cloudflare image path support for multiple sizes
- Inject speculation rules for browser-native prerendering
- Inject custom code imports and hydration data for client-side takeover
- Reactively update dynamic `<head>` elements on the client as data changes
- Auto-sync `og:description` with `description` when no explicit OG tag is configured

---

## Data Models

### HeadItemType

A typed string key used to identify and deduplicate head items in a `Map`.

**Format:** `{HeadTagTypes}:{text}` or `'title'`

**Examples:**
- `'title'` — the `<title>` element
- `'meta:description'` — `<meta name="description">`
- `'meta:og:title'` — `<meta property="og:title">`
- `'link:icon:32'` — `<link rel="icon" sizes="32x32">`
- `'script:speculationrules'` — speculation rules script
- `'style:variables'` — custom property stylesheet

### HeadTagTypes

Enum of supported HTML head tag types:

| Value | Tag |
|-------|-----|
| `Meta` | `<meta>` |
| `Link` | `<link>` |
| `Script` | `<script>` |
| `NoScript` | `<noscript>` |
| `Style` | `<style>` |

**Source:** `packages/core/src/component/component.types.ts:280-286`

### MetaEntry

Represents a custom head tag configured on a route.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | `HeadTagTypes` | Yes | The HTML tag type |
| `attrs` | `Record<string, Formula>` | Yes | Attribute formulas evaluated at render time |
| `content` | `Formula?` | No | Inner content formula (for non-void elements) |
| `index` | `number?` | No | Sort order for custom entries |

**Source:** `packages/core/src/component/component.types.ts:139-144`

### PageRoute.info

Route metadata that drives head generation:

| Field | Type | Description |
|-------|------|-------------|
| `title` | `{ formula: Formula }` | Page title formula |
| `description` | `{ formula: Formula }` | Page description formula |
| `language` | `{ formula: Formula }` | HTML `lang` attribute formula |
| `charset` | `{ formula: Formula }` | Document charset formula |
| `theme` | `{ formula: Formula }` | Active theme name formula |
| `meta` | `Record<string, MetaEntry>` | Custom head tag entries |

**Source:** `packages/core/src/component/component.types.ts:248-278`

---

## SSR Head Construction

### getHeadItems() (ssr/src/rendering/head.ts:26-320)

The central function that generates all `<head>` items for a page. Returns a `Map<HeadItemType, string>` where each entry is a complete HTML tag string.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cacheBuster` | `string?` | Version string appended as `?v=` to stylesheet/manifest URLs |
| `context` | `FormulaContext` | Formula evaluation context with page data |
| `cssBasePath` | `string` | Base path for font stylesheets (default: `/.toddle/fonts/stylesheet/css2`) |
| `page` | `ToddleComponent` | The page component being rendered |
| `resetStylesheetPath` | `string` | Path to global reset CSS (default: `/_static/reset.css`) |
| `pageStylesheetPath` | `string` | Path to per-page CSS (default: `/.toddle/stylesheet/{name}.css`) |
| `files` | `ProjectFiles` | Project data including config and packages |
| `project` | `ToddleProject` | Project metadata (name, description, emoji, type, thumbnail) |
| `themes` | `Record<string, Theme>` | Theme definitions for font extraction |
| `url` | `URL` | Current request URL for canonical references |
| `customProperties` | `string[]` | CSS custom property definitions to inline |

**Algorithm:**

1. **Compute title and description** from route formulas, with project-level fallbacks
2. **Collect font preload links** from all V2 themes
3. **Build default head items** in this order:
   - Reset stylesheet link (fetchpriority: high)
   - Page stylesheet link (fetchpriority: high)
   - Custom properties inline `<style>`
   - Font stylesheet links
   - Charset meta tag
   - Viewport meta tag
   - Title + og:title + apple-mobile-web-app-title
   - Description + og:description (only if description exists)
   - og:type (always "website")
   - og:url (current page URL)
   - application-name meta
   - Speculation rules script
4. **Handle package thumbnails**: If project is a package with a thumbnail, add og:image
5. **Handle manifest**: If configured, add manifest link and skip default theme-color; otherwise add default theme-color and msapplication-TileColor
6. **Handle icons**: Resolve from `config.meta.icon` formula:
   - Cloudflare image paths → generate 16x16, 32x32, and 48x48 (shortcut icon) variants
   - Other paths → single icon link
   - No icon configured → use project emoji as SVG favicon, add default mask-icon and apple-touch-icon
7. **Process custom meta entries**: Sort by `index`, evaluate attribute formulas, generate tags with `data-toddle-id` for client-side updates

**Business Rules:**
- The Map key system provides automatic deduplication — custom meta entries can override default entries by using the same key
- Font preload includes ALL project fonts (not just page-used fonts) for cross-page cache efficiency
- Custom meta entries are processed last so they can override any default
- Attribute values are escaped via `escapeAttrValue()` to prevent XSS
- Boolean `true` attribute values render as bare attributes (e.g., `<script async>`)
- Void elements self-close with `/>`, non-void elements get inner content

### renderHeadItems() (ssr/src/rendering/head.ts:322-334)

Sorts head items by priority and renders them as a newline-joined HTML string.

**Algorithm:**
1. Convert Map entries to array
2. Sort by position in `defaultHeadOrdering` array
3. Items not in the ordering array sort to the end
4. Join with `\n    ` (4-space indent)

### Default Head Ordering

Items are rendered in this priority order:

| Priority | Key | Rationale |
|----------|-----|-----------|
| 1 | `meta:charset` | Must be within first 1024 bytes |
| 2 | `meta:viewport` | Prevents layout shift |
| 3 | `title` | Primary SEO signal |
| 4 | `meta:description` | Secondary SEO signal |
| 5-7 | `link:icon:*` | Browser favicon requests |
| 8 | `meta:og:title` | Social sharing |
| 9 | `meta:application-name` | PWA name |
| 10 | `meta:og:url` | Canonical for social |
| 11 | `meta:og:description` | Social description |
| 12 | `meta:og:type` | Social type hint |
| 13 | `link:manifest` | PWA manifest |
| 14-15 | Icon links | Mask icon, apple-touch-icon |
| 16-18 | Theme + app meta | theme-color, apple title, tile color |
| 19 | `meta:og:locale` | Locale hint |
| 20 | `link:reset` | Global reset stylesheet |
| 21 | `link:page` | Per-page stylesheet |
| ... | Custom entries | After all predefined tags |

**Source:** `packages/ssr/src/rendering/head.ts:339-363`

---

## HTML Helpers

### getHtmlLanguage() (ssr/src/rendering/html.ts:6-19)

Evaluates the language formula from route info.

| Input | Fallback | Output |
|-------|----------|--------|
| Formula evaluates to string | — | That string |
| Formula evaluates to non-string | `defaultLanguage` | `'en'` |
| No language formula | `defaultLanguage` | `'en'` |

### getCharset() (ssr/src/rendering/html.ts:21-34)

Evaluates the charset formula from route info.

| Input | Fallback | Output |
|-------|----------|--------|
| Formula evaluates to string | — | That string |
| Formula evaluates to non-string | `defaultCharset` | `'utf-8'` |
| No charset formula | `defaultCharset` | `'utf-8'` |

### getTheme() (ssr/src/rendering/html.ts:36-47)

Determines the active theme for the page.

**Resolution order:**
1. Route info `theme.formula` evaluation → use if string
2. Cookie `nc-theme` value → use if string
3. Return `null` (no theme)

### getPageTitle() (ssr/src/rendering/head.ts:365-381)

| Input | Fallback |
|-------|----------|
| Title formula evaluates to string | — |
| No title formula or non-string result | `project.name` or `component.name` |

### getPageDescription() (ssr/src/rendering/head.ts:383-398)

| Input | Fallback |
|-------|----------|
| Description formula evaluates to string | — |
| No description formula or non-string result | `project.description` |
| No project description | `undefined` (no meta tag emitted) |

---

## Document Assembly

### nordcraftPage() (backend/src/routes/nordcraftPage.ts:38-240)

The top-level orchestrator that assembles a complete HTML response from component data.

**Pipeline:**

1. **Create formula context** via `getPageFormulaContext()` with request headers, cookies, URL
2. **Extract language** via `getHtmlLanguage()`
3. **Resolve themes** from `files.themes` or fall back to `files.config.theme` or built-in default
4. **Collect included components** via `takeIncludedComponents()` for tree-shaking
5. **Render page body** via `renderPageBody()` — includes API prefetching
6. **Build head items** via `getHeadItems()` + `renderHeadItems()`
7. **Extract charset** via `getCharset()`
8. **Prepare hydration data** (`ToddleInternals` JSON)
9. **Generate code import** — inline `<script type="module">` that bootstraps the client
10. **Resolve theme attribute** for `<html>` element
11. **Assemble final HTML** document

**HTML Document Structure:**

```html
<!doctype html>
<html lang="{language}" data-nc-theme="{theme}">
  <head>
    {renderedHeadItems}
  </head>
  <body>
    <div id="App">{renderedBody}</div>
    <script type="application/json" id="nordcraft-data">
      {toddleInternals JSON}
    </script>
    <script type="module">
      import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
      import { loadCustomCode, formulas, actions } from '{customCodeUrl}'
      window.__toddle = JSON.parse(document.getElementById('nordcraft-data').textContent);
      window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
      initGlobalObject({formulas, actions});
      loadCustomCode();
      createRoot(document.getElementById("App"));
    </script>
  </body>
</html>
```

**Hydration Data (ToddleInternals):**

| Field | Type | Description |
|-------|------|-------------|
| `project` | `string` | Project short_id |
| `branch` | `string` | Branch name (default: `'main'`) |
| `commit` | `string` | Commit hash (default: `'unknown'` for self-hosted) |
| `pageState` | `ComponentData` | Pre-computed component data including API responses |
| `component` | `Component` | Page component definition (test data removed) |
| `components` | `Component[]` | All included components (test data removed) |
| `isPageLoaded` | `boolean` | Always `false` — set to `true` after client hydration |
| `cookies` | `string[]` | Cookie names available in the request |

**Business Rules:**
- `</script>` in JSON is escaped to `<\/script>` to prevent premature tag closure
- Components without custom code still import `page.main.esm.js` but pass empty `formulas: {}` and `actions: {}`
- The `data-nc-theme` attribute is only added when a theme is resolved (non-falsy)
- API redirect errors during body rendering return HTTP redirects with diagnostic headers (`x-nordcraft-redirect-api-name`, `x-nordcraft-redirect-component-name`)
- Other rendering errors return `500 Internal server error`

---

## Client-Side Dynamic Head Updates

### setupMetaUpdates() (runtime/src/page.main.ts:358-546)

After hydration, subscribes to the data signal to reactively update `<head>` elements when component data changes. Only subscribes to formulas that are dynamic (non-static).

**Dynamic Language Updates:**

If `route.info.language.formula` is not a static `value` type:
1. Create a derived signal from `dataSignal` that evaluates the language formula
2. Subscribe: when the new language differs from `document.documentElement.lang`, update it

**Dynamic Title Updates:**

If `route.info.title.formula` is not a static `value` type:
1. Create a derived signal evaluating the title formula
2. Subscribe: when the new title differs from `document.title`, update it

**Dynamic Description Updates:**

If `route.info.description.formula` is not a static `value` type:
1. Create a derived signal evaluating the description formula
2. Subscribe: find or create `<meta name="description">`, set its `content`
3. **Auto-sync og:description**: If no custom `og:description` meta entry is configured, automatically create/update `<meta property="og:description">` with the same value

**Dynamic Custom Meta Updates:**

For each meta entry where any attribute formula is non-static:
1. Create a derived signal evaluating all attribute formulas
2. Subscribe: find existing element by `data-toddle-id`, or by `name`/`property` attribute, or create a new element
3. Apply all computed attributes

**Element Lookup Strategy:**

1. **By `data-toddle-id`**: If the meta entry has an ID (custom entries), look up by `[data-toddle-id="{id}"]`
2. **By `name` or `property` attribute**: Find the first `<meta>` whose `name` or `property` attribute matches
3. **Create new**: If neither lookup succeeds, create a new element and append to `<head>`

**Business Rules:**
- Static formulas (`type === 'value'`) are skipped entirely — their SSR-rendered values are already correct
- Only dynamic formulas trigger signal subscriptions
- The `og:description` auto-sync only applies when no explicit `og:description` meta entry is configured in the route
- Meta element matching by `name`/`property` ensures client updates target the same elements SSR rendered

---

## Font Integration

### getFontCssUrl() (ssr/src/rendering/fonts.ts:4-83)

Generates a Google Fonts-compatible CSS URL for font preloading.

**Algorithm:**

1. For each font in the theme:
   - Sort variants by weight
   - Split into italic and non-italic ranges
   - Encode weight ranges (e.g., `400;700`)
   - If italic variants exist, use `ital,wght@` axis format
   - Otherwise, use `wght@` format
2. Build URL: `{basePath}?display=swap&family={encoded families}`
3. Return `{ swap: url }` object

**Font URL format:** `/.toddle/fonts/stylesheet/css2?display=swap&family=Roboto:wght@400;700&family=Open+Sans:ital,wght@0,400;0,700;1,400`

**Business Rules:**
- `font-display: swap` is always used for performance
- All project fonts are included (not just page-used fonts) for better cross-page caching
- Variable font ranges are not yet supported (TODO in source)
- Fonts are proxied through `/.toddle/fonts/` to avoid third-party requests

---

## Icon Resolution

### Algorithm (ssr/src/rendering/head.ts:206-273)

1. **Config icon exists** (`files.config.meta.icon`):
   - Evaluate icon formula → `iconPath`
   - **Cloudflare image path** (detected by `isCloudflareImagePath()`):
     - Generate three sizes: `{basePath}/16`, `{basePath}/32`, `{basePath}/48`
     - Emit `link:icon:16` (16x16), `link:icon:32` (32x32), `link:icon` (shortcut, 48x48)
   - **Other path**: Emit single `link:icon`

2. **No config icon** — check if custom meta already provides icons:
   - If custom meta entries don't include icon-related links, add defaults:
     - **Project emoji**: Convert to SVG data URI favicon (`data:image/svg+xml,...`)
     - **Mask icon**: Default Layr Safari pinned tab SVG
     - **Apple touch icon**: Default Layr 180x180 PNG
     - **Standard icons**: Default Layr 16x16 and 32x32 PNGs

---

## Speculation Rules

### defaultSpeculationRules (ssr/src/rendering/speculation.ts)

Hardcoded prerender rules injected into every page:

| Rule | Selector | Eagerness |
|------|----------|-----------|
| Eager prerender | `[data-prerender="eager"]` | `eager` — prerender immediately |
| Moderate prerender | `[data-prerender="moderate"]` | `moderate` — prerender on hover/focus |

**Business Rules:**
- Rules are not configurable per-project (hardcoded)
- Only elements with explicit `data-prerender` attributes are affected
- Injected as `<script type="speculationrules">` in the head

---

## Cache Busting

### urlWithCacheBuster() (ssr/src/rendering/head.ts:400-403)

Appends a version query parameter to URLs when a cache buster is provided.

**Format:** `{url}?v={cacheBuster}`

**Applied to:**
- Reset stylesheet URL
- Manifest URL

**Not applied to:**
- Page stylesheet URL (has its own cache strategy)
- Font URLs (versioned by font configuration)
- Custom meta URLs (user-controlled)

---

## Attribute Escaping

### escapeAttrValue() (ssr/src/rendering/attributes.ts:19-24)

Escapes values for safe use in HTML attributes.

**Algorithm:**
1. Return empty string for `null`, `undefined`, or non-primitive types
2. Only accept `string`, `number`, `boolean` types
3. Escape `"` → `&quot;`
4. Escape `<` → `&lt;`
5. Escape `>` → `&gt;`

### toEncodedText() (ssr/src/rendering/attributes.ts:37-45)

Escapes strings for safe use as HTML text content.

**Escapes:** `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`, `\n` → `<br />`

---

## Edge Cases and Error Handling

### Missing Route Info

If a page has no `route.info`:
- Title falls back to project name, then component name
- Description falls back to project description, then omitted entirely (no meta tag)
- Language defaults to `'en'`
- Charset defaults to `'utf-8'`
- No custom meta tags are processed

### Description Omission

Description is only emitted when it evaluates to a non-empty string. If `null` or `undefined`:
- `<meta name="description">` is not added
- `<meta property="og:description">` is not added
- This avoids empty description meta tags that could harm SEO

### Manifest-Dependent Theme Color

- **With manifest configured**: `theme-color` and `msapplication-TileColor` are NOT added (manifest handles this)
- **Without manifest**: Default `#171717` theme color is added

### Custom Meta Override

Custom meta entries in `route.info.meta` can override any default head item by generating the same `HeadItemType` key. For example, a custom meta entry with `property="og:title"` will override the auto-generated og:title.

### Client-Side Element Creation

When `setupMetaUpdates` cannot find an existing DOM element for a meta entry:
- A new element is created with `document.createElement()`
- `data-toddle-id` is set if the entry has an ID
- The element is appended to `<head>`
- This handles cases where SSR didn't render the element (e.g., description was null at SSR time but becomes non-null on the client)

### Script Injection Safety

The hydration JSON data is placed in a `<script type="application/json">` tag (not executable) and all `</script>` occurrences within the JSON are escaped to `<\/script>` to prevent premature tag closure.

---

## Dependencies

| System | Relationship |
|--------|-------------|
| [SSR Pipeline](./ssr-pipeline.md) | `nordcraftPage()` is called by the page handler after body rendering |
| [Formula System](./formula-system.md) | Route info formulas evaluated for title, description, language, charset, theme |
| [Styling and Theming](./styling-and-theming.md) | Theme data drives font preloading and custom property injection |
| [SEO & Web Standards](./seo-web-standards.md) | Speculation rules injected; icon/manifest integration |
| [Navigation System](./navigation-system.md) | `setupMetaUpdates()` provides client-side head lifecycle |
| [Hydration System](./hydration-system.md) | `ToddleInternals` JSON bridges SSR to CSR |
| [Security and Sanitization](./security-and-sanitization.md) | `escapeAttrValue()` prevents XSS in head tags |
| [Font System](./font-system.md) | `getFontCssUrl()` generates font preload links |
| [Build and Deployment](./build-and-deployment.md) | `cacheBuster` ties into release versioning |
| [Package Management](./package-management.md) | Package thumbnails used for og:image on package projects |

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxItems` | 10,000 | Maximum items |

### Enforcement

- Size: Truncate with warning
- Time: Cancel with error
- Items: Stop processing

---

## Invariants

1. Operations MUST be valid
2. Operations MUST be safe
3. Results MUST be deterministic

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Operation fails | Log, continue |
| Timeout | Cancel |
| Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
