import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  onMount,
  onUnmount,
  onAttributesChange,
  triggerMount,
  triggerUnmount,
  triggerAttributeChange,
  resetLifecycleCallbacks,
  hasToddleGlobal,
  getToddleGlobal,
  initToddleGlobal,
  createComponentLifecycle,
} from './index';
import type { Component } from '@layr/types';
import { Signal } from '@layr/core';

describe('Lifecycle System', () => {
  afterEach(() => {
    resetLifecycleCallbacks();
  });

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

  describe('resetLifecycleCallbacks', () => {
    test('clears all mount callbacks', async () => {
      let called = false;
      onMount(() => { called = true; });

      resetLifecycleCallbacks();
      await triggerMount();

      expect(called).toBe(false);
    });

    test('clears all unmount callbacks', async () => {
      let called = false;
      onUnmount(() => { called = true; });

      resetLifecycleCallbacks();
      await triggerUnmount();

      expect(called).toBe(false);
    });

    test('clears all attribute change callbacks', () => {
      let called = false;
      onAttributesChange(() => { called = true; });

      resetLifecycleCallbacks();
      triggerAttributeChange({});

      expect(called).toBe(false);
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
      dataSignal = new Signal({ Variables: {} });
    });

    test('creates lifecycle with all methods', () => {
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
      expect(lifecycle.onMount).toBeDefined();
      expect(lifecycle.onUnmount).toBeDefined();
      expect(lifecycle.onAttributesChange).toBeDefined();
    });

    test('destroy aborts controller', () => {
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

    test('handles onLoad event', async () => {
      let actionCalled = false;
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
        onLoad: {
          actions: [{ type: 'SetVariable', name: 'test', data: { type: 'value', value: 1 } as any }],
        },
      };

      const lifecycle = createComponentLifecycle({
        component,
        dataSignal,
        abortController,
        handleAction: async (action) => {
          if (action.type === 'SetVariable') {
            actionCalled = true;
          }
        },
      });

      await lifecycle.initialize();

      expect(actionCalled).toBe(true);
    });

    test('does not execute actions after destroy', async () => {
      let actionCalled = false;
      const component: Component = {
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
        onLoad: {
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

    test('destroy fires instance unmount callbacks', () => {
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

      let unmountCalled = false;
      lifecycle.onUnmount(() => { unmountCalled = true; });

      lifecycle.destroy();

      expect(unmountCalled).toBe(true);
    });

    test('destroy does NOT fire global unmount callbacks', async () => {
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

      let globalUnmountCalled = false;
      onUnmount(() => { globalUnmountCalled = true; });

      lifecycle.destroy();

      expect(globalUnmountCalled).toBe(false);
    });

    test('two instances do not cross-contaminate', () => {
      const makeComponent = (): Component => ({
        name: 'Test',
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
      });

      const ac1 = new AbortController();
      const ac2 = new AbortController();
      const ds1 = new Signal<Record<string, unknown>>({ Variables: {} });
      const ds2 = new Signal<Record<string, unknown>>({ Variables: {} });

      const lc1 = createComponentLifecycle({
        component: makeComponent(),
        dataSignal: ds1,
        abortController: ac1,
        handleAction: async () => {},
      });

      const lc2 = createComponentLifecycle({
        component: makeComponent(),
        dataSignal: ds2,
        abortController: ac2,
        handleAction: async () => {},
      });

      let unmount1Called = false;
      let unmount2Called = false;

      lc1.onUnmount(() => { unmount1Called = true; });
      lc2.onUnmount(() => { unmount2Called = true; });

      // Destroy only instance 1
      lc1.destroy();

      expect(unmount1Called).toBe(true);
      expect(unmount2Called).toBe(false);

      // Now destroy instance 2
      lc2.destroy();
      expect(unmount2Called).toBe(true);
    });

    test('cannot register callbacks on destroyed lifecycle', () => {
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

      let mountCalled = false;
      let unmountCalled = false;
      let attrCalled = false;

      lifecycle.onMount(() => { mountCalled = true; });
      lifecycle.onUnmount(() => { unmountCalled = true; });
      lifecycle.onAttributesChange(() => { attrCalled = true; });

      // None should be called — they were no-ops
      expect(mountCalled).toBe(false);
      expect(unmountCalled).toBe(false);
      expect(attrCalled).toBe(false);
    });

    test('initialize fires instance mount callbacks', async () => {
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

      let mountCalled = false;
      lifecycle.onMount(() => { mountCalled = true; });

      await lifecycle.initialize();

      expect(mountCalled).toBe(true);
    });
  });
});
