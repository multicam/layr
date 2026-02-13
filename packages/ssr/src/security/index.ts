/**
 * Security and Content Sanitization System
 * Based on specs/security-and-sanitization.md
 * 
 * Provides XSS protection, URL validation, header sanitization, and template substitution.
 */

// ============================================================================
// XSS Protection - URL Parameter Sanitization
// ============================================================================

/**
 * Escape a single URL search parameter value.
 * Uses basic HTML entity encoding for XSS prevention.
 */
export function escapeSearchParameter(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape all URL search parameters.
 */
export function escapeSearchParameters(params: URLSearchParams): URLSearchParams {
  const escaped = new URLSearchParams();
  
  for (const [key, value] of params) {
    const escapedValue = escapeSearchParameter(value);
    if (escapedValue !== null) {
      escaped.set(key, escapedValue);
    }
  }
  
  return escaped;
}

// ============================================================================
// HTML Attribute Escaping
// ============================================================================

/**
 * Escape a value for safe inclusion in an HTML attribute.
 */
export function escapeAttrValue(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape text content for safe inclusion in HTML.
 */
export function toEncodedText(value: unknown): string {
  if (value == null) return '';
  
  return String(value)
    .replace(/&/g, '&amp;')  // Must be first to prevent double-encoding
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}

// ============================================================================
// Header Sanitization
// ============================================================================

/**
 * Hop-by-hop headers that should not be forwarded.
 */
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * Internal Layr headers that should not be forwarded.
 */
const LAYR_HEADERS = new Set([
  'x-layr-url',
  'x-layr-templates-in-body',
  'x-layr-rewrite',
  'x-layr-redirect-api-name',
  'x-layr-redirect-component-name',
  'x-layr-redirect-name',
]);

/**
 * Headers to forward from proxy responses.
 */
const PROXY_RESPONSE_HEADERS = new Set([
  'content-type',
  'cache-control',
  'expires',
  'accept-ranges',
  'date',
  'last-modified',
  'etag',
]);

/**
 * Skip hop-by-hop headers.
 */
export function skipHopByHopHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  
  for (const [key, value] of headers) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  }
  
  return filtered;
}

/**
 * Skip Layr-specific headers.
 */
export function skipLayrHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  
  for (const [key, value] of headers) {
    if (!LAYR_HEADERS.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  }
  
  return filtered;
}

/**
 * Skip cookie header.
 */
export function skipCookieHeader(headers: Headers): Headers {
  const filtered = new Headers();
  
  for (const [key, value] of headers) {
    if (key.toLowerCase() !== 'cookie') {
      filtered.set(key, value);
    }
  }
  
  return filtered;
}

/**
 * Filter response headers from proxy.
 */
export function filterProxyResponseHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  
  for (const [key, value] of headers) {
    if (PROXY_RESPONSE_HEADERS.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  }
  
  return filtered;
}

/**
 * Sanitize headers for proxy requests.
 * Applies all header filters in sequence.
 */
export function sanitizeProxyHeaders(headers: Headers): Headers {
  return skipCookieHeader(skipLayrHeaders(skipHopByHopHeaders(headers)));
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and normalize a URL.
 */
export function validateUrl(options: {
  path: string | null | undefined;
  origin?: string;
}): URL | false {
  const { path, origin } = options;
  
  // Type check
  if (typeof path !== 'string') return false;
  
  try {
    // Construct URL with optional origin for relative URLs
    const url = new URL(path, origin);
    
    // Re-encode search parameters to fix improper encoding
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      params.set(key, value);
    }
    url.search = params.toString();
    
    return url;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a localhost URL.
 */
export function isLocalhostUrl(href: string): boolean {
  return (
    href.startsWith('http://localhost:54404') ||
    href.startsWith('http://preview.localhost:54404')
  );
}

/**
 * Check if a hostname is localhost.
 */
export function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

// ============================================================================
// Template Substitution
// ============================================================================

/**
 * Cookie template pattern.
 */
const COOKIE_TEMPLATE_PATTERN = /{{ cookies\.(.+?) }}/gm;

/**
 * Apply cookie template substitution to a string.
 */
export function applyTemplateValues(
  input: string | null,
  cookies: Record<string, string>
): string {
  if (!input) return '';
  
  // Find all cookie names in templates
  const cookieNames = new Set<string>();
  let match;
  while ((match = COOKIE_TEMPLATE_PATTERN.exec(input)) !== null) {
    cookieNames.add(match[1]);
  }
  
  // Replace each template
  let result = input;
  for (const name of cookieNames) {
    const template = `{{ cookies.${name} }}`;
    const value = cookies[name] ?? '';
    result = result.split(template).join(value);
  }
  
  return result;
}

/**
 * Map template substitution over headers.
 */
export function mapTemplateHeaders(
  headers: Headers,
  cookies: Record<string, string>
): Headers {
  const mapped = new Headers();
  
  for (const [key, value] of headers) {
    mapped.set(key, applyTemplateValues(value, cookies));
  }
  
  return mapped;
}

// ============================================================================
// Script Tag Escaping
// ============================================================================

/**
 * Escape script tags in JSON for safe embedding in HTML.
 */
export function escapeScriptTags(json: string): string {
  return json.replace(/<\/script\b/gi, '<\\/script');
}

// ============================================================================
// Cloudflare Image Path Detection
// ============================================================================

/**
 * Check if a path is a Cloudflare image path.
 */
export function isCloudflareImagePath(path: string | null | undefined): path is string {
  if (typeof path !== 'string') return false;
  return path.startsWith('/cdn-cgi/imagedelivery/');
}

// ============================================================================
// Header Constants
// ============================================================================

export const PROXY_URL_HEADER = 'x-layr-url';
export const PROXY_TEMPLATES_IN_BODY = 'x-layr-templates-in-body';
export const REWRITE_HEADER = 'x-layr-rewrite';
export const REDIRECT_API_NAME_HEADER = 'x-layr-redirect-api-name';
export const REDIRECT_COMPONENT_NAME_HEADER = 'x-layr-redirect-component-name';
export const REDIRECT_NAME_HEADER = 'x-layr-redirect-name';
