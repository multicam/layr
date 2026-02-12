// Formula registry
import type { FormulaContext } from '@layr/core';

export type FormulaHandler = (args: Record<string, unknown>, ctx: FormulaContext) => unknown;
export type FormulaRegistry = Map<string, FormulaHandler>;

export const formulas: FormulaRegistry = new Map();

// Register a formula
export function registerFormula(name: string, handler: FormulaHandler): void {
  formulas.set(name, handler);
}

// Get a formula
export function getFormula(name: string): FormulaHandler | undefined {
  return formulas.get(name);
}

// Import and register all formulas
import { registerArrayFormulas } from './formulas/array';
import { registerStringFormulas } from './formulas/string';
import { registerNumberFormulas } from './formulas/number';
import { registerObjectFormulas } from './formulas/object';
import { registerLogicFormulas } from './formulas/logic';
import { registerComparisonFormulas } from './formulas/comparison';
import { registerUtilityFormulas } from './formulas/utility';

registerArrayFormulas();
registerStringFormulas();
registerNumberFormulas();
registerObjectFormulas();
registerLogicFormulas();
registerComparisonFormulas();
registerUtilityFormulas();

console.log(`Registered ${formulas.size} formulas`);
