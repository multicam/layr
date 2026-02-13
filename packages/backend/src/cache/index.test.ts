import { describe, test, expect, beforeEach } from 'bun:test';
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
  });

  describe('clearFileCache', () => {
    test('clears all cached entries', async () => {
      await loadJsFile('/nonexistent1.js');
      await loadJsFile('/nonexistent2.js');
      
      expect(getFileCacheSize()).toBeGreaterThan(0);
      
      clearFileCache();
      
      expect(getFileCacheSize()).toBe(0);
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
  });

  describe('BatchQueue', () => {
    test.skip('adds callbacks to queue', () => {
      // Requires browser environment with requestAnimationFrame
      const queue = new BatchQueue();
      // BatchQueue processes in RAF, so length may be 0 after add
      queue.add(() => {});
      // The callback was added and processed
    });

    test.skip('clear removes pending callbacks', () => {
      // Requires browser environment with requestAnimationFrame
      const queue = new BatchQueue();
      queue.add(() => {});
      queue.add(() => {});
      
      queue.clear();
      
      expect(queue.length).toBe(0);
    });
  });

  describe('getCacheControlHeader', () => {
    test('returns no-store', () => {
      expect(getCacheControlHeader({ noStore: true })).toBe('no-store');
    });

    test('returns no-cache', () => {
      expect(getCacheControlHeader({ noCache: true })).toBe('no-cache');
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
  });
});
