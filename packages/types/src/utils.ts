/**
 * Utility Types
 */

// ============================================================================
// Common Utilities
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type MaybeUndefined<T> = T | undefined;

export type MaybePromise<T> = T | Promise<T>;

// ============================================================================
// Record Utilities
// ============================================================================

export type StringKey<T> = keyof T & string;

export type Values<T> = T[keyof T];

export type Entries<T> = Array<[keyof T, T[keyof T]]>;

// ============================================================================
// Function Utilities
// ============================================================================

export type AnyFunction = (...args: any[]) => any;

export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

// ============================================================================
// Error Types
// ============================================================================

export interface LayrError extends Error {
  type: string;
  componentContext?: string;
  path?: string[];
  suggestion?: string;
}

export interface LimitExceededError extends LayrError {
  type: 'limit-exceeded';
  category: 'project' | 'component' | 'nesting' | 'size' | 'execution';
  limit: string;
  value: number;
  max: number;
}

export interface FormulaCycleError extends LayrError {
  type: 'formula-cycle';
  formulaName: string;
  componentName: string;
  cyclePath: string[];
}
