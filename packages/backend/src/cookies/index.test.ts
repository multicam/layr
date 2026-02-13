import { describe, test, expect } from 'bun:test';
import {
  parseCookies,
  getRequestCookies,
  decodeToken,
  buildSetCookieHeader,
  validateCookieOptions,
  deleteCookie,
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
});
