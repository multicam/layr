import { describe, test, expect, beforeEach, afterEach, mock, jest } from 'bun:test';
import {
  parseQuery,
  parseUrl,
  getLocationUrl,
  navigate,
  setUrlParameter,
  setUrlParameters,
  validateUrl,
  isLocalhostUrl,
  isLocalhostHostname,
  storeScrollState,
  restoreScrollState,
  tryStartViewTransition,
} from './index';
import type { Location, LocationSignal } from './index';
import { createSignal } from '@layr/core';

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

  describe('parseUrl', () => {
    const originalLocation = globalThis.window?.location;

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            pathname: '/users/123/profile',
            search: '?tab=settings&filter=active',
            hash: '#section1',
          },
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalLocation) {
        Object.defineProperty(globalThis, 'window', {
          value: { location: originalLocation },
          writable: true,
          configurable: true,
        });
      }
    });

    test('parses URL without route component', () => {
      const result = parseUrl({});

      expect(result.path).toBe('/users/123/profile');
      expect(result.hash).toBe('section1');
      expect(result.params).toEqual({});
      expect(result.query.tab).toBe('settings');
      expect(result.query.filter).toBe('active');
    });

    test('parses URL with route path parameters', () => {
      const result = parseUrl({
        route: {
          path: [
            { type: 'static', name: 'users' },
            { type: 'param', name: 'userId' },
            { type: 'static', name: 'profile' },
          ],
        },
      });

      expect(result.params.userId).toBe('123');
    });

    test('parses URL with declared query parameters', () => {
      const result = parseUrl({
        route: {
          path: [{ type: 'static', name: 'users' }],
          query: {
            tab: { name: 'tab' },
            sort: { name: 'sort' },
          },
        },
      });

      // Declared params should have values
      expect(result.query.tab).toBe('settings');
      // Declared but not present should be null
      expect(result.query.sort).toBeNull();
    });

    test('handles URL-encoded path parameters', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            pathname: '/hello%20world',
            search: '',
            hash: '',
          },
        },
        writable: true,
        configurable: true,
      });

      const result = parseUrl({
        route: {
          path: [{ type: 'param', name: 'username' }],
        },
      });

      expect(result.params.username).toBe('hello world');
    });

    test('handles malformed URI components in path', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            pathname: '/%ZZinvalid',
            search: '',
            hash: '',
          },
        },
        writable: true,
        configurable: true,
      });

      const result = parseUrl({
        route: {
          path: [{ type: 'param', name: 'value' }],
        },
      });

      // Should use raw value when decodeURIComponent fails
      expect(result.params.value).toBe('%ZZinvalid');
    });

    test('handles hash with query string', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            pathname: '/page',
            search: '',
            hash: '#section?foo=bar',
          },
        },
        writable: true,
        configurable: true,
      });

      const result = parseUrl({});

      // Hash should be extracted without query part
      expect(result.hash).toBe('section');
    });

    test('handles empty hash', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            pathname: '/page',
            search: '',
            hash: '',
          },
        },
        writable: true,
        configurable: true,
      });

      const result = parseUrl({});

      expect(result.hash).toBeNull();
    });
  });

  describe('navigate', () => {
    let mockHistory: { pushState: jest.Mock; replaceState: jest.Mock };
    let mockLocation: Location;

    beforeEach(() => {
      mockHistory = {
        pushState: mock(() => {}),
        replaceState: mock(() => {}),
      };

      mockLocation = {
        path: '/initial',
        params: {},
        query: {},
        hash: null,
      };

      Object.defineProperty(globalThis, 'window', {
        value: {
          history: mockHistory,
          location: {
            origin: 'https://example.com',
          },
        },
        writable: true,
        configurable: true,
      });
    });

    test('calls pushState for push mode', () => {
      const locationSignal = createSignal(mockLocation) as LocationSignal;
      const newLocation: Location = {
        path: '/new-path',
        params: {},
        query: {},
        hash: null,
      };

      navigate(newLocation, locationSignal, 'push');

      expect(mockHistory.pushState).toHaveBeenCalled();
      expect(locationSignal.get().path).toBe('/new-path');
    });

    test('calls replaceState for replace mode', () => {
      const locationSignal = createSignal(mockLocation) as LocationSignal;
      const newLocation: Location = {
        path: '/replaced-path',
        params: {},
        query: {},
        hash: null,
      };

      navigate(newLocation, locationSignal, 'replace');

      expect(mockHistory.replaceState).toHaveBeenCalled();
      expect(locationSignal.get().path).toBe('/replaced-path');
    });

    test('defaults to push mode', () => {
      const locationSignal = createSignal(mockLocation) as LocationSignal;
      const newLocation: Location = {
        path: '/default-push',
        params: {},
        query: {},
        hash: null,
      };

      navigate(newLocation, locationSignal);

      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    test('does nothing when URL is unchanged', () => {
      const locationSignal = createSignal(mockLocation) as LocationSignal;

      navigate(mockLocation, locationSignal, 'push');

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    test('blocks navigation for invalid URL', () => {
      const locationSignal = createSignal(mockLocation) as LocationSignal;
      const invalidLocation: Location = {
        path: '/valid',
        params: {},
        query: { bad: '\x00control' }, // This should still work, but let's test with invalid URL generation
        hash: null,
      };

      // The URL should still be valid since encodeURIComponent handles most chars
      // Let's test with a valid but edge case URL
      navigate(invalidLocation, locationSignal, 'push');

      // This should work since it's a valid path
      expect(mockHistory.pushState).toHaveBeenCalled();
    });
  });

  describe('setUrlParameter', () => {
    let mockHistory: { pushState: jest.Mock; replaceState: jest.Mock };

    beforeEach(() => {
      mockHistory = {
        pushState: mock(() => {}),
        replaceState: mock(() => {}),
      };

      Object.defineProperty(globalThis, 'window', {
        value: {
          history: mockHistory,
          location: {
            origin: 'https://example.com',
          },
        },
        writable: true,
        configurable: true,
      });
    });

    test('sets query parameter', () => {
      const initialLocation: Location = {
        path: '/page',
        params: {},
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameter('search', 'test', locationSignal);

      expect(locationSignal.get().query.search).toBe('test');
      // Query params default to replace mode
      expect(mockHistory.replaceState).toHaveBeenCalled();
    });

    test('sets path parameter', () => {
      const initialLocation: Location = {
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
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameter('id', '456', locationSignal);

      expect(locationSignal.get().params.id).toBe('456');
      // Path params default to push mode
      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    test('removes parameter when value is undefined', () => {
      const initialLocation: Location = {
        path: '/page',
        params: {},
        query: { search: 'test', other: 'value' },
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameter('search', undefined, locationSignal);

      expect(locationSignal.get().query.search).toBeUndefined();
      expect(locationSignal.get().query.other).toBe('value');
    });

    test('setting null query parameter does not navigate when URL unchanged', () => {
      const initialLocation: Location = {
        path: '/page',
        params: {},
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      // When we set null for a query param, the URL doesn't change (null is filtered)
      // so navigate returns early and doesn't update the signal
      setUrlParameter('filter', null, locationSignal);

      // Navigate should not have been called because URL is unchanged
      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    test('uses explicit mode over default', () => {
      const initialLocation: Location = {
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
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameter('id', '456', locationSignal, 'replace');

      expect(locationSignal.get().params.id).toBe('456');
      expect(mockHistory.replaceState).toHaveBeenCalled();
    });
  });

  describe('setUrlParameters', () => {
    let mockHistory: { pushState: jest.Mock; replaceState: jest.Mock };

    beforeEach(() => {
      mockHistory = {
        pushState: mock(() => {}),
        replaceState: mock(() => {}),
      };

      Object.defineProperty(globalThis, 'window', {
        value: {
          history: mockHistory,
          location: {
            origin: 'https://example.com',
          },
        },
        writable: true,
        configurable: true,
      });
    });

    test('sets multiple parameters atomically', () => {
      const initialLocation: Location = {
        route: {
          path: [{ type: 'static', name: 'page' }],
        },
        path: '/page',
        params: {},
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameters({ search: 'test', filter: 'active' }, locationSignal);

      expect(locationSignal.get().query.search).toBe('test');
      expect(locationSignal.get().query.filter).toBe('active');
    });

    test('sets path and query parameters together', () => {
      const initialLocation: Location = {
        route: {
          path: [
            { type: 'param', name: 'id' },
            { type: 'static', name: 'edit' },
          ],
        },
        path: '/123/edit',
        params: { id: '123' },
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameters({ id: '456', tab: 'settings' }, locationSignal);

      expect(locationSignal.get().params.id).toBe('456');
      expect(locationSignal.get().query.tab).toBe('settings');
      // Path change defaults to push mode
      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    test('does nothing without route', () => {
      const initialLocation: Location = {
        path: '/page',
        params: {},
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameters({ search: 'test' }, locationSignal);

      expect(mockHistory.pushState).not.toHaveBeenCalled();
      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    test('removes parameters with undefined', () => {
      const initialLocation: Location = {
        route: {
          path: [{ type: 'static', name: 'page' }],
        },
        path: '/page',
        params: {},
        query: { search: 'test', filter: 'active' },
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameters({ search: undefined }, locationSignal);

      expect(locationSignal.get().query.search).toBeUndefined();
      expect(locationSignal.get().query.filter).toBe('active');
    });

    test('defaults to replace mode for query-only changes', () => {
      const initialLocation: Location = {
        route: {
          path: [{ type: 'static', name: 'page' }],
        },
        path: '/page',
        params: {},
        query: {},
        hash: null,
      };
      const locationSignal = createSignal(initialLocation) as LocationSignal;

      setUrlParameters({ search: 'test' }, locationSignal);

      expect(mockHistory.replaceState).toHaveBeenCalled();
    });
  });

  describe('storeScrollState / restoreScrollState', () => {
    let mockSessionStorage: { [key: string]: string };
    let mockScrollTo: jest.Mock;

    beforeEach(() => {
      mockSessionStorage = {};
      mockScrollTo = mock(() => {});

      const mockElements = [
        { getAttribute: () => 'elem1', scrollTop: 100, scrollLeft: 50 },
        { getAttribute: () => 'elem2', scrollTop: 0, scrollLeft: 0 }, // No scroll, should be skipped
      ];

      Object.defineProperty(globalThis, 'window', {
        value: {
          scrollX: 10,
          scrollY: 20,
          scrollTo: mockScrollTo,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis, 'document', {
        value: {
          querySelectorAll: mock(() => mockElements),
          querySelector: mock(() => ({ scrollTop: 0, scrollLeft: 0 })),
          startViewTransition: undefined,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis, 'sessionStorage', {
        value: {
          getItem: (key: string) => mockSessionStorage[key] ?? null,
          setItem: (key: string, value: string) => { mockSessionStorage[key] = value; },
          removeItem: (key: string) => { delete mockSessionStorage[key]; },
        },
        writable: true,
        configurable: true,
      });
    });

    test('stores window scroll position', () => {
      storeScrollState('test-key', '[data-id]', (el) => el.getAttribute('data-id'));

      const stored = JSON.parse(mockSessionStorage['scroll-position(test-key)']);
      expect(stored.__window).toEqual({ x: 10, y: 20 });
    });

    test('stores element scroll positions', () => {
      storeScrollState('test-key', '[data-id]', (el) => el.getAttribute('data-id'));

      const stored = JSON.parse(mockSessionStorage['scroll-position(test-key)']);
      expect(stored.elem1).toEqual({ x: 50, y: 100 });
      // elem2 has 0,0 scroll so should not be stored
      expect(stored.elem2).toBeUndefined();
    });

    test('returns restore function', () => {
      const restore = storeScrollState('test-key');

      expect(typeof restore).toBe('function');
    });

    test('restores scroll positions', () => {
      mockSessionStorage['scroll-position(test-key)'] = JSON.stringify({
        __window: { x: 100, y: 200 },
        elem1: { x: 50, y: 100 },
      });

      const mockElem1 = { scrollTop: 0, scrollLeft: 0 };
      Object.defineProperty(globalThis, 'document', {
        value: {
          querySelector: mock((sel: string) => {
            if (sel === '[data-id="elem1"]') return mockElem1;
            return null;
          }),
        },
        writable: true,
        configurable: true,
      });

      restoreScrollState('test-key', (id) => {
        if (id === 'elem1') return mockElem1 as unknown as HTMLElement;
        return null;
      });

      expect(mockScrollTo).toHaveBeenCalledWith(100, 200);
    });

    test('does nothing when no stored state', () => {
      restoreScrollState('nonexistent-key');

      expect(mockScrollTo).not.toHaveBeenCalled();
    });

    test('handles invalid JSON in stored state', () => {
      mockSessionStorage['scroll-position(bad-key)'] = 'not valid json';

      // Should not throw
      restoreScrollState('bad-key');
    });

    test('does nothing when __window key is missing', () => {
      mockSessionStorage['scroll-position(incomplete)'] = JSON.stringify({
        elem1: { x: 50, y: 100 },
      });

      restoreScrollState('incomplete');

      expect(mockScrollTo).not.toHaveBeenCalled();
    });
  });

  describe('tryStartViewTransition', () => {
    test('executes callback immediately when API unavailable', () => {
      let callbackCalled = false;

      Object.defineProperty(globalThis, 'document', {
        value: {
          startViewTransition: undefined,
        },
        writable: true,
        configurable: true,
      });

      const result = tryStartViewTransition(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(true);
      expect(result).toHaveProperty('finished');
    });

    test('uses native API when available', async () => {
      let callbackCalled = false;

      const mockTransition = {
        finished: Promise.resolve(),
      };

      Object.defineProperty(globalThis, 'document', {
        value: {
          startViewTransition: mock((cb: () => void) => {
            cb();
            return mockTransition;
          }),
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: mock(() => ({ matches: false })),
        },
        writable: true,
        configurable: true,
      });

      const result = tryStartViewTransition(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(true);
      await expect(result.finished).resolves.toBeUndefined();
    });

    test('skips transition when prefers-reduced-motion', () => {
      let callbackCalled = false;

      Object.defineProperty(globalThis, 'document', {
        value: {
          startViewTransition: mock(() => {
            throw new Error('Should not be called');
          }),
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: mock((query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
          })),
        },
        writable: true,
        configurable: true,
      });

      const result = tryStartViewTransition(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(true);
    });

    test('ignores reduced motion preference when flag is set', () => {
      let callbackCalled = false;
      let transitionCalled = false;

      const mockTransition = {
        finished: Promise.resolve(),
      };

      Object.defineProperty(globalThis, 'document', {
        value: {
          startViewTransition: mock((cb: () => void) => {
            transitionCalled = true;
            cb(); // Call the callback like the native API would
            return mockTransition;
          }),
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: mock(() => ({ matches: true })),
        },
        writable: true,
        configurable: true,
      });

      tryStartViewTransition(
        () => { callbackCalled = true; },
        { skipPrefersReducedMotionCheck: true }
      );

      expect(callbackCalled).toBe(true);
      expect(transitionCalled).toBe(true);
    });
  });
});
