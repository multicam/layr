# Cookie Management Specification

## Purpose

The Cookie Management system provides end-to-end cookie handling across client and server. It supports three cookie categories: client-side cookies (via `document.cookie`), HttpOnly cookies (via a server endpoint), and cookie template substitution in proxied API requests. This enables secure authentication flows where tokens are stored as HttpOnly cookies and transparently injected into API calls.

### Jobs to Be Done

- Set and read client-side cookies from actions and formulas
- Set HttpOnly/Secure cookies via a server-side endpoint (inaccessible to JavaScript)
- Read HttpOnly cookie values through a template substitution system (`{{ cookies.name }}`)
- Inject cookie values into proxied API request URLs, headers, and bodies
- Support JWT-based automatic expiration detection
- Provide cookie deletion via TTL=0

---

## Architecture

### Cookie Categories

| Category | Set By | Read By | Accessible via JS |
|----------|--------|---------|-------------------|
| Client cookie | `setCookie` action (client) | `getCookie` formula | Yes |
| HttpOnly cookie | `setHttpOnlyCookie` action → server endpoint | `getHttpOnlyCookie` formula (returns template) → resolved at proxy time | No |
| Session cookie | `setSessionCookies` action → server endpoint | Cookie header | No |

### Key Files

| File | Package | Responsibility |
|------|---------|----------------|
| `packages/lib/actions/setCookie/handler.ts` | `@layr/lib` | Client-side cookie setting via `document.cookie` |
| `packages/lib/actions/setHttpOnlyCookie/handler.ts` | `@layr/lib` | HttpOnly cookie setting via server endpoint |
| `packages/lib/actions/setSessionCookies/handler.ts` | `@layr/lib` | Legacy session cookie setting |
| `packages/lib/formulas/getCookie/handler.ts` | `@layr/lib` | Read client-side cookies (or server-side from request) |
| `packages/lib/formulas/getHttpOnlyCookie/handler.ts` | `@layr/lib` | Returns cookie template string for proxy substitution |
| `packages/backend/src/routes/cookies.ts` | `@layr/backend` | Server-side `Set-Cookie` endpoint |
| `packages/backend/src/routes/apiProxy.ts` | `@layr/backend` | API proxy with cookie template substitution |
| `packages/ssr/src/rendering/cookies.ts` | `@layr/ssr` | Parse request cookies |
| `packages/ssr/src/rendering/template.ts` | `@layr/ssr` | Cookie template value replacement |
| `packages/core/src/api/template.ts` | `@layr/core` | Template string format definition |

---

## Client-Side Cookies

### `setCookie` Action

Sets a cookie via `document.cookie` (accessible to JavaScript).

**Arguments:**

| # | Name | Type | Default | Description |
|---|------|------|---------|-------------|
| 0 | Name | `string` | required | Cookie name |
| 1 | Value | `string` | required | Cookie value |
| 2 | Expires in | `number?` | (session) | TTL in seconds. Omit for session cookie. |
| 3 | SameSite | `string?` | `"Lax"` | `"Lax"`, `"Strict"`, or `"None"` |
| 4 | Path | `string?` | `"/"` | Cookie path (must start with `/`) |
| 5 | Include Subdomains | `boolean?` | `true` | When true, sets `Domain` to include subdomains |

**Events emitted:**
- `Success` — Cookie was set
- `Error` — Validation failed (with Error object)

**Cookie attributes set:** `SameSite`, `Path`, optional `Expires`, optional `Domain`. Note: **no** `HttpOnly` or `Secure` flags (client-side cookies are JS-accessible).

### `getCookie` Formula

Reads a cookie by name.

**Arguments:** `[name: string]`

**Behavior:**
- **Client-side:** Parses `document.cookie` to find the named cookie value
- **Server-side (SSR):** Reads from `env.request.cookies[name]`
- **Shadow DOM:** Returns `null` (cookies not accessible from ShadowRoot)
- Returns `null` if cookie not found or name is invalid

---

## HttpOnly Cookies

### `setHttpOnlyCookie` Action

Sets an HttpOnly cookie by calling the server endpoint `/.nordcraft/cookies/set-cookie`.

**Arguments:** Same as `setCookie` (Name, Value, TTL, SameSite, Path, Include Subdomains) with the same defaults and validation.

**Flow:**
1. Validate all arguments client-side
2. Construct query string with all parameters
3. `fetch("/.nordcraft/cookies/set-cookie?name=...&value=...&...")`
4. Server responds with `Set-Cookie` header containing HttpOnly flag
5. Emit `Success` or `Error` event

### Server Endpoint: `/.nordcraft/cookies/set-cookie` (or `/.toddle/cookies/set-cookie`)

**Method:** GET

**Query parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Cookie name |
| `value` | `string` | Yes | — | Cookie value |
| `sameSite` | `string` | No | `"Lax"` | SameSite attribute |
| `path` | `string` | No | `"/"` | Cookie path |
| `ttl` | `number` | No | — | Time-to-live in seconds |
| `includeSubdomains` | `string` | No | `"true"` | Include subdomain access |

**Cookie attributes always set:**
- `Secure` — Always
- `HttpOnly` — Always
- `SameSite` — From parameter
- `Path` — From parameter

**Expiration logic:**
1. If `ttl > 0`: `Expires` = now + ttl seconds
2. If `ttl` not provided: attempt to decode the `value` as a JWT and use `exp` claim as expiration
3. If `ttl === 0`: `Max-Age=0` (deletes the cookie)
4. If no TTL and not a JWT: session cookie (no expiry)

**JWT decoding (`decodeToken`):**
- Replaces Base64url characters (`-` → `+`, `_` → `/`)
- Splits by `.` and decodes the payload (second segment)
- Returns `{ exp?: number }` or `undefined` on failure
- Non-throwing: any parse error returns `undefined`

**Subdomain behavior:**
- `includeSubdomains=true` (default): `Domain=<hostname>` is set, making the cookie available to all subdomains
- `includeSubdomains=false`: No `Domain` attribute, cookie restricted to exact hostname

**Validation errors (400):**
- Name is not a string or is empty
- Value is not a string
- SameSite is not one of Lax/Strict/None
- Path is not a string or doesn't start with `/`
- TTL is a non-numeric string

### `getHttpOnlyCookie` Formula

Returns a **template string** rather than the actual cookie value (since HttpOnly cookies are inaccessible to JavaScript).

**Arguments:** `[name: string]`

**Returns:** `"{{ cookies.<name> }}"` — a template that is resolved server-side during API proxy requests.

**Example:** `getHttpOnlyCookie("access_token")` → `"{{ cookies.access_token }}"`

This template string is designed to be placed in API headers, URLs, or body fields. When the API request is proxied through the backend, the template is replaced with the actual cookie value.

---

## Cookie Template Substitution

### Template Format

```
{{ cookies.<cookieName> }}
```

Defined in `packages/core/src/api/template.ts`. Currently only `cookies` is a supported template type.

### `applyTemplateValues()`

**Input:** `(input: string | null, cookies: Record<string, string>)`

**Algorithm:**
1. Scan the input string for all `{{ cookies.<name> }}` patterns using regex
2. Collect all unique cookie names
3. For each cookie name, replace all occurrences with the actual cookie value
4. If cookie not found, replace with empty string (prevents leaking template syntax to external services)

### Where Templates Are Resolved

Templates are resolved in the **API proxy** (`apiProxy.ts`):

1. **URL:** The proxy URL header value is processed through `applyTemplateValues()` to inject cookie values into the request URL
2. **Headers:** All forwarded headers are processed through `mapTemplateHeaders()`, which applies template values to each header value
3. **Body:** If the `PROXY_TEMPLATES_IN_BODY` header is present, the request body is also processed:
   - `application/x-www-form-urlencoded`: Each form value is individually templated
   - Other content types (JSON, text): The entire body text is templated

### Header Sanitization

Before forwarding to the upstream API, the proxy:
1. Removes hop-by-hop headers (Connection, Keep-Alive, etc.)
2. Removes Layr-specific headers (proxy URL, template flags)
3. Removes the Cookie header (cookies are injected via templates instead)
4. Applies template substitution to remaining header values
5. Sets `Accept-Encoding: gzip, deflate` (no brotli support in proxy)

---

## Session Cookies (Legacy)

### `setSessionCookies` Action

A simplified action for setting an `access_token` cookie via `/.toddle/cookies/set-session-cookie`.

**Arguments:** `[access_token: string, ttl?: number]`

**Events:** `Success` or `Error`

This is a legacy action maintained for backward compatibility.

---

## SSR Cookie Reading

### `getRequestCookies()`

Parses the `Cookie` header from an incoming HTTP request using the `cookie` npm package.

**Input:** `Request`
**Output:** `Record<string, string>` — all cookies as key-value pairs, filtering out any entries with undefined keys or values.

Used by:
- The API proxy to resolve cookie templates
- SSR rendering context to provide cookie values to `getCookie` formula during server-side rendering

---

## Business Rules

1. **HttpOnly is always paired with Secure**: The server endpoint always sets both flags together
2. **Cookie template fallback**: If a cookie doesn't exist, templates resolve to empty string (not the template syntax)
3. **JWT auto-expiry**: HttpOnly cookies that contain JWTs automatically inherit the token's `exp` claim as the cookie expiration
4. **TTL=0 deletes**: Setting TTL to 0 sends `Max-Age=0`, which instructs the browser to delete the cookie
5. **Subdomain default**: Cookies include subdomain access by default (`includeSubdomains=true`)
6. **ShadowRoot isolation**: `getCookie` returns `null` inside Shadow DOM (Web Components) since `document.cookie` is not accessible from ShadowRoot

---

## Edge Cases

- **Non-JWT values with no TTL**: Results in a session cookie (expires when browser closes)
- **Malformed JWT**: `decodeToken()` silently returns `undefined`, cookie becomes a session cookie
- **Empty cookie value**: Allowed — sets a cookie with an empty string value
- **Special characters in cookie values**: Values are passed as query parameters and are URL-encoded by `URLSearchParams`
- **Proxy timeout**: API proxy has a 5-second timeout (`AbortSignal.timeout(5000)`); returns 504 on timeout
- **IPv6 localhost**: Proxy strips `cf-connecting-ip` header for localhost requests to avoid Cloudflare errors

---

## External Dependencies

- **`cookie`** (npm): Used in `getRequestCookies()` for parsing the `Cookie` header
- **Hono**: HTTP framework for the server-side cookie endpoint and API proxy
