import { registerFormula } from '../index';

export function registerLogicFormulas(): void {
  registerFormula('@toddle/equals', (args, ctx) => {
    return args.a === args.b;
  });

  registerFormula('@toddle/not-equals', (args, ctx) => {
    return args.a !== args.b;
  });

  registerFormula('@toddle/not', (args, ctx) => {
    return !args.value;
  });

  registerFormula('@toddle/if', (args, ctx) => {
    const condition = Boolean(args.condition);
    return condition ? args.then : args.else;
  });

  registerFormula('@toddle/switch', (args, ctx) => {
    const value = args.value;
    const cases = args.cases as Record<string, unknown>;
    const defaultCase = args.default;
    
    if (typeof cases !== 'object' || cases === null) {
      return defaultCase;
    }
    
    const key = String(value);
    return cases[key] ?? defaultCase;
  });

  registerFormula('@toddle/is-null', (args, ctx) => {
    return args.value === null || args.value === undefined;
  });

  registerFormula('@toddle/is-not-null', (args, ctx) => {
    return args.value !== null && args.value !== undefined;
  });

  registerFormula('@toddle/is-empty', (args, ctx) => {
    const value = args.value;
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  });
}
