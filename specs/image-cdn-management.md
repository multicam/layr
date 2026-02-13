# Image & CDN Management

## 1. Overview

### Purpose
The image and CDN management system handles Cloudflare Image Delivery integration, URL transformations for responsive image sizes, and conversion of relative image paths to absolute URLs during server-side rendering.

### Jobs to Be Done
- **Detect Cloudflare image paths** via the `/cdn-cgi/imagedelivery/` prefix
- **Generate responsive icon sizes** (16px, 32px, 48px) from a single Cloudflare image URL
- **Generate thumbnail variants** (256px) for package og:image metadata
- **Transform relative paths** to absolute URLs during SSR to ensure images load correctly
- **Proxy favicon requests** with dynamic content-type detection

### Scope
- Cloudflare Image Delivery path detection
- Responsive image URL generation for `<head>` elements
- Relative-to-absolute path transformation during SSR
- Favicon proxying in the backend

---

## 2. Cloudflare Image Path Detection

### Function

```typescript
isCloudflareImagePath(path?: string | null): path is string
```

A TypeScript type guard that returns `true` when the path starts with `/cdn-cgi/imagedelivery/`.

### Cloudflare Image URL Format

```
/cdn-cgi/imagedelivery/{accountHash}/{imageId}/{variant}
```

| Segment | Description |
|---------|-------------|
| `/cdn-cgi/imagedelivery/` | Fixed Cloudflare prefix |
| `{accountHash}` | Cloudflare account identifier |
| `{imageId}` | Uploaded image identifier |
| `{variant}` | Size or transformation variant (e.g., `16`, `32`, `256`, `public`) |

The system generates size variants by replacing the trailing segment with a numeric size.

---

## 3. Responsive Icon Generation

When the project's icon path is a Cloudflare image, three favicon sizes are generated in the page `<head>`:

### Algorithm

1. Evaluate icon formula from `config.meta.icon`
2. Check `isCloudflareImagePath(iconPath)`
3. If Cloudflare: extract base path by removing the last segment
4. Generate three `<link>` tags with size-specific paths

### Output

| Tag | Size | URL Suffix | HTML |
|-----|------|-----------|------|
| `link:icon:16` | 16x16 | `/16` | `<link rel="icon" sizes="16x16" href="{basePath}/16" />` |
| `link:icon:32` | 32x32 | `/32` | `<link rel="icon" sizes="32x32" href="{basePath}/32" />` |
| `link:icon` | Default | `/48` | `<link rel="shortcut icon" href="{basePath}/48" />` |

### Non-Cloudflare Fallback

When the icon path is not a Cloudflare image, a single `<link rel="icon">` tag is generated with the path as-is. No size variants are created.

---

## 4. Thumbnail Generation

For packages (not apps), a thumbnail URL is generated for the `og:image` meta tag:

### Algorithm

1. Check if project is a package with a thumbnail
2. If thumbnail path is a Cloudflare image: append `/256` to base path, prepend request origin
3. If not Cloudflare: use path as-is
4. Generate `<meta property="og:image">` tag

### Output

```html
<meta property="og:image" content="{origin}/cdn-cgi/imagedelivery/{hash}/{id}/256" />
```

This can be overridden by custom `meta.og:image` entries configured in the project.

---

## 5. Relative Path Transformation

### Purpose

During SSR, relative `src` attributes (e.g., `/images/photo.png`, `./icon.svg`) are converted to absolute URLs so that images load correctly regardless of the page's URL path.

### Function

```typescript
transformRelativePaths(urlOrigin: string): (component: Component) => Component
```

Curried function: takes the request origin, returns a component transformer.

### Algorithm

For each node in the component's node tree:
1. Check if node is an element (`type === 'element'`)
2. For each attribute, check if it's a `src` attribute
3. Check if the value is a static formula (`type === 'value'`) with a string value
4. If all conditions met: resolve the path using `new URL(value, urlOrigin).href`
5. Replace the formula value with the absolute URL

### Scope Limitations

| Transformed | Not Transformed |
|------------|----------------|
| `src` attributes | `href` attributes |
| Static value formulas | Dynamic formulas (evaluated at runtime) |
| Element nodes | Text or component nodes |
| String values | Non-string values |

### Examples

| Input | Origin | Output |
|-------|--------|--------|
| `/foo/img.png` | `https://example.com` | `https://example.com/foo/img.png` |
| `picture.webp` | `https://example.com` | `https://example.com/picture.webp` |
| `./img.png` | `https://example.com` | `https://example.com/img.png` |
| `https://cdn.example.com/img.png` | `https://example.com` | `https://cdn.example.com/img.png` (unchanged) |

---

## 6. Favicon Proxying

The backend serves `/favicon.ico` by proxying the configured icon URL. See the [SEO & Web Standards spec](seo-web-standards.md) for full details.

Key image-specific behavior:
- **Relative path support** — `validateUrl({ path, origin })` resolves relative icon paths
- **Dynamic content-type** — preserves the upstream image format (PNG, SVG, ICO, etc.)
- **Fallback content-type** — returns `image/x-icon` on error

---

## 7. Robots.txt Integration

Cloudflare image URLs are explicitly allowed in the default robots.txt:

```
Allow: /cdn-cgi/imagedelivery/*
Disallow: /cdn-cgi/
```

This ensures image URLs are crawlable for SEO while blocking other Cloudflare CDN internal paths.

---

## 8. Business Rules

1. **Cloudflare detection is prefix-based** — any path starting with `/cdn-cgi/imagedelivery/` is treated as a Cloudflare image
2. **Size variants use numeric suffixes** — appending `/{size}` to the base Cloudflare URL (e.g., `/16`, `/32`, `/256`)
3. **Only `src` attributes are transformed** — `href`, `poster`, `srcset`, and other image-related attributes are not modified
4. **Only static values are transformed** — dynamic formulas are evaluated at runtime and handle their own URL resolution
5. **Thumbnail variants only for packages** — apps don't have default og:image thumbnails
6. **No image optimization beyond Cloudflare** — no server-side image processing, compression, or format conversion
7. **Images served directly by CDN** — unlike API requests, image URLs are not proxied through the Layr backend (except favicon)

---

## 9. External Dependencies

| Dependency | Usage |
|------------|-------|
| Cloudflare Image Delivery | CDN for image hosting and responsive variants |
| `URL` constructor | Resolving relative paths to absolute URLs |
| `applyFormula()` | Evaluating icon path from project config |
| `escapeAttrValue()` | HTML attribute escaping for generated tags |

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
