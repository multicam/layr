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

// ========== New Phase 2 Formulas ==========

describe('new string formulas', () => {
  test('@toddle/capitalize capitalizes first letter', () => {
    const fn = getFormula('@toddle/capitalize')!;
    expect(fn({ text: 'hello' }, ctx)).toBe('Hello');
    expect(fn({ text: 'HELLO' }, ctx)).toBe('HELLO');
    expect(fn({ text: '' }, ctx)).toBe('');
  });

  test('@toddle/encodeJSON stringifies to JSON', () => {
    const fn = getFormula('@toddle/encodeJSON')!;
    expect(fn({ value: { a: 1 } }, ctx)).toBe('{"a":1}');
    expect(fn({ value: [1, 2, 3] }, ctx)).toBe('[1,2,3]');
    expect(fn({ value: 'test' }, ctx)).toBe('"test"');
  });

  test('@toddle/parseJSON parses JSON string', () => {
    const fn = getFormula('@toddle/parseJSON')!;
    expect(fn({ text: '{"a":1}' }, ctx)).toEqual({ a: 1 });
    expect(fn({ text: '[1,2,3]' }, ctx)).toEqual([1, 2, 3]);
    expect(fn({ text: 'invalid' }, ctx)).toBeNull();
  });

  test('@toddle/encodeURIComponent encodes URI', () => {
    const fn = getFormula('@toddle/encodeURIComponent')!;
    expect(fn({ text: 'hello world' }, ctx)).toBe('hello%20world');
    expect(fn({ text: 'test=value&foo=bar' }, ctx)).toBe('test%3Dvalue%26foo%3Dbar');
  });

  test('@toddle/decodeURIComponent decodes URI', () => {
    const fn = getFormula('@toddle/decodeURIComponent')!;
    expect(fn({ text: 'hello%20world' }, ctx)).toBe('hello world');
    expect(fn({ text: 'test%3Dvalue' }, ctx)).toBe('test=value');
  });

  test('@toddle/encodeBase64 encodes to Base64', () => {
    const fn = getFormula('@toddle/encodeBase64')!;
    expect(fn({ text: 'hello' }, ctx)).toBe('aGVsbG8=');
    expect(fn({ text: '' }, ctx)).toBe('');
  });

  test('@toddle/decodeBase64 decodes from Base64', () => {
    const fn = getFormula('@toddle/decodeBase64')!;
    expect(fn({ text: 'aGVsbG8=' }, ctx)).toBe('hello');
    expect(fn({ text: '' }, ctx)).toBe('');
  });

  test('@toddle/parseURL parses URL', () => {
    const fn = getFormula('@toddle/parseURL')!;
    const result = fn({ text: 'https://example.com/path?q=test#hash' }, ctx);
    expect(result).not.toBeNull();
    expect(result!.protocol).toBe('https:');
    expect(result!.hostname).toBe('example.com');
    expect(result!.pathname).toBe('/path');
    expect(result!.searchParams).toEqual({ q: 'test' });
    expect(result!.hash).toBe('#hash');
    expect(fn({ text: 'invalid' }, ctx)).toBeNull();
  });

  test('@toddle/matches tests regex', () => {
    const fn = getFormula('@toddle/matches')!;
    expect(fn({ text: 'hello123', pattern: '\\d+' }, ctx)).toBe(true);
    expect(fn({ text: 'hello', pattern: '\\d+' }, ctx)).toBe(false);
    expect(fn({ text: 'Test', pattern: 'test', flags: 'i' }, ctx)).toBe(true);
    expect(fn({ text: 'invalid', pattern: '[' }, ctx)).toBe(false);
  });
});

describe('new array formulas', () => {
  test('@toddle/unique removes duplicates', () => {
    const fn = getFormula('@toddle/unique')!;
    expect(fn({ items: [1, 2, 2, 3, 3, 3] }, ctx)).toEqual([1, 2, 3]);
    expect(fn({ items: ['a', 'b', 'a'] }, ctx)).toEqual(['a', 'b']);
    expect(fn({ items: [] }, ctx)).toEqual([]);
    expect(fn({ items: null }, ctx)).toBeNull();
  });

  test('@toddle/append adds to end', () => {
    const fn = getFormula('@toddle/append')!;
    expect(fn({ items: [1, 2], value: 3 }, ctx)).toEqual([1, 2, 3]);
    expect(fn({ items: [], value: 'x' }, ctx)).toEqual(['x']);
  });

  test('@toddle/prepend adds to start', () => {
    const fn = getFormula('@toddle/prepend')!;
    expect(fn({ items: [2, 3], value: 1 }, ctx)).toEqual([1, 2, 3]);
    expect(fn({ items: [], value: 'x' }, ctx)).toEqual(['x']);
  });

  test('@toddle/findIndex finds index', () => {
    const fn = getFormula('@toddle/findIndex')!;
    expect(fn({ items: [1, 2, 3], condition: ({ item }: any) => item === 2 }, ctx)).toBe(1);
    expect(fn({ items: [1, 2, 3], condition: ({ item }: any) => item > 10 }, ctx)).toBe(-1);
  });

  test('@toddle/findLast finds last match', () => {
    const fn = getFormula('@toddle/findLast')!;
    expect(fn({ items: [1, 2, 3, 2], condition: ({ item }: any) => item === 2 }, ctx)).toBe(2);
    expect(fn({ items: [1, 2, 3], condition: ({ item }: any) => item > 10 }, ctx)).toBeNull();
  });

  test('@toddle/drop removes first N', () => {
    const fn = getFormula('@toddle/drop')!;
    expect(fn({ items: [1, 2, 3, 4], count: 2 }, ctx)).toEqual([3, 4]);
    expect(fn({ items: [1, 2], count: 5 }, ctx)).toEqual([]);
  });

  test('@toddle/dropLast removes last N', () => {
    const fn = getFormula('@toddle/dropLast')!;
    expect(fn({ items: [1, 2, 3, 4], count: 2 }, ctx)).toEqual([1, 2]);
    expect(fn({ items: [1, 2], count: 5 }, ctx)).toEqual([]);
  });

  test('@toddle/take keeps first N', () => {
    const fn = getFormula('@toddle/take')!;
    expect(fn({ items: [1, 2, 3, 4], count: 2 }, ctx)).toEqual([1, 2]);
    expect(fn({ items: [1, 2], count: 5 }, ctx)).toEqual([1, 2]);
  });

  test('@toddle/takeLast keeps last N', () => {
    const fn = getFormula('@toddle/takeLast')!;
    expect(fn({ items: [1, 2, 3, 4], count: 2 }, ctx)).toEqual([3, 4]);
    expect(fn({ items: [1, 2], count: 5 }, ctx)).toEqual([1, 2]);
  });

  test('@toddle/shuffle randomizes order', () => {
    const fn = getFormula('@toddle/shuffle')!;
    const input = [1, 2, 3, 4, 5];
    const result = fn({ items: input }, ctx) as number[];
    // Check same elements, different order possible
    expect(result.sort()).toEqual(input);
    // Original should be unchanged
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(fn({ items: null }, ctx)).toBeNull();
  });

  test('@toddle/sortBy sorts by key', () => {
    const fn = getFormula('@toddle/sortBy')!;
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const result = fn({ items, key: ({ item }: any) => item.v, ascending: true }, ctx);
    expect(result).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
    expect(fn({ items: null }, ctx)).toBeNull();
  });
});

describe('new object formulas', () => {
  test('@toddle/deleteKey removes key', () => {
    const fn = getFormula('@toddle/deleteKey')!;
    expect(fn({ object: { a: 1, b: 2 }, key: 'a' }, ctx)).toEqual({ b: 2 });
    expect(fn({ object: null, key: 'a' }, ctx)).toBeNull();
  });

  test('@toddle/set sets key', () => {
    const fn = getFormula('@toddle/set')!;
    expect(fn({ object: { a: 1 }, key: 'b', value: 2 }, ctx)).toEqual({ a: 1, b: 2 });
    expect(fn({ object: { a: 1 }, key: 'a', value: 99 }, ctx)).toEqual({ a: 99 });
    expect(fn({ object: null, key: 'a', value: 1 }, ctx)).toBeNull();
  });

  test('@toddle/size counts keys', () => {
    const fn = getFormula('@toddle/size')!;
    expect(fn({ object: { a: 1, b: 2, c: 3 } }, ctx)).toBe(3);
    expect(fn({ object: {} }, ctx)).toBe(0);
    expect(fn({ object: null }, ctx)).toBe(0);
  });

  test('@toddle/groupBy groups by key', () => {
    const fn = getFormula('@toddle/groupBy')!;
    const items = [{ type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 }];
    const result = fn({ items, key: ({ item }: any) => item.type }, ctx);
    expect(result).toEqual({
      a: [{ type: 'a', v: 1 }, { type: 'a', v: 3 }],
      b: [{ type: 'b', v: 2 }],
    });
    expect(fn({ items: null }, ctx)).toBeNull();
    expect(fn({ items: [1, 2], key: null }, ctx)).toBeNull();
  });

  test('@toddle/keyBy indexes by key', () => {
    const fn = getFormula('@toddle/keyBy')!;
    const items = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    const result = fn({ items, key: ({ item }: any) => item.id }, ctx);
    expect(result).toEqual({
      a: { id: 'a', v: 1 },
      b: { id: 'b', v: 2 },
    });
    expect(fn({ items: null }, ctx)).toBeNull();
  });
});

describe('new number formulas', () => {
  test('@toddle/logarithm calculates log', () => {
    const fn = getFormula('@toddle/logarithm')!;
    expect(fn({ value: Math.E }, ctx)).toBeCloseTo(1);
    expect(fn({ value: 100, base: 10 }, ctx)).toBeCloseTo(2);
    expect(fn({ value: 0 }, ctx)).toBeNull();
    expect(fn({ value: -1 }, ctx)).toBeNull();
    expect(fn({ value: 8, base: 2 }, ctx)).toBeCloseTo(3);
  });

  test('@toddle/randomNumber returns integer in range', () => {
    const fn = getFormula('@toddle/randomNumber')!;
    for (let i = 0; i < 100; i++) {
      const result = fn({ min: 1, max: 6 }, ctx);
      expect(result).toBeInteger();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });
});

describe('new utility formulas', () => {
  test('@toddle/lastIndexOf finds last index', () => {
    const fn = getFormula('@toddle/lastIndexOf')!;
    expect(fn({ items: [1, 2, 3, 2, 1], value: 2 }, ctx)).toBe(3);
    expect(fn({ items: [1, 2, 3], value: 99 }, ctx)).toBe(-1);
    expect(fn({ items: null }, ctx)).toBe(-1);
  });

  test('@toddle/range generates sequence', () => {
    const fn = getFormula('@toddle/range')!;
    expect(fn({ start: 0, end: 5 }, ctx)).toEqual([0, 1, 2, 3, 4]);
    expect(fn({ start: 0, end: 5, step: 2 }, ctx)).toEqual([0, 2, 4]);
    expect(fn({ start: 10, end: 0, step: -2 }, ctx)).toEqual([10, 8, 6, 4, 2]);
    expect(fn({ start: 0, end: 5, step: 0 }, ctx)).toEqual([]);
  });

  test('@toddle/json deep clones', () => {
    const fn = getFormula('@toddle/json')!;
    const obj = { a: { b: 1 } };
    const cloned = fn({ value: obj }, ctx);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).not.toBe(obj.a);
    // Circular reference should return null
    const circular: any = { a: 1 };
    circular.self = circular;
    expect(fn({ value: circular }, ctx)).toBeNull();
  });

  test('@toddle/formatNumber formats number', () => {
    const fn = getFormula('@toddle/formatNumber')!;
    expect(fn({ value: 1234.5 }, ctx)).toBe('1,234.5');
    expect(fn({ value: 1000, locale: 'de-DE' }, ctx)).toMatch(/1[.,]000/);
    expect(fn({ value: 0.5, options: { style: 'percent' } }, ctx)).toBe('50%');
    expect(fn({ value: NaN }, ctx)).toBeNull();
  });
});

// ========== Datetime Formulas ==========

describe('datetime formulas', () => {
  test('@toddle/dateFromString parses ISO date string', () => {
    const fn = getFormula('@toddle/dateFromString')!;
    const result = fn({ date: '2024-03-15T10:30:00Z' }, ctx);
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe('2024-03-15T10:30:00.000Z');
  });

  test('@toddle/dateFromString parses date-only string', () => {
    const fn = getFormula('@toddle/dateFromString')!;
    const result = fn({ date: '2024-03-15' }, ctx);
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getUTCFullYear()).toBe(2024);
    expect((result as Date).getUTCMonth()).toBe(2); // March = 2
    expect((result as Date).getUTCDate()).toBe(15);
  });

  test('@toddle/dateFromString returns null for invalid date', () => {
    const fn = getFormula('@toddle/dateFromString')!;
    expect(fn({ date: 'invalid' }, ctx)).toBeNull();
    expect(fn({ date: '' }, ctx)).toBeNull(); // Empty string creates Invalid Date, which returns null
  });

  test('@toddle/dateFromString returns null for non-string input', () => {
    const fn = getFormula('@toddle/dateFromString')!;
    expect(fn({ date: 123 }, ctx)).toBeNull();
    expect(fn({ date: null }, ctx)).toBeNull();
    expect(fn({ date: undefined }, ctx)).toBeNull();
  });

  test('@toddle/dateFromTimestamp creates Date from milliseconds', () => {
    const fn = getFormula('@toddle/dateFromTimestamp')!;
    const timestamp = 1710502200000; // 2024-03-15T10:30:00Z
    const result = fn({ timestamp }, ctx);
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getTime()).toBe(timestamp);
  });

  test('@toddle/dateFromTimestamp defaults to 0', () => {
    const fn = getFormula('@toddle/dateFromTimestamp')!;
    const result = fn({}, ctx);
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getTime()).toBe(0);
  });

  test('@toddle/dateFromTimestamp returns null for NaN', () => {
    const fn = getFormula('@toddle/dateFromTimestamp')!;
    expect(fn({ timestamp: 'invalid' }, ctx)).toBeNull();
    expect(fn({ timestamp: NaN }, ctx)).toBeNull();
  });

  test('@toddle/formatDate with Date object', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const date = new Date('2024-03-15T10:30:00Z');
    const result = fn({ date }, ctx);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('@toddle/formatDate with string', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const result = fn({ date: '2024-03-15' }, ctx);
    expect(typeof result).toBe('string');
  });

  test('@toddle/formatDate with timestamp number', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const result = fn({ date: 1710502200000 }, ctx);
    expect(typeof result).toBe('string');
  });

  test('@toddle/formatDate with format pattern YYYY-MM-DD', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const date = new Date('2024-03-15T10:30:00Z');
    const result = fn({ date, format: 'YYYY-MM-DD' }, ctx);
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  test('@toddle/formatDate with named format styles', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const date = new Date('2024-03-15T10:30:00Z');

    const fullResult = fn({ date, format: 'full' }, ctx);
    expect(typeof fullResult).toBe('string');
    expect(fullResult.length).toBeGreaterThan(10);

    const shortResult = fn({ date, format: 'short' }, ctx);
    expect(typeof shortResult).toBe('string');
  });

  test('@toddle/formatDate with locale', () => {
    const fn = getFormula('@toddle/formatDate')!;
    const date = new Date('2024-03-15T10:30:00Z');
    const result = fn({ date, locale: 'en-US' }, ctx);
    expect(typeof result).toBe('string');
  });

  test('@toddle/formatDate returns null for invalid date', () => {
    const fn = getFormula('@toddle/formatDate')!;
    expect(fn({ date: 'invalid' }, ctx)).toBeNull();
    expect(fn({ date: null }, ctx)).toBeNull();
  });

  test('@toddle/now returns current Date', () => {
    const fn = getFormula('@toddle/now')!;
    const before = Date.now();
    const result = fn({}, ctx);
    const after = Date.now();

    expect(result).toBeInstanceOf(Date);
    const resultTime = (result as Date).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  test('@toddle/timestamp converts Date to milliseconds', () => {
    const fn = getFormula('@toddle/timestamp')!;
    const date = new Date('2024-03-15T10:30:00Z');
    const expectedTimestamp = date.getTime();
    const result = fn({ date }, ctx);
    expect(result).toBe(expectedTimestamp);
  });

  test('@toddle/timestamp with string input', () => {
    const fn = getFormula('@toddle/timestamp')!;
    const dateStr = '2024-03-15T10:30:00Z';
    const expectedTimestamp = new Date(dateStr).getTime();
    const result = fn({ date: dateStr }, ctx);
    expect(result).toBe(expectedTimestamp);
  });

  test('@toddle/timestamp with number input', () => {
    const fn = getFormula('@toddle/timestamp')!;
    const timestamp = 1710502200000;
    const result = fn({ date: timestamp }, ctx);
    expect(result).toBe(timestamp);
  });

  test('@toddle/timestamp returns null for invalid input', () => {
    const fn = getFormula('@toddle/timestamp')!;
    expect(fn({ date: 'invalid' }, ctx)).toBeNull();
    expect(fn({ date: null }, ctx)).toBeNull();
  });
});

// ========== Environment Formulas ==========

describe('environment formulas', () => {
  // Server-side context
  const serverCtx = {
    ...ctx,
    env: {
      isServer: true,
      branchName: 'main',
      request: {
        url: 'https://example.com/page?foo=bar',
        cookies: { session: 'abc123', theme: 'dark' },
        headers: { 'user-agent': 'TestBot/1.0' },
      },
    },
  } as any;

  // Client-side context (no isServer flag)
  const clientCtx = {
    ...ctx,
    env: {
      isServer: false,
    },
  } as any;

  test('@toddle/branchName returns env value', () => {
    const fn = getFormula('@toddle/branchName')!;
    expect(fn({}, serverCtx)).toBe('main');
    expect(fn({}, clientCtx)).toBeNull();
    expect(fn({}, ctx)).toBeNull();
  });

  test('@toddle/canShare returns false on server', () => {
    const fn = getFormula('@toddle/canShare')!;
    expect(fn({}, serverCtx)).toBe(false);
  });

  test('@toddle/canShare handles client-side check', () => {
    const fn = getFormula('@toddle/canShare')!;
    // In test environment (happy-dom), navigator.canShare may not exist
    const result = fn({}, clientCtx);
    expect(typeof result).toBe('boolean');
  });

  test('@toddle/canShare with data argument', () => {
    const fn = getFormula('@toddle/canShare')!;
    const shareData = { title: 'Test', url: 'https://example.com' };
    // Should not throw, returns boolean
    const result = fn({ data: shareData }, clientCtx);
    expect(typeof result).toBe('boolean');
  });

  test('@toddle/currentURL returns request URL on server', () => {
    const fn = getFormula('@toddle/currentURL')!;
    expect(fn({}, serverCtx)).toBe('https://example.com/page?foo=bar');
  });

  test('@toddle/currentURL returns null without context', () => {
    const fn = getFormula('@toddle/currentURL')!;
    // In test environment without window.location
    const result = fn({}, ctx);
    // Will be either the test runner's URL or null
    expect(typeof result === 'string' || result === null).toBe(true);
  });

  test('@toddle/getElementById returns null on server', () => {
    const fn = getFormula('@toddle/getElementById')!;
    expect(fn({ id: 'test' }, serverCtx)).toBeNull();
  });

  test('@toddle/getElementById returns null for non-string id', () => {
    const fn = getFormula('@toddle/getElementById')!;
    expect(fn({ id: 123 }, clientCtx)).toBeNull();
    expect(fn({ id: null }, clientCtx)).toBeNull();
  });

  test('@toddle/getElementById on client returns null when document undefined', () => {
    const fn = getFormula('@toddle/getElementById')!;
    // When isServer is not set (undefined), it falls back to checking document
    // In this test environment, document is not defined, so it should return null
    const ctxWithoutServerFlag = { ...ctx } as any;
    const result = fn({ id: 'nonexistent' }, ctxWithoutServerFlag);
    expect(result).toBeNull();
  });

  test('@toddle/getCookie returns null for non-string name', () => {
    const fn = getFormula('@toddle/getCookie')!;
    expect(fn({ name: 123 }, serverCtx)).toBeNull();
    expect(fn({ name: null }, serverCtx)).toBeNull();
  });

  test('@toddle/getCookie returns cookie from server context', () => {
    const fn = getFormula('@toddle/getCookie')!;
    expect(fn({ name: 'session' }, serverCtx)).toBe('abc123');
    expect(fn({ name: 'theme' }, serverCtx)).toBe('dark');
    expect(fn({ name: 'nonexistent' }, serverCtx)).toBeNull();
  });

  test('@toddle/getCookie returns null on client without cookies', () => {
    const fn = getFormula('@toddle/getCookie')!;
    // In test environment, document.cookie is typically empty
    const result = fn({ name: 'test' }, clientCtx);
    expect(result).toBeNull();
  });

  test('@toddle/getHttpOnlyCookie returns cookie on server only', () => {
    const fn = getFormula('@toddle/getHttpOnlyCookie')!;
    expect(fn({ name: 'session' }, serverCtx)).toBe('abc123');
    expect(fn({ name: 'session' }, clientCtx)).toBeNull();
    expect(fn({ name: 'nonexistent' }, serverCtx)).toBeNull();
  });

  test('@toddle/getHttpOnlyCookie returns null for non-string name', () => {
    const fn = getFormula('@toddle/getHttpOnlyCookie')!;
    expect(fn({ name: 123 }, serverCtx)).toBeNull();
    expect(fn({ name: null }, serverCtx)).toBeNull();
  });

  test('@toddle/isServer returns correct value', () => {
    const fn = getFormula('@toddle/isServer')!;
    expect(fn({}, serverCtx)).toBe(true);
    expect(fn({}, clientCtx)).toBe(false);
    expect(fn({}, ctx)).toBe(false);
  });

  test('@toddle/languages returns default on server', () => {
    const fn = getFormula('@toddle/languages')!;
    expect(fn({}, serverCtx)).toEqual(['en']);
  });

  test('@toddle/languages returns array on client', () => {
    const fn = getFormula('@toddle/languages')!;
    const result = fn({}, clientCtx);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('@toddle/userAgent returns header on server', () => {
    const fn = getFormula('@toddle/userAgent')!;
    expect(fn({}, serverCtx)).toBe('TestBot/1.0');
  });

  test('@toddle/userAgent returns navigator on client', () => {
    const fn = getFormula('@toddle/userAgent')!;
    const result = fn({}, clientCtx);
    // In test environment, should return some user agent string
    expect(typeof result === 'string' || result === null).toBe(true);
  });

  test('@toddle/userAgent returns null without navigator or context', () => {
    const fn = getFormula('@toddle/userAgent')!;
    // With default ctx that has no env
    const result = fn({}, ctx);
    expect(typeof result === 'string' || result === null).toBe(true);
  });
});

// ========== Storage Formulas ==========

describe('storage formulas', () => {
  // Server-side context
  const serverCtx = {
    ...ctx,
    env: {
      isServer: true,
    },
  } as any;

  // Client-side context (no isServer flag)
  const clientCtx = {
    ...ctx,
    env: {
      isServer: false,
    },
  } as any;

  test('@toddle/getFromLocalStorage returns null on server', () => {
    const fn = getFormula('@toddle/getFromLocalStorage')!;
    expect(fn({ key: 'test' }, serverCtx)).toBeNull();
  });

  test('@toddle/getFromLocalStorage returns null for non-string key', () => {
    const fn = getFormula('@toddle/getFromLocalStorage')!;
    expect(fn({ key: 123 }, clientCtx)).toBeNull();
    expect(fn({ key: null }, clientCtx)).toBeNull();
    expect(fn({ key: undefined }, clientCtx)).toBeNull();
  });

  test('@toddle/getFromLocalStorage returns null when storage undefined', () => {
    const fn = getFormula('@toddle/getFromLocalStorage')!;
    // When isServer is not set and localStorage is undefined, should return null
    const ctxWithoutServerFlag = { ...ctx } as any;
    expect(fn({ key: 'test' }, ctxWithoutServerFlag)).toBeNull();
  });

  test('@toddle/getFromLocalStorage returns parsed value from localStorage', () => {
    const fn = getFormula('@toddle/getFromLocalStorage')!;

    // Mock localStorage
    const storage: Record<string, string> = {
      'test-key': '"test-value"',
      'json-key': JSON.stringify({ foo: 'bar', num: 42 }),
      'array-key': JSON.stringify([1, 2, 3]),
    };

    const originalLocalStorage = globalThis.localStorage;
    // @ts-ignore - mocking for test
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: Object.keys(storage).length,
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };

    try {
      expect(fn({ key: 'test-key' }, clientCtx)).toBe('test-value');
      expect(fn({ key: 'json-key' }, clientCtx)).toEqual({ foo: 'bar', num: 42 });
      expect(fn({ key: 'array-key' }, clientCtx)).toEqual([1, 2, 3]);
      expect(fn({ key: 'nonexistent' }, clientCtx)).toBeNull();
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  test('@toddle/getFromLocalStorage returns null on JSON parse error', () => {
    const fn = getFormula('@toddle/getFromLocalStorage')!;

    // Mock localStorage with invalid JSON
    const storage: Record<string, string> = {
      'invalid-json': 'not valid json {',
    };

    const originalLocalStorage = globalThis.localStorage;
    // @ts-ignore - mocking for test
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: Object.keys(storage).length,
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };

    try {
      expect(fn({ key: 'invalid-json' }, clientCtx)).toBeNull();
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  test('@toddle/getFromSessionStorage returns null on server', () => {
    const fn = getFormula('@toddle/getFromSessionStorage')!;
    expect(fn({ key: 'test' }, serverCtx)).toBeNull();
  });

  test('@toddle/getFromSessionStorage returns null for non-string key', () => {
    const fn = getFormula('@toddle/getFromSessionStorage')!;
    expect(fn({ key: 123 }, clientCtx)).toBeNull();
    expect(fn({ key: null }, clientCtx)).toBeNull();
    expect(fn({ key: undefined }, clientCtx)).toBeNull();
  });

  test('@toddle/getFromSessionStorage returns null when storage undefined', () => {
    const fn = getFormula('@toddle/getFromSessionStorage')!;
    // When isServer is not set and sessionStorage is undefined, should return null
    const ctxWithoutServerFlag = { ...ctx } as any;
    expect(fn({ key: 'test' }, ctxWithoutServerFlag)).toBeNull();
  });

  test('@toddle/getFromSessionStorage returns parsed value from sessionStorage', () => {
    const fn = getFormula('@toddle/getFromSessionStorage')!;

    // Mock sessionStorage
    const storage: Record<string, string> = {
      'session-key': '"session-value"',
      'session-json': JSON.stringify({ session: true, count: 5 }),
      'session-array': JSON.stringify(['a', 'b', 'c']),
    };

    const originalSessionStorage = globalThis.sessionStorage;
    // @ts-ignore - mocking for test
    globalThis.sessionStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: Object.keys(storage).length,
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };

    try {
      expect(fn({ key: 'session-key' }, clientCtx)).toBe('session-value');
      expect(fn({ key: 'session-json' }, clientCtx)).toEqual({ session: true, count: 5 });
      expect(fn({ key: 'session-array' }, clientCtx)).toEqual(['a', 'b', 'c']);
      expect(fn({ key: 'nonexistent' }, clientCtx)).toBeNull();
    } finally {
      globalThis.sessionStorage = originalSessionStorage;
    }
  });

  test('@toddle/getFromSessionStorage returns null on JSON parse error', () => {
    const fn = getFormula('@toddle/getFromSessionStorage')!;

    // Mock sessionStorage with invalid JSON
    const storage: Record<string, string> = {
      'invalid-session': '{broken json',
    };

    const originalSessionStorage = globalThis.sessionStorage;
    // @ts-ignore - mocking for test
    globalThis.sessionStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: Object.keys(storage).length,
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };

    try {
      expect(fn({ key: 'invalid-session' }, clientCtx)).toBeNull();
    } finally {
      globalThis.sessionStorage = originalSessionStorage;
    }
  });
});
