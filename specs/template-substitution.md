# Template Substitution System

## 1. Overview

### Purpose
The template substitution system provides secure injection of HttpOnly cookie values into API requests at proxy time. Client-side code generates placeholder strings like `{{ cookies.access_token }}`, which are replaced server-side with actual cookie values during SSR or API proxying. This enables authentication patterns where tokens remain inaccessible to JavaScript but can flow through API calls.

### Jobs to Be Done
- **Generate template placeholders** for HttpOnly cookies via the `getHttpOnlyCookie()` formula
- **Substitute cookie values** in API request URLs, headers, and bodies server-side
- **Handle different body formats** — form-urlencoded bodies are parsed/reconstructed; JSON/text bodies use string substitution
- **Sanitize proxy headers** — remove hop-by-hop, internal, and cookie headers before forwarding
- **Control body substitution** via formula-driven opt-in (`useTemplatesInBody` flag)

### Scope
- Template string format and generation
- Server-side substitution in URLs, headers, and bodies
- API proxy request handling
- SSR API fetching with templates
- Client-side proxy configuration
- Header sanitization pipeline

---

## 2. Template Format

### Syntax

```
{{ cookies.<name> }}
```

- Double braces with internal spaces
- `cookies` namespace prefix (extensible design — only `cookies` currently supported)
- Dot separator before cookie name
- Cookie name is any non-empty string (non-greedy match)

### Template Types

```typescript
const templateTypes = {
  cookies: 'cookies',
}
```

Currently only `cookies` is supported. The architecture allows future template types via the `templateTypes` map.

### Generation

Templates are created by the `STRING_TEMPLATE()` factory:

```typescript
STRING_TEMPLATE(type: keyof typeof templateTypes, name: string): string
// STRING_TEMPLATE('cookies', 'access_token') → '{{ cookies.access_token }}'
```

The `getHttpOnlyCookie` formula handler uses this factory:
```typescript
handler([name]) {
  if (!name || typeof name !== 'string') return null
  return STRING_TEMPLATE('cookies', name)
}
```

Returns `null` for invalid (non-string or empty) cookie names.

---

## 3. Substitution Logic

### Core Function

```typescript
applyTemplateValues(
  input: string | null | undefined,
  cookies: Partial<Record<string, string>>
): string
```

**Algorithm:**

1. **Null guard** — return empty string for `null`/`undefined` input
2. **Extract cookie names** — regex `/{{ cookies\.(.+?) }}/gm` with zero-width match protection
3. **Deduplicate** — collect unique names into a `Set<string>`
4. **Replace** — for each unique cookie name, `replaceAll()` the template with the cookie value
5. **Fallback** — missing cookies resolve to empty string (never leaks template syntax)

### Regex Pattern

```
/{{ cookies\.(.+?) }}/gm
```

| Part | Meaning |
|------|---------|
| `{{ cookies\.` | Literal prefix with escaped dot |
| `(.+?)` | Non-greedy capture of cookie name (at least 1 char) |
| ` }}` | Literal suffix |
| `g` | Global — match all occurrences |
| `m` | Multiline mode |

### Missing Cookie Behavior

When a referenced cookie doesn't exist in the cookies object, the template is replaced with an empty string:

```
Input:  "Bearer {{ cookies.missing_token }}"
Output: "Bearer "
```

This prevents internal template syntax from leaking to external APIs.

---

## 4. Substitution Points

### 4.1 API Proxy — URL

The target URL (from `x-nordcraft-url` header) is substituted before URL validation:

```
1. Read x-nordcraft-url header
2. Parse request cookies from Cookie header
3. applyTemplateValues(headerValue, cookies)
4. validateUrl({ path: result, origin: requestUrl.origin })
5. If invalid → 400 Bad Request
```

### 4.2 API Proxy — Headers

Headers are processed through a sanitization pipeline then substituted:

```
skipHopByHopHeaders(headers)
  → skipLayrHeaders(result)
  → skipCookieHeader(result)
  → mapTemplateHeaders({ cookies, headers: result })
```

Each header value has `applyTemplateValues()` called on it. Header names are not modified.

**Removed headers:**

| Category | Headers |
|----------|---------|
| Hop-by-hop (RFC 2616) | `connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade` |
| Layr internal | `x-nordcraft-url`, `x-nordcraft-templates-in-body` |
| Cookie | `cookie` (prevents forwarding all cookies; only templated values are injected) |

### 4.3 API Proxy — Body

Body substitution requires two conditions:

1. **Method allows body** — POST, DELETE, PUT, PATCH, OPTIONS
2. **Opt-in header present** — `x-nordcraft-templates-in-body` header has any non-null value

**Form-urlencoded bodies (`application/x-www-form-urlencoded`):**
1. Parse body as `URLSearchParams`
2. Apply `applyTemplateValues()` to each value (keys unchanged)
3. Reconstruct `URLSearchParams` and serialize via `.toString()`

**All other content types (JSON, text, etc.):**
- Apply `applyTemplateValues()` to the raw body string

### 4.4 SSR API Fetching — Query Parameters

During SSR, API query parameters are substituted individually:

```
requestUrl.searchParams.forEach((value, key) => {
  requestUrl.searchParams.set(key, applyTemplateValues(value, cookies))
})
```

### 4.5 SSR API Fetching — Headers

Same `sanitizeProxyHeaders()` pipeline as the proxy handler, using cookies from the SSR request context.

---

## 5. Client-Side Proxy Configuration

### Proxy Decision

Each API has a formula-driven proxy flag:

```typescript
api.server.proxy.enabled.formula  // Evaluated at runtime
```

- `true` → route request through `/.toddle/omvej/` proxy
- `false` → direct fetch (templates remain unsubstituted)

### Proxy Request Setup

When proxying:

1. **Construct proxy URL:**
   ```
   /.toddle/omvej/components/{componentName}/apis/{componentName}:{apiName}
   ```

2. **Set routing header:**
   ```
   x-nordcraft-url: {decoded target URL}
   ```

3. **Set body template flag (if enabled):**
   ```typescript
   const allowBodyTemplateValues = toBoolean(
     applyFormula(api.server.proxy.useTemplatesInBody.formula, context)
   )
   if (allowBodyTemplateValues) {
     headers.set('x-nordcraft-templates-in-body', 'true')
   }
   ```

4. **Send to proxy endpoint** — backend handles substitution and forwarding

### Configuration Schema

```typescript
api.server.proxy = {
  enabled: { formula: Formula }            // Required — controls proxy routing
  useTemplatesInBody?: { formula: Formula } // Optional — enables body substitution
}
```

Both settings support dynamic formulas, allowing conditional proxy behavior based on component state.

---

## 6. Data Flow

### Client-Side Flow

```
1. Component formula: getHttpOnlyCookie('access_token')
   → Returns "{{ cookies.access_token }}"

2. API request builder includes template in URL/header/body

3. Runtime evaluates api.server.proxy.enabled
   → true: route to /.toddle/omvej/ with x-nordcraft-url header
   → false: direct fetch (templates not substituted)

4. If useTemplatesInBody enabled:
   → Set x-nordcraft-templates-in-body header
```

### Server-Side Proxy Flow

```
5. Proxy receives request at /.toddle/omvej/...
6. Parse Cookie header → { access_token: "abc123" }
7. Substitute x-nordcraft-url: "...{{ cookies.access_token }}..." → "...abc123..."
8. Validate URL → continue or 400
9. Sanitize headers → remove internal + hop-by-hop + cookie
10. Substitute header values → replace templates
11. If x-nordcraft-templates-in-body present:
    → Read body text
    → Substitute based on content-type
12. Forward request to external API
13. Stream response back to client
```

### SSR Flow

```
5. SSR evaluates API with ssr.enabled
6. Build request URL and headers with templates
7. Substitute query parameter values
8. Sanitize and substitute headers
9. Fetch from external API
10. Cache response for hydration
```

---

## 7. Security

### HttpOnly Cookie Protection

The entire template system exists to enable HttpOnly cookies in API requests without exposing their values to JavaScript:

1. **Client never sees cookie values** — `getHttpOnlyCookie()` returns a placeholder string, not the actual value
2. **Substitution happens server-side only** — the proxy or SSR server has access to the `Cookie` header
3. **Original Cookie header stripped** — `skipCookieHeader()` removes the `Cookie` header before forwarding, preventing all cookies from reaching the external API
4. **Only templated cookies injected** — only cookies explicitly referenced via `{{ cookies.name }}` are included

### Header Sanitization

Internal headers are removed to prevent information leakage:
- `x-nordcraft-url` — exposes internal routing
- `x-nordcraft-templates-in-body` — exposes implementation detail
- `cookie` — prevents mass cookie forwarding

### Missing Cookie Fallback

Templates for missing cookies resolve to empty strings rather than leaving the template syntax intact. This prevents:
- External APIs seeing internal template format
- Template patterns being logged or stored by third parties

---

## 8. Error Handling

| Error | Location | Response |
|-------|----------|----------|
| Invalid URL after substitution | Proxy URL validation | 400 with error message including attempted URL |
| Invalid header name/value | Proxy header sanitization | 400 with "Proxy validation failed" message |
| Non-text body read failure | Proxy body processing | 400 with "Error applying template values" message |
| Null/undefined input | `applyTemplateValues()` | Returns empty string (no error) |
| Missing cookie | `applyTemplateValues()` | Replaced with empty string (no error) |

### Proxy Timeout

All proxied requests have a 5-second timeout via `AbortSignal.timeout(5000)`. Template substitution errors are caught before the fetch attempt.

---

## 9. Business Rules

1. **Only `cookies` template type supported** — the `templateTypes` map has a single entry; no other template types exist
2. **Body substitution is opt-in** — requires both the `useTemplatesInBody` formula to evaluate truthy AND the `x-nordcraft-templates-in-body` header to be set
3. **Form-urlencoded receives special treatment** — values are individually parsed and substituted; other formats use string replacement
4. **Template syntax never reaches external APIs** — missing cookies become empty strings
5. **Cookie header always stripped** — prevents accidental cookie forwarding
6. **Static formulas for proxy config** — most proxy settings use value formulas but dynamic formulas are supported
7. **Proxy URL uses decoded form** — `decodeURIComponent(url.href.replace(/\+/g, ' '))` applied before setting `x-nordcraft-url`

---

## 10. Edge Cases

### Zero-Width Regex Matches
The substitution loop includes protection against zero-width regex matches that could cause infinite loops. If `m.index === cookieRegex.lastIndex`, the index is manually advanced.

### Multiple References to Same Cookie
The `Set<string>` deduplication ensures each unique cookie name is processed once by `replaceAll()`, regardless of how many times it appears in the input string.

### Cookie Values Containing Template Syntax
If a cookie value itself contains `{{ cookies.something }}`, it will not be recursively substituted. The substitution is a single-pass operation using `replaceAll()` on the original template strings.

### Non-Text Body with Templates Enabled
If `x-nordcraft-templates-in-body` is set but the request body is binary (not text), the body read will throw. This is caught and returns a 400 error with a descriptive message.

### Direct Fetch (No Proxy)
When `api.server.proxy.enabled` evaluates to `false`, the request is sent directly from the browser. Template strings like `{{ cookies.access_token }}` are sent as-is since no server-side substitution occurs. This is expected — APIs that need cookie injection must use the proxy.

---

## 11. External Dependencies

| Dependency | Usage |
|------------|-------|
| `cookie` npm package | RFC-compliant parsing of `Cookie` header |
| `STRING_TEMPLATE()` | Template string factory (shared between client and server) |
| `validateUrl()` | URL validation after substitution |
| `URLSearchParams` | Form-urlencoded body parsing/serialization |
| `Headers` API | Header manipulation and iteration |
| `AbortSignal.timeout()` | 5-second timeout on proxied requests |
