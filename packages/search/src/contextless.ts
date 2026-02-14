/**
 * Contextless Formula Evaluation
 * Static evaluation without runtime context
 * Based on specs/search-and-linting.md
 */

import type { Formula } from '@layr/types';

export interface ContextlessResult {
  isStatic: boolean;
  result: unknown;
}

/**
 * Evaluate a formula statically without runtime context.
 * Returns { isStatic, result } where isStatic indicates if the result
 * is deterministically computable.
 */
export function contextlessEvaluateFormula(formula: Formula): ContextlessResult {
  if (!formula || typeof formula !== 'object') {
    return { isStatic: false, result: undefined };
  }
  
  switch (formula.type) {
    case 'value':
      // Literal values are always static
      return { isStatic: true, result: formula.value };
      
    case 'array':
      // Array is static if all elements are static
      const arrayResult: unknown[] = [];
      for (const item of formula.items || []) {
        const itemResult = contextlessEvaluateFormula(item);
        if (!itemResult.isStatic) {
          return { isStatic: false, result: undefined };
        }
        arrayResult.push(itemResult.result);
      }
      return { isStatic: true, result: arrayResult };
      
    case 'record':
      // Record is static if all values are static
      const recordResult: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formula.properties || {})) {
        const valueResult = contextlessEvaluateFormula(value as Formula);
        if (!valueResult.isStatic) {
          return { isStatic: false, result: undefined };
        }
        recordResult[key] = valueResult.result;
      }
      return { isStatic: true, result: recordResult };
      
    case 'and':
      // AND is static if all true OR any false
      let allTrue = true;
      for (const operand of formula.operands || []) {
        const opResult = contextlessEvaluateFormula(operand);
        if (!opResult.isStatic) {
          return { isStatic: false, result: undefined };
        }
        if (!opResult.result) {
          // Found false - result is definitely false
          return { isStatic: true, result: false };
        }
        if (!opResult.result) allTrue = false;
      }
      return { isStatic: true, result: allTrue };
      
    case 'or':
      // OR is static if any true OR all false
      for (const operand of formula.operands || []) {
        const opResult = contextlessEvaluateFormula(operand);
        if (!opResult.isStatic) {
          return { isStatic: false, result: undefined };
        }
        if (opResult.result) {
          // Found true - result is definitely true
          return { isStatic: true, result: true };
        }
      }
      return { isStatic: true, result: false };
      
    case 'not':
      const notResult = contextlessEvaluateFormula(formula.operand);
      if (!notResult.isStatic) {
        return { isStatic: false, result: undefined };
      }
      return { isStatic: true, result: !notResult.result };
      
    case 'path':
      // Path access is never static (depends on runtime data)
      return { isStatic: false, result: undefined };
      
    case 'function':
      // Function calls are never static (depends on runtime evaluation)
      return { isStatic: false, result: undefined };
      
    case 'switch':
      // Switch is never static (depends on runtime conditions)
      return { isStatic: false, result: undefined };
      
    case 'error':
      return { isStatic: true, result: undefined };
      
    default:
      return { isStatic: false, result: undefined };
  }
}

/**
 * Check if a condition formula is always true
 */
export function isAlwaysTrue(formula: Formula): boolean {
  const result = contextlessEvaluateFormula(formula);
  return result.isStatic && result.result === true;
}

/**
 * Check if a condition formula is always false
 */
export function isAlwaysFalse(formula: Formula): boolean {
  const result = contextlessEvaluateFormula(formula);
  return result.isStatic && result.result === false;
}

/**
 * Check if a condition formula is static (always evaluates to same value)
 */
export function isStaticCondition(formula: Formula): boolean {
  return contextlessEvaluateFormula(formula).isStatic;
}
