/**
 * Retry Mechanism for API Requests
 * 
 * Provides configurable retry logic with exponential backoff,
 * jitter, and conditional retry predicates.
 * 
 * @module @layr/api/retry
 */

import { getLimits } from '../core/limits';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Backoff strategy */
  backoff: 'fixed' | 'linear' | 'exponential';
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Jitter factor (0-1) to add randomness to delays */
  jitter: number;
  /** Predicate to determine if error should trigger retry */
  retryOn: (error: unknown, attempt: number, response?: Response) => boolean;
  /** Callback for retry events */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoff: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
  jitter: 0.2,
  retryOn: defaultRetryPredicate,
};

/**
 * Default predicate for retrying requests
 */
function defaultRetryPredicate(error: unknown, _attempt: number, response?: Response): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return false; // Don't retry aborts
  }

  // HTTP status codes
  if (response) {
    // Retry on server errors (5xx) and specific 4xx errors
    if (response.status >= 500) return true;
    if (response.status === 408) return true; // Request Timeout
    if (response.status === 429) return true; // Too Many Requests
  }

  return false;
}

/**
 * Calculate delay for a given attempt
 */
export function calculateDelay(
  attempt: number,
  config: Pick<RetryConfig, 'backoff' | 'initialDelay' | 'maxDelay' | 'jitter'>
): number {
  let delay: number;

  switch (config.backoff) {
    case 'fixed':
      delay = config.initialDelay;
      break;
    case 'linear':
      delay = config.initialDelay * attempt;
      break;
    case 'exponential':
      delay = config.initialDelay * Math.pow(2, attempt - 1);
      break;
  }

  // Apply max cap
  delay = Math.min(delay, config.maxDelay);

  // Apply jitter
  if (config.jitter > 0) {
    const jitterRange = delay * config.jitter;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // -jitterRange to +jitterRange
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  // Enforce max attempts limit
  const maxAttempts = Math.min(
    fullConfig.maxAttempts,
    getLimits().api.maxRetries
  );

  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if response is attached to error
      if (error instanceof Error && 'response' in error) {
        lastResponse = (error as any).response;
      }

      // Check if we should retry
      const shouldRetry = attempt < maxAttempts && 
        fullConfig.retryOn(error, attempt, lastResponse);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, fullConfig);

      // Notify callback
      if (fullConfig.onRetry) {
        fullConfig.onRetry(attempt, delay, error);
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // All attempts exhausted
  throw lastError;
}

/**
 * Fetch with automatic retry
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(input, init);
      
      // Attach response to error for retry predicate
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        throw error;
      }
      
      return response;
    },
    retryConfig
  );
}

/**
 * Retry state for tracking per-API retry status
 */
export interface RetryState {
  /** API name */
  apiName: string;
  /** Current attempt number */
  attempt: number;
  /** Maximum attempts */
  maxAttempts: number;
  /** Last error encountered */
  lastError?: unknown;
  /** Next retry delay in ms */
  nextDelay?: number;
  /** Timestamp of last attempt */
  lastAttempt?: number;
}

/**
 * Retry manager for tracking multiple API retries
 */
export class RetryManager {
  private states: Map<string, RetryState> = new Map();
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Start tracking retries for an API
   */
  startRetry(apiName: string): RetryState {
    const state: RetryState = {
      apiName,
      attempt: 0,
      maxAttempts: Math.min(this.config.maxAttempts, getLimits().api.maxRetries),
    };
    this.states.set(apiName, state);
    return state;
  }

  /**
   * Record a failed attempt
   */
  recordFailure(apiName: string, error: unknown): RetryState | null {
    const state = this.states.get(apiName);
    if (!state) return null;

    state.attempt++;
    state.lastError = error;
    state.lastAttempt = Date.now();

    // Check if we should continue retrying
    if (state.attempt >= state.maxAttempts) {
      this.states.delete(apiName);
      return null; // No more retries
    }

    // Calculate next delay
    state.nextDelay = calculateDelay(state.attempt, this.config);

    return state;
  }

  /**
   * Clear retry state for an API (on success)
   */
  clearRetry(apiName: string): void {
    this.states.delete(apiName);
  }

  /**
   * Get retry state for an API
   */
  getState(apiName: string): RetryState | undefined {
    return this.states.get(apiName);
  }

  /**
   * Check if an API is currently retrying
   */
  isRetrying(apiName: string): boolean {
    return this.states.has(apiName);
  }

  /**
   * Get all active retries
   */
  getActiveRetries(): RetryState[] {
    return Array.from(this.states.values());
  }
}

/**
 * Create a retry-enabled fetcher function
 */
export function createRetryFetcher(
  baseConfig?: Partial<RetryConfig>
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return (input, init) => fetchWithRetry(input, init, baseConfig);
}
