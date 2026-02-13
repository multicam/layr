import { describe, test, expect } from 'bun:test';

describe('backend exports', () => {
  test('exports middleware', async () => {
    const mod = await import('./index');
    expect(mod.compose).toBeDefined();
    expect(mod.corsMiddleware).toBeDefined();
    expect(mod.loggerMiddleware).toBeDefined();
  });

  test('exports proxy', async () => {
    const mod = await import('./index');
    expect(mod.createProxy).toBeDefined();
    expect(mod.fontProxy).toBeDefined();
    expect(mod.fontStaticProxy).toBeDefined();
  });

  test('exports static', async () => {
    const mod = await import('./index');
    expect(mod.serveStatic).toBeDefined();
    expect(mod.staticMiddleware).toBeDefined();
  });
});
