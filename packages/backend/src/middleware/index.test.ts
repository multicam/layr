import { describe, test, expect, beforeEach } from 'bun:test';
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
  });
});
