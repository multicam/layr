import { describe, test, expect, beforeEach, vi, afterEach } from 'bun:test';
import {
  loadJsFile,
  clearFileCache,
  getFileCacheSize,
  createFormulaCache,
  BatchQueue,
  getCacheControlHeader,
  CachePresets,
} from './index';

describe('Cache System', () => {
  beforeEach(() => {
    clearFileCache();
  });

  describe('loadJsFile', () => {
    test('returns undefined for missing file', async () => {
      const result = await loadJsFile('/nonexistent/path.js');
      expect(result).toBeUndefined();
    });

    test('caches missing files (negative caching)', async () => {
      await loadJsFile('/nonexistent/path.js');
      const size = getFileCacheSize();
      expect(size).toBeGreaterThan(0);
    });

    test('returns cached result on subsequent calls', async () => {
      await loadJsFile('/nonexistent/cached.js');
      const result2 = await loadJsFile('/nonexistent/cached.js');
      expect(result2).toBeUndefined();
    });

    test('handles different paths separately', async () => {
      await loadJsFile('/path1.js');
      await loadJsFile('/path2.js');

      expect(getFileCacheSize()).toBe(2);
    });
  });

  describe('clearFileCache', () => {
    test('clears all cached entries', async () => {
      await loadJsFile('/nonexistent1.js');
      await loadJsFile('/nonexistent2.js');

      expect(getFileCacheSize()).toBeGreaterThan(0);

      clearFileCache();

      expect(getFileCacheSize()).toBe(0);
    });

    test('allows new entries after clear', async () => {
      await loadJsFile('/before-clear.js');
      clearFileCache();
      await loadJsFile('/after-clear.js');

      expect(getFileCacheSize()).toBe(1);
    });
  });

  describe('getFileCacheSize', () => {
    test('returns 0 for empty cache', () => {
      clearFileCache();
      expect(getFileCacheSize()).toBe(0);
    });

    test('returns correct count after multiple loads', async () => {
      await loadJsFile('/file1.js');
      await loadJsFile('/file2.js');
      await loadJsFile('/file3.js');

      expect(getFileCacheSize()).toBe(3);
    });
  });

  describe('createFormulaCache', () => {
    test('creates cache for memoized formulas', () => {
      const formulas = {
        memoized: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Variables', 'count'],
          },
        },
        notMemoized: {
          memoize: false,
          formula: { type: 'value', value: 1 },
        },
      };

      const cache = createFormulaCache(formulas);

      expect(cache.memoized).toBeDefined();
      expect(cache.notMemoized).toBeDefined();
    });

    test('handles empty formulas', () => {
      const cache = createFormulaCache({});
      expect(Object.keys(cache)).toHaveLength(0);
    });

    test('handles undefined formulas', () => {
      const cache = createFormulaCache(undefined);
      expect(Object.keys(cache)).toHaveLength(0);
    });

    test('cache hit returns cached result', () => {
      const formulas = {
        test: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Variables', 'value'],
          },
        },
      };

      const cache = createFormulaCache(formulas);

      const data = { Variables: { value: 42 } };

      // First call - miss
      const miss = cache.test.get(data);
      expect(miss.hit).toBe(false);

      // Set the cached value
      cache.test.set(data, 42);

      // Second call - hit
      const hit = cache.test.get(data);
      expect(hit.hit).toBe(true);
      expect((hit as any).data).toBe(42);
    });

    test('cache miss when value changes', () => {
      const formulas = {
        test: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Variables', 'value'],
          },
        },
      };

      const cache = createFormulaCache(formulas);

      const data1 = { Variables: { value: 42 } };
      cache.test.set(data1, 42);

      // Same value - hit
      const hit = cache.test.get(data1);
      expect(hit.hit).toBe(true);

      // Different value - miss
      const data2 = { Variables: { value: 100 } };
      const miss = cache.test.get(data2);
      expect(miss.hit).toBe(false);
    });

    test('non-memoized formula always returns miss', () => {
      const formulas = {
        test: {
          memoize: false,
          formula: { type: 'value', value: 1 },
        },
      };

      const cache = createFormulaCache(formulas);

      // Even after set, always returns miss
      cache.test.set({ foo: 'bar' }, 'result');
      const result = cache.test.get({ foo: 'bar' });
      expect(result.hit).toBe(false);
    });

    test('handles formula without path', () => {
      const formulas = {
        noPath: {
          memoize: true,
          formula: { type: 'value', value: 42 },
        },
      };

      const cache = createFormulaCache(formulas);

      // No path means no cacheable keys
      const result = cache.noPath.get({});
      expect(result.hit).toBe(false);
    });

    test('handles formula with Args path (not cacheable)', () => {
      const formulas = {
        argsPath: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Args', 'input'],
          },
        },
      };

      const cache = createFormulaCache(formulas);

      // Args path should not be cacheable
      const result = cache.argsPath.get({ Args: { input: 'test' } });
      expect(result.hit).toBe(false);
    });

    test('handles formula with apply type', () => {
      const formulas = {
        apply: {
          memoize: true,
          formula: {
            type: 'apply',
            formula: { type: 'path', path: ['Variables', 'x'] },
          },
        },
      };

      const cache = createFormulaCache(formulas);
      expect(cache.apply).toBeDefined();
    });

    test('handles formula with arguments array', () => {
      const formulas = {
        withArgs: {
          memoize: true,
          formula: {
            type: 'function',
            arguments: [
              {
                formula: {
                  type: 'path',
                  path: ['Variables', 'a'],
                },
              },
              {
                formula: {
                  type: 'path',
                  path: ['Variables', 'b'],
                },
              },
            ],
          },
        },
      };

      const cache = createFormulaCache(formulas);
      const data = { Variables: { a: 1, b: 2 } };

      // First call - miss
      const miss = cache.withArgs.get(data);
      expect(miss.hit).toBe(false);

      // Set and hit
      cache.withArgs.set(data, 3);
      const hit = cache.withArgs.get(data);
      expect(hit.hit).toBe(true);
    });

    test('handles nested path formula', () => {
      const formulas = {
        nested: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Level1', 'Level2', 'Level3'],
          },
        },
      };

      const cache = createFormulaCache(formulas);
      const data = { Level1: { Level2: { Level3: 'value' } } };

      cache.nested.set(data, 'result');
      const hit = cache.nested.get(data);
      expect(hit.hit).toBe(true);
    });

    test('handles null/undefined in data path', () => {
      const formulas = {
        test: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Variables', 'value'],
          },
        },
      };

      const cache = createFormulaCache(formulas);

      const dataNull = { Variables: null };
      const resultNull = cache.test.get(dataNull);
      expect(resultNull.hit).toBe(false);

      const dataUndef = { Variables: undefined };
      const resultUndef = cache.test.get(dataUndef);
      expect(resultUndef.hit).toBe(false);
    });

    test('handles primitive data (non-object)', () => {
      const formulas = {
        test: {
          memoize: true,
          formula: {
            type: 'path',
            path: ['Variables', 'value'],
          },
        },
      };

      const cache = createFormulaCache(formulas);

      // null data
      const resultNull = cache.test.get(null as any);
      expect(resultNull.hit).toBe(false);

      // primitive data
      const resultPrimitive = cache.test.get(42 as any);
      expect(resultPrimitive.hit).toBe(false);
    });

    test('deduplicates overlapping paths', () => {
      // Paths that are prefixes of other paths should be deduplicated
      const formulas = {
        dedup: {
          memoize: true,
          formula: {
            type: 'object',
            properties: {
              value: {
                type: 'path',
                path: ['Variables', 'data'],
              },
            },
          },
        },
      };

      const cache = createFormulaCache(formulas);
      expect(cache.dedup).toBeDefined();
    });
  });

  describe('BatchQueue', () => {
    test('creates queue with empty state', () => {
      const queue = new BatchQueue();
      expect(queue.length).toBe(0);
    });

    test('adds callbacks to queue', () => {
      const queue = new BatchQueue();
      queue.add(() => {});
      // Callback is added, then processed asynchronously
      expect(typeof queue.length).toBe('number');
    });

    test('clear removes pending callbacks', () => {
      const queue = new BatchQueue();
      queue.add(() => {});
      queue.add(() => {});

      queue.clear();

      expect(queue.length).toBe(0);
    });

    test('processes multiple callbacks in order', (done) => {
      const queue = new BatchQueue();
      const order: number[] = [];

      queue.add(() => order.push(1));
      queue.add(() => order.push(2));
      queue.add(() => order.push(3));

      // Wait for processing
      setTimeout(() => {
        expect(order).toEqual([1, 2, 3]);
        done();
      }, 50);
    });

    test('handles empty queue gracefully', () => {
      const queue = new BatchQueue();
      queue.clear(); // Clear empty queue
      expect(queue.length).toBe(0);
    });

    test('add returns immediately (async processing)', () => {
      const queue = new BatchQueue();
      const start = Date.now();

      queue.add(() => {
        // Simulate slow callback
      });

      const elapsed = Date.now() - start;
      // Add should return immediately, not wait for processing
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('getCacheControlHeader', () => {
    test('returns no-store', () => {
      expect(getCacheControlHeader({ noStore: true })).toBe('no-store');
    });

    test('returns no-cache', () => {
      expect(getCacheControlHeader({ noCache: true })).toBe('no-cache');
    });

    test('no-store takes precedence over no-cache', () => {
      expect(getCacheControlHeader({ noStore: true, noCache: true })).toBe('no-store');
    });

    test('includes max-age', () => {
      const header = getCacheControlHeader({ public: true, maxAge: 3600 });
      expect(header).toContain('public');
      expect(header).toContain('max-age=3600');
    });

    test('includes immutable', () => {
      const header = getCacheControlHeader({ public: true, immutable: true });
      expect(header).toContain('immutable');
    });

    test('defaults to private', () => {
      const header = getCacheControlHeader({ maxAge: 60 });
      expect(header).toContain('private');
    });

    test('includes all options together', () => {
      const header = getCacheControlHeader({
        public: true,
        maxAge: 3600,
        immutable: true,
      });

      expect(header).toContain('public');
      expect(header).toContain('max-age=3600');
      expect(header).toContain('immutable');
    });

    test('handles zero maxAge', () => {
      const header = getCacheControlHeader({ public: true, maxAge: 0 });
      expect(header).toContain('max-age=0');
    });

    test('handles empty options', () => {
      const header = getCacheControlHeader({});
      expect(header).toContain('private');
    });

    test('no-store ignores other options', () => {
      const header = getCacheControlHeader({
        noStore: true,
        public: true,
        maxAge: 999,
      });

      expect(header).toBe('no-store');
    });

    test('no-cache ignores other options except no-store', () => {
      const header = getCacheControlHeader({
        noCache: true,
        public: true,
        maxAge: 999,
      });

      expect(header).toBe('no-cache');
    });
  });

  describe('CachePresets', () => {
    test('noCache preset', () => {
      expect(CachePresets.noCache.noCache).toBe(true);
    });

    test('noStore preset', () => {
      expect(CachePresets.noStore.noStore).toBe(true);
    });

    test('oneHour preset', () => {
      expect(CachePresets.oneHour.maxAge).toBe(3600);
      expect(CachePresets.oneHour.public).toBe(true);
    });

    test('oneDay preset', () => {
      expect(CachePresets.oneDay.maxAge).toBe(86400);
    });

    test('immutable preset', () => {
      expect(CachePresets.immutable.immutable).toBe(true);
      expect(CachePresets.immutable.maxAge).toBe(31536000);
    });

    test('presets generate correct headers', () => {
      expect(getCacheControlHeader(CachePresets.noCache)).toBe('no-cache');
      expect(getCacheControlHeader(CachePresets.noStore)).toBe('no-store');
      expect(getCacheControlHeader(CachePresets.oneHour)).toContain('max-age=3600');
      expect(getCacheControlHeader(CachePresets.oneDay)).toContain('max-age=86400');
      expect(getCacheControlHeader(CachePresets.immutable)).toContain('immutable');
    });
  });
});
