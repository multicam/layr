/**
 * No Reference Project Formula Rule
 * Detects project-level formulas that are defined but never called
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const noReferenceProjectFormulaRule: Rule<{ formulaName: string }> = {
  code: 'no reference project formula',
  level: 'warning',
  category: 'formulas',
  visit: (report, ctx) => {
    const projectFormulas = ctx.files.formulas || {};
    const projectFormulaNames = new Set(Object.keys(projectFormulas));

    // If no project formulas, nothing to check
    if (projectFormulaNames.size === 0) return;

    // Collect all referenced project formula names
    const referencedFormulas = new Set<string>();

    const collectFormulaRefs = (formula: Formula): void => {
      if (!formula || typeof formula !== 'object') return;

      if (formula.type === 'path') {
        const pathParts = formula.path;
        // Project formulas are referenced as Formulas.FormulaName without component prefix
        if (pathParts?.[0] === 'Formulas' && pathParts.length >= 2) {
          const formulaName = pathParts[1] as string;
          // Only count if it's a project formula
          if (projectFormulaNames.has(formulaName)) {
            referencedFormulas.add(formulaName);
          }
        }
      }

      if (formula.type === 'apply') {
        // Apply operations call formulas
        if (projectFormulaNames.has(formula.name)) {
          referencedFormulas.add(formula.name);
        }
      }

      // Recursively check nested formulas
      for (const value of Object.values(formula)) {
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            for (const item of value) {
              if (item && typeof item === 'object') {
                if ('formula' in item) {
                  collectFormulaRefs((item as any).formula);
                } else {
                  collectFormulaRefs(item as Formula);
                }
              }
            }
          } else if ((value as any).type) {
            collectFormulaRefs(value as Formula);
          }
        }
      }
    };

    // Check all components
    for (const component of Object.values(ctx.files.components || {})) {
      if (!component) continue;

      // Check formulas
      for (const formula of Object.values(component.formulas || {})) {
        if (formula?.formula) {
          collectFormulaRefs(formula.formula);
        }
      }

      // Check variables
      for (const variable of Object.values(component.variables || {})) {
        if (variable?.initialValue) {
          collectFormulaRefs(variable.initialValue);
        }
      }

      // Check nodes
      for (const node of Object.values(component.nodes || {})) {
        if (!node) continue;

        if (node.condition) collectFormulaRefs(node.condition);
        if (node.repeat) collectFormulaRefs(node.repeat);

        if (node.type === 'element' && node.attrs) {
          for (const attrValue of Object.values(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              collectFormulaRefs(attrValue as Formula);
            }
          }
        }

        if (node.type === 'component' && node.attrs) {
          for (const attrValue of Object.values(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              collectFormulaRefs(attrValue as Formula);
            }
          }
        }

        if (node.type === 'text' && node.value && typeof node.value === 'object' && 'type' in node.value) {
          collectFormulaRefs(node.value as Formula);
        }
      }

      // Check APIs
      for (const api of Object.values(component.apis || {})) {
        if (!api) continue;

        const apiFormulaFields = ['url', 'body', 'method', 'timeout', 'credentials', 'parserMode', 'isError', 'autoFetch'] as const;
        for (const field of apiFormulaFields) {
          if ((api as any)[field]) {
            collectFormulaRefs((api as any)[field]);
          }
        }

        if (api.headers) {
          for (const header of Object.values(api.headers)) {
            if (header?.formula) collectFormulaRefs(header.formula);
            if (header?.enabled) collectFormulaRefs(header.enabled);
          }
        }

        if (api.queryParams) {
          for (const param of Object.values(api.queryParams)) {
            if (param?.formula) collectFormulaRefs(param.formula);
            if (param?.enabled) collectFormulaRefs(param.enabled);
          }
        }
      }

      // Check route formulas
      const route = component.route as any;
      if (route?.title) collectFormulaRefs(route.title);
      if (route?.description) collectFormulaRefs(route.description);
      if (route?.icon) collectFormulaRefs(route.icon);
    }

    // Check project formulas themselves (they can reference each other)
    for (const formula of Object.values(projectFormulas)) {
      if (formula?.formula) {
        collectFormulaRefs(formula.formula);
      }
    }

    // Report project formulas that are never referenced
    for (const formulaName of projectFormulaNames) {
      if (!referencedFormulas.has(formulaName)) {
        report({ formulaName }, ['formulas', formulaName]);
      }
    }
  },
};
