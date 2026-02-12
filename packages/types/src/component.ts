/**
 * Component System Types
 * Based on specs/component-system.md
 */

// ============================================================================
// Component
// ============================================================================

export interface Component {
  name: string;
  route?: PageRoute;
  attributes?: Record<string, ComponentAttribute>;
  variables?: Record<string, ComponentVariable>;
  formulas?: Record<string, ComponentFormula>;
  contexts?: Record<string, ComponentContext>;
  workflows?: Record<string, ComponentWorkflow>;
  apis?: Record<string, ComponentAPI>;
  nodes: Record<string, NodeModel>;
  events?: ComponentEvent[];
  onLoad?: EventModel;
  onAttributeChange?: EventModel;
  exported?: boolean;
  customElement?: {
    enabled?: Formula;
  };
}

export interface ComponentAttribute {
  name: string;
  testValue?: unknown;
}

export interface ComponentVariable {
  initialValue: Formula;
}

export interface ComponentFormula {
  name: string;
  arguments?: Array<{ name: string; testValue?: unknown }>;
  memoize?: boolean;
  exposeInContext?: boolean;
  formula: Formula;
}

export interface ComponentWorkflow {
  name: string;
  parameters: Array<{ name: string; testValue?: unknown }>;
  callbacks?: Array<{ name: string; testValue?: unknown }>;
  actions: ActionModel[];
  exposeInContext?: boolean;
}

export interface ComponentContext {
  formulas: string[];
  workflows: string[];
  componentName?: string;
  package?: string;
}

export interface ComponentEvent {
  name: string;
  testValue?: unknown;
}

// ============================================================================
// Page Route
// ============================================================================

export interface PageRoute {
  path: string;
  query?: Record<string, RouteQueryParam>;
}

export interface RouteQueryParam {
  attribute: string;
  default?: Formula;
}

// ============================================================================
// Component API
// ============================================================================

export interface ComponentAPI {
  name: string;
  type: 'v1' | 'v2';
  
  // V2 fields
  method?: Formula;
  url?: Formula;
  headers?: Record<string, { formula: Formula; enabled?: Formula }>;
  queryParams?: Record<string, { formula: Formula; enabled?: Formula }>;
  body?: Formula;
  timeout?: Formula;
  credentials?: Formula;
  parserMode?: Formula;
  isError?: Formula;
  
  // V1 fields
  path?: Formula;
  searchParams?: Array<{ name: string; value: Formula }>;
  headersV1?: Formula;
  bodyV1?: Formula;
  methodV1?: Formula;
  throttle?: number;
  debounce?: number;
  
  // Common
  autoFetch?: Formula;
  server?: {
    ssr?: {
      enabled: Formula;
    };
  };
}

// ============================================================================
// Event Model
// ============================================================================

export interface EventModel {
  actions: ActionModel[];
}

// ============================================================================
// Imports (forward declarations)
// ============================================================================

import type { NodeModel } from './node';
import type { Formula } from './formula';
import type { ActionModel } from './action';
