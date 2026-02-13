/**
 * Formula Evaluation Engine
 * Based on specs/formula-system.md and specs/formula-evaluation-engine.md
 * 
 * Informed by SolidJS computed values and Svelte reactivity
 */

import type {
  Formula,
  ValueOperation,
  PathOperation,
  FunctionOperation,
  ObjectOperation,
  ArrayOperation,
  SwitchOperation,
  OrOperation,
  AndOperation,
  ApplyOperation,
  RecordOperation,
} from '@layr/types';

import { FormulaContext } from './context';

// Maximum evaluation depth
const MAX_FORMULA_DEPTH = 256;

/**
 * Evaluate a formula
 */
export function applyFormula(
  formula: Formula,
  ctx: FormulaContext,
  depth: number = 0
): unknown {
  // Depth limit check
  if (depth > MAX_FORMULA_DEPTH) {
    const error = new Error(`Formula depth limit exceeded (${MAX_FORMULA_DEPTH})`);
    ctx.toddle.errors.push(error);
    if (ctx.env?.logErrors) {
      console.error(error);
    }
    return null;
  }

  try {
    switch (formula.type) {
      case 'value':
        return evaluateValue(formula);
      
      case 'path':
        return evaluatePath(formula, ctx);
      
      case 'function':
        return evaluateFunction(formula, ctx, depth);
      
      case 'object':
        return evaluateObject(formula, ctx, depth);
      
      case 'array':
        return evaluateArray(formula, ctx, depth);
      
      case 'switch':
        return evaluateSwitch(formula, ctx, depth);
      
      case 'or':
        return evaluateOr(formula, ctx, depth);
      
      case 'and':
        return evaluateAnd(formula, ctx, depth);
      
      case 'apply':
        return evaluateApply(formula, ctx, depth);
      
      case 'record':
        return evaluateObject(formula, ctx, depth); // Same as object
      
      default:
        return null;
    }
  } catch (e) {
    ctx.toddle.errors.push(e instanceof Error ? e : new Error(String(e)));
    if (ctx.env?.logErrors) {
      console.error('Formula evaluation error:', e);
    }
    return null;
  }
}

// ============================================================================
// Operation Evaluators
// ============================================================================

function evaluateValue(formula: ValueOperation): unknown {
  return formula.value;
}

function evaluatePath(formula: PathOperation, ctx: FormulaContext): unknown {
  const path = formula.path;
  let current: any = ctx.data;

  for (const segment of path) {
    if (current == null) {
      return null;
    }

    // Guard against prototype pollution
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
      return null;
    }

    // Handle array index access
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      current = current[parseInt(segment, 10)];
    } else if (typeof current === 'object') {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        return null;
      }
      current = current[segment];
    } else {
      return null;
    }
  }

  return current ?? null;
}

function evaluateFunction(
  formula: FunctionOperation,
  ctx: FormulaContext,
  depth: number
): unknown {
  const packageName = formula.package ?? ctx.package;
  
  // Try V2 lookup
  const handler = ctx.toddle.getCustomFormula(formula.name, packageName);
  
  if (handler) {
    // Build named arguments
    const args: Record<string, unknown> = {};
    
    for (const arg of formula.arguments ?? []) {
      if (arg.name) {
        if (arg.isFunction) {
          // Create closure for higher-order functions
          args[arg.name] = (innerArgs: any) => {
            const innerCtx: FormulaContext = {
              ...ctx,
              data: {
                ...ctx.data,
                Args: innerArgs,
              },
            };
            return applyFormula(arg.formula, innerCtx, depth + 1);
          };
        } else {
          args[arg.name] = applyFormula(arg.formula, ctx, depth + 1);
        }
      }
    }
    
    // Call handler
    if (typeof handler === 'function') {
      return handler(args, ctx);
    }
    
    // If it's a ToddleFormula, evaluate its formula
    if (handler.formula) {
      return applyFormula(handler.formula, {
        ...ctx,
        data: {
          ...ctx.data,
          Args: args,
        },
      }, depth + 1);
    }
    
    return null;
  }
  
  // Try legacy lookup
  const legacyHandler = ctx.toddle.getFormula(formula.name);
  if (legacyHandler) {
    const args = (formula.arguments ?? []).map((arg) =>
      applyFormula(arg.formula, ctx, depth + 1)
    );
    return legacyHandler(args, ctx);
  }
  
  // Not found
  console.warn(`Formula not found: ${formula.name}`);
  return null;
}

function evaluateObject(
  formula: ObjectOperation | RecordOperation,
  ctx: FormulaContext,
  depth: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const arg of formula.arguments ?? []) {
    if (arg.name) {
      result[arg.name] = applyFormula(arg.formula, ctx, depth + 1);
    }
  }
  
  return result;
}

function evaluateArray(
  formula: ArrayOperation,
  ctx: FormulaContext,
  depth: number
): unknown[] {
  return formula.arguments.map((arg) => applyFormula(arg.formula, ctx, depth + 1));
}

function evaluateSwitch(
  formula: SwitchOperation,
  ctx: FormulaContext,
  depth: number
): unknown {
  for (const case_ of formula.cases) {
    const condition = applyFormula(case_.condition, ctx, depth + 1);
    if (toBoolean(condition)) {
      return applyFormula(case_.formula, ctx, depth + 1);
    }
  }
  
  return applyFormula(formula.default, ctx, depth + 1);
}

function evaluateOr(
  formula: OrOperation,
  ctx: FormulaContext,
  depth: number
): boolean {
  for (const arg of formula.arguments) {
    const value = applyFormula(arg.formula, ctx, depth + 1);
    if (toBoolean(value)) {
      return true;
    }
  }
  return false;
}

function evaluateAnd(
  formula: AndOperation,
  ctx: FormulaContext,
  depth: number
): boolean {
  for (const arg of formula.arguments) {
    const value = applyFormula(arg.formula, ctx, depth + 1);
    if (!toBoolean(value)) {
      return false;
    }
  }
  return true;
}

function evaluateApply(
  formula: ApplyOperation,
  ctx: FormulaContext,
  depth: number
): unknown {
  const componentFormula = ctx.component?.formulas?.[formula.name];
  
  if (!componentFormula) {
    console.warn(`Component formula not found: ${formula.name}`);
    return null;
  }
  
  // Build args
  const args: Record<string, unknown> = {};
  for (const arg of formula.arguments ?? []) {
    if (arg.name) {
      if (arg.isFunction) {
        args[arg.name] = (innerArgs: any) => {
          const innerCtx: FormulaContext = {
            ...ctx,
            data: { ...ctx.data, Args: innerArgs },
          };
          return applyFormula(arg.formula, innerCtx, depth + 1);
        };
      } else {
        args[arg.name] = applyFormula(arg.formula, ctx, depth + 1);
      }
    }
  }
  
  // Check cache
  if (componentFormula.memoize && ctx.formulaCache) {
    const cache = ctx.formulaCache[formula.name];
    if (cache) {
      const key = JSON.stringify(args); // Cache key based on arguments only
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = applyFormula(componentFormula.formula, {
        ...ctx,
        data: {
          ...ctx.data,
          Args: args,
        },
      }, depth + 1);

      cache.set(key, result);
      return result;
    }
  }
  
  return applyFormula(componentFormula.formula, {
    ...ctx,
    data: {
      ...ctx.data,
      Args: args,
    },
  }, depth + 1);
}

// ============================================================================
// Utilities
// ============================================================================

export function toBoolean(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !isNaN(value) && value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}
