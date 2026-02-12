import { registerFormula } from '../index';

export function registerComparisonFormulas(): void {
  registerFormula('@toddle/greater-than', (args, ctx) => {
    const a = Number(args.a);
    const b = Number(args.b);
    if (isNaN(a) || isNaN(b)) return false;
    return a > b;
  });

  registerFormula('@toddle/greater-than-or-equal', (args, ctx) => {
    const a = Number(args.a);
    const b = Number(args.b);
    if (isNaN(a) || isNaN(b)) return false;
    return a >= b;
  });

  registerFormula('@toddle/less-than', (args, ctx) => {
    const a = Number(args.a);
    const b = Number(args.b);
    if (isNaN(a) || isNaN(b)) return false;
    return a < b;
  });

  registerFormula('@toddle/less-than-or-equal', (args, ctx) => {
    const a = Number(args.a);
    const b = Number(args.b);
    if (isNaN(a) || isNaN(b)) return false;
    return a <= b;
  });

  registerFormula('@toddle/between', (args, ctx) => {
    const value = Number(args.value);
    const min = Number(args.min);
    const max = Number(args.max);
    if (isNaN(value) || isNaN(min) || isNaN(max)) return false;
    return value >= min && value <= max;
  });
}
