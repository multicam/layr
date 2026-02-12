/**
 * Layr Proposed Fixes - API Module
 * 
 * This module exports all proposed fixes for the API layer.
 * 
 * @module @layr/proposed-fixes/api
 */

export {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateDelay,
  withRetry,
  fetchWithRetry,
  RetryState,
  RetryManager,
  createRetryFetcher,
} from './retry';
