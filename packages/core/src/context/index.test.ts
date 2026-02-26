import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  provide,
  consume,
  consumeSignal,
  hasContext,
  unprovide,
  clearProviders,
  createContext,
  ContextScope,
  ContextKeys,
  resolvePreviewContext,
  isContextProvider,
  getExposedFormulas,
  getExposedWorkflows,
  buildProviderKey
} from './index';
import { Signal } from '../signal/signal';

describe('Context Providers', () => {
  afterEach(() => {
    clearProviders();
  });

  describe('provide/consume', () => {
    test('provides and consumes a value', () => {
      provide('test-key', 'test-value');
      expect(consume<string>('test-key')).toBe('test-value');
    });

    test('consumes with default value', () => {
      expect(consume('missing-key', 'default')).toBe('default');
    });

    test('returns undefined for missing context', () => {
      expect(consume('missing-key')).toBeUndefined();
    });

    test('provides a signal', () => {
      const signal = new Signal(10);
      provide('signal-key', signal);

      expect(consume<number>('signal-key')).toBe(10);

      signal.set(20);
      expect(consume<number>('signal-key')).toBe(20);
    });

    test('overwrites existing provider', () => {
      provide('key', 'first');
      provide('key', 'second');
      expect(consume<string>('key')).toBe('second');
    });

    test('provides with symbol key', () => {
      const sym = Symbol('test');
      provide(sym, 'symbol-value');
      expect(consume<string>(sym)).toBe('symbol-value');
    });
  });

  describe('consumeSignal', () => {
    test('returns signal for signal provider', () => {
      const signal = new Signal(5);
      provide('sig-key', signal);

      const consumed = consumeSignal<number>('sig-key');
      expect(consumed).toBe(signal);
    });

    test('returns undefined for non-signal provider', () => {
      provide('value-key', 'plain-value');
      expect(consumeSignal('value-key')).toBeUndefined();
    });

    test('returns undefined for missing provider', () => {
      expect(consumeSignal('missing-key')).toBeUndefined();
    });
  });

  describe('hasContext', () => {
    test('returns true for provided context', () => {
      provide('key', 'value');
      expect(hasContext('key')).toBe(true);
    });

    test('returns false for missing context', () => {
      expect(hasContext('missing')).toBe(false);
    });

    test('works with symbol keys', () => {
      const sym = Symbol('test');
      provide(sym, 'value');
      expect(hasContext(sym)).toBe(true);
    });
  });

  describe('unprovide', () => {
    test('removes provider', () => {
      provide('key', 'value');
      expect(hasContext('key')).toBe(true);

      unprovide('key');
      expect(hasContext('key')).toBe(false);
    });

    test('returns true if removed', () => {
      provide('key', 'value');
      expect(unprovide('key')).toBe(true);
    });

    test('returns false if not found', () => {
      expect(unprovide('missing')).toBe(false);
    });

    test('works with symbol keys', () => {
      const sym = Symbol('test');
      provide(sym, 'value');
      expect(unprovide(sym)).toBe(true);
    });
  });

  describe('clearProviders', () => {
    test('removes all providers', () => {
      provide('a', 1);
      provide('b', 2);
      provide('c', 3);

      clearProviders();

      expect(hasContext('a')).toBe(false);
      expect(hasContext('b')).toBe(false);
      expect(hasContext('c')).toBe(false);
    });
  });

  describe('createContext', () => {
    test('creates typed context', () => {
      const UserContext = createContext<{ name: string }>('user');

      UserContext.provide({ name: 'John' });
      expect(UserContext.consume()?.name).toBe('John');
    });

    test('returns default value', () => {
      const ThemeContext = createContext<string>('theme');
      expect(ThemeContext.consume('light')).toBe('light');
    });

    test('has() works', () => {
      const CountContext = createContext<number>('count');
      expect(CountContext.has()).toBe(false);

      CountContext.provide(5);
      expect(CountContext.has()).toBe(true);
    });

    test('consumeSignal() returns signal', () => {
      const CountContext = createContext<number>('count');
      const signal = new Signal(42);
      CountContext.provide(signal);

      const consumed = CountContext.consumeSignal();
      expect(consumed).toBe(signal);
    });

    test('works with symbol key', () => {
      const sym = Symbol('myContext');
      const MyContext = createContext<string>(sym);

      MyContext.provide('test');
      expect(MyContext.consume()).toBe('test');
    });
  });

  describe('ContextScope', () => {
    test('provides and consumes in scope', () => {
      const scope = new ContextScope();
      scope.provide('scoped-key', 'scoped-value');

      expect(scope.consume<string>('scoped-key')).toBe('scoped-value');
    });

    test('falls back to parent scope', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);

      parent.provide('parent-key', 'parent-value');
      expect(child.consume<string>('parent-key')).toBe('parent-value');
    });

    test('falls back to global providers', () => {
      const scope = new ContextScope();
      provide('global-key', 'global-value');

      expect(scope.consume<string>('global-key')).toBe('global-value');
    });

    test('scope takes precedence over global', () => {
      provide('key', 'global');

      const scope = new ContextScope();
      scope.provide('key', 'scoped');

      expect(scope.consume<string>('key')).toBe('scoped');
      expect(consume<string>('key')).toBe('global');
    });

    test('child scope takes precedence over parent', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);

      parent.provide('key', 'parent');
      child.provide('key', 'child');

      expect(child.consume<string>('key')).toBe('child');
    });

    test('has() checks scope chain', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);

      parent.provide('key', 'value');
      expect(child.has('key')).toBe(true);
    });

    test('clear() removes scope providers', () => {
      const scope = new ContextScope();
      scope.provide('key', 'value');

      scope.clear();

      expect(scope.has('key')).toBe(false);
    });

    test('provides signal in scope', () => {
      const scope = new ContextScope();
      const signal = new Signal(10);
      scope.provide('signal-key', signal);

      expect(scope.consume<number>('signal-key')).toBe(10);

      signal.set(20);
      expect(scope.consume<number>('signal-key')).toBe(20);
    });

    test('consume with default value in scope', () => {
      const scope = new ContextScope();
      expect(scope.consume('missing', 'default')).toBe('default');
    });

    test('parent default value falls back to global', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);

      provide('global-key', 'global-value');
      expect(child.consume<string>('global-key')).toBe('global-value');
    });

    test('has() returns false when no provider in chain', () => {
      const scope = new ContextScope();
      expect(scope.has('missing')).toBe(false);
    });

    test('clear() does not affect parent scope', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);

      parent.provide('key', 'parent');
      child.provide('key2', 'child');

      child.clear();

      expect(child.has('key')).toBe(true);
      expect(child.has('key2')).toBe(false);
    });
  });

  describe('ContextKeys', () => {
    test('has standard keys defined', () => {
      expect(ContextKeys.Attributes).toBe('layr:attributes');
      expect(ContextKeys.Variables).toBe('layr:variables');
      expect(ContextKeys.Apis).toBe('layr:apis');
      expect(ContextKeys.ListItem).toBe('layr:listItem');
      expect(ContextKeys.Component).toBe('layr:component');
      expect(ContextKeys.Page).toBe('layr:page');
      expect(ContextKeys.URL).toBe('layr:url');
      expect(ContextKeys.Route).toBe('layr:route');
      expect(ContextKeys.Env).toBe('layr:env');
      expect(ContextKeys.Request).toBe('layr:request');
      expect(ContextKeys.Response).toBe('layr:response');
    });
  });

  describe('resolvePreviewContext', () => {
    test('returns empty object when no formulas exposed', () => {
      const config = {
        providerName: 'TestProvider',
        formulas: ['formula1']
      };

      const providerComponent = {
        formulas: {
          formula1: {
            exposeInContext: false,
            formula: { type: 'value', value: 'test' }
          }
        }
      };

      const result = resolvePreviewContext({
        config,
        providerComponent,
        applyFormula: () => 'result',
        buildTestContext: () => ({})
      });

      expect(result).toEqual({ TestProvider: {} });
    });

    test('evaluates exposed formulas', () => {
      const config = {
        providerName: 'TestProvider',
        formulas: ['formula1']
      };

      const providerComponent = {
        formulas: {
          formula1: {
            exposeInContext: true,
            formula: { type: 'value', value: 'test result' }
          }
        }
      };

      const result = resolvePreviewContext({
        config,
        providerComponent,
        applyFormula: () => 'evaluated result',
        buildTestContext: () => ({})
      });

      expect(result).toEqual({
        TestProvider: {
          formula1: 'evaluated result'
        }
      });
    });

    test('handles missing formula', () => {
      const config = {
        providerName: 'TestProvider',
        formulas: ['missingFormula']
      };

      const providerComponent = {
        formulas: {}
      };

      const result = resolvePreviewContext({
        config,
        providerComponent,
        applyFormula: () => 'result',
        buildTestContext: () => ({})
      });

      expect(result).toEqual({ TestProvider: {} });
    });

    test('handles formula evaluation error', () => {
      const config = {
        providerName: 'TestProvider',
        formulas: ['errorFormula']
      };

      const providerComponent = {
        formulas: {
          errorFormula: {
            exposeInContext: true,
            formula: { type: 'value', value: 'test' }
          }
        }
      };

      const result = resolvePreviewContext({
        config,
        providerComponent,
        applyFormula: () => { throw new Error('Test error'); },
        buildTestContext: () => ({})
      });

      expect(result).toEqual({
        TestProvider: {
          errorFormula: null
        }
      });
    });
  });

  describe('isContextProvider', () => {
    test('returns true for component with exposed formula', () => {
      const component = {
        formulas: {
          myFormula: {
            exposeInContext: true
          }
        }
      };

      expect(isContextProvider(component as any)).toBe(true);
    });

    test('returns true for component with exposed workflow', () => {
      const component = {
        workflows: {
          myWorkflow: {
            exposeInContext: true
          }
        }
      };

      expect(isContextProvider(component as any)).toBe(true);
    });

    test('returns false for component without exposed items', () => {
      const component = {
        formulas: {
          myFormula: {
            exposeInContext: false
          }
        },
        workflows: {
          myWorkflow: {
            exposeInContext: false
          }
        }
      };

      expect(isContextProvider(component as any)).toBe(false);
    });

    test('returns false for component without formulas or workflows', () => {
      const component = {};

      expect(isContextProvider(component as any)).toBe(false);
    });

    test('returns false for null component', () => {
      expect(isContextProvider(null as any)).toBe(false);
    });

    test('returns false for undefined component', () => {
      expect(isContextProvider(undefined as any)).toBe(false);
    });

    test('handles component with empty formulas', () => {
      const component = {
        formulas: {}
      };

      expect(isContextProvider(component as any)).toBe(false);
    });
  });

  describe('getExposedFormulas', () => {
    test('returns names of exposed formulas', () => {
      const component = {
        formulas: {
          formula1: { exposeInContext: true },
          formula2: { exposeInContext: false },
          formula3: { exposeInContext: true }
        }
      };

      const result = getExposedFormulas(component as any);
      expect(result).toContain('formula1');
      expect(result).toContain('formula3');
      expect(result).not.toContain('formula2');
    });

    test('returns empty array for component without formulas', () => {
      const component = {};

      expect(getExposedFormulas(component as any)).toEqual([]);
    });

    test('returns empty array for null component', () => {
      expect(getExposedFormulas(null as any)).toEqual([]);
    });

    test('returns empty array for undefined formulas', () => {
      const component = { formulas: undefined };

      expect(getExposedFormulas(component as any)).toEqual([]);
    });
  });

  describe('getExposedWorkflows', () => {
    test('returns names of exposed workflows', () => {
      const component = {
        workflows: {
          workflow1: { exposeInContext: true },
          workflow2: { exposeInContext: false },
          workflow3: { exposeInContext: true }
        }
      };

      const result = getExposedWorkflows(component as any);
      expect(result).toContain('workflow1');
      expect(result).toContain('workflow3');
      expect(result).not.toContain('workflow2');
    });

    test('returns empty array for component without workflows', () => {
      const component = {};

      expect(getExposedWorkflows(component as any)).toEqual([]);
    });

    test('returns empty array for null component', () => {
      expect(getExposedWorkflows(null as any)).toEqual([]);
    });
  });

  describe('buildProviderKey', () => {
    test('returns provider name when no package', () => {
      expect(buildProviderKey('MyProvider')).toBe('MyProvider');
    });

    test('returns namespaced key with package', () => {
      expect(buildProviderKey('MyProvider', '@myorg/mypackage')).toBe('@myorg/mypackage/MyProvider');
    });

    test('handles empty package name', () => {
      expect(buildProviderKey('MyProvider', '')).toBe('MyProvider');
    });

    test('handles undefined package name', () => {
      expect(buildProviderKey('MyProvider', undefined)).toBe('MyProvider');
    });
  });
});
