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

  // lastIndexOf - last index of value
  registerFormula('@toddle/lastIndexOf', (args, ctx) => {
    const items = args.items as any[];
    const value = args.value;
    if (!Array.isArray(items)) return -1;
    return items.lastIndexOf(value);
  });

  // range - generate number sequence
  registerFormula('@toddle/range', (args, ctx) => {
    const start = Number(args.start ?? 0);
    const end = Number(args.end ?? 0);
    const step = Number(args.step ?? 1);
    if (step === 0) return [];
    const result: number[] = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > end; i += step) {
        result.push(i);
      }
    }
    return result;
  });

  // json - deep clone via JSON round-trip
  registerFormula('@toddle/json', (args, ctx) => {
    const value = args.value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  });

  // formatNumber - format number with Intl.NumberFormat
  registerFormula('@toddle/formatNumber', (args, ctx) => {
    const value = Number(args.value ?? 0);
    const locale = String(args.locale ?? 'en-US');
    const options = args.options as Intl.NumberFormatOptions | undefined;
    if (isNaN(value)) return null;
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return String(value);
    }
  });
}
