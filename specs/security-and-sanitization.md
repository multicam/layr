# Security & Content Sanitization Specification

## Purpose

This specification defines the security model of the Layr framework — the defense-in-depth layers that protect against XSS, header injection, cookie theft, SSRF, template injection, and other web security threats. Security is implemented across four packages: SSR (server-side output encoding), backend (API proxy, cookie management), core (URL validation), and runtime (client-side safe rendering).

### Jobs to Be Done

- Prevent cross-site scripting (XSS) in both server-rendered HTML and client-side dynamic updates
- Sanitize all user-controlled inputs (URL parameters, cookie values, form data) before they enter the rendering or proxy pipelines
- Enforce secure cookie attributes (HttpOnly, Secure) on all cookies set through the framework
- Filter sensitive headers when proxying API requests to prevent information leakage
- Validate and normalize URLs to prevent SSRF and open redirect attacks
- Provide controlled template substitution that avoids arbitrary code execution

---

## Architecture Overview

Security operates at four layers:

```
Request → [URL Validation] → [Header Sanitization] → [Template Substitution] → [API Proxy / SSR]
                                                                                       ↓
                                                                              [Output Encoding]
                                                                                       ↓
                                                                              [HTML Response]
                                                                                       ↓
                                                                              [Client Hydration]
                                                                                       ↓
                                                                              [Safe DOM APIs]
```

| Layer | Package | Threat | Mechanism |
|-------|---------|--------|-----------|
| Input sanitization | `ssr`, `core` | XSS via URL parameters | `xss` package, `escapeSearchParameter()` |
| Output encoding (SSR) | `ssr` | XSS in rendered HTML | `escapeAttrValue()`, `toEncodedText()`, script tag blocking |
| Output encoding (Client) | `runtime` | XSS in dynamic content | `innerText`, `nodeValue`, `setAttribute()` — never `innerHTML` |
| Header filtering | `ssr` | Information leakage, header injection | Multi-stage header filter chain |
| Cookie security | `backend` | Cookie theft, CSRF | Forced HttpOnly + Secure, SameSite validation |
| URL validation | `core` | SSRF, open redirects | `validateUrl()` with proper encoding |
| Template substitution | `ssr` | Template injection | Controlled `{{ cookies.* }}` syntax only |

---

## XSS Protection

### Server-Side (SSR)

#### URL Parameter Sanitization

All URL search parameters are sanitized using the `xss` package (v1.0.15) before entering the formula evaluation context.

**Functions:** `packages/ssr/src/rendering/request.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `escapeSearchParameter` | `(value?: string \| null) => string \| null` | Sanitizes a single parameter via `xss()`. Returns `null` for non-strings |
| `escapeSearchParameters` | `(params: URLSearchParams) => URLSearchParams` | Sanitizes all parameters, filtering out nulls |

**Data flow:** Incoming request URL → `escapeSearchParameters()` → sanitized params used in formula context (ComponentData.Location.query, Route parameters)

#### HTML Attribute Escaping

Attribute values are double-escaped: quotes first, then HTML entities.

**Functions:** `packages/ssr/src/rendering/attributes.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `escapeAttrValue` | `(value: any) => string` | Escapes attribute values. Returns `''` for non-string/number/boolean types |
| `escapeQuote` (internal) | `(value: string) => string` | Replaces `"` with `&quot;` |
| `escapeHtml` (internal) | `(html: string) => string` | Replaces `<` with `&lt;` and `>` with `&gt;` |

**Valid attribute types:** `string`, `number`, `boolean` only. All other types produce an empty string.

**Additionally:** The `xss` package's own `escapeAttrValue` is imported separately in `packages/ssr/src/rendering/components.ts:27` and used for `data-node-id` and `class` attributes — providing defense in depth.

#### Text Content Encoding

Text nodes are encoded to prevent HTML injection.

**Function:** `toEncodedText()` at `packages/ssr/src/rendering/attributes.ts:37-45`

| Character | Replacement | Order |
|-----------|-------------|-------|
| `&` | `&amp;` | 1st (prevents double-encoding) |
| `<` | `&lt;` | 2nd |
| `>` | `&gt;` | 3rd |
| `"` | `&quot;` | 4th |
| `'` | `&#39;` | 5th |
| `\n` | `<br />` | 6th |

**Business Rule:** The `&` character MUST be escaped first to prevent double-encoding of existing entities.

#### Script Tag Blocking

`<script>` elements are completely stripped during SSR to prevent double execution (once in SSR, once in client hydration).

**Location:** `packages/ssr/src/rendering/components.ts:171-174`

```
case 'script': return ''
```

**Exception:** `<style>` tags ARE rendered with their text content from formula evaluation (not escaped — CSS injection is a known lower-risk vector since styles are developer-controlled).

#### Hydration Data Escaping

Server-rendered data injected into the page for client hydration uses `<script type="application/json">` (non-executable) with explicit `</script>` escaping:

**Location:** `packages/backend/src/routes/nordcraftPage.ts:178-183`

```
JSON.stringify(data).replaceAll('</script>', '<\\/script>')
```

This prevents breaking out of the script context even if the data contains `</script>` strings.

### Client-Side (Runtime)

The runtime NEVER uses `innerHTML` for dynamic content. All dynamic content uses safe DOM APIs:

| API | Used For | File |
|-----|----------|------|
| `elem.innerText = value` | Text content in HTML namespace | `runtime/src/components/createText.ts:63,66` |
| `textNode.nodeValue = value` | Text content in SVG/MathML namespace | `runtime/src/components/createText.ts:97,100` |
| `elem.setAttribute(name, value)` | Dynamic attributes | `runtime/src/utils/setAttribute.ts` |
| `elem.classList.add/remove()` | Dynamic classes | throughout runtime |

**Business Rule:** No code path in the runtime should ever set `innerHTML` with user-controlled data.

---

## Header Sanitization

### API Proxy Header Filter Chain

When proxying API requests, headers pass through a multi-stage filter before being forwarded to the upstream server.

**Function:** `sanitizeProxyHeaders()` at `packages/ssr/src/rendering/template.ts:44-58`

**Filter chain (applied in order):**

| Stage | Function | File | Headers Removed |
|-------|----------|------|-----------------|
| 1 | `skipHopByHopHeaders()` | `ssr/src/utils/headers.ts:46-52` | `connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade` |
| 2 | `skipLayrHeaders()` | `ssr/src/utils/headers.ts:27-32` | `x-nordcraft-url`, `x-nordcraft-templates-in-body` |
| 3 | `skipCookieHeader()` | `ssr/src/utils/headers.ts:11-15` | `cookie` |
| 4 | `mapTemplateHeaders()` | `ssr/src/rendering/template.ts` | (applies cookie template substitution to remaining header values) |

**Response header filtering:**
- `skipContentEncodingHeader()` removes `content-encoding` from proxy responses to prevent encoding mismatches (`ssr/src/utils/headers.ts:54-58`)

**Business Rules:**
- The `cookie` header is ALWAYS stripped — cookies are never forwarded to external APIs
- Internal `x-nordcraft-*` headers are ALWAYS stripped — they must not leak to upstream servers
- Hop-by-hop headers are removed per RFC 2616 Section 13.5.1

### Internal Header Constants

| Header | Constant | Purpose |
|--------|----------|---------|
| `x-nordcraft-url` | `PROXY_URL_HEADER` | Carries the target URL for proxied API requests |
| `x-nordcraft-templates-in-body` | `PROXY_TEMPLATES_IN_BODY` | Signals that the request body contains `{{ cookies.* }}` templates |
| `x-nordcraft-rewrite` | `REWRITE_HEADER` | Signals that the request is a rewrite (not a redirect) |
| `x-nordcraft-redirect-api-name` | `REDIRECT_API_NAME_HEADER` | Tracks which API triggered a redirect |
| `x-nordcraft-redirect-component-name` | `REDIRECT_COMPONENT_NAME_HEADER` | Tracks which component triggered a redirect |
| `x-nordcraft-redirect-name` | `REDIRECT_NAME_HEADER` | Tracks the redirect rule name |

**Source:** `core/src/utils/url.ts`, `ssr/src/utils/headers.ts`

---

## Cookie Security

### Cookie Setting Endpoint

**Endpoint:** `GET /.nordcraft/cookies/set-cookie`
**Handler:** `packages/backend/src/routes/cookies.ts`

#### Input Validation

| Parameter | Source | Validation | Default |
|-----------|--------|------------|---------|
| `name` | Query param | Non-empty string (required) | — |
| `value` | Query param | String (required, can be empty) | — |
| `sameSite` | Query param | One of `Lax`, `Strict`, `None` (case-insensitive) | `Lax` |
| `path` | Query param | String starting with `/` | `/` |
| `ttl` | Query param | Non-negative integer (seconds) | — |
| `includeSubdomains` | Query param | Boolean-like | — |

All query parameters are sanitized via `escapeSearchParameters()` before processing.

#### Forced Security Attributes

Every cookie set through Layr includes these non-negotiable attributes:

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| `Secure` | Always | Cookie only sent over HTTPS |
| `HttpOnly` | Always | Cookie inaccessible to JavaScript (prevents XSS cookie theft) |

Configurable attributes:
- `SameSite` — validated against whitelist, defaults to `Lax`
- `Path` — must start with `/`
- `Expires` / `Max-Age` — derived from `ttl` parameter
- `Domain` — set to current hostname only when `includeSubdomains` is requested

#### JWT Token Expiration

**Function:** `decodeToken()` at `packages/backend/src/routes/cookies.ts:86-102`

When the cookie value contains a JWT token, the system can extract the `exp` claim to auto-set cookie expiration:

- Converts Base64url to Base64 (replaces `-` with `+`, `_` with `/`)
- Parses only the payload segment (does NOT validate the signature)
- Returns `{ exp?: number }` or `undefined` on any failure
- Wrapped in try/catch — all errors silently return `undefined`

**Business Rule:** The JWT is NOT cryptographically verified — this is purely for reading the expiration time. Authentication is the responsibility of the upstream API.

### Cookie Reading

**Function:** `getRequestCookies()` at `packages/ssr/src/rendering/cookies.ts:4-10`

Parses the `cookie` request header using the `cookie` package. Filters out entries with `undefined` keys or values.

---

## URL Validation

### Core Validation

**Function:** `validateUrl()` at `packages/core/src/utils/url.ts:9-34`

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string?` | URL string to validate |
| `origin` | `string?` | Origin for resolving relative URLs |
| **Returns** | `URL \| false` | Validated URL object or `false` |

**Validation steps:**
1. Type check — must be a `string`
2. Construct a `URL` object (leverages browser/runtime URL parser)
3. Re-encode search parameters by iterating, deleting, and re-appending (fixes improper encoding)
4. Return the normalized `URL` object, or `false` on any error

**Used in:**
- API proxy: validates the target URL before forwarding requests
- Backend routes: validates redirect destinations
- Manifest generation

### Runtime URL Construction

**Function:** `getLocationUrl()` at `packages/runtime/src/utils/url.ts:5-44`

Builds URLs from `Location` objects with proper encoding:
- Path segments compiled via `path-to-regexp`'s `compile()` function
- Query parameter keys and values encoded via `encodeURIComponent()`
- Null query values are filtered out
- Hash fragments are prepended with `#` without encoding

---

## Template Substitution

### Cookie Template System

**Function:** `applyTemplateValues()` at `packages/ssr/src/rendering/template.ts:10-42`

Provides controlled substitution of cookie values in strings using `{{ cookies.cookieName }}` syntax.

**Pattern:** `/{{ cookies\.(.+?) }}/gm` (non-greedy match for cookie name)

**Behavior:**
1. Scan input string for all `{{ cookies.* }}` patterns
2. Collect unique cookie names
3. Replace each template with the corresponding cookie value
4. Unknown cookies resolve to `''` (empty string)

**Security constraints:**
- Only `{{ cookies.* }}` syntax is supported — no arbitrary expressions
- No recursive template expansion (templates in cookie values are NOT processed)
- Zero-width match protection prevents infinite loops

**Applied to:**
- Proxy request URLs (from `x-nordcraft-url` header)
- Proxy request headers (via `mapTemplateHeaders`)
- Proxy request bodies (when `x-nordcraft-templates-in-body` header is present)
  - `application/x-www-form-urlencoded`: only values are substituted, keys preserved
  - Other content types: full body string substitution

**Business Rule:** Cookie values are substituted as-is without further sanitization. This is acceptable because:
1. Cookies are HttpOnly (not settable by client-side scripts)
2. Cookie values are controlled by the application's own cookie-setting endpoint

---

## API Proxy Security

### Request Flow

**Handler:** `proxyRequestHandler()` at `packages/backend/src/routes/apiProxy.ts`

**Endpoint:** `ALL /.toddle/omvej/components/:componentName/apis/:apiName`

**Security steps in order:**

1. **Parse request cookies** via `getRequestCookies()`
2. **Extract and validate target URL** from `x-nordcraft-url` header, applying cookie templates
3. **Reject invalid URLs** with 400 error
4. **Sanitize request headers** via `sanitizeProxyHeaders()` (multi-stage filter chain)
5. **Override Accept-Encoding** to `gzip, deflate` (prevents unsupported encodings)
6. **Apply body templates** (if `x-nordcraft-templates-in-body` header present)
7. **Forward request** to upstream server
8. **Strip Content-Encoding** from response headers
9. **Return response** to client

### SSRF Mitigation

- Target URL must pass `validateUrl()` — rejects malformed URLs
- The URL comes from the `x-nordcraft-url` header, which is set by the client-side runtime (not directly from user input)
- Proxy path includes component and API name parameters, providing audit tracing

### Accept-Encoding Override

The proxy always sets `Accept-Encoding: gzip, deflate` to:
1. Prevent Brotli or other encodings the runtime may not handle
2. Ensure consistent response decompression

---

## Edge Cases and Known Limitations

### Style Tag Content Not Escaped

**Location:** `ssr/src/rendering/components.ts:267`

Style tag content is rendered from formula evaluation without HTML escaping. This is a CSS injection vector if formulas return user-controlled data.

**Mitigation:** Styles are typically developer-configured, not user-controlled. The formula system provides some isolation.

### Meta Tag Content Not Escaped

**Location:** `ssr/src/rendering/head.ts:311`

Custom meta tag content (from `MetaEntry.content`) is rendered without escaping. If a meta entry is a `<script>` tag with user-controlled content, this is an XSS vector.

**Mitigation:** Meta entries are configured by developers in the page route definition, not from user input.

### Title Tag Not Escaped

**Location:** `ssr/src/rendering/head.ts:130`

The `<title>` content is not HTML-escaped. A title containing `</title><script>...` could break out of the title context.

**Mitigation:** Titles come from formula evaluation of developer-configured page metadata.

### No CSRF Token System

Layr does not implement CSRF tokens. Protection relies on:
- `SameSite=Lax` cookies (default)
- The API proxy requiring specific `x-nordcraft-*` headers that browsers won't add to cross-origin requests

### No Content Security Policy

No CSP headers are emitted by default. Deployments should add CSP headers via middleware or CDN configuration.

### Hash Fragment Not URL-Encoded

`getLocationUrl()` does not encode hash fragments. Browsers typically handle this, but special characters could cause issues in edge cases.

---

## External Dependencies

| Package | Version | Used For |
|---------|---------|----------|
| `xss` | 1.0.15 | URL parameter sanitization, attribute escaping in SSR |
| `cookie` | 1.0.2 | Cookie parsing from request headers |

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [API Integration](./api-integration.md) | API proxy security protects proxied API requests |
| [Cookie Management](./cookie-management.md) | Cookie security attributes and endpoint |
| [SSR Pipeline](./ssr-pipeline.md) | Output encoding during server-side rendering |
| [Hydration System](./hydration-system.md) | Safe hydration data injection |
| [Backend Server](./backend-server.md) | Hosts the proxy endpoint and cookie endpoint |
| [Rendering Engine](./rendering-engine.md) | Client-side safe DOM API usage |
