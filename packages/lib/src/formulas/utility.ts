import { registerFormula } from '../index';

export function registerUtilityFormulas(): void {
  registerFormula('@toddle/to-string', (args, ctx) => {
    const value = args.value;
    if (value === null || value === undefined) return '';
    return String(value);
  });

  registerFormula('@toddle/to-number', (args, ctx) => {
    const value = args.value;
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  });

  registerFormula('@toddle/to-boolean', (args, ctx) => {
    const value = args.value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  });

  registerFormula('@toddle/to-array', (args, ctx) => {
    const value = args.value;
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  });

  registerFormula('@toddle/type-of', (args, ctx) => {
    const value = args.value;
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  });

  registerFormula('@toddle/default', (args, ctx) => {
    const value = args.value;
    const fallback = args.fallback;
    return value ?? fallback;
  });

  registerFormula('@toddle/first', (args, ctx) => {
    const items = args.items;
    if (Array.isArray(items)) return items[0] ?? null;
    return null;
  });

  registerFormula('@toddle/last', (args, ctx) => {
    const items = args.items;
    if (Array.isArray(items)) return items[items.length - 1] ?? null;
    return null;
  });

  registerFormula('@toddle/nth', (args, ctx) => {
    const items = args.items as any[];
    const index = Number(args.index ?? 0);
    if (!Array.isArray(items)) return null;
    if (index < 0 || index >= items.length) return null;
    return items[index];
  });
}
