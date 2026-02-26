import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  parseQuery,
  getLocationUrl,
  validateUrl,
  isLocalhostUrl,
  isLocalhostHostname,
  storeScrollState,
  restoreScrollState,
  tryStartViewTransition,
} from './index';
import type { Location } from './index';

describe('Navigation System', () => {
  describe('parseQuery', () => {
    test('parses simple query string', () => {
      const result = parseQuery('?foo=bar&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    test('parses query string without leading question mark', () => {
      const result = parseQuery('foo=bar&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    test('handles empty query string', () => {
      expect(parseQuery('')).toEqual({});
      expect(parseQuery('?')).toEqual({});
    });

    test('handles valueless parameters', () => {
      const result = parseQuery('?flag');
      expect(result).toEqual({ flag: '' });
    });

    test('handles multiple valueless parameters', () => {
      const result = parseQuery('?flag1&flag2&flag3');
      expect(result).toEqual({ flag1: '', flag2: '', flag3: '' });
    });

    test('handles mixed parameters with and without values', () => {
      const result = parseQuery('?flag&foo=bar&anotherFlag');
      expect(result).toEqual({ flag: '', foo: 'bar', anotherFlag: '' });
    });

    test('decodes URL-encoded values', () => {
      const result = parseQuery('?name=John%20Doe');
      expect(result.name).toBe('John Doe');
    });

    test('decodes URL-encoded keys', () => {
      const result = parseQuery('?user%20name=value');
      expect(result['user name']).toBe('value');
    });

    test('handles special characters in values', () => {
      const result = parseQuery('?url=https%3A%2F%2Fexample.com');
      expect(result.url).toBe('https://example.com');
    });

    test('handles empty values', () => {
      const result = parseQuery('?empty=');
      expect(result.empty).toBe('');
    });

    test('filters empty pairs from query string', () => {
      const result = parseQuery('?foo=bar&&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });
  });

  describe('getLocationUrl', () => {
    test('builds URL from location with static route', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'static', name: 'about' },
          ],
        },
        path: '/about',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/about');
    });

    test('builds URL with multiple static segments', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'static', name: 'api' },
            { type: 'static', name: 'users' },
          ],
        },
        path: '/api/users',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/api/users');
    });

    test('builds URL with dynamic params', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'param', name: 'id' },
          ],
        },
        path: '/123',
        params: { id: '123' },
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/123');
    });

    test('stops building path when param is null', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'param', name: 'id' },
            { type: 'static', name: 'edit' },
          ],
        },
        path: '/',
        params: { id: null },
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/');
    });

    test('stops building path when param is undefined', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'param', name: 'id' },
            { type: 'static', name: 'edit' },
          ],
        },
        path: '/',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/');
    });

    test('encodes param values in URL', () => {
      const location: Location = {
        route: {
          path: [
            { type: 'param', name: 'slug' },
          ],
        },
        path: '/hello-world',
        params: { slug: 'hello world' },
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/hello%20world');
    });

    test('includes hash in URL', () => {
      const location: Location = {
        route: {
          path: [],
        },
        path: '/',
        params: {},
        query: {},
        hash: 'section',
      };

      const url = getLocationUrl(location);
      expect(url).toBe('/#section');
    });

    test('includes query params in URL', () => {
      const location: Location = {
        route: {
          path: [],
        },
        path: '/',
        params: {},
        query: { foo: 'bar', baz: 'qux' },
        hash: null,
      };

      const url = getLocationUrl(location);
      expect(url).toContain('foo=bar');
      expect(url).toContain('baz=qux');
    });

    test('encodes query param keys and values', () => {
      const location: Location = {
        route: {
          path: [],
        },
        path: '/',
        params: {},
        query: { 'search term': 'hello world' },
        hash: null,
      };

      const url = getLocationUrl(location);
      expect(url).toContain('search%20term=hello%20world');
    });

    test('excludes null query params', () => {
      const location: Location = {
        route: {
          path: [],
        },
        path: '/',
        params: {},
        query: { foo: 'bar', missing: null },
        hash: null,
      };

      const url = getLocationUrl(location);
      expect(url).toContain('foo=bar');
      expect(url).not.toContain('missing');
    });

    test('uses path directly when no route', () => {
      const location: Location = {
        path: '/custom/path',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/custom/path');
    });

    test('uses page property when page is set but no route', () => {
      const location: Location = {
        page: 'home',
        path: '/home',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/home');
    });

    test('places query string before hash', () => {
      const location: Location = {
        route: {
          path: [{ type: 'static', name: 'page' }],
        },
        path: '/page',
        params: {},
        query: { foo: 'bar' },
        hash: 'section',
      };

      const url = getLocationUrl(location);
      // Query must come before hash per URL spec
      expect(url).toBe('/page?foo=bar#section');
      expect(url.indexOf('?')).toBeLessThan(url.indexOf('#'));
    });

    test('handles hash without query', () => {
      const location: Location = {
        path: '/page',
        params: {},
        query: {},
        hash: 'section',
      };

      expect(getLocationUrl(location)).toBe('/page#section');
    });

    test('handles query without hash', () => {
      const location: Location = {
        path: '/page',
        params: {},
        query: { foo: 'bar' },
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/page?foo=bar');
    });

    test('returns root path for empty route', () => {
      const location: Location = {
        route: {
          path: [],
        },
        path: '/',
        params: {},
        query: {},
        hash: null,
      };

      expect(getLocationUrl(location)).toBe('/');
    });
  });

  describe('validateUrl', () => {
    test('validates absolute URLs', () => {
      const result = validateUrl({ path: 'https://example.com/path' });
      expect(result).not.toBe(false);
      expect((result as URL).href).toBe('https://example.com/path');
    });

    test('validates relative URLs with origin', () => {
      const result = validateUrl({ path: '/path', origin: 'https://example.com' });
      expect(result).not.toBe(false);
      expect((result as URL).href).toBe('https://example.com/path');
    });

    test('validates URLs with query strings', () => {
      const result = validateUrl({ path: '/path?foo=bar', origin: 'https://example.com' });
      expect(result).not.toBe(false);
      expect((result as URL).searchParams.get('foo')).toBe('bar');
    });

    test('returns false for null path', () => {
      expect(validateUrl({ path: null })).toBe(false);
    });

    test('returns false for undefined path', () => {
      expect(validateUrl({ path: undefined })).toBe(false);
    });

    test('returns false for non-string path', () => {
      expect(validateUrl({ path: 123 as any })).toBe(false);
    });

    test('returns false for invalid URL', () => {
      expect(validateUrl({ path: 'not a valid url :: //' })).toBe(false);
    });

    test('handles URLs with special characters', () => {
      const result = validateUrl({ path: '/path?name=John%20Doe', origin: 'https://example.com' });
      expect(result).not.toBe(false);
    });
  });

  describe('isLocalhostUrl', () => {
    test('returns true for localhost URLs with port 54404', () => {
      expect(isLocalhostUrl('http://localhost:54404/page')).toBe(true);
      expect(isLocalhostUrl('http://localhost:54404/')).toBe(true);
    });

    test('returns true for preview localhost URLs', () => {
      expect(isLocalhostUrl('http://preview.localhost:54404/page')).toBe(true);
      expect(isLocalhostUrl('http://preview.localhost:54404/')).toBe(true);
    });

    test('returns false for non-localhost URLs', () => {
      expect(isLocalhostUrl('https://example.com')).toBe(false);
    });

    test('returns false for localhost with different port', () => {
      expect(isLocalhostUrl('http://localhost:3000')).toBe(false);
      expect(isLocalhostUrl('http://localhost:8080')).toBe(false);
    });

    test('returns false for HTTPS localhost', () => {
      expect(isLocalhostUrl('https://localhost:54404')).toBe(false);
    });
  });

  describe('isLocalhostHostname', () => {
    test('returns true for localhost', () => {
      expect(isLocalhostHostname('localhost')).toBe(true);
    });

    test('returns true for 127.0.0.1', () => {
      expect(isLocalhostHostname('127.0.0.1')).toBe(true);
    });

    test('returns false for other IP addresses', () => {
      expect(isLocalhostHostname('192.168.1.1')).toBe(false);
      expect(isLocalhostHostname('10.0.0.1')).toBe(false);
    });

    test('returns false for other hostnames', () => {
      expect(isLocalhostHostname('example.com')).toBe(false);
      expect(isLocalhostHostname('subdomain.example.com')).toBe(false);
    });
  });

  describe('storeScrollState / restoreScrollState', () => {
    test.skip('stores and restores window scroll position', () => {
      // This test requires a browser environment with window object
      const key = 'test-scroll';

      // Store state
      const restore = storeScrollState(key, '[data-id]', () => 'test');

      // Get stored state
      const stored = sessionStorage.getItem(`scroll-position(${key})`);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveProperty('__window');

      // Clean up
      sessionStorage.removeItem(`scroll-position(${key})`);
    });
  });

  describe('tryStartViewTransition', () => {
    test.skip('returns finished promise', async () => {
      // This test requires a browser environment
      let callbackCalled = false;

      const result = tryStartViewTransition(() => {
        callbackCalled = true;
      });

      expect(result).toHaveProperty('finished');
      expect(callbackCalled).toBe(true);

      await result.finished;
    });

    test.skip('executes callback immediately when API unavailable', () => {
      // This test requires a browser environment
      let callbackCalled = false;

      const result = tryStartViewTransition(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(true);
    });
  });
});
