import { describe, test, expect, beforeAll } from 'bun:test';
import './index'; // Import to register formulas
import { formulas, getFormula } from './index';
import type { FormulaContext } from '@layr/core';

// Create a minimal formula context
const ctx = {
  data: { Attributes: {}, Variables: {}, Apis: {} },
  toddle: { getCustomFormula: () => undefined, errors: [] },
} as FormulaContext;

describe('formula registration', () => {
  test('registers formulas on import', () => {
    expect(formulas.size).toBeGreaterThan(50);
  });

  test('getFormula returns registered formula', () => {
    expect(getFormula('@toddle/map')).toBeDefined();
    expect(getFormula('@toddle/nonexistent')).toBeUndefined();
  });
});

describe('array formulas', () => {
  test('@toddle/map transforms elements', () => {
    const fn = getFormula('@toddle/map')!;
    const result = fn({
      items: [1, 2, 3],
      fx: ({ item }: any) => item * 2,
    }, ctx);
    expect(result).toEqual([2, 4, 6]);
  });

  test('@toddle/filter filters elements', () => {
    const fn = getFormula('@toddle/filter')!;
    const result = fn({
      items: [1, 2, 3, 4, 5],
      condition: ({ item }: any) => item > 2,
    }, ctx);
    expect(result).toEqual([3, 4, 5]);
  });

  test('@toddle/reduce reduces to single value', () => {
    const fn = getFormula('@toddle/reduce')!;
    const result = fn({
      items: [1, 2, 3],
      initial: 0,
      reducer: ({ acc, item }: any) => acc + item,
    }, ctx);
    expect(result).toBe(6);
  });

  test('@toddle/find finds first match', () => {
    const fn = getFormula('@toddle/find')!;
    const result = fn({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      condition: ({ item }: any) => item.id === 2,
    }, ctx);
    expect(result).toEqual({ id: 2 });
  });

  test('@toddle/find returns null when not found', () => {
    const fn = getFormula('@toddle/find')!;
    const result = fn({
      items: [1, 2, 3],
      condition: ({ item }: any) => item > 10,
    }, ctx);
    expect(result).toBeNull();
  });

  test('@toddle/length returns array length', () => {
    const fn = getFormula('@toddle/length')!;
    expect(fn({ items: [1, 2, 3] }, ctx)).toBe(3);
    expect(fn({ items: [] }, ctx)).toBe(0);
    expect(fn({ items: null }, ctx)).toBeNull();
  });

  test('@toddle/join joins elements', () => {
    const fn = getFormula('@toddle/join')!;
    expect(fn({ items: ['a', 'b', 'c'], separator: '-' }, ctx)).toBe('a-b-c');
    expect(fn({ items: ['a', 'b'], separator: '' }, ctx)).toBe('ab');
  });

  test('@toddle/includes checks membership', () => {
    const fn = getFormula('@toddle/includes')!;
    expect(fn({ items: [1, 2, 3], value: 2 }, ctx)).toBe(true);
    expect(fn({ items: [1, 2, 3], value: 5 }, ctx)).toBe(false);
  });

  test('@toddle/index-of finds position', () => {
    const fn = getFormula('@toddle/index-of')!;
    expect(fn({ items: ['a', 'b', 'c'], value: 'b' }, ctx)).toBe(1);
    expect(fn({ items: ['a', 'b', 'c'], value: 'z' }, ctx)).toBe(-1);
  });

  test('@toddle/slice extracts portion', () => {
    const fn = getFormula('@toddle/slice')!;
    expect(fn({ items: [1, 2, 3, 4, 5], start: 1, end: 4 }, ctx)).toEqual([2, 3, 4]);
    expect(fn({ items: [1, 2, 3], start: 0 }, ctx)).toEqual([1, 2, 3]);
  });

  test('@toddle/concat merges arrays', () => {
    const fn = getFormula('@toddle/concat')!;
    expect(fn({ items: [1, 2], others: [3, 4] }, ctx)).toEqual([1, 2, 3, 4]);
    expect(fn({ items: [1], others: null }, ctx)).toEqual([1]);
  });

  test('@toddle/reverse reverses array', () => {
    const fn = getFormula('@toddle/reverse')!;
    expect(fn({ items: [1, 2, 3] }, ctx)).toEqual([3, 2, 1]);
  });

  test('@toddle/sort sorts array', () => {
    const fn = getFormula('@toddle/sort')!;
    expect(fn({ items: [3, 1, 2], ascending: true }, ctx)).toEqual([1, 2, 3]);
    expect(fn({ items: [1, 2, 3], ascending: false }, ctx)).toEqual([3, 2, 1]);
  });

  test('@toddle/flat flattens nested array', () => {
    const fn = getFormula('@toddle/flat')!;
    expect(fn({ items: [[1, 2], [3, 4]], depth: 1 }, ctx)).toEqual([1, 2, 3, 4]);
  });

  test('@toddle/every checks all match', () => {
    const fn = getFormula('@toddle/every')!;
    expect(fn({ items: [2, 4, 6], condition: ({ item }: any) => item % 2 === 0 }, ctx)).toBe(true);
    expect(fn({ items: [2, 3, 4], condition: ({ item }: any) => item % 2 === 0 }, ctx)).toBe(false);
  });

  test('@toddle/some checks any match', () => {
    const fn = getFormula('@toddle/some')!;
    expect(fn({ items: [1, 3, 5], condition: ({ item }: any) => item === 3 }, ctx)).toBe(true);
    expect(fn({ items: [1, 3, 5], condition: ({ item }: any) => item % 2 === 0 }, ctx)).toBe(false);
  });
});

describe('string formulas', () => {
  test('@toddle/concatenate joins strings', () => {
    const fn = getFormula('@toddle/concatenate')!;
    expect(fn({ strings: ['hello', ' ', 'world'] }, ctx)).toBe('hello world');
    expect(fn({ strings: [] }, ctx)).toBe('');
  });

  test('@toddle/split splits by delimiter', () => {
    const fn = getFormula('@toddle/split')!;
    expect(fn({ text: 'a-b-c', delimiter: '-' }, ctx)).toEqual(['a', 'b', 'c']);
  });

  test('@toddle/uppercase converts to uppercase', () => {
    const fn = getFormula('@toddle/uppercase')!;
    expect(fn({ text: 'hello' }, ctx)).toBe('HELLO');
  });

  test('@toddle/lowercase converts to lowercase', () => {
    const fn = getFormula('@toddle/lowercase')!;
    expect(fn({ text: 'HELLO' }, ctx)).toBe('hello');
  });

  test('@toddle/trim removes whitespace', () => {
    const fn = getFormula('@toddle/trim')!;
    expect(fn({ text: '  hello  ' }, ctx)).toBe('hello');
  });

  test('@toddle/substring extracts portion', () => {
    const fn = getFormula('@toddle/substring')!;
    expect(fn({ text: 'hello', start: 1, end: 4 }, ctx)).toBe('ell');
  });

  test('@toddle/replace replaces first occurrence', () => {
    const fn = getFormula('@toddle/replace')!;
    expect(fn({ text: 'aaa', search: 'a', replace: 'b' }, ctx)).toBe('baa');
  });

  test('@toddle/replace-all replaces all occurrences', () => {
    const fn = getFormula('@toddle/replace-all')!;
    expect(fn({ text: 'aaa', search: 'a', replace: 'b' }, ctx)).toBe('bbb');
  });

  test('@toddle/starts-with checks prefix', () => {
    const fn = getFormula('@toddle/starts-with')!;
    expect(fn({ text: 'hello world', prefix: 'hello' }, ctx)).toBe(true);
    expect(fn({ text: 'hello world', prefix: 'world' }, ctx)).toBe(false);
  });

  test('@toddle/ends-with checks suffix', () => {
    const fn = getFormula('@toddle/ends-with')!;
    expect(fn({ text: 'hello world', suffix: 'world' }, ctx)).toBe(true);
    expect(fn({ text: 'hello world', suffix: 'hello' }, ctx)).toBe(false);
  });

  test('@toddle/string-includes checks contains', () => {
    const fn = getFormula('@toddle/string-includes')!;
    expect(fn({ text: 'hello', search: 'ell' }, ctx)).toBe(true);
    expect(fn({ text: 'hello', search: 'xyz' }, ctx)).toBe(false);
  });

  test('@toddle/string-length returns length', () => {
    const fn = getFormula('@toddle/string-length')!;
    expect(fn({ text: 'hello' }, ctx)).toBe(5);
    expect(fn({ text: '' }, ctx)).toBe(0);
  });

  test('@toddle/pad-start pads start', () => {
    const fn = getFormula('@toddle/pad-start')!;
    expect(fn({ text: '5', length: 3, pad: '0' }, ctx)).toBe('005');
  });

  test('@toddle/pad-end pads end', () => {
    const fn = getFormula('@toddle/pad-end')!;
    expect(fn({ text: '5', length: 3, pad: '0' }, ctx)).toBe('500');
  });

  test('@toddle/repeat repeats string', () => {
    const fn = getFormula('@toddle/repeat')!;
    expect(fn({ text: 'ab', count: 3 }, ctx)).toBe('ababab');
    expect(fn({ text: 'x', count: 0 }, ctx)).toBe('');
  });
});

describe('number formulas', () => {
  test('@toddle/add adds numbers', () => {
    const fn = getFormula('@toddle/add')!;
    expect(fn({ a: 2, b: 3 }, ctx)).toBe(5);
  });

  test('@toddle/subtract subtracts numbers', () => {
    const fn = getFormula('@toddle/subtract')!;
    expect(fn({ a: 5, b: 3 }, ctx)).toBe(2);
  });

  test('@toddle/multiply multiplies numbers', () => {
    const fn = getFormula('@toddle/multiply')!;
    expect(fn({ a: 4, b: 3 }, ctx)).toBe(12);
  });

  test('@toddle/divide divides numbers', () => {
    const fn = getFormula('@toddle/divide')!;
    expect(fn({ a: 10, b: 2 }, ctx)).toBe(5);
    expect(fn({ a: 10, b: 0 }, ctx)).toBeNull();
  });

  test('@toddle/mod returns modulo', () => {
    const fn = getFormula('@toddle/mod')!;
    expect(fn({ a: 7, b: 3 }, ctx)).toBe(1);
    expect(fn({ a: 7, b: 0 }, ctx)).toBeNull();
  });

  test('@toddle/power raises to power', () => {
    const fn = getFormula('@toddle/power')!;
    expect(fn({ base: 2, exponent: 3 }, ctx)).toBe(8);
  });

  test('@toddle/sqrt returns square root', () => {
    const fn = getFormula('@toddle/sqrt')!;
    expect(fn({ value: 9 }, ctx)).toBe(3);
    expect(fn({ value: -1 }, ctx)).toBeNull();
  });

  test('@toddle/abs returns absolute value', () => {
    const fn = getFormula('@toddle/abs')!;
    expect(fn({ value: -5 }, ctx)).toBe(5);
    expect(fn({ value: 5 }, ctx)).toBe(5);
  });

  test('@toddle/round rounds number', () => {
    const fn = getFormula('@toddle/round')!;
    expect(fn({ value: 3.7 }, ctx)).toBe(4);
    expect(fn({ value: 3.14159, decimals: 2 }, ctx)).toBe(3.14);
  });

  test('@toddle/floor rounds down', () => {
    const fn = getFormula('@toddle/floor')!;
    expect(fn({ value: 3.9 }, ctx)).toBe(3);
  });

  test('@toddle/ceil rounds up', () => {
    const fn = getFormula('@toddle/ceil')!;
    expect(fn({ value: 3.1 }, ctx)).toBe(4);
  });

  test('@toddle/min returns minimum', () => {
    const fn = getFormula('@toddle/min')!;
    expect(fn({ values: [3, 1, 4, 1, 5] }, ctx)).toBe(1);
    expect(fn({ values: [] }, ctx)).toBeNull();
  });

  test('@toddle/max returns maximum', () => {
    const fn = getFormula('@toddle/max')!;
    expect(fn({ values: [3, 1, 4, 1, 5] }, ctx)).toBe(5);
    expect(fn({ values: [] }, ctx)).toBeNull();
  });

  test('@toddle/clamp clamps value', () => {
    const fn = getFormula('@toddle/clamp')!;
    expect(fn({ value: 5, min: 0, max: 10 }, ctx)).toBe(5);
    expect(fn({ value: -5, min: 0, max: 10 }, ctx)).toBe(0);
    expect(fn({ value: 15, min: 0, max: 10 }, ctx)).toBe(10);
  });
});

describe('object formulas', () => {
  test('@toddle/keys returns keys', () => {
    const fn = getFormula('@toddle/keys')!;
    expect(fn({ object: { a: 1, b: 2 } }, ctx)).toEqual(['a', 'b']);
    expect(fn({ object: null }, ctx)).toBeNull();
  });

  test('@toddle/values returns values', () => {
    const fn = getFormula('@toddle/values')!;
    expect(fn({ object: { a: 1, b: 2 } }, ctx)).toEqual([1, 2]);
  });

  test('@toddle/entries returns entries', () => {
    const fn = getFormula('@toddle/entries')!;
    expect(fn({ object: { a: 1 } }, ctx)).toEqual([['a', 1]]);
  });

  test('@toddle/from-entries creates object', () => {
    const fn = getFormula('@toddle/from-entries')!;
    expect(fn({ entries: [['a', 1], ['b', 2]] }, ctx)).toEqual({ a: 1, b: 2 });
  });

  test('@toddle/merge merges objects', () => {
    const fn = getFormula('@toddle/merge')!;
    expect(fn({ objects: [{ a: 1 }, { b: 2 }] }, ctx)).toEqual({ a: 1, b: 2 });
  });

  test('@toddle/pick picks keys', () => {
    const fn = getFormula('@toddle/pick')!;
    expect(fn({ object: { a: 1, b: 2, c: 3 }, keys: ['a', 'c'] }, ctx)).toEqual({ a: 1, c: 3 });
  });

  test('@toddle/omit omits keys', () => {
    const fn = getFormula('@toddle/omit')!;
    expect(fn({ object: { a: 1, b: 2, c: 3 }, keys: ['b'] }, ctx)).toEqual({ a: 1, c: 3 });
  });

  test('@toddle/has-key checks key existence', () => {
    const fn = getFormula('@toddle/has-key')!;
    expect(fn({ object: { a: 1 }, key: 'a' }, ctx)).toBe(true);
    expect(fn({ object: { a: 1 }, key: 'b' }, ctx)).toBe(false);
  });

  test('@toddle/get gets value', () => {
    const fn = getFormula('@toddle/get')!;
    expect(fn({ object: { a: 1 }, key: 'a' }, ctx)).toBe(1);
    expect(fn({ object: { a: 1 }, key: 'b', fallback: 'default' }, ctx)).toBe('default');
  });
});

describe('logic formulas', () => {
  test('@toddle/equals compares equality', () => {
    const fn = getFormula('@toddle/equals')!;
    expect(fn({ a: 1, b: 1 }, ctx)).toBe(true);
    expect(fn({ a: 1, b: 2 }, ctx)).toBe(false);
    expect(fn({ a: 'x', b: 'x' }, ctx)).toBe(true);
    // Deep equality for objects and arrays
    expect(fn({ a: { x: 1 }, b: { x: 1 } }, ctx)).toBe(true);
    expect(fn({ a: { x: 1 }, b: { x: 2 } }, ctx)).toBe(false);
    expect(fn({ a: [1, 2], b: [1, 2] }, ctx)).toBe(true);
    expect(fn({ a: [1, 2], b: [2, 1] }, ctx)).toBe(false);
  });

  test('@toddle/not-equals compares inequality', () => {
    const fn = getFormula('@toddle/not-equals')!;
    expect(fn({ a: 1, b: 2 }, ctx)).toBe(true);
    expect(fn({ a: 1, b: 1 }, ctx)).toBe(false);
    // Deep inequality for objects
    expect(fn({ a: { x: 1 }, b: { x: 1 } }, ctx)).toBe(false);
    expect(fn({ a: { x: 1 }, b: { x: 2 } }, ctx)).toBe(true);
  });

  test('@toddle/not negates value', () => {
    const fn = getFormula('@toddle/not')!;
    expect(fn({ value: true }, ctx)).toBe(false);
    expect(fn({ value: false }, ctx)).toBe(true);
  });

  test('@toddle/if returns then/else', () => {
    const fn = getFormula('@toddle/if')!;
    expect(fn({ condition: true, then: 'yes', else: 'no' }, ctx)).toBe('yes');
    expect(fn({ condition: false, then: 'yes', else: 'no' }, ctx)).toBe('no');
  });

  test('@toddle/switch matches cases', () => {
    const fn = getFormula('@toddle/switch')!;
    expect(fn({ value: 'b', cases: { a: 1, b: 2 }, default: 0 }, ctx)).toBe(2);
    expect(fn({ value: 'z', cases: { a: 1, b: 2 }, default: 0 }, ctx)).toBe(0);
  });

  test('@toddle/is-null checks null/undefined', () => {
    const fn = getFormula('@toddle/is-null')!;
    expect(fn({ value: null }, ctx)).toBe(true);
    expect(fn({ value: undefined }, ctx)).toBe(true);
    expect(fn({ value: 0 }, ctx)).toBe(false);
  });

  test('@toddle/is-not-null checks not null', () => {
    const fn = getFormula('@toddle/is-not-null')!;
    expect(fn({ value: null }, ctx)).toBe(false);
    expect(fn({ value: 0 }, ctx)).toBe(true);
  });

  test('@toddle/is-empty checks emptiness', () => {
    const fn = getFormula('@toddle/is-empty')!;
    expect(fn({ value: null }, ctx)).toBe(true);
    expect(fn({ value: '' }, ctx)).toBe(true);
    expect(fn({ value: [] }, ctx)).toBe(true);
    expect(fn({ value: {} }, ctx)).toBe(true);
    expect(fn({ value: [1] }, ctx)).toBe(false);
    expect(fn({ value: 'x' }, ctx)).toBe(false);
  });
});

describe('comparison formulas', () => {
  test('@toddle/greater-than compares', () => {
    const fn = getFormula('@toddle/greater-than')!;
    expect(fn({ a: 5, b: 3 }, ctx)).toBe(true);
    expect(fn({ a: 3, b: 5 }, ctx)).toBe(false);
  });

  test('@toddle/greater-than-or-equal compares', () => {
    const fn = getFormula('@toddle/greater-than-or-equal')!;
    expect(fn({ a: 5, b: 5 }, ctx)).toBe(true);
    expect(fn({ a: 4, b: 5 }, ctx)).toBe(false);
  });

  test('@toddle/less-than compares', () => {
    const fn = getFormula('@toddle/less-than')!;
    expect(fn({ a: 3, b: 5 }, ctx)).toBe(true);
    expect(fn({ a: 5, b: 3 }, ctx)).toBe(false);
  });

  test('@toddle/less-than-or-equal compares', () => {
    const fn = getFormula('@toddle/less-than-or-equal')!;
    expect(fn({ a: 5, b: 5 }, ctx)).toBe(true);
    expect(fn({ a: 6, b: 5 }, ctx)).toBe(false);
  });

  test('@toddle/between checks range', () => {
    const fn = getFormula('@toddle/between')!;
    expect(fn({ value: 5, min: 1, max: 10 }, ctx)).toBe(true);
    expect(fn({ value: 0, min: 1, max: 10 }, ctx)).toBe(false);
    expect(fn({ value: 11, min: 1, max: 10 }, ctx)).toBe(false);
  });
});

describe('utility formulas', () => {
  test('@toddle/to-string converts to string', () => {
    const fn = getFormula('@toddle/to-string')!;
    expect(fn({ value: 123 }, ctx)).toBe('123');
    expect(fn({ value: null }, ctx)).toBe('');
  });

  test('@toddle/to-number converts to number', () => {
    const fn = getFormula('@toddle/to-number')!;
    expect(fn({ value: '123' }, ctx)).toBe(123);
    expect(fn({ value: 'abc' }, ctx)).toBeNull();
    expect(fn({ value: null }, ctx)).toBeNull();
  });

  test('@toddle/to-boolean converts to boolean', () => {
    const fn = getFormula('@toddle/to-boolean')!;
    expect(fn({ value: 1 }, ctx)).toBe(true);
    expect(fn({ value: 0 }, ctx)).toBe(false);
    expect(fn({ value: 'x' }, ctx)).toBe(true);
    expect(fn({ value: '' }, ctx)).toBe(false);
    expect(fn({ value: null }, ctx)).toBe(false);
  });

  test('@toddle/to-array converts to array', () => {
    const fn = getFormula('@toddle/to-array')!;
    expect(fn({ value: [1, 2] }, ctx)).toEqual([1, 2]);
    expect(fn({ value: 1 }, ctx)).toEqual([1]);
    expect(fn({ value: null }, ctx)).toEqual([]);
  });

  test('@toddle/type-of returns type', () => {
    const fn = getFormula('@toddle/type-of')!;
    expect(fn({ value: null }, ctx)).toBe('null');
    expect(fn({ value: [1, 2] }, ctx)).toBe('array');
    expect(fn({ value: 'x' }, ctx)).toBe('string');
    expect(fn({ value: 1 }, ctx)).toBe('number');
    expect(fn({ value: {} }, ctx)).toBe('object');
  });

  test('@toddle/default provides fallback', () => {
    const fn = getFormula('@toddle/default')!;
    expect(fn({ value: 1, fallback: 0 }, ctx)).toBe(1);
    expect(fn({ value: null, fallback: 0 }, ctx)).toBe(0);
    expect(fn({ value: undefined, fallback: 'default' }, ctx)).toBe('default');
  });

  test('@toddle/first returns first element', () => {
    const fn = getFormula('@toddle/first')!;
    expect(fn({ items: [1, 2, 3] }, ctx)).toBe(1);
    expect(fn({ items: [] }, ctx)).toBeNull();
  });

  test('@toddle/last returns last element', () => {
    const fn = getFormula('@toddle/last')!;
    expect(fn({ items: [1, 2, 3] }, ctx)).toBe(3);
    expect(fn({ items: [] }, ctx)).toBeNull();
  });

  test('@toddle/nth returns nth element', () => {
    const fn = getFormula('@toddle/nth')!;
    expect(fn({ items: ['a', 'b', 'c'], index: 1 }, ctx)).toBe('b');
    expect(fn({ items: ['a', 'b', 'c'], index: 5 }, ctx)).toBeNull();
    expect(fn({ items: ['a', 'b', 'c'], index: -1 }, ctx)).toBeNull();
  });
});

describe('random formula', () => {
  test('@toddle/random returns value in range', () => {
    const fn = getFormula('@toddle/random')!;
    for (let i = 0; i < 100; i++) {
      const result = fn({ min: 0, max: 10 }, ctx);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  test('@toddle/random with custom range', () => {
    const fn = getFormula('@toddle/random')!;
    const result = fn({ min: 100, max: 200 }, ctx);
    expect(result).toBeGreaterThanOrEqual(100);
    expect(result).toBeLessThanOrEqual(200);
  });

  test('@toddle/random defaults to 0-1', () => {
    const fn = getFormula('@toddle/random')!;
    const result = fn({}, ctx);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('string edge cases', () => {
  test('@toddle/char-at returns null for out of bounds', () => {
    const fn = getFormula('@toddle/char-at')!;
    expect(fn({ text: 'hello', index: 10 }, ctx)).toBeNull();
    expect(fn({ text: 'hello', index: -1 }, ctx)).toBeNull();
  });

  test('@toddle/char-at returns empty string for empty text', () => {
    const fn = getFormula('@toddle/char-at')!;
    expect(fn({ text: '', index: 0 }, ctx)).toBeNull();
  });

  test('@toddle/string-index-of returns -1 for not found', () => {
    const fn = getFormula('@toddle/string-index-of')!;
    expect(fn({ text: 'hello', search: 'xyz' }, ctx)).toBe(-1);
  });
});
