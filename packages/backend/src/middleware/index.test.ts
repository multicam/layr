import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test';
import { compose, corsMiddleware, loggerMiddleware, errorHandlerMiddleware, requestIdMiddleware } from './index';

describe('middleware', () => {
  describe('compose', () => {
    test('executes middleware in order', async () => {
      const order: number[] = [];
      const middleware = [
        async (_ctx: any, next: any) => { order.push(1); await next(); },
        async (_ctx: any, next: any) => { order.push(2); await next(); },
        async (_ctx: any, next: any) => { order.push(3); await next(); },
      ];

      const composed = compose(middleware);
      await composed({} as any, async () => { order.push(4); });

      expect(order).toEqual([1, 2, 3, 4]);
    });

    test('can short-circuit', async () => {
      const order: number[] = [];
      const middleware = [
        async (_ctx: any, _next: any) => { order.push(1); },
        async (_ctx: any, next: any) => { order.push(2); await next(); },
      ];

      const composed = compose(middleware);
      await composed({} as any, async () => { order.push(3); });

      expect(order).toEqual([1]);
    });

    test('throws when next() called multiple times', async () => {
      const middleware = [
        async (_ctx: any, next: any) => {
          await next();
          await next(); // Second call should throw
        },
      ];

      const composed = compose(middleware);

      await expect(composed({} as any, async () => {})).rejects.toThrow('next() called multiple times');
    });

    test('handles empty middleware array', async () => {
      const composed = compose([]);
      let finalCalled = false;

      await composed({} as any, async () => { finalCalled = true; });

      expect(finalCalled).toBe(true);
    });

    test('handles single middleware', async () => {
      let called = false;
      const middleware = [
        async (_ctx: any, next: any) => { called = true; await next(); },
      ];

      const composed = compose(middleware);
      await composed({} as any, async () => {});

      expect(called).toBe(true);
    });

    test('passes context through middleware chain', async () => {
      const ctx = { value: 0 };
      const middleware = [
        async (c: any, next: any) => { c.value += 1; await next(); },
        async (c: any, next: any) => { c.value *= 2; await next(); },
      ];

      const composed = compose(middleware);
      await composed(ctx as any, async () => { ctx.value += 10; });

      expect(ctx.value).toBe(12); // (0 + 1) * 2 + 10
    });
  });

  describe('corsMiddleware', () => {
    test('sets CORS headers', async () => {
      const ctx = {
        req: { method: 'GET', header: () => 'http://localhost:3000' },
        header: () => {},
        text: () => {},
      } as any;

      let called = false;
      await corsMiddleware()(ctx, async () => { called = true; });

      expect(called).toBe(true);
    });

    test('handles OPTIONS preflight', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'OPTIONS', header: () => '*' },
        header: (k: string, v: string) => { headers[k] = v; },
        text: (body: string, status: number) => ({ status }),
      } as any;

      const result = await corsMiddleware()(ctx, async () => {});

      expect((result as any).status).toBe(204);
    });

    test('sets wildcard origin by default', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => undefined },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware()(ctx, async () => {});

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('sets single allowed origin', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => 'http://example.com' },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ origin: 'https://allowed.com' })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Origin']).toBe('https://allowed.com');
    });

    test('allows matching origin from array', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => 'http://localhost:3000' },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({
        origin: ['http://localhost:3000', 'https://production.com'],
      })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    test('uses first origin when request origin not in array', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => 'http://unknown.com' },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({
        origin: ['https://allowed1.com', 'https://allowed2.com'],
      })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Origin']).toBe('https://allowed1.com');
    });

    test('sets Vary header when array origin matches', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => 'http://localhost:3000' },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({
        origin: ['http://localhost:3000', 'https://other.com'],
      })(ctx, async () => {});

      expect(headers['Vary']).toBe('Origin');
    });

    test('sets custom allowed methods', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => undefined },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ methods: ['GET', 'POST'] })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
    });

    test('sets custom allowed headers', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => undefined },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ headers: ['Content-Type', 'X-Custom'] })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-Custom');
    });

    test('sets credentials header when enabled', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => undefined },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ credentials: true })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    test('does not set credentials header when disabled', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => undefined },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ credentials: false })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });

    test('falls back to * when origin array is empty', async () => {
      const headers: Record<string, string> = {};
      const ctx = {
        req: { method: 'GET', header: () => 'http://example.com' },
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await corsMiddleware({ origin: [] })(ctx, async () => {});

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('loggerMiddleware', () => {
    let consoleLogMock: ReturnType<typeof mock>;

    beforeEach(() => {
      consoleLogMock = mock(() => {});
      console.log = consoleLogMock as any;
    });

    afterEach(() => {
      consoleLogMock.mockRestore?.();
    });

    test('logs request method and path', async () => {
      const ctx = {
        req: { method: 'GET', path: '/api/test' },
        res: { status: 200 },
      } as any;

      await loggerMiddleware()(ctx, async () => {});

      expect(consoleLogMock).toHaveBeenCalled();
      const logCall = consoleLogMock.mock.calls[0][0];
      expect(logCall).toContain('GET');
      expect(logCall).toContain('/api/test');
      expect(logCall).toContain('200');
    });

    test('logs response time', async () => {
      const ctx = {
        req: { method: 'POST', path: '/api/data' },
        res: { status: 201 },
      } as any;

      await loggerMiddleware()(ctx, async () => {});

      const logCall = consoleLogMock.mock.calls[0][0];
      expect(logCall).toMatch(/\d+ms/);
    });

    test('measures actual elapsed time', async () => {
      const ctx = {
        req: { method: 'GET', path: '/slow' },
        res: { status: 200 },
      } as any;

      const start = Date.now();
      await loggerMiddleware()(ctx, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const elapsed = Date.now() - start;

      const logCall = consoleLogMock.mock.calls[0][0];
      const match = logCall.match(/(\d+)ms/);
      expect(match).not.toBeNull();
      const loggedMs = parseInt(match![1], 10);
      expect(loggedMs).toBeGreaterThanOrEqual(10);
      expect(loggedMs).toBeLessThanOrEqual(elapsed + 10);
    });
  });

  describe('errorHandlerMiddleware', () => {
    let consoleErrorMock: ReturnType<typeof mock>;

    beforeEach(() => {
      consoleErrorMock = mock(() => {});
      console.error = consoleErrorMock as any;
    });

    afterEach(() => {
      consoleErrorMock.mockRestore?.();
    });

    test('passes through successful requests', async () => {
      let nextCalled = false;
      const ctx = { json: () => {} } as any;

      await errorHandlerMiddleware()(ctx, async () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
    });

    test('catches errors and returns 500 response', async () => {
      let jsonResponse: any = null;
      const ctx = {
        json: (body: any, status: number) => { jsonResponse = { body, status }; },
      } as any;

      const result = await errorHandlerMiddleware()(ctx, async () => {
        throw new Error('Test error');
      });

      expect(jsonResponse.status).toBe(500);
    });

    test('hides error message in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      let jsonResponse: any = null;
      const ctx = {
        json: (body: any, status: number) => { jsonResponse = { body, status }; },
      } as any;

      await errorHandlerMiddleware()(ctx, async () => {
        throw new Error('Secret error');
      });

      expect(jsonResponse.body.error).toBe('Internal Server Error');
      process.env.NODE_ENV = originalEnv;
    });

    test('shows error message in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      let jsonResponse: any = null;
      const ctx = {
        json: (body: any, status: number) => { jsonResponse = { body, status }; },
      } as any;

      await errorHandlerMiddleware()(ctx, async () => {
        throw new Error('Detailed error');
      });

      expect(jsonResponse.body.error).toBe('Detailed error');
      process.env.NODE_ENV = originalEnv;
    });

    test('logs error to console', async () => {
      const ctx = {
        json: () => {},
      } as any;

      const error = new Error('Logged error');
      await errorHandlerMiddleware()(ctx, async () => {
        throw error;
      });

      expect(consoleErrorMock).toHaveBeenCalled();
    });

    test('handles non-Error throws gracefully', async () => {
      let jsonResponse: any = null;
      const ctx = {
        json: (body: any, status: number) => { jsonResponse = { body, status }; },
      } as any;

      const result = await errorHandlerMiddleware()(ctx, async () => {
        throw 'string error';
      });

      expect(jsonResponse.status).toBe(500);
    });
  });

  describe('requestIdMiddleware', () => {
    test('generates request ID', async () => {
      let setKey: string | undefined;
      let setHeader: string | undefined;

      const ctx = {
        set: (k: string, v: string) => { setKey = v; },
        header: (k: string, v: string) => { setHeader = v; },
      } as any;

      await requestIdMiddleware()(ctx, async () => {});

      expect(setKey).toBeDefined();
      expect(setHeader).toBeDefined();
    });

    test('generates valid UUID format', async () => {
      let setHeader: string | undefined;

      const ctx = {
        set: () => {},
        header: (k: string, v: string) => { setHeader = v; },
      } as any;

      await requestIdMiddleware()(ctx, async () => {});

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(setHeader).toMatch(uuidRegex);
    });

    test('stores ID in context', async () => {
      let storedValue: string | undefined;

      const ctx = {
        set: (k: string, v: string) => { storedValue = v; },
        header: () => {},
      } as any;

      await requestIdMiddleware()(ctx, async () => {});

      expect(storedValue).toBeDefined();
      expect(storedValue!.length).toBe(36); // UUID length
    });

    test('sets X-Request-ID header', async () => {
      const headers: Record<string, string> = {};

      const ctx = {
        set: () => {},
        header: (k: string, v: string) => { headers[k] = v; },
      } as any;

      await requestIdMiddleware()(ctx, async () => {});

      expect(headers['X-Request-ID']).toBeDefined();
    });

    test('generates unique IDs for different requests', async () => {
      const ids: string[] = [];

      const makeRequest = async () => {
        let id: string | undefined;
        const ctx = {
          set: () => {},
          header: (k: string, v: string) => { if (k === 'X-Request-ID') id = v; },
        } as any;

        await requestIdMiddleware()(ctx, async () => {});
        return id!;
      };

      for (let i = 0; i < 10; i++) {
        ids.push(await makeRequest());
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
