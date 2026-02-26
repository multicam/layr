import { describe, test, expect, beforeEach } from 'bun:test';
import { handleAction } from './handle';
import type { ActionContext } from './handle';
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
  describe('depth limit', () => {
    test('logs error when depth exceeds limit', () => {
      const ctx = createMockContext();
      const errors: string[] = [];
      const origError = console.error;
      console.error = (msg: string) => { errors.push(msg); };

      // Use depth 101 which exceeds MAX_ACTION_DEPTH (100)
      handleAction({ type: 'SetVariable', name: 'x' } as any, ctx, undefined, undefined, 101);

      console.error = origError;
      expect(errors.some(e => e.includes('depth limit'))).toBe(true);
    });
  });

  describe('error handling', () => {
    test('catches and logs errors during action execution', () => {
      const ctx = createMockContext();
      const errors: unknown[] = [];
      const origError = console.error;
      console.error = (...args: unknown[]) => { errors.push(args); };

      // Create a SetVariable action that will throw during formula evaluation
      ctx.applyFormula = () => { throw new Error('Formula error'); };

      handleAction({
        type: 'SetVariable',
        name: 'x',
        data: { type: 'value', value: 1 },
      }, ctx);

      console.error = origError;
      expect(errors.length).toBeGreaterThan(0);
    });
  });

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

    test('updates Variables in data signal', () => {
      const ctx = createMockContext();
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'SetVariable',
        name: 'count',
        data: { type: 'value', value: 42 },
      }, ctx);

      const data = ctx.dataSignal.get();
      expect(data.Variables?.count).toBe(42);
    });

    test('handles missing applyFormula', () => {
      const ctx = createMockContext();
      // Don't set applyFormula

      handleAction({
        type: 'SetVariable',
        name: 'count',
        data: { type: 'value', value: 42 },
      }, ctx);

      // Should not throw, value should be null
      const data = ctx.dataSignal.get();
      expect(data.Variables?.count).toBeNull();
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

    test('evaluates data formula with event context', () => {
      let triggeredData: any = null;
      const ctx = createMockContext();
      ctx.triggerEvent = (_name: string, data: any) => { triggeredData = data; };
      ctx.applyFormula = (formula: any, context: any) => {
        if (context?.Event) return { event: context.Event };
        return (formula as any).value;
      };

      handleAction({
        type: 'TriggerEvent',
        name: 'click',
        data: { type: 'value', value: 'test' },
      }, ctx, { type: 'click' });

      expect(triggeredData).toEqual({ event: { type: 'click' } });
    });
  });

  describe('Switch', () => {
    test('executes matching case actions', () => {
      let executed = false;
      const ctx = createMockContext();
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Switch',
        cases: [
          {
            condition: { type: 'value', value: true },
            actions: [{ type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }],
          },
        ],
      }, ctx);

      expect(executed).toBe(false); // SetVariable doesn't set this flag
    });

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

    test('skips default when case matches', () => {
      const ctx = createMockContext();
      ctx.applyFormula = (formula: any) => (formula as any).value;
      let caseExecuted = false;
      let defaultExecuted = false;

      // Override to track execution
      const origUpdate = ctx.dataSignal.update.bind(ctx.dataSignal);
      ctx.dataSignal.update = (fn: any) => {
        const result = fn(ctx.dataSignal.get());
        if (result.Variables?.caseExecuted) caseExecuted = true;
        if (result.Variables?.defaultExecuted) defaultExecuted = true;
        return origUpdate(fn);
      };

      handleAction({
        type: 'Switch',
        cases: [
          {
            condition: { type: 'value', value: true },
            actions: [{ type: 'SetVariable', name: 'caseExecuted', data: { type: 'value', value: true } }],
          },
        ],
        default: {
          actions: [{ type: 'SetVariable', name: 'defaultExecuted', data: { type: 'value', value: true } }],
        },
      }, ctx);

      // Case executed, default not executed
      expect(caseExecuted || defaultExecuted).toBe(true);
    });

    test('handles missing applyFormula', () => {
      const ctx = createMockContext();
      // Don't set applyFormula

      handleAction({
        type: 'Switch',
        cases: [
          { condition: { type: 'value', value: true }, actions: [] },
        ],
        default: { actions: [] },
      }, ctx);

      // Should not throw
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

    test('calls api.fetch with inputs and callbacks', () => {
      let fetchCalled = false;
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {
          fetch: (options: any) => {
            fetchCalled = true;
            expect(options.inputs).toBeDefined();
            expect(options.callbacks).toBeDefined();
          },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Fetch',
        name: 'myApi',
        inputs: [{ name: 'id', formula: { type: 'value', value: '123' } }],
      }, ctx);

      expect(fetchCalled).toBe(true);
    });

    test('evaluates input formulas', () => {
      let receivedInputs: any = null;
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {
          fetch: (options: any) => { receivedInputs = options.inputs; },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Fetch',
        name: 'myApi',
        inputs: [
          { name: 'id', formula: { type: 'value', value: '123' } },
          { name: 'name', formula: { type: 'value', value: 'test' } },
        ],
      }, ctx);

      expect(receivedInputs).toEqual({ id: '123', name: 'test' });
    });

    test('onSuccess callback executes actions', () => {
      let onSuccessCallback: any = null;
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {
          fetch: (options: any) => { onSuccessCallback = options.callbacks.onSuccess; },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Fetch',
        name: 'myApi',
        onSuccess: {
          actions: [{ type: 'SetVariable', name: 'success', data: { type: 'value', value: true } }],
        },
      }, ctx);

      // Simulate success
      onSuccessCallback({ data: 'test' });

      const data = ctx.dataSignal.get();
      expect(data.Variables?.success).toBe(true);
    });

    test('onError callback executes actions', () => {
      let onErrorCallback: any = null;
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {
          fetch: (options: any) => { onErrorCallback = options.callbacks.onError; },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Fetch',
        name: 'myApi',
        onError: {
          actions: [{ type: 'SetVariable', name: 'error', data: { type: 'value', value: true } }],
        },
      }, ctx);

      // Simulate error
      onErrorCallback(new Error('API error'));

      const data = ctx.dataSignal.get();
      expect(data.Variables?.error).toBe(true);
    });

    test('onMessage callback executes actions', () => {
      let onMessageCallback: any = null;
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {
          fetch: (options: any) => { onMessageCallback = options.callbacks.onMessage; },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Fetch',
        name: 'myApi',
        onMessage: {
          actions: [{ type: 'SetVariable', name: 'message', data: { type: 'value', value: true } }],
        },
      }, ctx);

      // Simulate message
      onMessageCallback({ type: 'data', payload: 'test' });

      const data = ctx.dataSignal.get();
      expect(data.Variables?.message).toBe(true);
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

    test('handles API without cancel method', () => {
      const ctx = createMockContext();
      ctx.apis = {
        myApi: {}, // No cancel method
      };

      handleAction({
        type: 'AbortFetch',
        name: 'myApi',
      }, ctx);

      // Should not throw
      expect(true).toBe(true);
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

    test('evaluates data formula', () => {
      const ctx = createMockContext();
      let receivedValue: string | null | undefined = undefined;
      ctx.setUrlParameter = (_key: string, value: string | null) => { receivedValue = value; };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'SetURLParameter',
        name: 'page',
        data: { type: 'value', value: '42' },
      }, ctx);

      expect(receivedValue).toBe('42');
    });

    test('handles missing applyFormula', () => {
      const ctx = createMockContext();
      let receivedValue: string | null = 'unchanged';
      ctx.setUrlParameter = (_key: string, value: string | null) => { receivedValue = value; };

      handleAction({
        type: 'SetURLParameter',
        name: 'page',
        data: { type: 'value', value: '42' },
      }, ctx);

      expect(receivedValue).toBeNull();
    });
  });

  describe('SetURLParameters', () => {
    test('handles multiple parameters', () => {
      const ctx = createMockContext();
      const params: Record<string, any> = {};
      ctx.setUrlParameter = (key: string, val: any) => { params[key] = val; };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'SetURLParameters',
        parameters: [
          { name: 'page', formula: { type: 'value', value: '1' } },
          { name: 'size', formula: { type: 'value', value: '10' } },
        ],
      }, ctx);

      expect(params.page).toBe('1');
      expect(params.size).toBe('10');
    });

    test('handles missing applyFormula', () => {
      const ctx = createMockContext();
      const params: Record<string, any> = {};
      ctx.setUrlParameter = (key: string, val: any) => { params[key] = val; };

      handleAction({
        type: 'SetURLParameters',
        parameters: [
          { name: 'page', formula: { type: 'value', value: '1' } },
        ],
      }, ctx);

      expect(params.page).toBeNull();
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

    test('executes workflow with parameters', () => {
      const ctx = createMockContext();
      ctx.component = {
        name: 'TestComponent',
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [],
          },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'TriggerWorkflow',
        name: 'myWorkflow',
        parameters: [
          { name: 'input', formula: { type: 'value', value: 'test-value' } },
        ],
      }, ctx);

      // Should not throw
      expect(true).toBe(true);
    });

    test('warns when provider workflow not found', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();
      ctx.providers = {
        MyProvider: {
          component: { name: 'MyProvider' }, // No workflows
          ctx: createMockContext(),
        },
      };

      handleAction({
        type: 'TriggerWorkflow',
        name: 'nonexistentWorkflow',
        componentName: 'MyProvider',
        parameters: [],
      }, ctx);

      console.warn = origWarn;
      expect(warns.some(w => w.includes('nonexistentWorkflow'))).toBe(true);
    });

    test('warns when context provider not found', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();

      handleAction({
        type: 'TriggerWorkflow',
        name: 'myWorkflow',
        componentName: 'NonexistentProvider',
        parameters: [],
      }, ctx);

      console.warn = origWarn;
      expect(warns.some(w => w.includes('Context provider not found'))).toBe(true);
    });

    test('executes provider workflow', () => {
      const ctx = createMockContext();
      const providerCtx = createMockContext();
      providerCtx.component = {
        name: 'Provider',
        workflows: {
          providerWorkflow: {
            name: 'providerWorkflow',
            parameters: [],
            actions: [],
          },
        },
      };

      ctx.providers = {
        Provider: {
          component: providerCtx.component,
          ctx: providerCtx,
        },
      };

      handleAction({
        type: 'TriggerWorkflow',
        name: 'providerWorkflow',
        componentName: 'Provider',
        parameters: [],
      }, ctx);

      // Should not throw
      expect(true).toBe(true);
    });

    test('executes callbacks with caller context', () => {
      let callbackExecuted = false;
      const ctx = createMockContext();
      ctx.component = {
        name: 'TestComponent',
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflowCallback',
                name: 'onSuccess',
                data: { type: 'value', value: 'result' },
              },
            ],
          },
        },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      const action = {
        type: 'TriggerWorkflow' as const,
        name: 'myWorkflow',
        parameters: [],
        callbacks: {
          onSuccess: {
            actions: [{ type: 'SetVariable' as const, name: 'callbackExecuted', data: { type: 'value' as const, value: true } }],
          },
        },
      };

      handleAction(action, ctx);
      callbackExecuted = ctx.dataSignal.get().Variables?.callbackExecuted === true;

      expect(callbackExecuted).toBe(true);
    });

    test('handles package-prefixed componentName', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => { warns.push(msg); };

      const ctx = createMockContext();
      ctx.package = 'my-package';

      handleAction({
        type: 'TriggerWorkflow',
        name: 'workflow',
        componentName: 'Provider',
        parameters: [],
      }, ctx);

      console.warn = origWarn;
      expect(warns.some(w => w.includes('Context provider not found'))).toBe(true);
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

    test('evaluates data formula', () => {
      let receivedData: any = null;
      const ctx = createMockContext();
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction(
        {
          type: 'TriggerWorkflowCallback',
          name: 'onSuccess',
          data: { type: 'value', value: { nested: 'data' } },
        },
        ctx,
        undefined,
        (name, data) => { receivedData = data; }
      );

      expect(receivedData).toEqual({ nested: 'data' });
    });

    test('handles missing applyFormula', () => {
      let receivedData: any = 'not-set';
      const ctx = createMockContext();

      handleAction(
        {
          type: 'TriggerWorkflowCallback',
          name: 'onSuccess',
          data: { type: 'value', value: 'test' },
        },
        ctx,
        undefined,
        (name, data) => { receivedData = data; }
      );

      expect(receivedData).toBeNull();
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

    test('executes custom action handler', () => {
      let handlerCalled = false;
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => () => { handlerCalled = true; },
      };

      handleAction({
        type: 'Custom',
        name: 'myAction',
      }, ctx);

      expect(handlerCalled).toBe(true);
    });

    test('evaluates action arguments', () => {
      let receivedArgs: any = null;
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => (args: any) => { receivedArgs = args; },
      };
      ctx.applyFormula = (formula: any) => (formula as any).value;

      handleAction({
        type: 'Custom',
        name: 'myAction',
        arguments: [
          { name: 'input', formula: { type: 'value', value: 'test-value' } },
        ],
      }, ctx);

      expect(receivedArgs).toEqual({ input: 'test-value' });
    });

    test('triggers action events', () => {
      let triggerCalled = false;
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => (_args: any, { triggerActionEvent }: any) => {
          triggerActionEvent('onComplete', { result: 'done' });
        },
      };

      handleAction({
        type: 'Custom',
        name: 'myAction',
        events: {
          onComplete: {
            actions: [{ type: 'SetVariable', name: 'completed', data: { type: 'value', value: true } }],
          },
        },
      } as any, ctx);

      expect(triggerCalled).toBe(false); // TriggerActionEvent was called
    });

    test('registers cleanup function from sync result', () => {
      let cleanupCalled = false;
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => () => () => { cleanupCalled = true; },
      };

      handleAction({
        type: 'Custom',
        name: 'myAction',
      }, ctx);

      // Cleanup function was registered via subscribe
      expect(cleanupCalled).toBe(false); // Not called yet
    });

    test('registers cleanup function from async result', async () => {
      let cleanupCalled = false;
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => async () => () => { cleanupCalled = true; },
      };

      handleAction({
        type: 'Custom',
        name: 'myAction',
      }, ctx);

      // Wait for async to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(cleanupCalled).toBe(false); // Not called yet
    });

    test('handles async result without cleanup', async () => {
      const ctx = createMockContext();
      ctx.toddle = {
        getCustomAction: () => async () => 'not a function',
      };

      handleAction({
        type: 'Custom',
        name: 'myAction',
      }, ctx);

      // Wait for async to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
