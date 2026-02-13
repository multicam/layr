import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { evaluateCondition, evaluateRepeat, shouldRender, createRepeatedNodes } from './condition';
import type { RenderContext } from './component';
import type { Component, NodeModel } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let mockDoc: Document;

function createMockContext(): RenderContext {
  const dataSignal = new Signal({
    Attributes: {},
    Variables: {},
    Apis: {},
  });
  const root = window.document.createElement('div');
  return {
    dataSignal,
    component: { name: 'Test', nodes: {} },
    root,
    abortSignal: new AbortController().signal,
  };
}

describe('condition', () => {
  beforeAll(() => {
    window = new Window();
    mockDoc = window.document;
    (globalThis as any).document = mockDoc;
  });

  describe('evaluateCondition', () => {
    test('returns true for undefined condition', () => {
      const ctx = createMockContext();
      expect(evaluateCondition(undefined, ctx)).toBe(true);
    });

    test('returns true for truthy value', () => {
      const ctx = createMockContext();
      expect(evaluateCondition({ type: 'value', value: true }, ctx)).toBe(true);
      expect(evaluateCondition({ type: 'value', value: 1 }, ctx)).toBe(true);
      expect(evaluateCondition({ type: 'value', value: 'hello' }, ctx)).toBe(true);
    });

    test('returns false for falsy value', () => {
      const ctx = createMockContext();
      expect(evaluateCondition({ type: 'value', value: false }, ctx)).toBe(false);
      expect(evaluateCondition({ type: 'value', value: 0 }, ctx)).toBe(false);
      expect(evaluateCondition({ type: 'value', value: '' }, ctx)).toBe(false);
      expect(evaluateCondition({ type: 'value', value: null }, ctx)).toBe(false);
    });
  });

  describe('evaluateRepeat', () => {
    test('returns single null for no repeat', () => {
      const ctx = createMockContext();
      const result = evaluateRepeat(undefined, ctx);
      expect(result).toEqual([null]);
    });

    test('returns array for array value', () => {
      const ctx = createMockContext();
      const result = evaluateRepeat({ type: 'value', value: [1, 2, 3] }, ctx);
      expect(result).toEqual([1, 2, 3]);
    });

    test('returns single item for non-array', () => {
      const ctx = createMockContext();
      const result = evaluateRepeat({ type: 'value', value: 'test' }, ctx);
      expect(result).toEqual([null]);
    });
  });

  describe('shouldRender', () => {
    test('returns true when no condition', () => {
      const ctx = createMockContext();
      const node: NodeModel = { type: 'text', value: { type: 'value', value: 'test' } };
      expect(shouldRender(node, ctx)).toBe(true);
    });

    test('returns true when condition is true', () => {
      const ctx = createMockContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        condition: { type: 'value', value: true },
      };
      expect(shouldRender(node, ctx)).toBe(true);
    });

    test('returns false when condition is false', () => {
      const ctx = createMockContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        condition: { type: 'value', value: false },
      };
      expect(shouldRender(node, ctx)).toBe(false);
    });
  });

  describe('createRepeatedNodes', () => {
    test('returns single item without repeat', () => {
      const ctx = createMockContext();
      const node: NodeModel = { type: 'text', value: { type: 'value', value: 'test' } };
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result).toHaveLength(1);
      expect(result[0].listItem).toBeNull();
    });

    test('returns multiple items for array repeat', () => {
      const ctx = createMockContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        repeat: { type: 'value', value: ['a', 'b', 'c'] },
      };
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result).toHaveLength(3);
      expect(result[0].listItem?.Item).toBe('a');
      expect(result[0].listItem?.Index).toBe(0);
      expect(result[1].listItem?.Index).toBe(1);
      expect(result[2].listItem?.Index).toBe(2);
    });

    test('uses repeatKey for Key', () => {
      const ctx = createMockContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        repeat: { type: 'value', value: [{ id: 'x' }] },
        repeatKey: { type: 'value', value: 'my-key' },
      };
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result[0].listItem?.Key).toBe('my-key');
    });
  });
});
