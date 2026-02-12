import { describe, test, expect, beforeEach } from 'bun:test';
import { applyFormula, toBoolean } from './evaluate';
import type { FormulaContext } from './context';

// Create a minimal test context
function createTestContext(data: any = {}): FormulaContext {
  return {
    data: {
      Attributes: {},
      Variables: {},
      Apis: {},
      ...data,
    },
    toddle: {
      getFormula: () => undefined,
      getCustomFormula: () => undefined,
      errors: [],
    },
  };
}

describe('applyFormula', () => {
  describe('value operations', () => {
    test('returns string value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: 'hello' }, ctx);
      expect(result).toBe('hello');
    });

    test('returns number value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: 42 }, ctx);
      expect(result).toBe(42);
    });

    test('returns boolean value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: true }, ctx);
      expect(result).toBe(true);
    });

    test('returns null value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: null }, ctx);
      expect(result).toBeNull();
    });

    test('returns object value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: { a: 1 } }, ctx);
      expect(result).toEqual({ a: 1 });
    });

    test('returns undefined value', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'value', value: undefined }, ctx);
      expect(result).toBeUndefined();
    });
  });

  describe('path operations', () => {
    test('resolves simple path', () => {
      const ctx = createTestContext({ Variables: { name: 'John' } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'name'] }, ctx);
      expect(result).toBe('John');
    });

    test('resolves nested path', () => {
      const ctx = createTestContext({ Variables: { user: { name: 'John', age: 30 } } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'user', 'name'] }, ctx);
      expect(result).toBe('John');
    });

    test('returns null for missing path segment', () => {
      const ctx = createTestContext({ Variables: {} });
      const result = applyFormula({ type: 'path', path: ['Variables', 'missing'] }, ctx);
      expect(result).toBeNull();
    });

    test('returns null for null intermediate value', () => {
      const ctx = createTestContext({ Variables: { user: null } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'user', 'name'] }, ctx);
      expect(result).toBeNull();
    });

    test('resolves array index', () => {
      const ctx = createTestContext({ Variables: { items: ['a', 'b', 'c'] } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'items', '1'] }, ctx);
      expect(result).toBe('b');
    });

    test('returns null for out of bounds array index', () => {
      const ctx = createTestContext({ Variables: { items: ['a'] } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'items', '5'] }, ctx);
      expect(result).toBeNull();
    });

    test('resolves Attributes', () => {
      const ctx = createTestContext({ Attributes: { count: 5 } });
      const result = applyFormula({ type: 'path', path: ['Attributes', 'count'] }, ctx);
      expect(result).toBe(5);
    });

    test('returns null for path on primitive', () => {
      const ctx = createTestContext({ Variables: { num: 42 } });
      const result = applyFormula({ type: 'path', path: ['Variables', 'num', 'property'] }, ctx);
      expect(result).toBeNull();
    });
  });

  describe('object operations', () => {
    test('creates empty object', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'object', arguments: [] }, ctx);
      expect(result).toEqual({});
    });

    test('creates object with properties', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'object',
        arguments: [
          { name: 'a', formula: { type: 'value', value: 1 } },
          { name: 'b', formula: { type: 'value', value: 2 } },
        ],
      }, ctx);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('ignores arguments without name', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'object',
        arguments: [
          { name: 'a', formula: { type: 'value', value: 1 } },
          { formula: { type: 'value', value: 999 } },
        ],
      }, ctx);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('record operations (alias for object)', () => {
    test('creates object via record type', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'record',
        arguments: [{ name: 'x', formula: { type: 'value', value: 'test' } }],
      }, ctx);
      expect(result).toEqual({ x: 'test' });
    });
  });

  describe('array operations', () => {
    test('creates empty array', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'array', arguments: [] }, ctx);
      expect(result).toEqual([]);
    });

    test('creates array with elements', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'array',
        arguments: [
          { formula: { type: 'value', value: 1 } },
          { formula: { type: 'value', value: 2 } },
          { formula: { type: 'value', value: 3 } },
        ],
      }, ctx);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('switch operations', () => {
    test('returns first matching case', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'switch',
        cases: [
          { condition: { type: 'value', value: false }, formula: { type: 'value', value: 'no' } },
          { condition: { type: 'value', value: true }, formula: { type: 'value', value: 'yes' } },
        ],
        default: { type: 'value', value: 'default' },
      }, ctx);
      expect(result).toBe('yes');
    });

    test('returns default when no case matches', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'switch',
        cases: [
          { condition: { type: 'value', value: false }, formula: { type: 'value', value: 'no' } },
        ],
        default: { type: 'value', value: 'default' },
      }, ctx);
      expect(result).toBe('default');
    });

    test('evaluates cases in order', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'switch',
        cases: [
          { condition: { type: 'value', value: false }, formula: { type: 'value', value: 1 } },
          { condition: { type: 'value', value: false }, formula: { type: 'value', value: 2 } },
          { condition: { type: 'value', value: true }, formula: { type: 'value', value: 3 } },
        ],
        default: { type: 'value', value: 0 },
      }, ctx);
      expect(result).toBe(3);
    });
  });

  describe('or operations', () => {
    test('returns true if any argument is truthy', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'or',
        arguments: [
          { formula: { type: 'value', value: false } },
          { formula: { type: 'value', value: true } },
        ],
      }, ctx);
      expect(result).toBe(true);
    });

    test('returns false if all arguments are falsy', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'or',
        arguments: [
          { formula: { type: 'value', value: false } },
          { formula: { type: 'value', value: null } },
        ],
      }, ctx);
      expect(result).toBe(false);
    });

    test('handles empty arguments', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'or', arguments: [] }, ctx);
      expect(result).toBe(false);
    });
  });

  describe('and operations', () => {
    test('returns true if all arguments are truthy', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'and',
        arguments: [
          { formula: { type: 'value', value: true } },
          { formula: { type: 'value', value: 1 } },
        ],
      }, ctx);
      expect(result).toBe(true);
    });

    test('returns false if any argument is falsy', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'and',
        arguments: [
          { formula: { type: 'value', value: true } },
          { formula: { type: 'value', value: false } },
        ],
      }, ctx);
      expect(result).toBe(false);
    });

    test('handles empty arguments', () => {
      const ctx = createTestContext();
      const result = applyFormula({ type: 'and', arguments: [] }, ctx);
      expect(result).toBe(true);
    });
  });

  describe('function operations with handlers', () => {
    test('calls V2 handler with named args', () => {
      const handler = (args: any) => args.a + args.b;
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = (name: string) => name === 'add' ? handler : undefined;

      const result = applyFormula({
        type: 'function',
        name: 'add',
        arguments: [
          { name: 'a', formula: { type: 'value', value: 2 } },
          { name: 'b', formula: { type: 'value', value: 3 } },
        ],
      }, ctx);
      expect(result).toBe(5);
    });

    test('calls ToddleFormula definition', () => {
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = (name: string) => {
        if (name === 'double') return { formula: { type: 'path', path: ['Args', 'x'] } };
        return undefined;
      };

      const result = applyFormula({
        type: 'function',
        name: 'double',
        arguments: [{ name: 'x', formula: { type: 'value', value: 10 } }],
      }, ctx);
      expect(result).toBe(10);
    });

    test('calls legacy handler with positional args', () => {
      const ctx = createTestContext();
      ctx.toddle.getFormula = (name: string) => {
        if (name === '@toddle/add') return (args: any[]) => args[0] + args[1];
        return undefined;
      };

      const result = applyFormula({
        type: 'function',
        name: '@toddle/add',
        arguments: [
          { formula: { type: 'value', value: 5 } },
          { formula: { type: 'value', value: 7 } },
        ],
      }, ctx);
      expect(result).toBe(12);
    });

    test('handles higher-order function (isFunction: true)', () => {
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = (name: string) => {
        if (name === 'map') {
          return (args: any) => args.items.map((item: any) => args.fx({ item }));
        }
        return undefined;
      };

      const result = applyFormula({
        type: 'function',
        name: 'map',
        arguments: [
          { name: 'items', formula: { type: 'value', value: [1, 2, 3] } },
          { name: 'fx', formula: { type: 'path', path: ['Args', 'item'] }, isFunction: true },
        ],
      }, ctx);
      expect(result).toEqual([1, 2, 3]);
    });

    test('uses package namespace from formula', () => {
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = (name: string, pkg?: string) => {
        if (name === 'test' && pkg === '@mypackage') return () => 'from package';
        return undefined;
      };

      const result = applyFormula({
        type: 'function',
        name: 'test',
        package: '@mypackage',
        arguments: [],
      }, ctx);
      expect(result).toBe('from package');
    });

    test('uses package namespace from context', () => {
      const ctx = createTestContext();
      ctx.package = '@ctxpackage';
      ctx.toddle.getCustomFormula = (name: string, pkg?: string) => {
        if (pkg === '@ctxpackage') return () => 'from ctx package';
        return undefined;
      };

      const result = applyFormula({
        type: 'function',
        name: 'test',
        arguments: [],
      }, ctx);
      expect(result).toBe('from ctx package');
    });

    test('returns null when handler is not a function', () => {
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = () => ({ notAFunction: true });

      const result = applyFormula({
        type: 'function',
        name: 'bad',
        arguments: [],
      }, ctx);
      expect(result).toBeNull();
    });

    test('returns null when formula not found', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'function',
        name: '@toddle/unknown',
        arguments: [],
      }, ctx);
      expect(result).toBeNull();
    });
  });

  describe('apply operations', () => {
    test('returns null when component is undefined', () => {
      const ctx = createTestContext();
      const result = applyFormula({
        type: 'apply',
        name: 'myFormula',
        arguments: [],
      }, ctx);
      expect(result).toBeNull();
    });

    test('returns null when formula not in component', () => {
      const ctx = createTestContext();
      ctx.component = {
        formulas: {
          otherFormula: { formula: { type: 'value', value: 1 } },
        },
      };

      const result = applyFormula({
        type: 'apply',
        name: 'missing',
        arguments: [],
      }, ctx);
      expect(result).toBeNull();
    });

    test('evaluates component formula with Args', () => {
      const ctx = createTestContext();
      ctx.component = {
        formulas: {
          greet: { formula: { type: 'path', path: ['Args', 'name'] } },
        },
      };

      const result = applyFormula({
        type: 'apply',
        name: 'greet',
        arguments: [{ name: 'name', formula: { type: 'value', value: 'World' } }],
      }, ctx);
      expect(result).toBe('World');
    });

    test('memoizes result when memoize: true', () => {
      const ctx = createTestContext();
      ctx.component = {
        formulas: {
          computed: {
            memoize: true,
            formula: { type: 'value', value: 42 },
          },
        },
      };
      ctx.formulaCache = {
        computed: {
          get: () => undefined,
          set: () => {},
        },
      };

      const result = applyFormula({
        type: 'apply',
        name: 'computed',
        arguments: [],
      }, ctx);
      expect(result).toBe(42);
    });

    test('uses cached result when available', () => {
      const ctx = createTestContext();
      ctx.component = {
        formulas: {
          cached: {
            memoize: true,
            formula: { type: 'value', value: 0 },
          },
        },
      };
      
      let setCalled = false;
      ctx.formulaCache = {
        cached: {
          get: () => 99,
          set: () => { setCalled = true; },
        },
      };

      const result = applyFormula({
        type: 'apply',
        name: 'cached',
        arguments: [],
      }, ctx);
      expect(result).toBe(99);
      expect(setCalled).toBe(false);
    });
  });

  describe('error handling', () => {
    test('catches errors in formula evaluation', () => {
      const ctx = createTestContext();
      ctx.toddle.getCustomFormula = () => {
        throw new Error('Handler error');
      };

      const result = applyFormula({
        type: 'function',
        name: 'error',
        arguments: [{ name: 'x', formula: { type: 'value', value: 1 } }],
      }, ctx);

      expect(result).toBeNull();
      expect(ctx.toddle.errors.length).toBeGreaterThan(0);
    });

    test('logs error when env.logErrors is true', () => {
      const ctx = createTestContext();
      ctx.env = { logErrors: true };
      
      let errorLogged = false;
      const origError = console.error;
      console.error = () => { errorLogged = true; };
      
      ctx.toddle.getCustomFormula = () => {
        throw new Error('Intentional error');
      };
      
      applyFormula({
        type: 'function',
        name: 'thrower',
        arguments: [],
      }, ctx);
      
      console.error = origError;
      expect(errorLogged).toBe(true);
    });
  });
});

describe('toBoolean', () => {
  test('null is falsy', () => expect(toBoolean(null)).toBe(false));
  test('undefined is falsy', () => expect(toBoolean(undefined)).toBe(false));
  test('false is falsy', () => expect(toBoolean(false)).toBe(false));
  test('0 is falsy', () => expect(toBoolean(0)).toBe(false));
  test('empty string is falsy', () => expect(toBoolean('')).toBe(false));
  test('empty array is falsy', () => expect(toBoolean([])).toBe(false));
  test('empty object is falsy', () => expect(toBoolean({})).toBe(false));
  test('true is truthy', () => expect(toBoolean(true)).toBe(true));
  test('1 is truthy', () => expect(toBoolean(1)).toBe(true));
  test('non-empty string is truthy', () => expect(toBoolean('hello')).toBe(true));
  test('non-empty array is truthy', () => expect(toBoolean([1])).toBe(true));
  test('non-empty object is truthy', () => expect(toBoolean({ a: 1 })).toBe(true));
});

