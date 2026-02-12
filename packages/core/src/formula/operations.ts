/**
 * Formula Operation Type Guards
 */

import type {
  Formula,
  ValueOperation,
  PathOperation,
  FunctionOperation,
  ObjectOperation,
  ArrayOperation,
  SwitchOperation,
  OrOperation,
  AndOperation,
  ApplyOperation,
  RecordOperation,
} from '@layr/types';

export function isValue(f: Formula): f is ValueOperation {
  return f.type === 'value';
}

export function isPath(f: Formula): f is PathOperation {
  return f.type === 'path';
}

export function isFunction(f: Formula): f is FunctionOperation {
  return f.type === 'function';
}

export function isObject(f: Formula): f is ObjectOperation {
  return f.type === 'object';
}

export function isArray(f: Formula): f is ArrayOperation {
  return f.type === 'array';
}

export function isSwitch(f: Formula): f is SwitchOperation {
  return f.type === 'switch';
}

export function isOr(f: Formula): f is OrOperation {
  return f.type === 'or';
}

export function isAnd(f: Formula): f is AndOperation {
  return f.type === 'and';
}

export function isApply(f: Formula): f is ApplyOperation {
  return f.type === 'apply';
}

export function isRecord(f: Formula): f is RecordOperation {
  return f.type === 'record';
}
