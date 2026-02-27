/**
 * Unknown Attribute Rule
 * Checks for references to non-existent attributes via Attributes.X path formulas
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

export const unknownAttributeRule: Rule = {
  code: 'unknown attribute',
  level: 'error',
  category: 'attributes',
  visit: (report, ctx) => {
    // Walk all formula paths and check attribute references
    const walkFormula = (formula: Formula, component: string, path: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;

      if (formula.type === 'path') {
        const pathParts = formula.path;
        if (pathParts?.[0] === 'Attributes') {
          const attrName = pathParts[1] as string;
          const comp = ctx.files.components?.[component];
          if (comp && !comp.attributes?.[attrName]) {
            report({ attributeName: attrName }, path);
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

      // Check all nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        // Check node condition
        if (node.condition) {
          walkFormula(node.condition, name, ['components', name, 'nodes', nodeId, 'condition']);
        }

        // Check node repeat
        if (node.repeat) {
          walkFormula(node.repeat, name, ['components', name, 'nodes', nodeId, 'repeat']);
        }

        // Check element attributes
        if (node.type === 'element' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              walkFormula(attrValue as Formula, name, ['components', name, 'nodes', nodeId, 'attrs', attrName]);
            }
          }
        }

        // Check component node attributes
        if (node.type === 'component' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              walkFormula(attrValue as Formula, name, ['components', name, 'nodes', nodeId, 'attrs', attrName]);
            }
          }
        }

        // Check text node value
        if (node.type === 'text' && node.value && typeof node.value === 'object' && 'type' in node.value) {
          walkFormula(node.value as Formula, name, ['components', name, 'nodes', nodeId, 'value']);
        }
      }

      // Check APIs
      for (const [apiName, api] of Object.entries(component.apis || {})) {
        if (!api) continue;

        // Check various formula fields in API
        const apiFormulaFields = ['url', 'body', 'method', 'timeout', 'credentials', 'parserMode', 'isError', 'autoFetch'] as const;
        for (const field of apiFormulaFields) {
          if ((api as any)[field]) {
            walkFormula((api as any)[field], name, ['components', name, 'apis', apiName, field]);
          }
        }

        // Check headers
        if (api.headers) {
          for (const [headerName, header] of Object.entries(api.headers)) {
            if (header?.formula) {
              walkFormula(header.formula, name, ['components', name, 'apis', apiName, 'headers', headerName, 'formula']);
            }
            if (header?.enabled) {
              walkFormula(header.enabled, name, ['components', name, 'apis', apiName, 'headers', headerName, 'enabled']);
            }
          }
        }

        // Check query params
        if (api.queryParams) {
          for (const [paramName, param] of Object.entries(api.queryParams)) {
            if (param?.formula) {
              walkFormula(param.formula, name, ['components', name, 'apis', apiName, 'queryParams', paramName, 'formula']);
            }
            if (param?.enabled) {
              walkFormula(param.enabled, name, ['components', name, 'apis', apiName, 'queryParams', paramName, 'enabled']);
            }
          }
        }
      }
    }
  }
};
