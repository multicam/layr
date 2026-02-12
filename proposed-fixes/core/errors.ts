/**
 * Error Attribution System
 * 
 * Provides rich error context including formula paths, component context,
 * and execution traces for debugging production issues.
 * 
 * @module @layr/core/errors
 */

import { getLimits } from './limits';

/**
 * Error types in Layr
 */
export type LayrErrorType =
  | 'formula_evaluation'
  | 'action_execution'
  | 'api_request'
  | 'component_render'
  | 'hydration'
  | 'validation'
  | 'limit_exceeded'
  | 'cycle_detected'
  | 'unknown';

/**
 * Context for a single step in the execution path
 */
export interface ExecutionStep {
  /** Type of context */
  type: 'component' | 'formula' | 'action' | 'api' | 'node';
  /** Name or identifier */
  name: string;
  /** Package name if applicable */
  package?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Timestamp when this step started */
  timestamp: number;
}

/**
 * Base Layr error with attribution
 */
export class LayrError extends Error {
  /** Type of error */
  public readonly type: LayrErrorType;
  /** Execution path leading to the error */
  public readonly path: ExecutionStep[];
  /** Timestamp when error occurred */
  public readonly timestamp: number;
  /** Component context where error occurred */
  public readonly componentContext?: string;
  /** Suggested fix if available */
  public readonly suggestedFix?: string;
  /** Original error if wrapping */
  public readonly cause?: Error;

  constructor(
    type: LayrErrorType,
    message: string,
    options?: {
      path?: ExecutionStep[];
      componentContext?: string;
      suggestedFix?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'LayrError';
    this.type = type;
    this.path = options?.path ?? [];
    this.timestamp = Date.now();
    this.componentContext = options?.componentContext;
    this.suggestedFix = options?.suggestedFix;
    this.cause = options?.cause;
  }

  /**
   * Get formatted path string
   */
  get pathString(): string {
    return this.path
      .map((step) => {
        const prefix = step.package ? `${step.package}/` : '';
        return `${step.type}:${prefix}${step.name}`;
      })
      .join(' → ');
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      path: this.path,
      pathString: this.pathString,
      timestamp: this.timestamp,
      componentContext: this.componentContext,
      suggestedFix: this.suggestedFix,
      cause: this.cause?.message,
    };
  }
}

/**
 * Formula evaluation error with detailed context
 */
export class FormulaError extends LayrError {
  constructor(
    public readonly formulaName: string,
    public readonly formulaType: string,
    message: string,
    options?: {
      path?: ExecutionStep[];
      componentContext?: string;
      cause?: Error;
      inputContext?: Record<string, unknown>;
    }
  ) {
    super('formula_evaluation', message, {
      path: options?.path,
      componentContext: options?.componentContext,
      cause: options?.cause,
      suggestedFix: FormulaError.getSuggestedFix(formulaType, message),
    });
    this.name = 'FormulaError';
  }

  private static getSuggestedFix(formulaType: string, message: string): string | undefined {
    if (message.includes('undefined') || message.includes('null')) {
      return 'Check that the data path exists and has a value. Consider using the "default" formula to provide a fallback.';
    }
    if (formulaType === 'path') {
      return 'Verify the path segments are correct. Check component data structure.';
    }
    if (formulaType === 'function') {
      return 'Check formula arguments and ensure the formula handler is registered.';
    }
    return undefined;
  }
}

/**
 * Action execution error with action context
 */
export class ActionError extends LayrError {
  constructor(
    public readonly actionType: string,
    public readonly actionIndex: number,
    message: string,
    options?: {
      path?: ExecutionStep[];
      componentContext?: string;
      cause?: Error;
    }
  ) {
    super('action_execution', message, {
      path: options?.path,
      componentContext: options?.componentContext,
      cause: options?.cause,
    });
    this.name = 'ActionError';
  }
}

/**
 * API request error with request details
 */
export class ApiError extends LayrError {
  constructor(
    public readonly apiName: string,
    public readonly statusCode?: number,
    public readonly url?: string,
    message?: string,
    options?: {
      path?: ExecutionStep[];
      componentContext?: string;
      cause?: Error;
    }
  ) {
    super('api_request', message ?? `API request failed: ${apiName}`, {
      path: options?.path,
      componentContext: options?.componentContext,
      cause: options?.cause,
    });
    this.name = 'ApiError';
  }
}

/**
 * Hydration mismatch error
 */
export class HydrationError extends LayrError {
  constructor(
    public readonly mismatchType: 'html' | 'data' | 'state',
    public readonly expected: string,
    public readonly actual: string,
    options?: {
      path?: ExecutionStep[];
      componentContext?: string;
    }
  ) {
    super('hydration', `Hydration mismatch (${mismatchType}): expected "${expected}", got "${actual}"`, {
      path: options?.path,
      componentContext: options?.componentContext,
      suggestedFix: 'This may indicate server/client state divergence. Check formulas that depend on browser-only APIs.',
    });
    this.name = 'HydrationError';
  }
}

/**
 * Error collector for aggregating multiple errors
 */
export class ErrorCollector {
  private errors: LayrError[] = [];
  private readonly maxErrors: number;

  constructor(maxErrors?: number) {
    this.maxErrors = maxErrors ?? getLimits().error.maxErrors;
  }

  /**
   * Add an error to the collector
   * @returns true if error was added, false if collector is full
   */
  add(error: LayrError): boolean {
    if (this.errors.length >= this.maxErrors) {
      return false;
    }
    this.errors.push(error);
    return true;
  }

  /**
   * Get all collected errors
   */
  getErrors(): LayrError[] {
    return [...this.errors];
  }

  /**
   * Check if any errors were collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get error count
   */
  get count(): number {
    return this.errors.length;
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get errors by type
   */
  getByType(type: LayrErrorType): LayrError[] {
    return this.errors.filter((e) => e.type === type);
  }

  /**
   * Get summary of errors by type
   */
  getSummary(): Record<LayrErrorType, number> {
    const summary: Record<string, number> = {};
    for (const error of this.errors) {
      summary[error.type] = (summary[error.type] ?? 0) + 1;
    }
    return summary as Record<LayrErrorType, number>;
  }
}

/**
 * Global error collector instance
 */
let globalErrorCollector: ErrorCollector | undefined;

/**
 * Get or create the global error collector
 */
export function getErrorCollector(): ErrorCollector {
  if (!globalErrorCollector) {
    globalErrorCollector = new ErrorCollector();
  }
  return globalErrorCollector;
}

/**
 * Reset the global error collector
 */
export function resetErrorCollector(): void {
  globalErrorCollector = undefined;
}

/**
 * Execution context for tracking path during evaluation
 */
export class ExecutionContext {
  private path: ExecutionStep[] = [];

  /**
   * Push a context step
   */
  push(step: Omit<ExecutionStep, 'timestamp'>): void {
    this.path.push({
      ...step,
      timestamp: Date.now(),
    });
  }

  /**
   * Pop the last context step
   */
  pop(): ExecutionStep | undefined {
    return this.path.pop();
  }

  /**
   * Get current path
   */
  getPath(): ExecutionStep[] {
    return [...this.path];
  }

  /**
   * Get current depth
   */
  get depth(): number {
    return this.path.length;
  }

  /**
   * Create a LayrError with current context
   */
  createError(
    type: LayrErrorType,
    message: string,
    options?: Omit<ConstructorParameters<typeof LayrError>[2], 'path'>
  ): LayrError {
    return new LayrError(type, message, {
      ...options,
      path: this.getPath(),
    });
  }

  /**
   * Execute a function with context tracking
   */
  withContext<T>(
    step: Omit<ExecutionStep, 'timestamp'>,
    fn: () => T
  ): T {
    this.push(step);
    try {
      return fn();
    } finally {
      this.pop();
    }
  }
}

/**
 * Create an attributed error from any error
 */
export function attributeError(
  error: unknown,
  context: ExecutionContext,
  type: LayrErrorType = 'unknown'
): LayrError {
  if (error instanceof LayrError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new LayrError(type, message, {
    path: context.getPath(),
    cause,
  });
}
