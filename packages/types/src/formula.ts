/**
 * Formula System Types
 * Based on specs/formula-system.md
 */

// ============================================================================
// Formula (Union Type)
// ============================================================================

export type Formula =
  | ValueOperation
  | PathOperation
  | FunctionOperation
  | ObjectOperation
  | ArrayOperation
  | SwitchOperation
  | OrOperation
  | AndOperation
  | ApplyOperation
  | RecordOperation;

// ============================================================================
// Operation Types
// ============================================================================

export interface ValueOperation {
  type: 'value';
  value: string | number | boolean | null | object | undefined;
}

export interface PathOperation {
  type: 'path';
  path: string[];
}

export interface FunctionOperation {
  type: 'function';
  name: string;
  package?: string;
  arguments: FunctionArgument[];
  variableArguments?: boolean;
  display_name?: string;
}

export interface FunctionArgument {
  name: string;
  formula: Formula;
  isFunction?: boolean;
}

export interface ObjectOperation {
  type: 'object';
  arguments?: FunctionArgument[];
}

export interface ArrayOperation {
  type: 'array';
  arguments: Array<{ formula: Formula }>;
}

export interface SwitchOperation {
  type: 'switch';
  cases: Array<{ condition: Formula; formula: Formula }>;
  default: Formula;
}

export interface OrOperation {
  type: 'or';
  arguments: Array<{ formula: Formula }>;
}

export interface AndOperation {
  type: 'and';
  arguments: Array<{ formula: Formula }>;
}

export interface ApplyOperation {
  type: 'apply';
  name: string;
  arguments: FunctionArgument[];
}

export interface RecordOperation {
  type: 'record';
  arguments?: FunctionArgument[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValueOperation(f: Formula): f is ValueOperation {
  return f.type === 'value';
}

export function isPathOperation(f: Formula): f is PathOperation {
  return f.type === 'path';
}

export function isFunctionOperation(f: Formula): f is FunctionOperation {
  return f.type === 'function';
}

export function isObjectOperation(f: Formula): f is ObjectOperation {
  return f.type === 'object';
}

export function isArrayOperation(f: Formula): f is ArrayOperation {
  return f.type === 'array';
}

export function isSwitchOperation(f: Formula): f is SwitchOperation {
  return f.type === 'switch';
}

export function isOrOperation(f: Formula): f is OrOperation {
  return f.type === 'or';
}

export function isAndOperation(f: Formula): f is AndOperation {
  return f.type === 'and';
}

export function isApplyOperation(f: Formula): f is ApplyOperation {
  return f.type === 'apply';
}

export function isRecordOperation(f: Formula): f is RecordOperation {
  return f.type === 'record';
}
