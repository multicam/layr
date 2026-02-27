import { registerFormula } from '../index';

export function registerObjectFormulas(): void {
  registerFormula('@toddle/keys', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return null;
    return Object.keys(obj);
  });

  registerFormula('@toddle/values', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return null;
    return Object.values(obj);
  });

  registerFormula('@toddle/entries', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return null;
    return Object.entries(obj);
  });

  registerFormula('@toddle/from-entries', (args, ctx) => {
    const entries = args.entries as [string, unknown][];
    if (!Array.isArray(entries)) return null;
    try {
      return Object.fromEntries(entries);
    } catch {
      return null;
    }
  });

  registerFormula('@toddle/merge', (args, ctx) => {
    const objects = args.objects as Record<string, unknown>[];
    if (!Array.isArray(objects)) return null;
    return Object.assign({}, ...objects.filter(o => typeof o === 'object' && o !== null));
  });

  registerFormula('@toddle/pick', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const keys = args.keys as string[];
    if (typeof obj !== 'object' || obj === null) return null;
    if (!Array.isArray(keys)) return null;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
    }
    return result;
  });

  registerFormula('@toddle/omit', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const keys = args.keys as string[];
    if (typeof obj !== 'object' || obj === null) return null;
    if (!Array.isArray(keys)) return { ...obj };
    const result: Record<string, unknown> = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  });

  registerFormula('@toddle/has-key', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const key = String(args.key ?? '');
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.prototype.hasOwnProperty.call(obj, key);
  });

  registerFormula('@toddle/get', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const key = String(args.key ?? '');
    const fallback = args.fallback;
    if (typeof obj !== 'object' || obj === null) return fallback;
    return Object.prototype.hasOwnProperty.call(obj, key) ? (obj[key] ?? fallback) : fallback;
  });

  // deleteKey - remove key from object (immutable)
  registerFormula('@toddle/deleteKey', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const key = String(args.key ?? '');
    if (typeof obj !== 'object' || obj === null) return null;
    const result: Record<string, unknown> = { ...obj };
    delete result[key];
    return result;
  });

  // set - set key in object (immutable)
  registerFormula('@toddle/set', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    const key = String(args.key ?? '');
    const value = args.value;
    if (typeof obj !== 'object' || obj === null) return null;
    return { ...obj, [key]: value };
  });

  // size - count of keys
  registerFormula('@toddle/size', (args, ctx) => {
    const obj = args.object as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return 0;
    return Object.keys(obj).length;
  });

  // groupBy - group array elements by key
  registerFormula('@toddle/groupBy', (args, ctx) => {
    const items = args.items as any[];
    const keyFn = args.key as ((item: any) => string) | undefined;
    if (!Array.isArray(items)) return null;
    if (typeof keyFn !== 'function') return null;
    const result: Record<string, any[]> = {};
    for (const item of items) {
      const key = String(keyFn({ item }) ?? '');
      if (!result[key]) result[key] = [];
      result[key].push(item);
    }
    return result;
  });

  // keyBy - index array by key
  registerFormula('@toddle/keyBy', (args, ctx) => {
    const items = args.items as any[];
    const keyFn = args.key as ((item: any) => string) | undefined;
    if (!Array.isArray(items)) return null;
    if (typeof keyFn !== 'function') return null;
    const result: Record<string, any> = {};
    for (const item of items) {
      const key = String(keyFn({ item }) ?? '');
      result[key] = item;
    }
    return result;
  });
}
