# Font System Specification

## Purpose

The Font System manages web font loading, proxying, and CSS generation for Layr applications. It proxies Google Fonts through the application's own domain (avoiding third-party requests), generates `@font-face` CSS with the correct weight and italic axis encoding, and integrates font `<link>` tags into the SSR-rendered `<head>`.

### Jobs to Be Done

- Proxy Google Fonts stylesheets and font files through the application's domain
- Generate font CSS URLs with correct weight range encoding (static and italic axes)
- Integrate font stylesheet `<link>` tags into SSR-rendered pages
- Support multiple themes, each with their own font families
- Respect `font-display: swap` for performance
- Forward appropriate HTTP headers for caching

---

## Architecture

### Key Files

| File | Package | Responsibility |
|------|---------|----------------|
| `packages/backend/src/routes/font.ts` | `@layr/backend` | Hono router for font proxy endpoints |
| `packages/ssr/src/rendering/fonts.ts` | `@layr/ssr` | Font CSS URL generation |
| `packages/ssr/src/rendering/head.ts` | `@layr/ssr` | Head tag generation (includes font links) |
| `packages/core/src/styling/theme.ts` | `@layr/core` | `FontFamily` type definition |

### Data Flow

```
Theme Definition
  └── FontFamily[] (family, provider, variants with weights)
        │
        ▼
getFontCssUrl({ fonts, basePath })
        │
        ▼
URL: /.toddle/fonts/stylesheet/css2?family=Roboto:wght@400;700&display=swap
        │
        ▼
getHeadItems() → <link href="..." rel="stylesheet" />
        │
        ▼
Browser requests /.toddle/fonts/stylesheet/css2?...
        │
        ▼
fontRouter.get('/stylesheet/:stylesheet{.*}')
        │
        ├── Fetch from https://fonts.googleapis.com/css2?...
        ├── Replace https://fonts.gstatic.com → /.toddle/fonts/font
        └── Return rewritten stylesheet
              │
              ▼
Browser parses @font-face rules, requests /.toddle/fonts/font/...
              │
              ▼
fontRouter.get('/font/:font{.*}')
              │
              └── Fetch from https://fonts.gstatic.com/... → return font binary
```

---

## Data Models

### FontFamily

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name of the font |
| `family` | `string` | CSS font-family value (e.g. `"Roboto"`) |
| `provider` | `'google' \| 'upload'` | Font source |
| `type` | `'serif' \| 'sans-serif' \| 'monospace' \| 'cursive'` | Font category |
| `variants` | `Array<FontVariant>?` | Available weight/style variants |

### FontVariant

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Variant display name |
| `weight` | `'100' \| '200' \| ... \| '900'` | CSS font-weight |
| `italic` | `boolean` | Whether this is an italic variant |
| `url` | `string` | Direct URL to the font file |

---

## Font Proxy (Backend)

### Router: `/.toddle/fonts/`

CORS is enabled on all font routes to support custom elements that need to fetch fonts cross-origin.

#### `GET /.toddle/fonts/stylesheet/:stylesheet{.*}`

Proxies a Google Fonts CSS stylesheet.

**Request flow:**
1. Construct upstream URL: `https://fonts.googleapis.com/{stylesheet}{queryString}`
2. Forward standard headers: `Accept`, `Accept-Encoding`, `Accept-Language`, `Referer`, `User-Agent`
3. Fetch the stylesheet from Google
4. Replace all `https://fonts.gstatic.com` references with `/.toddle/fonts/font` so that font file requests also go through the proxy
5. Forward filtered response headers: `Content-Type`, `Cache-Control`, `Expires`, `Accept-Ranges`, `Date`, `Last-Modified`, `ETag`
6. Return the rewritten stylesheet

**Error handling:**
- If Google returns non-OK: respond with `404` and body `"Stylesheet not found"`
- If fetch throws: respond with `404` and body `"Stylesheet could not be generated"`

#### `GET /.toddle/fonts/font/:font{.*}`

Proxies individual font files (woff2, woff, ttf).

**Request flow:**
1. Construct upstream URL: `https://fonts.gstatic.com/{font}`
2. Forward standard headers
3. Stream the response body back with filtered headers
4. Return the binary font data

**Error handling:**
- Non-OK or missing body: `404` with `"Font not found"`
- Fetch error: `404` with `"Unable to fetch font"`

### Header Filtering

Both endpoints only forward these response headers (security/privacy measure):
- `Content-Type`
- `Cache-Control`
- `Expires`
- `Accept-Ranges`
- `Date`
- `Last-Modified`
- `ETag`

All other headers from Google are dropped.

### Request Headers

Both endpoints forward these request headers to Google:
- `Accept`
- `Accept-Encoding`
- `Accept-Language`
- `Referer`
- `User-Agent`

The `User-Agent` header is important — Google Fonts returns different font formats (woff2 vs woff vs ttf) based on the requesting browser's User-Agent.

---

## Font CSS URL Generation (SSR)

### `getFontCssUrl()`

**Input:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fonts` | `FontFamily[]` | Font families from the theme |
| `baseForAbsoluteUrls` | `string?` | Base URL for absolute URL construction |
| `basePath` | `string` | Proxy path (default: `/.toddle/fonts/stylesheet/css2`) |

**Output:** `{ swap: string } | undefined`

Returns a URL pointing to the font proxy stylesheet endpoint, or `undefined` if no fonts are provided.

### URL Encoding Algorithm

For each `FontFamily`:

1. Sort variants by numeric weight
2. Separate into `standardRange` (non-italic) and `italicRange` (italic)
3. Skip fonts with no valid weight variants
4. Encode the `wght` axis:
   - **No italic variants:** `family=FontName:wght@400;500;700`
   - **With italic variants:** `family=FontName:ital,wght@0,400;0,700;1,400;1,700` (0 = normal, 1 = italic)
5. Static encoding: each weight is listed explicitly (e.g. `400;500;700`)
6. All families are appended as separate `family` query parameters
7. `display=swap` is always set

**Example URLs:**
- Single font, no italic: `/.toddle/fonts/stylesheet/css2?display=swap&family=Roboto:wght@400;700`
- Single font, with italic: `/.toddle/fonts/stylesheet/css2?display=swap&family=Roboto:ital,wght@0,400;0,700;1,400;1,700`
- Multiple fonts: `...&family=Roboto:wght@400;700&family=Open+Sans:wght@300;400;600`

---

## Head Tag Integration (SSR)

The `getHeadItems()` function in `head.ts` integrates fonts into the SSR-rendered `<head>`:

1. Iterate all themes in the project
2. For each theme with fonts, call `getFontCssUrl()` to get the stylesheet URL
3. Generate `<link href="..." rel="stylesheet" />` tags
4. These are added to the head items map with key `link:font:swap`

**Strategy:** All fonts from all themes are included in every page. While not optimal for bundle size, this provides:
- Better cacheability across pages (same stylesheet URL)
- Consistent behavior with the editor
- Guaranteed availability of `var(--font-sans)` for the reset stylesheet
- Negligible overhead for most applications

---

## Business Rules

1. **Font display:** Always `swap` — text is rendered immediately with a fallback font, then swapped when the custom font loads
2. **First-party proxying:** All font requests go through `/.toddle/fonts/` to avoid third-party cookie and privacy concerns
3. **Static weight encoding:** Individual weights are listed (e.g. `400;700`), not ranges (e.g. `400..700`). Variable font range encoding is prepared but commented out pending UI support.
4. **All themes included:** Font stylesheets include fonts from all themes, not just the active theme
5. **Provider support:** Only `google` provider fonts go through the proxy. `upload` provider fonts use direct URLs.

---

## Edge Cases

- **Empty font list:** `getFontCssUrl()` returns `undefined`, no `<link>` is generated
- **Font with no valid weights:** Skipped (variants filtered to numeric weights only)
- **Duplicate italic axis encoding:** Standard weights use index `0`, italic weights use index `1`
- **Invalid base URL:** `new URL()` in `getFontCssUrl()` catches errors and returns `undefined`
- **Google Fonts outage:** Proxy returns 404; page renders with fallback system fonts due to `font-display: swap`

---

## External Dependencies

- **Google Fonts API** (`fonts.googleapis.com`): Font metadata and CSS stylesheets
- **Google Fonts CDN** (`fonts.gstatic.com`): Font binary files
- **Hono** (`hono`): HTTP router framework for backend proxy routes

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
