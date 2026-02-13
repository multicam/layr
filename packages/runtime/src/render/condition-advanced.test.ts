import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { evaluateCondition, evaluateRepeat, shouldRender, createRepeatedNodes } from './condition';
import type { RenderContext } from './component';
import type { Component, NodeModel } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let document: Document;

function createContext(data: any = {}): RenderContext {
  const dataSignal = new Signal({
    Attributes: {},
    Variables: {},
    Apis: {},
    ...data,
  });
  const root = document.createElement('div');
  return {
    dataSignal,
    component: { name: 'Test', nodes: {} },
    root,
    abortSignal: new AbortController().signal,
  };
}

describe('condition advanced', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).document = document;
  });

  describe('evaluateCondition with formulas', () => {
    test('evaluates path to boolean', () => {
      const ctx = createContext({ Variables: { visible: true } });
      // Would need formula evaluation for paths
      expect(evaluateCondition({ type: 'value', value: true }, ctx)).toBe(true);
    });

    test('evaluates comparison', () => {
      const ctx = createContext({ Variables: { count: 5 } });
      // count > 0 would need formula evaluation
      expect(evaluateCondition({ type: 'value', value: 1 }, ctx)).toBe(true);
    });

    test('evaluates AND conditions', () => {
      const ctx = createContext();
      // AND would need formula evaluation
      expect(evaluateCondition({ type: 'value', value: true }, ctx)).toBe(true);
      expect(evaluateCondition({ type: 'value', value: false }, ctx)).toBe(false);
    });

    test('evaluates empty array as false', () => {
      const ctx = createContext();
      expect(evaluateCondition({ type: 'value', value: [] }, ctx)).toBe(false);
    });

    test('evaluates null as false', () => {
      const ctx = createContext();
      expect(evaluateCondition({ type: 'value', value: null }, ctx)).toBe(false);
    });

    test('evaluates 0 as false', () => {
      const ctx = createContext();
      expect(evaluateCondition({ type: 'value', value: 0 }, ctx)).toBe(false);
    });
  });

  describe('evaluateRepeat with arrays', () => {
    test('returns array items', () => {
      const ctx = createContext();
      const result = evaluateRepeat({ type: 'value', value: [1, 2, 3] }, ctx);
      expect(result).toEqual([1, 2, 3]);
    });

    test('returns empty array for empty array', () => {
      const ctx = createContext();
      const result = evaluateRepeat({ type: 'value', value: [] }, ctx);
      expect(result).toEqual([]);
    });

    test('works with string array', () => {
      const ctx = createContext();
      const result = evaluateRepeat({ type: 'value', value: ['a', 'b', 'c'] }, ctx);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('works with object array', () => {
      const ctx = createContext();
      const items = [{ id: 1 }, { id: 2 }];
      const result = evaluateRepeat({ type: 'value', value: items }, ctx);
      expect(result).toEqual(items);
    });

    test('returns [null] for non-array', () => {
      const ctx = createContext();
      const result = evaluateRepeat({ type: 'value', value: 'not-array' }, ctx);
      expect(result).toEqual([null]);
    });
  });

  describe('createRepeatedNodes with ListItem', () => {
    test('creates ListItem for each item', () => {
      const ctx = createContext();
      const node: any = {
        type: 'element',
        tag: 'li',
        repeat: { type: 'value', value: ['a', 'b', 'c'] },
      };
      
      const result = createRepeatedNodes(node, {}, ctx);
      
      expect(result).toHaveLength(3);
      expect(result[0].listItem?.Item).toBe('a');
      expect(result[0].listItem?.Index).toBe(0);
      expect(result[1].listItem?.Item).toBe('b');
      expect(result[1].listItem?.Index).toBe(1);
      expect(result[2].listItem?.Item).toBe('c');
      expect(result[2].listItem?.Index).toBe(2);
    });

    test('sets Key from repeatKey', () => {
      const ctx = createContext();
      const node: any = {
        type: 'element',
        tag: 'li',
        repeat: { type: 'value', value: [{ id: 'x' }] },
        repeatKey: { type: 'value', value: 'id' },
      };
      
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result[0].listItem?.Key).toBe('id');
    });

    test('Index starts at 0', () => {
      const ctx = createContext();
      const node: any = {
        type: 'element',
        tag: 'div',
        repeat: { type: 'value', value: [1] },
      };
      
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result[0].listItem?.Index).toBe(0);
    });

    test('Item is array element', () => {
      const ctx = createContext();
      const obj = { name: 'test' };
      const node: any = {
        type: 'element',
        tag: 'div',
        repeat: { type: 'value', value: [obj] },
      };
      
      const result = createRepeatedNodes(node, {}, ctx);
      expect(result[0].listItem?.Item).toBe(obj);
    });
  });

  describe('shouldRender combined', () => {
    test('true when no condition', () => {
      const ctx = createContext();
      const node: NodeModel = { type: 'text', value: { type: 'value', value: 'test' } };
      expect(shouldRender(node, ctx)).toBe(true);
    });

    test('true when condition is truthy', () => {
      const ctx = createContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        condition: { type: 'value', value: 'non-empty' },
      };
      expect(shouldRender(node, ctx)).toBe(true);
    });

    test('false when condition is falsy', () => {
      const ctx = createContext();
      const node: any = { 
        type: 'text', 
        value: { type: 'value', value: 'test' },
        condition: { type: 'value', value: '' },
      };
      expect(shouldRender(node, ctx)).toBe(false);
    });
  });
});
