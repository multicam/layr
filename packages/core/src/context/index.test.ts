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
  ContextKeys
} from './index';
import { Signal } from '../signal/signal';

describe('Context Providers', () => {
  afterEach(() => {
    clearProviders();
  });

  describe('provide/consume', () => {
    test('provides and consumes a value', () => {
      provide('test-key', 'test-value');
      expect(consume('test-key')).toBe('test-value');
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
      
      expect(consume('signal-key')).toBe(10);
      
      signal.set(20);
      expect(consume('signal-key')).toBe(20);
    });

    test('overwrites existing provider', () => {
      provide('key', 'first');
      provide('key', 'second');
      expect(consume('key')).toBe('second');
    });
  });

  describe('consumeSignal', () => {
    test('returns signal for signal provider', () => {
      const signal = new Signal(5);
      provide('sig-key', signal);
      
      const consumed = consumeSignal('sig-key');
      expect(consumed).toBe(signal);
    });

    test('returns undefined for non-signal provider', () => {
      provide('value-key', 'plain-value');
      expect(consumeSignal('value-key')).toBeUndefined();
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
  });

  describe('ContextScope', () => {
    test('provides and consumes in scope', () => {
      const scope = new ContextScope();
      scope.provide('scoped-key', 'scoped-value');
      
      expect(scope.consume('scoped-key')).toBe('scoped-value');
    });

    test('falls back to parent scope', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);
      
      parent.provide('parent-key', 'parent-value');
      expect(child.consume('parent-key')).toBe('parent-value');
    });

    test('falls back to global providers', () => {
      const scope = new ContextScope();
      provide('global-key', 'global-value');
      
      expect(scope.consume('global-key')).toBe('global-value');
    });

    test('scope takes precedence over global', () => {
      provide('key', 'global');
      
      const scope = new ContextScope();
      scope.provide('key', 'scoped');
      
      expect(scope.consume('key')).toBe('scoped');
      expect(consume('key')).toBe('global');
    });

    test('child scope takes precedence over parent', () => {
      const parent = new ContextScope();
      const child = new ContextScope(parent);
      
      parent.provide('key', 'parent');
      child.provide('key', 'child');
      
      expect(child.consume('key')).toBe('child');
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
    });
  });
});
