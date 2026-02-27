# SEO and Head Generation

Assembles the HTML `<head>` section for SSR pages and serves standard web resource files (sitemap, robots.txt, manifest, favicon). Sitemap and robots.txt generators exist as utility functions but are not wired to HTTP routes yet.

**Packages:** `@layr/ssr`, `@layr/backend`

---

## Phase Summary

| Feature | Phase | Status |
|---------|-------|--------|
| `<head>` assembly (meta, title, OG, charset, viewport) | MVP | Implemented |
| Font `<link>` tags | MVP | Implemented |
| Favicon resolution (Cloudflare + generic) | MVP | Implemented |
| Speculation rules injection | MVP | Implemented |
| Client-side dynamic head updates | MVP | Implemented |
| `og:description` auto-sync | MVP | Implemented |
| Sitemap/robots.txt generator functions | MVP | Implemented |
| Manifest JSON generator function | MVP | Implemented |
| `GET /sitemap.xml` HTTP route | Phase 2 | Not wired |
| `GET /robots.txt` HTTP route | Phase 2 | Not wired |
| `GET /manifest.json` HTTP route | Phase 2 | Not wired |
| `GET /favicon.ico` HTTP route | Phase 2 | Not wired |
| `GET /serviceWorker.js` HTTP route | Phase 2 | Not wired |
| Twitter Card meta tags | MVP | Implemented (utility function) |

---

## Head Item System

### HeadItemType Keys

A typed string key used to identify and deduplicate items in a `Map<HeadItemType, string>`.

| Key | Tag |
|-----|-----|
| `'title'` | `<title>` |
| `'meta:description'` | `<meta name="description">` |
| `'meta:og:title'` | `<meta property="og:title">` |
| `'meta:og:description'` | `<meta property="og:description">` |
| `'meta:og:url'` | `<meta property="og:url">` |
| `'meta:og:type'` | `<meta property="og:type">` |
| `'meta:og:image'` | `<meta property="og:image">` |
| `'meta:viewport'` | `<meta name="viewport">` |
| `'meta:charset'` | `<meta charset="...">` |
| `'link:icon'` | `<link rel="icon">` |
| `'link:icon:16'` | `<link rel="icon" sizes="16x16">` |
| `'link:icon:32'` | `<link rel="icon" sizes="32x32">` |
| `'link:manifest'` | `<link rel="manifest">` |
| `'link:reset'` | Reset CSS stylesheet link |
| `'link:page'` | Per-page stylesheet link |
| `'link:font:swap'` | Font stylesheet link |
| `'script:speculationrules'` | Speculation rules script |
| `'style:variables'` | Custom property inline style |

Custom meta entries use the same key system — they can override any default entry.

### Head Tag Types

```typescript
enum HeadTagTypes {
  Meta = 'meta',
  Link = 'link',
  Script = 'script',
  NoScript = 'noscript',
  Style = 'style',
}
```

### MetaEntry Interface

```typescript
interface MetaEntry {
  tag: HeadTagTypes
  attrs: Record<string, Formula>    // evaluated at render time
  content?: Formula                 // inner content (non-void elements)
  index?: number                    // sort order for custom entries
}
```

---

## SSR Head Construction

### `getHeadItems(page, files, project, themes, context, options)`

Returns `Map<HeadItemType, string>` — complete HTML tag strings, deduplicated.

**Build order:**

1. Compute title and description from route formulas (fall back to project name/description)
2. Collect font preload links from all V2 themes
3. Emit default items:

| Order | Item |
|-------|------|
| 1 | `<meta charset="...">` |
| 2 | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| 3 | `<title>` |
| 4 | `<meta name="description">` |
| 5–7 | Icon `<link>` tags |
| 8 | `<meta property="og:title">` |
| 9 | `<meta name="application-name">` |
| 10 | `<meta property="og:url">` |
| 11 | `<meta property="og:description">` (only if description exists) |
| 12 | `<meta property="og:type" content="website">` |
| 13 | `<link rel="manifest">` (if configured) |
| 14–15 | Mask icon, apple-touch-icon |
| 16–18 | `theme-color`, `apple-mobile-web-app-title`, `msapplication-TileColor` |
| 20 | Reset stylesheet `<link>` |
| 21 | Page stylesheet `<link>` |
| 22+ | Font stylesheet `<link>` |
| last | Custom meta entries (can override any above) |

Speculation rules: `<script type="speculationrules">` injected in head.

**Key rules:**
- Description emitted only when non-empty string (avoids empty meta tags)
- With manifest configured: theme-color and msapplication-TileColor skipped (manifest handles it)
- Without manifest: default `theme-color: #171717` added
- All project fonts included (not just page-used) for cross-page cache efficiency
- Attribute values escaped via `escapeAttrValue()` to prevent XSS

### `renderHeadItems(items)`

Sorts by `defaultHeadOrdering` array position, joins with `\n    ` (4-space indent).

---

## Route Info (Head Formulas)

```typescript
interface PageRoute {
  info: {
    title: { formula: Formula }
    description: { formula: Formula }
    language: { formula: Formula }
    charset: { formula: Formula }
    theme: { formula: Formula }
    meta: Record<string, MetaEntry>
  }
}
```

### Fallback Chain

| Field | Formula result | Fallback 1 | Fallback 2 |
|-------|---------------|------------|------------|
| title | string | project.name | component.name |
| description | string | project.description | omit tag |
| language | string | `'en'` | — |
| charset | string | `'utf-8'` | — |
| theme | string | cookie `nc-theme` | `null` (no attribute) |

---

## Favicon Resolution

**When `config.meta.icon` is set:**

| Icon path type | Output |
|----------------|--------|
| Cloudflare (`/cdn-cgi/imagedelivery/...`) | 3 `<link>` tags: 16x16, 32x32, shortcut 48x48 |
| Any other path | Single `<link rel="icon">` |

**When no `config.meta.icon` is set and no custom icon in meta:**

| Tag | Source |
|-----|--------|
| `<link rel="icon">` | Project emoji as SVG data URI |
| `<link rel="mask-icon">` | Default Layr Safari pinned-tab SVG |
| `<link rel="apple-touch-icon">` | Default Layr 180x180 PNG |
| Standard 16x16, 32x32 icons | Default Layr PNGs |

---

## Speculation Rules

Injected into every page's `<head>`. Not configurable per-project.

```json
{
  "prerender": [
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"eager\"]" }, "eagerness": "eager" },
    { "source": "document", "where": { "selector_matches": "[data-prerender=\"moderate\"]" }, "eagerness": "moderate" }
  ]
}
```

| Eagerness | Behavior |
|-----------|---------|
| `eager` | Prerender when link visible in viewport |
| `moderate` | Prerender on hover/focus |

Usage: add `data-prerender="eager"` or `data-prerender="moderate"` to `<a>` elements.

---

## Client-Side Dynamic Head Updates

### `setupMetaUpdates()`

After hydration, subscribes reactive signals to `<head>` elements. Static formulas (`type === 'value'`) are skipped — SSR values are already correct.

**Dynamic language:** evaluates `route.info.language.formula` → updates `document.documentElement.lang`

**Dynamic title:** evaluates `route.info.title.formula` → updates `document.title`

**Dynamic description:**
1. Evaluates `route.info.description.formula`
2. Finds or creates `<meta name="description">`, sets `content`
3. If no explicit `og:description` meta entry configured: also creates/updates `<meta property="og:description">` (auto-sync)

**Dynamic custom meta:**
1. Evaluates all attribute formulas for non-static meta entries
2. Finds existing element by `data-toddle-id`, then by `name`/`property` attribute, then creates new
3. Applies computed attributes

---

## Document Assembly

### `layrPage()` Pipeline

1. Create formula context (request headers, cookies, URL)
2. Resolve language via `getHtmlLanguage()`
3. Resolve themes from `files.themes` or config fallback
4. Collect included components for tree-shaking
5. Render page body via `renderPageBody()`
6. Build head items via `getHeadItems()` + `renderHeadItems()`
7. Extract charset via `getCharset()`
8. Prepare hydration data (`ToddleInternals` JSON)
9. Generate client bootstrap script
10. Resolve `data-nc-theme` attribute
11. Assemble final HTML

**Output structure:**

```html
<!doctype html>
<html lang="{lang}" data-nc-theme="{theme}">
  <head>
    {renderedHeadItems}
  </head>
  <body>
    <div id="App">{renderedBody}</div>
    <script type="application/json" id="layr-data">{ToddleInternals JSON}</script>
    <script type="module">
      import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
      import { loadCustomCode, formulas, actions } from '{customCodeUrl}'
      window.__toddle = JSON.parse(document.getElementById('layr-data').textContent);
      window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
      initGlobalObject({formulas, actions});
      loadCustomCode();
      createRoot(document.getElementById("App"));
    </script>
  </body>
</html>
```

**Hydration data (`ToddleInternals`):**

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | Project short_id |
| `branch` | string | Branch name (`'main'`) |
| `commit` | string | Commit hash (`'unknown'` for self-hosted) |
| `pageState` | ComponentData | Pre-computed data including API responses |
| `component` | Component | Page component definition |
| `components` | Component[] | All included components |
| `isPageLoaded` | boolean | Always `false`; set `true` post-hydration |
| `cookies` | string[] | Cookie names available in request |

`</script>` in JSON escaped to `<\/script>` to prevent premature tag closure.

---

## SEO Utility Functions [MVP]

Implemented in `packages/ssr/src/seo/index.ts`. Not yet wired to HTTP routes.

### `generateSitemap(routes, options)`

```typescript
function generateSitemap(
  routes: Array<{ path: string }>,
  options: { origin: string; maxPages?: number }
): string
```

Outputs XML sitemap. Limits to `maxPages` (default: 1000), sorts by path length.

### `filterStaticRoutes(routes)`

Filters to only include routes where all segments have `type === 'static'` (excludes `:param` segments).

### `generateRobotsTxt(options)`

Default output:
```
Sitemap: {origin}/sitemap.xml

User-agent: *
Disallow: /_toddle
Disallow: /_toddle/
Disallow: /.toddle
Disallow: /.toddle/
Disallow: /.layr
Disallow: /.layr/
Disallow: /_api
Disallow: /_api/
Allow: /cdn-cgi/imagedelivery/*
Disallow: /cdn-cgi/
```

### `generateOpenGraphTags(options)`

Renders `og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `og:site_name` meta tags.

### `generateTwitterCardTags(options)`

Renders `twitter:card`, `twitter:site`, `twitter:title`, `twitter:description`, `twitter:image`.

### `generateFaviconLinks(iconPath)`

Detects Cloudflare image paths (`/cdn-cgi/imagedelivery/`) and generates 16x16, 32x32, shortcut 48x48. Otherwise generates single icon link.

---

## HTTP Routes [Phase 2]

These routes are **planned but not yet registered** in the Hono backend. The generator functions above exist and are ready to wire.

### Planned Endpoint Matrix

| Route | Config Key | Fallback | Cache |
|-------|-----------|---------|-------|
| `GET /sitemap.xml` | `meta.sitemap` | Auto-generated from static routes | `public, max-age=3600` |
| `GET /robots.txt` | `meta.robots` | Default safe rules | `public, max-age=3600` |
| `GET /manifest.json` | `meta.manifest` | None (404) | `public, max-age=3600` |
| `GET /favicon.ico` | `meta.icon` | None (404) | `public, max-age=3600` |
| `GET /serviceWorker.js` | `meta.serviceWorker` | None (404) | None (SW manages its own cache) |

### Common Pattern (Planned)

```
1. Evaluate config.meta.{endpoint}.formula → URL
2. Validate URL
3. Fetch external resource
4. If OK: stream response with cache headers
5. If failed: generate fallback (sitemap/robots) or 404
```

### Configuration Model (Planned)

```typescript
config?: {
  meta?: {
    icon?: { formula: Formula }
    robots?: { formula: Formula }
    sitemap?: { formula: Formula }
    manifest?: { formula: Formula }
    serviceWorker?: { formula: Formula }
  }
}
```

All formulas evaluated without context (static URLs only).

### Sitemap Rules (When Wired) [Phase 2]

- Only `PageComponent` types (components with `route` property)
- Only static routes (all segments `type === 'static'`)
- Maximum 1000 pages
- Sorted ascending by segment count (shortest paths first)
- Format: `http://www.sitemaps.org/schemas/sitemap/0.9`

### Robots.txt Disallow Paths (When Wired) [Phase 2]

| Path | Reason |
|------|--------|
| `/_toddle`, `/_toddle/` | Legacy internal paths |
| `/.toddle`, `/.toddle/` | Font proxy and config paths |
| `/.layr`, `/.layr/` | Runtime paths |
| `/_api`, `/_api/` | API proxy endpoints |
| `/cdn-cgi/` | Cloudflare internal (with Allow exception for image delivery) |

Sitemap reference always points to `/sitemap.xml` regardless of custom sitemap config.

---

## Security

### `escapeAttrValue(value)`

Used on all attribute values in head tags to prevent XSS:
- `"` → `&quot;`
- `<` → `&lt;`
- `>` → `&gt;`
- Returns empty string for `null`, `undefined`, non-primitive types

### `escapeXml(str)` (sitemap)

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

### Attribute Name Validation

Attribute names validated against `/^[a-zA-Z_][\w\-:.]*$/` before rendering. Invalid names are silently dropped.

---

## Cache Busting

`urlWithCacheBuster(url, cacheBuster)` appends `?v={cacheBuster}` to:
- Reset stylesheet URL
- Manifest URL

Not applied to: page stylesheet, font URLs, custom meta URLs.

---

## Cross-References

- Font `<link>` generation → `specs/20-styling-engine.md` (Font System section)
- Theme `data-nc-theme` attribute → `specs/21-themes.md`
- Custom property `<style>` injection → `specs/20-styling-engine.md` (CustomPropertyStyleSheet section)
