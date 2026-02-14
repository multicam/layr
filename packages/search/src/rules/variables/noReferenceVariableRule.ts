/**
 * No Reference Variable Rule
 * Checks for unused variables (variables that are never referenced)
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const noReferenceVariableRule: Rule = {
  code: 'no reference variable',
  level: 'warning',
  category: 'variables',
  visit: (report, ctx) => {
    // Walk all components to find unreferenced variables
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      const variableNames = Object.keys(component.variables || {});
      if (variableNames.length === 0) continue;
      
      const referencedVariables = new Set<string>();
      
      // Helper to check formula for variable references
      const checkFormula = (formula: Formula): void => {
        if (!formula || typeof formula !== 'object') return;
        
        if (formula.type === 'path') {
          const pathParts = formula.path;
          if (pathParts?.[0] === 'Variables') {
            const varName = pathParts[1] as string;
            referencedVariables.add(varName);
          }
        }
        
        // Recursively check nested formulas
        for (const value of Object.values(formula)) {
          if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
              for (const item of value) {
                checkFormula(item as Formula);
              }
            } else if ((value as any).type) {
              checkFormula(value as Formula);
            }
          }
        }
      };
      
      // Check formulas
      for (const formula of Object.values(component.formulas || {})) {
        if (formula?.formula) {
          checkFormula(formula.formula);
        }
      }
      
      // Check nodes
      for (const node of Object.values(component.nodes || {})) {
        if (!node) continue;
        
        if (node.type === 'element' || node.type === 'component') {
          for (const attrValue of Object.values(node.attrs || {})) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              checkFormula(attrValue as Formula);
            }
          }
          for (const styleValue of Object.values(node.style || {})) {
            if (styleValue && typeof styleValue === 'object' && 'type' in styleValue) {
              checkFormula(styleValue as Formula);
            }
          }
        }
        
        if (node.type === 'text' && node.value && typeof node.value === 'object' && 'type' in node.value) {
          checkFormula(node.value as Formula);
        }
        
        if (node.condition) {
          checkFormula(node.condition);
        }
        
        if (node.repeat) {
          checkFormula(node.repeat);
        }
      }
      
      // Check APIs
      for (const api of Object.values(component.apis || {})) {
        if (api?.url) checkFormula(api.url);
        if (api?.body) checkFormula(api.body);
        if (api?.method) checkFormula(api.method);
        if (api?.path) checkFormula(api.path);
        if (api?.bodyV1) checkFormula(api.bodyV1);
        if (api?.methodV1) checkFormula(api.methodV1);
        if (api?.headersV1) checkFormula(api.headersV1);
        if (api?.autoFetch) checkFormula(api.autoFetch);
        if (api?.timeout) checkFormula(api.timeout);
        if (api?.credentials) checkFormula(api.credentials);
        if (api?.parserMode) checkFormula(api.parserMode);
        if (api?.isError) checkFormula(api.isError);
        
        for (const header of Object.values(api?.headers || {})) {
          if (header?.formula) checkFormula(header.formula);
        }
        for (const queryParam of Object.values(api?.queryParams || {})) {
          if (queryParam?.formula) checkFormula(queryParam.formula);
        }
        for (const searchParam of api?.searchParams || []) {
          if (searchParam.value) checkFormula(searchParam.value);
        }
      }
      
      // Report unreferenced variables
      for (const varName of variableNames) {
        if (!referencedVariables.has(varName)) {
          report({ variableName: varName }, ['components', compName, 'variables', varName]);
        }
      }
    }
  }
};
