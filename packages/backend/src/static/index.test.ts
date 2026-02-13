import { describe, test, expect, beforeAll } from 'bun:test';
import { serveStatic, staticMiddleware } from './index';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/layr-static-test';

describe('static', () => {
  beforeAll(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.txt'), 'Hello World');
    mkdirSync(join(TEST_DIR, 'subdir'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'subdir', 'nested.txt'), 'Nested');
  });

  describe('serveStatic', () => {
    test('serves existing file', async () => {
      const ctx = { 
        req: { path: '/test.txt' },
      } as any;
      
      const response = await serveStatic(TEST_DIR, ctx);
      
      expect(response).toBeDefined();
      expect(response?.status).toBe(200);
    });

    test('returns null for missing file', async () => {
      const ctx = { req: { path: '/nonexistent.txt' } } as any;
      const response = await serveStatic(TEST_DIR, ctx);
      expect(response).toBeNull();
    });

    test('serves nested file', async () => {
      const ctx = { req: { path: '/subdir/nested.txt' } } as any;
      const response = await serveStatic(TEST_DIR, ctx);
      expect(response?.status).toBe(200);
    });
  });

  describe('staticMiddleware', () => {
    test('creates middleware function', () => {
      const middleware = staticMiddleware(TEST_DIR);
      expect(typeof middleware).toBe('function');
    });
  });
});
