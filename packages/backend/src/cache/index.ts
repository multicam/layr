/**
 * Performance and Caching System
 * Based on specs/performance-and-caching.md
 * 
 * Provides file caching, formula caching, and batch queue utilities.
 */

// ============================================================================
// File Cache
// ============================================================================

/**
 * In-memory cache for loaded JS/JSON files.
 * Uses module-level Map for singleton behavior.
 */
const fileCache = new Map<string, unknown>();

/**
 * Load a JS file with caching.
 * Returns undefined for failed loads (negative caching).
 */
export async function loadJsFile<T>(path: string): Promise<T | undefined> {
  if (fileCache.has(path)) {
    return fileCache.get(path) as T | undefined;
  }

  try {
    const content = await import(path.toLowerCase());
    const parsed = content.default as T;
    fileCache.set(path, parsed);
    return parsed;
  } catch {
    // Negative caching - don't retry failed loads
    fileCache.set(path, undefined);
    return undefined;
  }
}

/**
 * Clear the file cache (for testing).
 */
export function clearFileCache(): void {
  fileCache.clear();
}

/**
 * Get cache size (for debugging).
 */
export function getFileCacheSize(): number {
  return fileCache.size;
}

// ============================================================================
// Formula Cache (for runtime)
// ============================================================================

/**
 * Formula cache entry.
 */
export interface FormulaCacheEntry {
  get: (data: Record<string, unknown>) => 
    | { hit: true; data: unknown }
    | { hit: false };
  set: (data: Record<string, unknown>, result: unknown) => void;
}

/**
 * Formula cache type.
 */
export type FormulaCache = Record<string, FormulaCacheEntry>;

/**
 * Create a formula cache for a component.
 */
export function createFormulaCache(
  formulas?: Record<string, { memoize?: boolean; formula: unknown }>
): FormulaCache {
  const cache: FormulaCache = {};

  if (!formulas) return cache;

  for (const [name, formulaDef] of Object.entries(formulas)) {
    if (formulaDef.memoize) {
      const config = getFormulaCacheConfig(formulaDef.formula);
      
      if (config.canCache) {
        let cacheInput: Record<string, unknown> | null = null;
        let cacheData: unknown = null;

        cache[name] = {
          get: (data: Record<string, unknown>) => {
            if (cacheInput && config.keys.every((key) => 
              getValue(data, key) === getValue(cacheInput, key)
            )) {
              return { hit: true, data: cacheData };
            }
            return { hit: false };
          },
          set: (data: Record<string, unknown>, result: unknown) => {
            cacheInput = { ...data };
            cacheData = result;
          },
        };
      } else {
        // Non-cacheable formula
        cache[name] = {
          get: () => ({ hit: false }),
          set: () => {},
        };
      }
    } else {
      // Non-memoized formula
      cache[name] = {
        get: () => ({ hit: false }),
        set: () => {},
      };
    }
  }

  return cache;
}

/**
 * Get cache configuration for a formula.
 */
function getFormulaCacheConfig(formula: unknown): { canCache: boolean; keys: string[][] } {
  const keys: string[][] = [];
  
  function visit(f: unknown, path: string[]): void {
    if (!f || typeof f !== 'object') return;
    
    const formulaObj = f as Record<string, unknown>;
    
    if (formulaObj.type === 'path') {
      const formulaPath = formulaObj.path as string[] | undefined;
      if (formulaPath && formulaPath[0] !== 'Args') {
        keys.push([...path, ...formulaPath]);
      }
    } else if (formulaObj.type === 'apply') {
      // Check if referenced formula is memoized
      // If not, this formula cannot be cached
      // For now, we allow caching
    } else if (formulaObj.arguments && Array.isArray(formulaObj.arguments)) {
      for (let i = 0; i < formulaObj.arguments.length; i++) {
        const arg = formulaObj.arguments[i];
        if (arg && typeof arg === 'object' && 'formula' in arg) {
          visit(arg.formula, [...path, 'arguments', i, 'formula']);
        }
      }
    }
  }

  visit(formula, []);

  // Deduplicate - remove paths that are prefixes of longer paths
  const deduped = keys.filter((key) => 
    !keys.some((other) => 
      other !== key && 
      other.length > key.length && 
      other.slice(0, key.length).join('/') === key.join('/')
    )
  );

  return { canCache: deduped.length >= 0, keys: deduped };
}

/**
 * Get a value from an object by path.
 */
function getValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    if (current == null) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// ============================================================================
// Batch Queue (for DOM updates)
// ============================================================================

/**
 * BatchQueue coalesces multiple callbacks into a single requestAnimationFrame.
 */
export class BatchQueue {
  private queue: Array<() => void> = [];
  private isProcessing = false;

  /**
   * Add a callback to the batch queue.
   */
  add(callback: () => void): void {
    this.queue.push(callback);
    this.processBatch();
  }

  /**
   * Process the batch in a single RAF.
   */
  private processBatch(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    requestAnimationFrame(() => {
      // Drain the queue
      while (this.queue.length > 0) {
        const callback = this.queue.shift();
        callback?.();
      }
      this.isProcessing = false;
    });
  }

  /**
   * Clear pending callbacks.
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get pending callback count.
   */
  get length(): number {
    return this.queue.length;
  }
}

// ============================================================================
// Response Cache Headers
// ============================================================================

/**
 * Cache control options.
 */
export interface CacheOptions {
  maxAge?: number;
  public?: boolean;
  immutable?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

/**
 * Generate Cache-Control header value.
 */
export function getCacheControlHeader(options: CacheOptions): string {
  if (options.noStore) return 'no-store';
  if (options.noCache) return 'no-cache';

  const directives: string[] = [];

  if (options.public) {
    directives.push('public');
  } else {
    directives.push('private');
  }

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.immutable) {
    directives.push('immutable');
  }

  return directives.join(', ');
}

/**
 * Common cache presets.
 */
export const CachePresets = {
  /** No caching */
  noCache: { noCache: true } as CacheOptions,
  /** No storage */
  noStore: { noStore: true } as CacheOptions,
  /** 1 hour cache */
  oneHour: { public: true, maxAge: 3600 } as CacheOptions,
  /** 1 day cache */
  oneDay: { public: true, maxAge: 86400 } as CacheOptions,
  /** 1 year cache (for immutable assets) */
  immutable: { public: true, maxAge: 31536000, immutable: true } as CacheOptions,
};
