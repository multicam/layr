/**
 * Unknown Formula Rule
 * Checks for references to non-existent formulas
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const unknownFormulaRule: Rule = {
  code: 'unknown formula',
  level: 'error',
  category: 'formulas',
  visit: (report, ctx) => {
    // Collect all formula names per component and globally
    const globalFormulas = new Set<string>();
    for (const name of Object.keys(ctx.files.formulas || {})) {
      globalFormulas.add(name);
    }
    
    // Add package formulas
    for (const pkg of Object.values(ctx.files.packages || {})) {
      if (!pkg) continue;
      for (const name of Object.keys(pkg.formulas || {})) {
        globalFormulas.add(`${pkg.manifest.name}/${name}`);
      }
    }
    
    // Walk all formula references
    const walkFormula = (formula: Formula, component: string, path: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;
      
      if (formula.type === 'path') {
        const pathParts = formula.path;
        if (pathParts?.[0] === 'Formulas') {
          const formulaName = pathParts[1] as string;
          const comp = ctx.files.components?.[component];
          const isLocalFormula = comp && comp.formulas?.[formulaName];
          const isGlobalFormula = globalFormulas.has(formulaName);
          
          if (!isLocalFormula && !isGlobalFormula) {
            report({ formulaName }, path);
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
      
      // Check formulas (formulas can reference other formulas)
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
      
      // Check nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;
        
        if (node.type === 'element' || node.type === 'component') {
          for (const [attrName, attrValue] of Object.entries(node.attrs || {})) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              walkFormula(attrValue as Formula, name, ['components', name, 'nodes', nodeId, 'attrs', attrName]);
            }
          }
        }
        
        if (node.type === 'text' && node.value && typeof node.value === 'object' && 'type' in node.value) {
          walkFormula(node.value as Formula, name, ['components', name, 'nodes', nodeId, 'value']);
        }
        
        if (node.condition) {
          walkFormula(node.condition, name, ['components', name, 'nodes', nodeId, 'condition']);
        }
        
        if (node.repeat) {
          walkFormula(node.repeat, name, ['components', name, 'nodes', nodeId, 'repeat']);
        }
      }
    }
  }
};
