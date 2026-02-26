import { describe, test, expect } from 'bun:test';
import {
  parseCookies,
  getRequestCookies,
  decodeToken,
  buildSetCookieHeader,
  validateCookieOptions,
  deleteCookie,
  setHttpOnlyCookie,
  createCookieHandler,
} from './index';
import type { CookieOptions } from './index';

describe('Cookie Management', () => {
  describe('parseCookies', () => {
    test('parses simple cookie string', () => {
      const cookies = parseCookies('name=value');
      expect(cookies).toEqual({ name: 'value' });
    });

    test('parses multiple cookies', () => {
      const cookies = parseCookies('name1=value1; name2=value2');
      expect(cookies).toEqual({ name1: 'value1', name2: 'value2' });
    });

    test('handles whitespace', () => {
      const cookies = parseCookies('  name1=value1  ;  name2=value2  ');
      expect(cookies).toEqual({ name1: 'value1', name2: 'value2' });
    });

    test('returns empty for null', () => {
      expect(parseCookies(null)).toEqual({});
    });

    test('returns empty for empty string', () => {
      expect(parseCookies('')).toEqual({});
    });

    test('handles cookies without value', () => {
      const cookies = parseCookies('name=');
      expect(cookies).toEqual({ name: '' });
    });
  });

  describe('getRequestCookies', () => {
    test('extracts cookies from request', () => {
      const request = new Request('https://example.com', {
        headers: { cookie: 'session=abc123' },
      });
      
      const cookies = getRequestCookies(request);
      expect(cookies).toEqual({ session: 'abc123' });
    });

    test('returns empty for request without cookies', () => {
      const request = new Request('https://example.com');
      const cookies = getRequestCookies(request);
      expect(cookies).toEqual({});
    });
  });

  describe('decodeToken', () => {
    test('decodes valid JWT', () => {
      // Create a simple JWT (header.payload.signature)
      const payload = { exp: 1234567890 };
      const payloadBase64 = btoa(JSON.stringify(payload));
      const token = `header.${payloadBase64}.signature`;
      
      const decoded = decodeToken(token);
      expect(decoded?.exp).toBe(1234567890);
    });

    test('returns undefined for invalid JWT', () => {
      expect(decodeToken('invalid')).toBeUndefined();
      expect(decodeToken('not.enough')).toBeUndefined();
      expect(decodeToken('')).toBeUndefined();
    });
  });

  describe('buildSetCookieHeader', () => {
    test('includes Secure and HttpOnly', () => {
      const options: CookieOptions = { name: 'test', value: 'value' };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
    });

    test('includes SameSite', () => {
      const options: CookieOptions = { name: 'test', value: 'value', sameSite: 'Strict' };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('SameSite=Strict');
    });

    test('defaults SameSite to Lax', () => {
      const options: CookieOptions = { name: 'test', value: 'value' };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('SameSite=Lax');
    });

    test('includes Path', () => {
      const options: CookieOptions = { name: 'test', value: 'value', path: '/app' };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('Path=/app');
    });

    test('defaults Path to /', () => {
      const options: CookieOptions = { name: 'test', value: 'value' };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('Path=/');
    });

    test('includes Max-Age=0 for TTL=0', () => {
      const options: CookieOptions = { name: 'test', value: 'value', ttl: 0 };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('Max-Age=0');
    });

    test('includes Expires for positive TTL', () => {
      const options: CookieOptions = { name: 'test', value: 'value', ttl: 3600 };
      const header = buildSetCookieHeader(options);
      
      expect(header).toContain('Expires=');
    });
  });

  describe('validateCookieOptions', () => {
    test('returns null for valid options', () => {
      const options: CookieOptions = { name: 'test', value: 'value' };
      expect(validateCookieOptions(options)).toBeNull();
    });

    test('returns error for empty name', () => {
      expect(validateCookieOptions({ name: '', value: 'test' })).toBe(
        'Name must be a non-empty string'
      );
    });

    test('returns error for non-string name', () => {
      expect(validateCookieOptions({ name: 123 as any, value: 'test' })).toBe(
        'Name must be a non-empty string'
      );
    });

    test('returns error for non-string value', () => {
      expect(validateCookieOptions({ name: 'test', value: 123 as any })).toBe(
        'Value must be a string'
      );
    });

    test('returns error for invalid SameSite', () => {
      expect(
        validateCookieOptions({ name: 'test', value: 'value', sameSite: 'Invalid' as any })
      ).toBe('SameSite must be Lax, Strict, or None');
    });

    test('returns error for invalid Path', () => {
      expect(
        validateCookieOptions({ name: 'test', value: 'value', path: 123 as any })
      ).toBe('Path must be a string');
    });

    test('returns error for Path not starting with /', () => {
      expect(
        validateCookieOptions({ name: 'test', value: 'value', path: 'path' })
      ).toBe('Path must start with /');
    });

    test('returns error for non-number TTL', () => {
      expect(
        validateCookieOptions({ name: 'test', value: 'value', ttl: '100' as any })
      ).toBe('TTL must be a number');
    });
  });

  describe('deleteCookie', () => {
    test('returns header that deletes cookie', () => {
      const header = deleteCookie('session');

      expect(header).toContain('session=');
      expect(header).toContain('Max-Age=0');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
    });

    test('includes path', () => {
      const header = deleteCookie('session', '/app');
      expect(header).toContain('Path=/app');
    });
  });

  describe('setHttpOnlyCookie', () => {
    test('includes domain for multi-part hostname', () => {
      const options: CookieOptions = { name: 'session', value: 'abc123' };
      const header = setHttpOnlyCookie(options, 'app.example.com');

      expect(header).toContain('session=');
      expect(header).toContain('Domain=example.com');
    });

    test('excludes domain for localhost', () => {
      const options: CookieOptions = { name: 'session', value: 'abc123' };
      const header = setHttpOnlyCookie(options, 'localhost');

      expect(header).not.toContain('Domain=');
    });

    test('excludes domain for IP address', () => {
      const options: CookieOptions = { name: 'session', value: 'abc123' };
      const header = setHttpOnlyCookie(options, '192.168.1.1');

      expect(header).not.toContain('Domain=');
    });

    test('excludes domain when includeSubdomains is false', () => {
      const options: CookieOptions = { name: 'session', value: 'abc123', includeSubdomains: false };
      const header = setHttpOnlyCookie(options, 'app.example.com');

      expect(header).not.toContain('Domain=');
    });

    test('works without hostname', () => {
      const options: CookieOptions = { name: 'session', value: 'abc123' };
      const header = setHttpOnlyCookie(options);

      expect(header).toContain('session=');
      expect(header).toContain('Secure');
    });
  });

  describe('createCookieHandler', () => {
    test('returns 405 for non-POST requests', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=test&value=123', {
        method: 'GET',
      });

      const response = handler(request);
      expect(response.status).toBe(405);
    });

    test('returns 400 for missing name', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?value=123', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.status).toBe(400);
    });

    test('returns 400 for invalid path', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=test&value=123&path=invalid', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.status).toBe(400);
    });

    test('sets cookie for valid POST request', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=session&value=test123', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('session=');
    });

    test('uses custom getHostname', async () => {
      const handler = createCookieHandler({
        getHostname: () => 'app.custom.com',
      });
      const request = new Request('https://example.com/api/cookie?name=session&value=test123', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.headers.get('Set-Cookie')).toContain('Domain=custom.com');
    });

    test('handles TTL parameter', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=session&value=test123&ttl=3600', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('Expires=');
    });

    test('handles sameSite parameter', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=session&value=test123&sameSite=Strict', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict');
    });

    test('handles includeSubdomains=false', async () => {
      const handler = createCookieHandler();
      const request = new Request('https://example.com/api/cookie?name=session&value=test123&includeSubdomains=false', {
        method: 'POST',
      });

      const response = handler(request);
      expect(response.headers.get('Set-Cookie')).not.toContain('Domain=');
    });
  });

  describe('decodeToken edge cases', () => {
    test('handles Base64url with padding', () => {
      // Base64url without padding that needs padding added
      const payload = { exp: 1234567890, sub: 'user123' };
      const payloadBase64 = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''); // Remove padding

      const token = `header.${payloadBase64}.signature`;
      const decoded = decodeToken(token);

      expect(decoded?.exp).toBe(1234567890);
      expect(decoded?.sub).toBe('user123');
    });

    test('handles malformed JSON in payload', () => {
      const token = 'header.not-valid-json.signature';
      expect(decodeToken(token)).toBeUndefined();
    });

    test('handles token with only dots', () => {
      expect(decodeToken('...')).toBeUndefined();
    });
  });

  describe('buildSetCookieHeader edge cases', () => {
    test('extracts expiration from JWT when TTL is negative', () => {
      const payload = { exp: 9999999999 };
      const payloadBase64 = btoa(JSON.stringify(payload));
      const token = `header.${payloadBase64}.signature`;

      const options: CookieOptions = { name: 'session', value: token, ttl: -1 };
      const header = buildSetCookieHeader(options);

      expect(header).toContain('Expires=');
    });

    test('extracts expiration from JWT when TTL is undefined', () => {
      const payload = { exp: 9999999999 };
      const payloadBase64 = btoa(JSON.stringify(payload));
      const token = `header.${payloadBase64}.signature`;

      const options: CookieOptions = { name: 'session', value: token };
      const header = buildSetCookieHeader(options);

      expect(header).toContain('Expires=');
    });

    test('does not add Expires for session cookie without JWT exp', () => {
      const options: CookieOptions = { name: 'session', value: 'not-a-jwt' };
      const header = buildSetCookieHeader(options);

      expect(header).not.toContain('Expires=');
      expect(header).not.toContain('Max-Age=');
    });

    test('encodes special characters in value', () => {
      const options: CookieOptions = { name: 'test', value: 'hello world; special=chars' };
      const header = buildSetCookieHeader(options);

      expect(header).toContain('test=hello%20world%3B%20special%3Dchars');
    });
  });

  describe('parseCookies edge cases', () => {
    test('handles URL-encoded values', () => {
      const cookies = parseCookies('name=hello%20world');
      expect(cookies).toEqual({ name: 'hello world' });
    });

    test('handles malformed URL-encoded values gracefully', () => {
      const cookies = parseCookies('name=%ZZinvalid');
      expect(cookies).toEqual({ name: '%ZZinvalid' });
    });

    test('skips entries without equals sign', () => {
      const cookies = parseCookies('name=value; invalidEntry; another=test');
      expect(cookies).toEqual({ name: 'value', another: 'test' });
    });

    test('handles values with equals signs', () => {
      const cookies = parseCookies('key=value=with=equals');
      expect(cookies).toEqual({ key: 'value=with=equals' });
    });
  });
});
