/**
 * Layr Proposed Fixes - Runtime Module
 * 
 * This module exports all proposed fixes for the runtime layer.
 * 
 * @module @layr/proposed-fixes/runtime
 */

export {
  HydrationConfig,
  DEFAULT_HYDRATION_CONFIG,
  startHydration,
  endHydration,
  isHydrating,
  detectHydrationMismatches,
  checkHydration,
  checkDataHydration,
  type HydrationMismatch,
  type MismatchType,
} from './hydration';
