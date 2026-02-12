/**
 * Layr Proposed Fixes - Core Module
 * 
 * This module exports all proposed fixes for the core Layr systems.
 * These are designed to address the critical gaps identified in the spec review.
 * 
 * @module @layr/proposed-fixes/core
 */

// Safety Limits
export {
  LAYR_LIMITS,
  getLimits,
  setLimits,
  resetLimits,
  checkLimit,
  isWithinLimit,
  LimitExceededError,
  type LayrLimits,
} from './limits';

// Cycle Detection
export {
  CycleDetectedError,
  FormulaCycleDetector,
  PackageCycleDetector,
  WorkflowCycleDetector,
  ComponentCycleDetector,
  getFormulaCycleDetector,
  resetFormulaCycleDetector,
} from './cycle-detection';

// Error Attribution
export {
  LayrError,
  FormulaError,
  ActionError,
  ApiError,
  HydrationError,
  ErrorCollector,
  getErrorCollector,
  resetErrorCollector,
  ExecutionContext,
  attributeError,
  type LayrErrorType,
  type ExecutionStep,
} from './errors';

// Performance Metrics
export {
  PerformanceMetrics,
  getMetrics,
  resetMetrics,
  timeAsync,
  timeSync,
  exposeMetricsToWindow,
  type Metric,
  type MetricCategory,
  type RenderMetric,
  type FormulaMetric,
  type ActionMetric,
  type ApiMetric,
  type SignalMetric,
  type SsrMetric,
  type MetricsSummary,
} from './metrics';
