/**
 * Unknown Variable Rule
 * Checks for references to non-existent variables
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const unknownVariableRule: Rule = {
  code: 'unknown variable',
  level: 'error',
  category: 'variables',
  visit: (report, ctx) => {
    // Walk all formula paths and check variable references
    const walkFormula = (formula: Formula, component: string, path: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;
      
      if (formula.type === 'path') {
        const pathParts = formula.path;
        if (pathParts?.[0] === 'Variables') {
          const varName = pathParts[1] as string;
          const comp = ctx.files.components?.[component];
          if (comp && !comp.variables?.[varName]) {
            report({ variableName: varName }, path);
          }
        }
      }
      
      // Recursively check nested formulas
      for (const [key, value] of Object.entries(formula)) {
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              walkFormula(value[i] as Formula, component, [...path, key, i]);
            }
          } else if ((value as any).type) {
            walkFormula(value as Formula, component, [...path, key]);
          }
        }
      }
    };
    
    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      // Check formulas
      for (const [fnName, formula] of Object.entries(component.formulas || {})) {
        if (formula?.formula) {
          walkFormula(formula.formula, name, ['components', name, 'formulas', fnName]);
        }
      }
      
      // Check variables initial values
      for (const [varName, variable] of Object.entries(component.variables || {})) {
        if (variable?.initialValue) {
          walkFormula(variable.initialValue, name, ['components', name, 'variables', varName]);
        }
      }
    }
  }
};
