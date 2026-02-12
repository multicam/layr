import { registerFormula } from '../index';
import type { FormulaContext } from '@layr/core';

export function registerArrayFormulas(): void {
  // map - transform array elements
  registerFormula('@toddle/map', (args, ctx) => {
    const items = args.items as any[];
    const fx = args.fx as ((item: any) => any);
    if (!Array.isArray(items) || typeof fx !== 'function') return null;
    return items.map((item, index) => fx({ item, index }));
  });

  // filter - filter array elements
  registerFormula('@toddle/filter', (args, ctx) => {
    const items = args.items as any[];
    const condition = args.condition as ((item: any) => boolean);
    if (!Array.isArray(items) || typeof condition !== 'function') return null;
    return items.filter((item, index) => condition({ item, index }));
  });

  // reduce - reduce array to single value
  registerFormula('@toddle/reduce', (args, ctx) => {
    const items = args.items as any[];
    const initial = args.initial;
    const reducer = args.reducer as ((acc: any, item: any) => any);
    if (!Array.isArray(items) || typeof reducer !== 'function') return null;
    return items.reduce((acc, item, index) => reducer({ acc, item, index }), initial);
  });

  // find - find first matching element
  registerFormula('@toddle/find', (args, ctx) => {
    const items = args.items as any[];
    const condition = args.condition as ((item: any) => boolean);
    if (!Array.isArray(items) || typeof condition !== 'function') return null;
    return items.find((item, index) => condition({ item, index })) ?? null;
  });

  // length - get array length
  registerFormula('@toddle/length', (args, ctx) => {
    const items = args.items;
    if (!Array.isArray(items)) return null;
    return items.length;
  });

  // join - join array elements
  registerFormula('@toddle/join', (args, ctx) => {
    const items = args.items as any[];
    const separator = String(args.separator ?? '');
    if (!Array.isArray(items)) return null;
    return items.join(separator);
  });

  // includes - check if array includes value
  registerFormula('@toddle/includes', (args, ctx) => {
    const items = args.items as any[];
    const value = args.value;
    if (!Array.isArray(items)) return false;
    return items.includes(value);
  });

  // indexOf - find index of value
  registerFormula('@toddle/index-of', (args, ctx) => {
    const items = args.items as any[];
    const value = args.value;
    if (!Array.isArray(items)) return -1;
    return items.indexOf(value);
  });

  // slice - extract portion of array
  registerFormula('@toddle/slice', (args, ctx) => {
    const items = args.items as any[];
    const start = Number(args.start ?? 0);
    const end = args.end !== undefined ? Number(args.end) : undefined;
    if (!Array.isArray(items)) return null;
    return items.slice(start, end);
  });

  // concat - concatenate arrays
  registerFormula('@toddle/concat', (args, ctx) => {
    const items = args.items as any[];
    const others = args.others as any[];
    if (!Array.isArray(items)) return null;
    if (!Array.isArray(others)) return items;
    return [...items, ...others];
  });

  // reverse - reverse array
  registerFormula('@toddle/reverse', (args, ctx) => {
    const items = args.items as any[];
    if (!Array.isArray(items)) return null;
    return [...items].reverse();
  });

  // sort - sort array
  registerFormula('@toddle/sort', (args, ctx) => {
    const items = args.items as any[];
    const ascending = args.ascending !== false;
    if (!Array.isArray(items)) return null;
    return [...items].sort((a, b) => {
      if (a < b) return ascending ? -1 : 1;
      if (a > b) return ascending ? 1 : -1;
      return 0;
    });
  });

  // flat - flatten nested array
  registerFormula('@toddle/flat', (args, ctx) => {
    const items = args.items as any[];
    const depth = Number(args.depth ?? 1);
    if (!Array.isArray(items)) return null;
    return items.flat(depth);
  });

  // every - check if all elements match
  registerFormula('@toddle/every', (args, ctx) => {
    const items = args.items as any[];
    const condition = args.condition as ((item: any) => boolean);
    if (!Array.isArray(items) || typeof condition !== 'function') return false;
    return items.every((item, index) => condition({ item, index }));
  });

  // some - check if any element matches
  registerFormula('@toddle/some', (args, ctx) => {
    const items = args.items as any[];
    const condition = args.condition as ((item: any) => boolean);
    if (!Array.isArray(items) || typeof condition !== 'function') return false;
    return items.some((item, index) => condition({ item, index }));
  });
}
