/**
 * Cookie Management System
 * Based on specs/cookie-management.md
 * 
 * Provides server-side cookie handling with HttpOnly support.
 */

// ============================================================================
// Cookie Types
// ============================================================================

export interface CookieOptions {
  name: string;
  value: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
  ttl?: number;
  includeSubdomains?: boolean;
}

export interface CookieConfig {
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Lax' | 'Strict' | 'None';
  path: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
}

// ============================================================================
// Cookie Parsing
// ============================================================================

/**
 * Parse cookies from a Cookie header string.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');
  
  for (const pair of pairs) {
    const trimmed = pair.trim();
    const index = trimmed.indexOf('=');

    if (index > 0) {
      const name = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();

      // Filter out undefined keys/values
      if (name && value !== undefined) {
        try {
          cookies[name] = decodeURIComponent(value);
        } catch {
          cookies[name] = value;
        }
      }
    }
  }
  
  return cookies;
}

/**
 * Get cookies from a Request object.
 */
export function getRequestCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie');
  return parseCookies(cookieHeader);
}

// ============================================================================
// Cookie Setting
// ============================================================================

/**
 * Decode a JWT token to extract the expiration time.
 * Returns undefined if not a valid JWT or no exp claim.
 */
export function decodeToken(token: string): { exp?: number } | undefined {
  try {
    // Convert Base64url to Base64
    let base64 = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    // Add padding for environments that require it
    while (base64.length % 4 !== 0) base64 += '=';

    // Decode
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return undefined;
  }
}

/**
 * Build a Set-Cookie header value.
 */
export function buildSetCookieHeader(options: CookieOptions): string {
  const {
    name,
    value,
    sameSite = 'Lax',
    path = '/',
    ttl,
    includeSubdomains = true,
  } = options;
  
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  
  // Always set Secure and HttpOnly
  parts.push('Secure');
  parts.push('HttpOnly');
  
  // SameSite
  parts.push(`SameSite=${sameSite}`);
  
  // Path
  parts.push(`Path=${path}`);
  
  // Expiration
  if (ttl !== undefined) {
    if (ttl === 0) {
      // Delete cookie
      parts.push('Max-Age=0');
    } else if (ttl > 0) {
      // Set expiration
      const expires = new Date(Date.now() + ttl * 1000);
      parts.push(`Expires=${expires.toUTCString()}`);
    } else {
      // Try to extract from JWT
      const decoded = decodeToken(value);
      if (decoded?.exp) {
        const expires = new Date(decoded.exp * 1000);
        parts.push(`Expires=${expires.toUTCString()}`);
      }
      // Otherwise session cookie
    }
  } else {
    // Try to extract from JWT for session cookies too
    const decoded = decodeToken(value);
    if (decoded?.exp) {
      const expires = new Date(decoded.exp * 1000);
      parts.push(`Expires=${expires.toUTCString()}`);
    }
    // Otherwise session cookie (no expiry)
  }
  
  // Domain for subdomain support
  if (includeSubdomains) {
    // Domain will be set by the handler based on request hostname
    // parts.push(`Domain=${domain}`);
  }
  
  return parts.join('; ');
}

/**
 * Validate cookie options.
 * Returns an error message or null if valid.
 */
export function validateCookieOptions(options: Partial<CookieOptions>): string | null {
  if (typeof options.name !== 'string' || options.name === '') {
    return 'Name must be a non-empty string';
  }
  
  if (typeof options.value !== 'string') {
    return 'Value must be a string';
  }
  
  if (options.sameSite && !['Lax', 'Strict', 'None'].includes(options.sameSite)) {
    return 'SameSite must be Lax, Strict, or None';
  }
  
  if (options.path && typeof options.path !== 'string') {
    return 'Path must be a string';
  }
  
  if (options.path && !options.path.startsWith('/')) {
    return 'Path must start with /';
  }
  
  if (options.ttl !== undefined && typeof options.ttl !== 'number') {
    return 'TTL must be a number';
  }
  
  return null;
}

// ============================================================================
// Cookie Handler
// ============================================================================

/**
 * Create a Set-Cookie header for HttpOnly cookie.
 */
export function setHttpOnlyCookie(options: CookieOptions, hostname?: string): string {
  const parts = [buildSetCookieHeader(options)];

  // Build domain - skip for localhost and IP addresses
  let domainAttr = '';
  if (options.includeSubdomains !== false && hostname) {
    if (hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && hostname.includes('.')) {
      const hostnameParts = hostname.split('.');
      // For multi-part TLDs, take last 2 parts (imperfect but safer)
      const domain = hostnameParts.slice(-2).join('.');
      domainAttr = `Domain=${domain}`;
      parts.push(domainAttr);
    }
  }

  return parts.filter(Boolean).join('; ');
}

/**
 * Delete a cookie by setting Max-Age=0.
 */
export function deleteCookie(name: string, path = '/'): string {
  return `${name}=; Max-Age=0; Path=${path}; Secure; HttpOnly; SameSite=Lax`;
}

// ============================================================================
// Cookie Constants
// ============================================================================

export const THEME_COOKIE_NAME = 'nc-theme';
export const SESSION_COOKIE_NAME = 'access_token';

// ============================================================================
// Hono Cookie Handler
// ============================================================================

/**
 * Cookie handler options for Hono.
 */
export interface CookieHandlerOptions {
  getPath?: (url: string) => string;
  getHostname?: (url: string) => string;
}

/**
 * Create a cookie set handler for Hono routes.
 */
export function createCookieHandler(options: CookieHandlerOptions = {}) {
  return (request: Request): Response => {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);
    
    // Extract parameters
    const name = params.get('name');
    const value = params.get('value') ?? '';
    const sameSite = (params.get('sameSite') as CookieOptions['sameSite']) ?? 'Lax';
    const path = params.get('path') ?? '/';
    const ttlStr = params.get('ttl');
    const includeSubdomains = params.get('includeSubdomains') !== 'false';
    
    // Parse TTL
    const ttl = ttlStr ? parseInt(ttlStr, 10) : undefined;
    
    // Validate
    const cookieOptions: CookieOptions = {
      name: name ?? '',
      value,
      sameSite,
      path,
      ttl: isNaN(ttl ?? NaN) ? undefined : ttl,
      includeSubdomains,
    };
    
    const validationError = validateCookieOptions(cookieOptions);
    if (validationError || !name) {
      return new Response(JSON.stringify({ error: validationError ?? 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Build Set-Cookie header
    const hostname = options.getHostname?.(url.href) ?? url.hostname;
    const setCookie = setHttpOnlyCookie(cookieOptions, hostname);
    
    return new Response(null, {
      status: 200,
      headers: {
        'Set-Cookie': setCookie,
        'Cache-Control': 'no-cache',
      },
    });
  };
}
