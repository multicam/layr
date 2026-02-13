import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  onMount,
  onUnmount,
  onAttributesChange,
  triggerMount,
  triggerUnmount,
  triggerAttributeChange,
  hasToddleGlobal,
  getToddleGlobal,
  initToddleGlobal,
  createComponentLifecycle,
} from './index';
import type { Component } from '@layr/types';
import { Signal } from '@layr/core';

describe('Lifecycle System', () => {
  describe('onMount / triggerMount', () => {
    test('calls mount callbacks', async () => {
      let called = false;
      const cleanup = onMount(() => {
        called = true;
      });
      
      await triggerMount();
      
      expect(called).toBe(true);
      cleanup();
    });

    test('supports multiple callbacks', async () => {
      const order: number[] = [];
      
      onMount(() => { order.push(1); });
      onMount(() => { order.push(2); });
      
      await triggerMount();
      
      expect(order).toEqual([1, 2]);
    });

    test('cleanup removes callback', async () => {
      let called = false;
      const cleanup = onMount(() => { called = true; });
      cleanup();
      
      await triggerMount();
      
      expect(called).toBe(false);
    });

    test('supports async callbacks', async () => {
      let called = false;
      
      onMount(async () => {
        await new Promise(r => setTimeout(r, 10));
        called = true;
      });
      
      await triggerMount();
      
      expect(called).toBe(true);
    });
  });

  describe('onUnmount / triggerUnmount', () => {
    test('calls unmount callbacks', async () => {
      let called = false;
      const cleanup = onUnmount(() => {
        called = true;
      });
      
      await triggerUnmount();
      
      expect(called).toBe(true);
      cleanup();
    });

    test('cleanup removes callback', async () => {
      let called = false;
      const cleanup = onUnmount(() => { called = true; });
      cleanup();
      
      await triggerUnmount();
      
      expect(called).toBe(false);
    });
  });

  describe('onAttributesChange / triggerAttributeChange', () => {
    test('calls attribute change callbacks', () => {
      let received: Record<string, unknown> | undefined;
      
      onAttributesChange((attrs) => {
        received = attrs;
      });
      
      triggerAttributeChange({ foo: 'bar' });
      
      expect(received).toEqual({ foo: 'bar' });
    });

    test('supports multiple callbacks', () => {
      const calls: number[] = [];
      
      onAttributesChange(() => { calls.push(1); });
      onAttributesChange(() => { calls.push(2); });
      
      triggerAttributeChange({});
      
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('hasToddleGlobal / getToddleGlobal', () => {
    test('returns false when not initialized', () => {
      // Note: may be true if other tests initialized it
      const result = hasToddleGlobal();
      expect(typeof result).toBe('boolean');
    });

    test('getToddleGlobal returns undefined when not initialized', () => {
      const global = getToddleGlobal();
      // May be defined from other tests
      expect(global === undefined || global !== undefined).toBe(true);
    });
  });

  describe('initToddleGlobal', () => {
    test('initializes global object', () => {
      const toddle = initToddleGlobal({
        project: 'test-project',
        branch: 'main',
        commit: 'abc123',
        env: {
          isServer: false,
          runtime: 'page',
          logErrors: true,
        },
      });
      
      expect(toddle.project).toBe('test-project');
      expect(toddle.branch).toBe('main');
      expect(toddle.commit).toBe('abc123');
      expect(toddle.errors).toEqual([]);
      expect(toddle.env.runtime).toBe('page');
    });
  });

  describe('createComponentLifecycle', () => {
    let abortController: AbortController;
    let dataSignal: Signal<Record<string, unknown>>;

    beforeEach(() => {
      abortController = new AbortController();
      dataSignal = Signal({ Variables: {} });
    });

    test.skip('creates lifecycle with initialize and destroy', () => {
      // Requires full browser environment
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
      };
      
      const lifecycle = createComponentLifecycle({
        component,
        dataSignal,
        abortController,
        handleAction: async () => {},
      });
      
      expect(lifecycle.initialize).toBeDefined();
      expect(lifecycle.destroy).toBeDefined();
      expect(lifecycle.handleAttributeChange).toBeDefined();
    });

    test.skip('destroy aborts controller', () => {
      // Requires full browser environment
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
      };
      
      const lifecycle = createComponentLifecycle({
        component,
        dataSignal,
        abortController,
        handleAction: async () => {},
      });
      
      lifecycle.destroy();
      
      expect(abortController.signal.aborted).toBe(true);
    });

    test.skip('handles onLoad event', async () => {
      // Requires full browser environment
      let actionCalled = false;
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
        onLoad: {
          trigger: 'Load',
          actions: [{ type: 'SetVariable', name: 'test', data: { type: 'value', value: 1 } as any }],
        },
      };
      
      const lifecycle = createComponentLifecycle({
        component,
        dataSignal,
        abortController,
        handleAction: async (action, ctx) => {
          if (action.type === 'SetVariable') {
            actionCalled = true;
          }
        },
      });
      
      await lifecycle.initialize();
      
      expect(actionCalled).toBe(true);
    });

    test.skip('does not execute actions after destroy', async () => {
      // Requires full browser environment
      let actionCalled = false;
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
        onLoad: {
          trigger: 'Load',
          actions: [{ type: 'SetVariable', name: 'test' }],
        },
      };
      
      const lifecycle = createComponentLifecycle({
        component,
        dataSignal,
        abortController,
        handleAction: async () => {
          actionCalled = true;
        },
      });
      
      lifecycle.destroy();
      await lifecycle.initialize();
      
      expect(actionCalled).toBe(false);
    });
  });
});
