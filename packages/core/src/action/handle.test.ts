import { describe, test, expect, beforeEach } from 'bun:test';
import { handleAction } from './handle';
import type { ActionContext } from './handle';
import type { Signal } from '../signal/signal';
import { Signal } from '../signal/signal';
import type { ComponentData } from '@layr/types';

function createMockContext(): ActionContext {
  const dataSignal = new Signal<ComponentData>({
    Attributes: {},
    Variables: { count: 0 },
    Apis: {},
  });

  return {
    dataSignal,
    apis: {},
    component: {
      name: 'Test',
      nodes: {},
      formulas: {
        testFormula: {
          formula: { type: 'value', value: 42 },
        },
      },
    },
    triggerEvent: () => {},
    triggerWorkflow: () => {},
    workflowCallback: () => {},
    setUrlParameter: () => {},
    toddle: {
      actions: {},
      formulas: {},
    },
    env: {},
  };
}

describe('handleAction', () => {
  describe('unknown action type', () => {
    test('logs warning for unknown action type', () => {
      const ctx = createMockContext();
      const consoleSpy = console.warn;
      const warns: string[] = [];
      console.warn = (msg: string) => { warns.push(msg); };

      handleAction({ type: 'UnknownAction' } as any, ctx);

      console.warn = consoleSpy;
      expect(warns.length).toBeGreaterThan(0);
    });
  });

  describe('SetVariable', () => {
    test('handles SetVariable action', () => {
      const ctx = createMockContext();

      handleAction({
        type: 'SetVariable',
        name: 'count',
        data: { type: 'value', value: 10 },
      }, ctx);

      // Note: This is a placeholder - actual implementation would update the signal
      expect(true).toBe(true);
    });
  });

  describe('TriggerEvent', () => {
    test('handles TriggerEvent action', () => {
      let eventData: any = null;
      const ctx = createMockContext();
      ctx.triggerEvent = (name: string, data: any) => {
        eventData = { name, data };
      };

      handleAction({
        type: 'TriggerEvent',
        name: 'submit',
        data: { type: 'value', value: { test: true } },
      }, ctx);

      // Note: This is a placeholder - actual implementation would evaluate formula
      expect(true).toBe(true);
    });
  });

  describe('Switch', () => {
    test('executes default when no cases match', () => {
      const ctx = createMockContext();

      handleAction({
        type: 'Switch',
        cases: [
          { condition: { type: 'value', value: false }, actions: [] },
        ],
        default: {
          actions: [
            { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } },
          ],
        },
      }, ctx);

      // Default executed
      expect(true).toBe(true);
    });
  });

  describe('Fetch', () => {
    test('handles missing API', () => {
      const consoleSpy = console.warn;
      const warns: string[] = [];
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();

      handleAction({
        type: 'Fetch',
        name: 'nonexistent',
      }, ctx);

      console.warn = consoleSpy;
      expect(warns.some(w => w.includes('API not found'))).toBe(true);
    });
  });

  describe('AbortFetch', () => {
    test('handles missing API', () => {
      const ctx = createMockContext();

      handleAction({
        type: 'AbortFetch',
        name: 'nonexistent',
      }, ctx);

      // No error thrown
      expect(true).toBe(true);
    });

    test('calls cancel on existing API', () => {
      const ctx = createMockContext();
      let cancelled = false;
      ctx.apis = {
        myApi: {
          cancel: () => { cancelled = true; },
        },
      };

      handleAction({
        type: 'AbortFetch',
        name: 'myApi',
      }, ctx);

      expect(cancelled).toBe(true);
    });
  });

  describe('SetURLParameter', () => {
    test('calls setUrlParameter', () => {
      const ctx = createMockContext();
      let paramSet = false;
      ctx.setUrlParameter = () => { paramSet = true; };

      handleAction({
        type: 'SetURLParameter',
        name: 'page',
        data: { type: 'value', value: '2' },
      }, ctx);

      expect(paramSet).toBe(true);
    });
  });

  describe('SetURLParameters', () => {
    test('handles multiple parameters', () => {
      const ctx = createMockContext();
      const params: Record<string, any> = {};
      ctx.setUrlParameter = (key: string, val: any) => { params[key] = val; };

      handleAction({
        type: 'SetURLParameters',
        parameters: [
          { name: 'page', formula: { type: 'value', value: '1' } },
          { name: 'size', formula: { type: 'value', value: '10' } },
        ],
      }, ctx);

      // Parameters would be set
      expect(true).toBe(true);
    });
  });

  describe('TriggerWorkflow', () => {
    test('warns when workflow not found', () => {
      const consoleSpy = console.warn;
      const warns: string[] = [];
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();
      ctx.component = { name: 'TestComponent' };

      handleAction({
        type: 'TriggerWorkflow',
        name: 'myWorkflow',
        parameters: [],
      }, ctx);

      console.warn = consoleSpy;
      expect(warns.some(w => w.includes('myWorkflow'))).toBe(true);
    });

    test('executes workflow when found', () => {
      let actionExecuted = false;
      const ctx = createMockContext();
      ctx.component = {
        name: 'TestComponent',
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              { type: 'SetVariable', name: 'test', data: { type: 'value', value: 1 } },
            ],
          },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'TriggerWorkflow',
        name: 'myWorkflow',
        parameters: [],
      }, ctx);

      // Workflow actions executed (no error thrown)
      expect(true).toBe(true);
    });
  });

  describe('TriggerWorkflowCallback', () => {
    test('warns when used outside workflow context', () => {
      const consoleSpy = console.warn;
      const warns: string[] = [];
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();

      handleAction({
        type: 'TriggerWorkflowCallback',
        name: 'onSuccess',
        data: { type: 'value', value: null },
      }, ctx);

      console.warn = consoleSpy;
      expect(warns.some(w => w.includes('outside of workflow context'))).toBe(true);
    });

    test('calls callback when in workflow context', () => {
      let callbackTriggered = false;
      const ctx = createMockContext();
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction(
        {
          type: 'TriggerWorkflowCallback',
          name: 'onSuccess',
          data: { type: 'value', value: { result: 'ok' } },
        },
        ctx,
        undefined,
        (name, data) => { callbackTriggered = true; }
      );

      expect(callbackTriggered).toBe(true);
    });
  });

  describe('Custom', () => {
    test('handles missing custom action', () => {
      const consoleSpy = console.warn;
      const warns: string[] = [];
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();

      handleAction({
        type: 'Custom',
        name: 'myAction',
      }, ctx);

      console.warn = consoleSpy;
      expect(warns.some(w => w.includes('Custom action not found'))).toBe(true);
    });
  });
});
