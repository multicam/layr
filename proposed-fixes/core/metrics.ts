/**
 * Performance Metrics Collection
 * 
 * Collects and exposes performance metrics for monitoring
 * and debugging Layr applications.
 * 
 * @module @layr/core/metrics
 */

import { getLimits } from './limits';

/**
 * Performance metric types
 */
export type MetricCategory = 'render' | 'formula' | 'action' | 'api' | 'signal' | 'ssr';

/**
 * Base metric structure
 */
export interface Metric {
  /** Metric name */
  name: string;
  /** Category */
  category: MetricCategory;
  /** Number of occurrences */
  count: number;
  /** Total duration in ms */
  totalDuration: number;
  /** Maximum duration in ms */
  maxDuration: number;
  /** Minimum duration in ms */
  minDuration: number;
  /** Average duration in ms */
  avgDuration: number;
  /** Last timestamp */
  lastTimestamp: number;
}

/**
 * Render-specific metrics
 */
export interface RenderMetric extends Metric {
  category: 'render';
  /** Number of DOM updates */
  domUpdates: number;
  /** Number of components rendered */
  componentsRendered: number;
}

/**
 * Formula-specific metrics
 */
export interface FormulaMetric extends Metric {
  category: 'formula';
  /** Number of cache hits */
  cacheHits: number;
  /** Number of cache misses */
  cacheMisses: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
}

/**
 * Action-specific metrics
 */
export interface ActionMetric extends Metric {
  category: 'action';
  /** Number of successful executions */
  successCount: number;
  /** Number of failed executions */
  failureCount: number;
}

/**
 * API-specific metrics
 */
export interface ApiMetric extends Metric {
  category: 'api';
  /** Number of requests */
  requestCount: number;
  /** Number of successful responses */
  successCount: number;
  /** Number of failed responses */
  failureCount: number;
  /** Number of retried requests */
  retryCount: number;
  /** Average response size in bytes */
  avgResponseSize: number;
  /** HTTP status code distribution */
  statusCodes: Record<number, number>;
}

/**
 * Signal-specific metrics
 */
export interface SignalMetric extends Metric {
  category: 'signal';
  /** Number of active subscribers */
  activeSubscribers: number;
  /** Number of signal updates */
  updateCount: number;
  /** Number of signals created */
  signalsCreated: number;
  /** Number of signals destroyed */
  signalsDestroyed: number;
}

/**
 * SSR-specific metrics
 */
export interface SsrMetric extends Metric {
  category: 'ssr';
  /** Time to first byte in ms */
  ttfb: number;
  /** Time to render HTML in ms */
  renderTime: number;
  /** Size of hydration payload in bytes */
  hydrationSize: number;
  /** Number of APIs fetched during SSR */
  apiFetchCount: number;
}

/**
 * All metric types
 */
export type AnyMetric = RenderMetric | FormulaMetric | ActionMetric | ApiMetric | SignalMetric | SsrMetric;

/**
 * Metrics summary
 */
export interface MetricsSummary {
  render: Record<string, RenderMetric>;
  formula: Record<string, FormulaMetric>;
  action: Record<string, ActionMetric>;
  api: Record<string, ApiMetric>;
  signal: Record<string, SignalMetric>;
  ssr: Record<string, SsrMetric>;
  /** Timestamp when metrics were collected */
  timestamp: number;
  /** Duration the app has been running in ms */
  uptime: number;
}

/**
 * Performance entry for timing
 */
interface TimingEntry {
  startTime: number;
  name: string;
  category: MetricCategory;
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, AnyMetric> = new Map();
  private activeTimings: Map<string, TimingEntry> = new Map();
  private startTime: number;
  private enabled: boolean = true;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Enable or disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start timing an operation
   */
  startTiming(id: string, name: string, category: MetricCategory): void {
    if (!this.enabled) return;

    this.activeTimings.set(id, {
      startTime: performance.now(),
      name,
      category,
    });
  }

  /**
   * End timing an operation and record the metric
   */
  endTiming(id: string, metadata?: Partial<AnyMetric>): number | null {
    if (!this.enabled) return null;

    const entry = this.activeTimings.get(id);
    if (!entry) return null;

    this.activeTimings.delete(id);
    const duration = performance.now() - entry.startTime;

    this.record(entry.name, entry.category, duration, metadata);

    return duration;
  }

  /**
   * Record a metric
   */
  record(
    name: string,
    category: MetricCategory,
    duration: number,
    metadata?: Partial<AnyMetric>
  ): void {
    if (!this.enabled) return;

    const key = `${category}:${name}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.avgDuration = existing.totalDuration / existing.count;
      existing.lastTimestamp = Date.now();

      // Merge metadata
      if (metadata) {
        this.mergeMetadata(existing, metadata);
      }
    } else {
      const base: Metric = {
        name,
        category,
        count: 1,
        totalDuration: duration,
        maxDuration: duration,
        minDuration: duration,
        avgDuration: duration,
        lastTimestamp: Date.now(),
      };

      const metric = { ...base, ...metadata } as AnyMetric;
      this.metrics.set(key, metric);
    }
  }

  /**
   * Merge metadata into existing metric
   */
  private mergeMetadata(existing: AnyMetric, metadata: Partial<AnyMetric>): void {
    // Category-specific merging
    if (existing.category === 'formula' && 'cacheHits' in metadata) {
      const f = existing as FormulaMetric;
      const m = metadata as Partial<FormulaMetric>;
      if (m.cacheHits !== undefined) f.cacheHits += m.cacheHits;
      if (m.cacheMisses !== undefined) f.cacheMisses += m.cacheMisses;
      f.cacheHitRate = f.cacheHits / (f.cacheHits + f.cacheMisses) || 0;
    }

    if (existing.category === 'action') {
      const a = existing as ActionMetric;
      const m = metadata as Partial<ActionMetric>;
      if (m.successCount !== undefined) a.successCount += m.successCount;
      if (m.failureCount !== undefined) a.failureCount += m.failureCount;
    }

    if (existing.category === 'api') {
      const a = existing as ApiMetric;
      const m = metadata as Partial<ApiMetric>;
      if (m.successCount !== undefined) a.successCount += m.successCount;
      if (m.failureCount !== undefined) a.failureCount += m.failureCount;
      if (m.retryCount !== undefined) a.retryCount += m.retryCount;
      if (m.statusCodes) {
        a.statusCodes = a.statusCodes ?? {};
        for (const [code, count] of Object.entries(m.statusCodes)) {
          a.statusCodes[code] = (a.statusCodes[code] ?? 0) + count;
        }
      }
    }

    if (existing.category === 'signal') {
      const s = existing as SignalMetric;
      const m = metadata as Partial<SignalMetric>;
      if (m.activeSubscribers !== undefined) s.activeSubscribers = m.activeSubscribers;
      if (m.updateCount !== undefined) s.updateCount += m.updateCount;
      if (m.signalsCreated !== undefined) s.signalsCreated += m.signalsCreated;
      if (m.signalsDestroyed !== undefined) s.signalsDestroyed += m.signalsDestroyed;
    }
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string, category: MetricCategory): AnyMetric | undefined {
    return this.metrics.get(`${category}:${name}`);
  }

  /**
   * Get all metrics for a category
   */
  getCategory<Category extends MetricCategory>(
    category: Category
  ): Record<string, Extract<AnyMetric, { category: Category }>> {
    const result: Record<string, any> = {};

    for (const [key, metric] of this.metrics) {
      if (metric.category === category) {
        const name = key.replace(`${category}:`, '');
        result[name] = metric;
      }
    }

    return result;
  }

  /**
   * Get full metrics summary
   */
  getSummary(): MetricsSummary {
    return {
      render: this.getCategory('render'),
      formula: this.getCategory('formula'),
      action: this.getCategory('action'),
      api: this.getCategory('api'),
      signal: this.getCategory('signal'),
      ssr: this.getCategory('ssr'),
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get top metrics by duration
   */
  getTopByDuration(category?: MetricCategory, limit: number = 10): AnyMetric[] {
    let metrics = Array.from(this.metrics.values());

    if (category) {
      metrics = metrics.filter((m) => m.category === category);
    }

    return metrics
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);
  }

  /**
   * Get top metrics by count
   */
  getTopByCount(category?: MetricCategory, limit: number = 10): AnyMetric[] {
    let metrics = Array.from(this.metrics.values());

    if (category) {
      metrics = metrics.filter((m) => m.category === category);
    }

    return metrics
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeTimings.clear();
    this.startTime = Date.now();
  }

  /**
   * Export metrics for logging/transmission
   */
  export(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}

/**
 * Global metrics instance
 */
let globalMetrics: PerformanceMetrics | undefined;

/**
 * Get or create the global metrics instance
 */
export function getMetrics(): PerformanceMetrics {
  if (!globalMetrics) {
    globalMetrics = new PerformanceMetrics();
  }
  return globalMetrics;
}

/**
 * Reset the global metrics instance
 */
export function resetMetrics(): void {
  globalMetrics = undefined;
}

/**
 * Convenience function to time an async operation
 */
export async function timeAsync<T>(
  name: string,
  category: MetricCategory,
  fn: () => Promise<T>,
  metadata?: Partial<AnyMetric>
): Promise<T> {
  const metrics = getMetrics();
  const id = `${category}:${name}:${Date.now()}:${Math.random()}`;

  metrics.startTiming(id, name, category);
  try {
    const result = await fn();
    metrics.endTiming(id, metadata);
    return result;
  } catch (error) {
    metrics.endTiming(id, { failureCount: 1, ...metadata });
    throw error;
  }
}

/**
 * Convenience function to time a sync operation
 */
export function timeSync<T>(
  name: string,
  category: MetricCategory,
  fn: () => T,
  metadata?: Partial<AnyMetric>
): T {
  const metrics = getMetrics();
  const id = `${category}:${name}:${Date.now()}:${Math.random()}`;

  metrics.startTiming(id, name, category);
  try {
    const result = fn();
    metrics.endTiming(id, metadata);
    return result;
  } catch (error) {
    metrics.endTiming(id, { failureCount: 1, ...metadata });
    throw error;
  }
}

/**
 * Expose metrics to window in development mode
 */
export function exposeMetricsToWindow(): void {
  if (typeof window !== 'undefined') {
    (window as any).__layrMetrics = {
      get: () => getMetrics().getSummary(),
      getTop: (category?: MetricCategory) => getMetrics().getTopByDuration(category),
      clear: () => getMetrics().clear(),
      export: () => getMetrics().export(),
    };
  }
}
