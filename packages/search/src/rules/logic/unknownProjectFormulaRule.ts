/**
 * Unknown Project Formula Rule
 * Checks for references to project formulas that do not exist
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const unknownProjectFormulaRule: Rule<{ formulaName: string }> = {
  code: 'unknown project formula',
  level: 'error',
  category: 'logic',
  visit: (report, ctx) => {
    const projectFormulas = ctx.files.formulas || {};
    const projectFormulaNames = new Set(Object.keys(projectFormulas));

    // Helper to check a formula for project formula references
    const checkFormula = (formula: Formula | undefined, path: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;

      if (formula.type === 'path') {
        const pathParts = formula.path;
        // Project formulas are referenced as Formulas.FormulaName
        if (pathParts?.[0] === 'Formulas' && pathParts.length >= 2) {
          const formulaName = pathParts[1] as string;
          // Only report if it's not a known project formula
          // Note: unknownFormulaRule handles component formulas
          if (!projectFormulaNames.has(formulaName)) {
            // Check if this is a project formula reference (no component prefix)
            // If it exists as a component formula in some component, it's not a project formula issue
            let isComponentFormula = false;
            for (const component of Object.values(ctx.files.components || {})) {
              if (component?.formulas?.[formulaName]) {
                isComponentFormula = true;
                break;
              }
            }
            // Only report if it's not a component formula and not a project formula
            if (!isComponentFormula) {
              report({ formulaName }, path);
            }
          }
        }
      }

      // Recursively check nested formulas
      if (formula.type === 'array' && Array.isArray(formula.value)) {
        for (let i = 0; i < formula.value.length; i++) {
          checkFormula(formula.value[i], [...path, 'value', i]);
        }
      }

      if (formula.type === 'object' && formula.value && typeof formula.value === 'object') {
        for (const [key, value] of Object.entries(formula.value as Record<string, Formula>)) {
          checkFormula(value, [...path, 'value', key]);
        }
      }

      if (formula.type === 'function') {
        if (formula.parameters) {
          for (const param of formula.parameters) {
            if (param.formula) {
              checkFormula(param.formula, path);
            }
          }
        }
      }
    };

    // Check all components
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check formulas
      for (const [formulaName, formula] of Object.entries(component.formulas || {})) {
        if (formula?.formula) {
          checkFormula(formula.formula, ['components', compName, 'formulas', formulaName, 'formula']);
        }
      }

      // Check variables
      for (const [varName, variable] of Object.entries(component.variables || {})) {
        if (variable?.initialValue) {
          checkFormula(variable.initialValue, ['components', compName, 'variables', varName, 'initialValue']);
        }
      }

      // Check nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        if (node.condition) {
          checkFormula(node.condition, ['components', compName, 'nodes', nodeId, 'condition']);
        }
        if (node.repeat) {
          checkFormula(node.repeat, ['components', compName, 'nodes', nodeId, 'repeat']);
        }

        if (node.type === 'element' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            checkFormula(attrValue, ['components', compName, 'nodes', nodeId, 'attrs', attrName]);
          }
        }

        if (node.type === 'component' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            checkFormula(attrValue, ['components', compName, 'nodes', nodeId, 'attrs', attrName]);
          }
        }

        if (node.type === 'text' && node.value) {
          checkFormula(node.value, ['components', compName, 'nodes', nodeId, 'value']);
        }
      }

      // Check APIs
      for (const [apiName, api] of Object.entries(component.apis || {})) {
        if (!api) continue;

        const apiFormulaFields = ['url', 'body', 'method', 'timeout', 'credentials', 'parserMode', 'isError', 'autoFetch'] as const;
        for (const field of apiFormulaFields) {
          if ((api as any)[field]) {
            checkFormula((api as any)[field], ['components', compName, 'apis', apiName, field]);
          }
        }

        if (api.headers) {
          for (const [headerName, header] of Object.entries(api.headers)) {
            if (header?.formula) {
              checkFormula(header.formula, ['components', compName, 'apis', apiName, 'headers', headerName, 'formula']);
            }
          }
        }

        if (api.queryParams) {
          for (const [paramName, param] of Object.entries(api.queryParams)) {
            if (param?.formula) {
              checkFormula(param.formula, ['components', compName, 'apis', apiName, 'queryParams', paramName, 'formula']);
            }
          }
        }
      }

      // Check route formulas
      const route = component.route as any;
      if (route?.title) {
        checkFormula(route.title, ['components', compName, 'route', 'title']);
      }
      if (route?.description) {
        checkFormula(route.description, ['components', compName, 'route', 'description']);
      }
      if (route?.icon) {
        checkFormula(route.icon, ['components', compName, 'route', 'icon']);
      }
    }

    // Check project formulas themselves (they can reference each other)
    for (const [formulaName, formula] of Object.entries(projectFormulas)) {
      if (formula?.formula) {
        checkFormula(formula.formula, ['formulas', formulaName, 'formula']);
      }
    }
  },
};
