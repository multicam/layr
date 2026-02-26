/**
 * Route Types
 * Based on specs/routing.md
 */

import type { Formula } from './formula';
import type { ActionModel } from './action';

// ============================================================================
// Page Route
// ============================================================================

export interface PageRoute {
  path: string;
  query?: Record<string, RouteQueryParam>;
  title?: string;
  description?: string;
  info?: RouteInfo;
}

export interface RouteInfo {
  title?: { formula: Formula };
  description?: { formula: Formula };
  language?: { formula: Formula };
  meta?: Array<{ name: string; content: { formula: Formula } }>;
}

export interface RouteQueryParam {
  attribute: string;
  default?: Formula;
}

// ============================================================================
// Custom Route
// ============================================================================

export interface CustomRoute {
  name: string;
  type: 'redirect' | 'rewrite';
  source: RouteSource;
  destination: RouteDestination;
  status?: number;
  enabled?: Formula;
}

export interface RouteSource {
  type: 'path' | 'pattern';
  value: string;
}

export interface RouteDestination {
  type: 'url' | 'page';
  url?: Formula;
  path?: Formula[];
  queryParams?: Record<string, { formula: Formula; enabled?: Formula }>;
  hash?: Formula;
}

// ============================================================================
// Route Match
// ============================================================================

export interface RouteMatch {
  page: string;
  params: Record<string, string | null>;
  query: Record<string, string | null>;
  hash: string;
}

// ============================================================================
// Location State
// ============================================================================

export interface LocationState {
  page?: string;
  path: string;
  params: Record<string, string | null>;
  query: Record<string, string | null>;
  hash: string;
}
