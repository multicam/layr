import { describe, test, expect } from 'bun:test';
import {
  isValue,
  isPath,
  isFunction,
  isObject,
  isArray,
  isSwitch,
  isOr,
  isAnd,
  isApply,
  isRecord,
} from './operations';

describe('formula type guards', () => {
  test('isValue returns true for value operations', () => {
    expect(isValue({ type: 'value', value: 'hello' })).toBe(true);
    expect(isValue({ type: 'path', path: [] })).toBe(false);
  });

  test('isPath returns true for path operations', () => {
    expect(isPath({ type: 'path', path: ['Variables', 'x'] })).toBe(true);
    expect(isPath({ type: 'value', value: 1 })).toBe(false);
  });

  test('isFunction returns true for function operations', () => {
    expect(isFunction({ type: 'function', name: '@toddle/map', arguments: [] })).toBe(true);
    expect(isFunction({ type: 'value', value: null })).toBe(false);
  });

  test('isObject returns true for object operations', () => {
    expect(isObject({ type: 'object', arguments: [] })).toBe(true);
    expect(isObject({ type: 'array', arguments: [] })).toBe(false);
  });

  test('isArray returns true for array operations', () => {
    expect(isArray({ type: 'array', arguments: [] })).toBe(true);
    expect(isArray({ type: 'object', arguments: [] })).toBe(false);
  });

  test('isSwitch returns true for switch operations', () => {
    expect(isSwitch({ type: 'switch', cases: [], default: { type: 'value', value: null } })).toBe(true);
    expect(isSwitch({ type: 'or', arguments: [] })).toBe(false);
  });

  test('isOr returns true for or operations', () => {
    expect(isOr({ type: 'or', arguments: [] })).toBe(true);
    expect(isOr({ type: 'and', arguments: [] })).toBe(false);
  });

  test('isAnd returns true for and operations', () => {
    expect(isAnd({ type: 'and', arguments: [] })).toBe(true);
    expect(isAnd({ type: 'or', arguments: [] })).toBe(false);
  });

  test('isApply returns true for apply operations', () => {
    expect(isApply({ type: 'apply', name: 'myFormula', arguments: [] })).toBe(true);
    expect(isApply({ type: 'function', name: 'test', arguments: [] })).toBe(false);
  });

  test('isRecord returns true for record operations', () => {
    expect(isRecord({ type: 'record', arguments: [] })).toBe(true);
    expect(isRecord({ type: 'object', arguments: [] })).toBe(false);
  });
});
