/**
 * Layr Safety Limits Configuration
 * 
 * This module defines system-wide limits to prevent runaway scenarios
 * like infinite loops, stack overflows, and memory exhaustion.
 * 
 * @module @layr/core/limits
 */

/**
 * System-wide safety limits configuration.
 * All values are conservative defaults that can be overridden at runtime.
 */
export const LAYR_LIMITS = {
  /**
   * Component system limits
   */
  component: {
    /** Maximum depth of component nesting (parent → child → grandchild...) */
    maxDepth: 50,
    /** Maximum number of nodes per component */
    maxNodes: 10000,
    /** Maximum number of attributes per component */
    maxAttributes: 100,
    /** Maximum number of variables per component */
    maxVariables: 100,
    /** Maximum number of formulas per component */
    maxFormulas: 200,
    /** Maximum number of APIs per component */
    maxApis: 50,
    /** Maximum number of workflows per component */
    maxWorkflows: 50,
  },

  /**
   * Formula system limits
   */
  formula: {
    /** Maximum nesting depth of formula AST */
    maxDepth: 256,
    /** Maximum evaluation time in milliseconds (0 = no limit) */
    maxEvaluationTime: 1000,
    /** Maximum number of arguments to a formula */
    maxArguments: 50,
    /** Maximum length of a path expression */
    maxPathLength: 50,
    /** Maximum number of switch cases */
    maxSwitchCases: 10,
    /** Maximum number of or/and arguments */
    maxLogicalArgs: 50,
  },

  /**
   * Action system limits
   */
  action: {
    /** Maximum depth of nested actions (Switch → actions → Fetch → callbacks) */
    maxDepth: 100,
    /** Maximum execution time for action chain in milliseconds (0 = no limit) */
    maxExecutionTime: 5000,
    /** Maximum number of actions in a single list */
    maxActionsPerList: 100,
    /** Maximum number of switch cases */
    maxSwitchCases: 20,
    /** Maximum number of callback actions */
    maxCallbackActions: 20,
  },

  /**
   * API system limits
   */
  api: {
    /** Maximum request body size in bytes */
    maxBodySize: 10 * 1024 * 1024, // 10MB
    /** Maximum request timeout in milliseconds */
    maxTimeout: 60000, // 60 seconds
    /** Default request timeout in milliseconds */
    defaultTimeout: 30000, // 30 seconds
    /** Maximum number of concurrent requests per API */
    maxConcurrent: 10,
    /** Maximum retry attempts */
    maxRetries: 3,
    /** Maximum redirect rules per API */
    maxRedirectRules: 20,
    /** Maximum header value length */
    maxHeaderLength: 8192,
  },

  /**
   * Package/dependency limits
   */
  package: {
    /** Maximum depth of package dependencies */
    maxDepth: 10,
    /** Maximum number of packages per project */
    maxPackages: 100,
    /** Maximum number of components from all packages */
    maxPackageComponents: 1000,
  },

  /**
   * SSR limits
   */
  ssr: {
    /** Maximum time for SSR render in milliseconds */
    maxRenderTime: 10000, // 10 seconds
    /** Maximum time for API fetch during SSR */
    maxApiFetchTime: 5000, // 5 seconds
    /** Maximum size of hydration payload in bytes */
    maxHydrationSize: 5 * 1024 * 1024, // 5MB
    /** Maximum number of APIs to evaluate during SSR */
    maxApisPerPage: 50,
  },

  /**
   * Styling limits
   */
  styling: {
    /** Maximum number of custom properties */
    maxCustomProperties: 1000,
    /** Maximum number of style variants per node */
    maxVariants: 50,
    /** Maximum number of animations per component */
    maxAnimations: 20,
    /** Maximum number of keyframes per animation */
    maxKeyframes: 100,
  },

  /**
   * Rendering limits
   */
  render: {
    /** Maximum time for a single render in milliseconds */
    maxRenderTime: 100, // 100ms for 60fps
    /** Maximum number of DOM updates per frame */
    maxUpdatesPerFrame: 1000,
    /** Maximum number of signal subscribers */
    maxSubscribers: 10000,
  },

  /**
   * Error handling limits
   */
  error: {
    /** Maximum errors to collect before stopping */
    maxErrors: 100,
    /** Maximum error message length */
    maxMessageLength: 10000,
    /** Maximum stack trace depth */
    maxStackDepth: 50,
  },
} as const;

/**
 * Type for limits configuration
 */
export type LayrLimits = typeof LAYR_LIMITS;

/**
 * Runtime limits that can be modified
 */
let runtimeLimits = { ...LAYR_LIMITS };

/**
 * Get current runtime limits
 */
export function getLimits(): LayrLimits {
  return runtimeLimits;
}

/**
 * Override runtime limits (use with caution)
 */
export function setLimits(overrides: Partial<LayrLimits>): void {
  runtimeLimits = {
    ...runtimeLimits,
    ...overrides,
    // Deep merge for nested objects
    component: { ...runtimeLimits.component, ...overrides.component },
    formula: { ...runtimeLimits.formula, ...overrides.formula },
    action: { ...runtimeLimits.action, ...overrides.action },
    api: { ...runtimeLimits.api, ...overrides.api },
    package: { ...runtimeLimits.package, ...overrides.package },
    ssr: { ...runtimeLimits.ssr, ...overrides.ssr },
    styling: { ...runtimeLimits.styling, ...overrides.styling },
    render: { ...runtimeLimits.render, ...overrides.render },
    error: { ...runtimeLimits.error, ...overrides.error },
  };
}

/**
 * Reset limits to defaults
 */
export function resetLimits(): void {
  runtimeLimits = { ...LAYR_LIMITS };
}

/**
 * Limit exceeded error
 */
export class LimitExceededError extends Error {
  constructor(
    public readonly category: keyof LayrLimits,
    public readonly limit: string,
    public readonly value: number,
    public readonly max: number
  ) {
    super(`${category}.${limit} exceeded: ${value} > ${max}`);
    this.name = 'LimitExceededError';
  }
}

/**
 * Check if a value is within limits, throw if not
 */
export function checkLimit(
  category: keyof LayrLimits,
  limit: string,
  value: number
): void {
  const max = (runtimeLimits as any)[category]?.[limit];
  if (max !== undefined && value > max) {
    throw new LimitExceededError(category, limit, value, max);
  }
}

/**
 * Check if a value is within limits, return boolean
 */
export function isWithinLimit(
  category: keyof LayrLimits,
  limit: string,
  value: number
): boolean {
  const max = (runtimeLimits as any)[category]?.[limit];
  return max === undefined || value <= max;
}
