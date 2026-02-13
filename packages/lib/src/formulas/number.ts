import { registerFormula } from '../index';

export function registerNumberFormulas(): void {
  registerFormula('@toddle/add', (args, ctx) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 0);
    return a + b;
  });

  registerFormula('@toddle/subtract', (args, ctx) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 0);
    return a - b;
  });

  registerFormula('@toddle/multiply', (args, ctx) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 0);
    return a * b;
  });

  registerFormula('@toddle/divide', (args, ctx) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 0);
    if (b === 0) return null;
    return a / b;
  });

  registerFormula('@toddle/mod', (args, ctx) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 1);
    if (b === 0) return null;
    return a % b;
  });

  registerFormula('@toddle/power', (args, ctx) => {
    const base = Number(args.base ?? 0);
    const exponent = Number(args.exponent ?? 1);
    return Math.pow(base, exponent);
  });

  registerFormula('@toddle/sqrt', (args, ctx) => {
    const value = Number(args.value ?? 0);
    if (value < 0) return null;
    return Math.sqrt(value);
  });

  registerFormula('@toddle/abs', (args, ctx) => {
    const value = Number(args.value ?? 0);
    return Math.abs(value);
  });

  registerFormula('@toddle/round', (args, ctx) => {
    const value = Number(args.value ?? 0);
    const decimals = Math.max(0, Math.floor(Number(args.decimals ?? 0)));
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  });

  registerFormula('@toddle/floor', (args, ctx) => {
    const value = Number(args.value ?? 0);
    return Math.floor(value);
  });

  registerFormula('@toddle/ceil', (args, ctx) => {
    const value = Number(args.value ?? 0);
    return Math.ceil(value);
  });

  registerFormula('@toddle/min', (args, ctx) => {
    const values = args.values as number[];
    if (!Array.isArray(values) || values.length === 0) return null;
    let result = Number(values[0]);
    for (let i = 1; i < values.length; i++) {
      const v = Number(values[i]);
      if (isNaN(v)) continue;
      if (isNaN(result) || v < result) result = v;
    }
    return isNaN(result) ? null : result;
  });

  registerFormula('@toddle/max', (args, ctx) => {
    const values = args.values as number[];
    if (!Array.isArray(values) || values.length === 0) return null;
    let result = Number(values[0]);
    for (let i = 1; i < values.length; i++) {
      const v = Number(values[i]);
      if (isNaN(v)) continue;
      if (isNaN(result) || v > result) result = v;
    }
    return isNaN(result) ? null : result;
  });

  registerFormula('@toddle/random', (args, ctx) => {
    const min = Number(args.min ?? 0);
    const max = Number(args.max ?? 1);
    return Math.random() * (max - min) + min;
  });

  registerFormula('@toddle/clamp', (args, ctx) => {
    const value = Number(args.value ?? 0);
    const min = Number(args.min ?? 0);
    const max = Number(args.max ?? 1);
    return Math.min(Math.max(value, min), max);
  });
}
