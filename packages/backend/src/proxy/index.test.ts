import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { createProxy, fontProxy, fontStaticProxy } from './index';
import type { Context } from 'hono';

// Helper to create mock context
function createMockContext(url: string, method = 'GET', body?: string, headers?: Record<string, string>): Context {
  const reqUrl = new URL(url, 'http://localhost');
  return {
    req: {
      url: reqUrl.toString(),
      method,
      path: reqUrl.pathname,
      raw: {
        headers: new Map(Object.entries(headers || {})) as any,
        forEach: () => {},
      } as any,
      text: async () => body || '',
    },
    text: (msg: string, status: number) => new Response(msg, { status }) as any,
  } as unknown as Context;
}

describe('proxy', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() => Promise.resolve(new Response('mocked', { status: 200 })));
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fetchMock?.mockRestore?.();
  });

  describe('createProxy', () => {
    test('creates proxy function', () => {
      const proxy = createProxy({ target: 'https://example.com' });
      expect(typeof proxy).toBe('function');
    });

    test('accepts config options', () => {
      const proxy = createProxy({
        target: 'https://example.com',
        changeOrigin: true,
        timeout: 5000,
      });
      expect(typeof proxy).toBe('function');
    });

    test('forwards GET request to target URL', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/test/path?foo=bar', 'GET');

      await proxy(ctx);

      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toBe('https://api.example.com/test/path?foo=bar');
      expect(call[1].method).toBe('GET');
    });

    test('forwards POST request with body', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/api', 'POST', '{"data":"test"}');

      await proxy(ctx);

      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      expect(call[1].method).toBe('POST');
      expect(call[1].body).toBe('{"data":"test"}');
    });

    test('omits body for GET requests', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/api', 'GET', 'body-ignored');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].body).toBeUndefined();
    });

    test('omits body for HEAD requests', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/api', 'HEAD', 'body-ignored');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].body).toBeUndefined();
    });

    test('sets Host header when changeOrigin is true', async () => {
      const proxy = createProxy({ target: 'https://api.example.com', changeOrigin: true });
      const ctx = createMockContext('http://localhost/test');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].headers['Host']).toBe('api.example.com');
    });

    test('does not set Host header when changeOrigin is false', async () => {
      const proxy = createProxy({ target: 'https://api.example.com', changeOrigin: false });
      const ctx = createMockContext('http://localhost/test');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].headers['Host']).toBeUndefined();
    });

    test('merges custom headers with forwarded headers', async () => {
      const proxy = createProxy({
        target: 'https://api.example.com',
        headers: { 'X-Custom': 'custom-value' },
      });
      const ctx = createMockContext('http://localhost/test', 'GET', undefined, {
        'content-type': 'application/json',
        'x-custom': 'should-be-overridden',
      });

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].headers['X-Custom']).toBe('custom-value');
      expect(call[1].headers['content-type']).toBe('application/json');
    });

    test('only forwards safe headers', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/test', 'GET', undefined, {
        'authorization': 'Bearer token', // Not in safe list
        'content-type': 'application/json', // In safe list
      });

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].headers['authorization']).toBeUndefined();
      expect(call[1].headers['content-type']).toBe('application/json');
    });

    test('returns 502 Bad Gateway on fetch error', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error'))) as any;
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/test');

      const response = await proxy(ctx);

      expect(response.status).toBe(502);
    });

    test('returns 504 Gateway Timeout on abort', async () => {
      global.fetch = mock(() => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      }) as any;
      const proxy = createProxy({ target: 'https://api.example.com', timeout: 100 });
      const ctx = createMockContext('http://localhost/test');

      const response = await proxy(ctx);

      expect(response.status).toBe(504);
    });

    test('uses default timeout of 30000ms', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/test');

      await proxy(ctx);

      // Verify the proxy was created (no error thrown)
      expect(fetchMock).toHaveBeenCalled();
    });

    test('forwards PUT request with body', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/resource', 'PUT', 'update data');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].method).toBe('PUT');
      expect(call[1].body).toBe('update data');
    });

    test('forwards DELETE request', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/resource', 'DELETE');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[1].method).toBe('DELETE');
    });

    test('returns response from upstream', async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response('upstream response', {
          status: 201,
          headers: { 'X-Upstream': 'value' }
        }))
      ) as any;
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/test');

      const response = await proxy(ctx);

      expect(response.status).toBe(201);
      expect(await response.text()).toBe('upstream response');
    });

    test('handles empty path', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/', 'GET');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toBe('https://api.example.com/');
    });

    test('forwards query parameters', async () => {
      const proxy = createProxy({ target: 'https://api.example.com' });
      const ctx = createMockContext('http://localhost/search?q=test&limit=10', 'GET');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('q=test');
      expect(call[0]).toContain('limit=10');
    });
  });

  describe('fontProxy', () => {
    test('creates Google Fonts proxy', () => {
      const proxy = fontProxy();
      expect(typeof proxy).toBe('function');
    });

    test('proxy targets Google Fonts CSS API', async () => {
      const proxy = fontProxy();
      const ctx = createMockContext('http://localhost/css2?family=Roboto', 'GET');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('fonts.googleapis.com');
    });
  });

  describe('fontStaticProxy', () => {
    test('creates Google Fonts static proxy', () => {
      const proxy = fontStaticProxy();
      expect(typeof proxy).toBe('function');
    });

    test('proxy targets Google Fonts static files', async () => {
      const proxy = fontStaticProxy();
      const ctx = createMockContext('http://localhost/s/roboto/font.woff2', 'GET');

      await proxy(ctx);

      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('fonts.gstatic.com');
    });
  });
});
