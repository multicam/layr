/**
 * Unknown URL Parameter Rule
 * Detects formulas that reference URL parameters not defined in the route
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

/**
 * Extract URL parameter names from a route path
 * e.g., "/users/:id/posts/:postId" -> ["id", "postId"]
 */
function extractPathParams(path: string): Set<string> {
  const params = new Set<string>();
  const regex = /:([^/]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    params.add(match[1]);
  }

  return params;
}

export const unknownUrlParameterRule: Rule<{ paramName: string }> = {
  code: 'unknown url parameter',
  level: 'error',
  category: 'routing',
  visit: (report, ctx) => {
    // Walk all formula paths and check URL parameter references
    const walkFormula = (
      formula: Formula,
      component: string,
      path: (string | number)[],
      routeParams: Set<string>
    ): void => {
      if (!formula || typeof formula !== 'object') return;

      if (formula.type === 'path') {
        const pathParts = formula.path;
        if (pathParts?.[0] === 'URL' && pathParts.length >= 2) {
          const paramName = pathParts[1] as string;
          if (!routeParams.has(paramName)) {
            report({ paramName }, path);
          }
        }
      }

      // Recursively check nested formulas
      for (const [key, value] of Object.entries(formula)) {
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              walkFormula(value[i] as Formula, component, [...path, key, i], routeParams);
            }
          } else if ((value as any).type) {
            walkFormula(value as Formula, component, [...path, key], routeParams);
          }
        }
      }
    };

    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Only check components with routes (pages)
      if (!component.route?.path) continue;

      const routeParams = extractPathParams(component.route.path);

      // If no route params, all URL references are invalid
      // Check formulas
      for (const [fnName, formula] of Object.entries(component.formulas || {})) {
        if (formula?.formula) {
          walkFormula(formula.formula, name, ['components', name, 'formulas', fnName], routeParams);
        }
      }

      // Check variables initial values
      for (const [varName, variable] of Object.entries(component.variables || {})) {
        if (variable?.initialValue) {
          walkFormula(variable.initialValue, name, ['components', name, 'variables', varName], routeParams);
        }
      }

      // Check all nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        // Check node condition
        if (node.condition) {
          walkFormula(node.condition, name, ['components', name, 'nodes', nodeId, 'condition'], routeParams);
        }

        // Check node repeat
        if (node.repeat) {
          walkFormula(node.repeat, name, ['components', name, 'nodes', nodeId, 'repeat'], routeParams);
        }

        // Check element attributes
        if (node.type === 'element' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              walkFormula(attrValue as Formula, name, ['components', name, 'nodes', nodeId, 'attrs', attrName], routeParams);
            }
          }
        }

        // Check component node attributes
        if (node.type === 'component' && node.attrs) {
          for (const [attrName, attrValue] of Object.entries(node.attrs)) {
            if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
              walkFormula(attrValue as Formula, name, ['components', name, 'nodes', nodeId, 'attrs', attrName], routeParams);
            }
          }
        }

        // Check text node value
        if (node.type === 'text' && node.value && typeof node.value === 'object' && 'type' in node.value) {
          walkFormula(node.value as Formula, name, ['components', name, 'nodes', nodeId, 'value'], routeParams);
        }
      }

      // Check route formulas (title, description, icon)
      const route = component.route as any;
      if (route.title) {
        walkFormula(route.title, name, ['components', name, 'route', 'title'], routeParams);
      }
      if (route.description) {
        walkFormula(route.description, name, ['components', name, 'route', 'description'], routeParams);
      }
      if (route.icon) {
        walkFormula(route.icon, name, ['components', name, 'route', 'icon'], routeParams);
      }

      // Check APIs
      for (const [apiName, api] of Object.entries(component.apis || {})) {
        if (!api) continue;

        const apiFormulaFields = ['url', 'body', 'method', 'timeout', 'credentials', 'parserMode', 'isError', 'autoFetch'] as const;
        for (const field of apiFormulaFields) {
          if ((api as any)[field]) {
            walkFormula((api as any)[field], name, ['components', name, 'apis', apiName, field], routeParams);
          }
        }

        if (api.headers) {
          for (const [headerName, header] of Object.entries(api.headers)) {
            if (header?.formula) {
              walkFormula(header.formula, name, ['components', name, 'apis', apiName, 'headers', headerName, 'formula'], routeParams);
            }
            if (header?.enabled) {
              walkFormula(header.enabled, name, ['components', name, 'apis', apiName, 'headers', headerName, 'enabled'], routeParams);
            }
          }
        }

        if (api.queryParams) {
          for (const [paramName, param] of Object.entries(api.queryParams)) {
            if (param?.formula) {
              walkFormula(param.formula, name, ['components', name, 'apis', apiName, 'queryParams', paramName, 'formula'], routeParams);
            }
            if (param?.enabled) {
              walkFormula(param.enabled, name, ['components', name, 'apis', apiName, 'queryParams', paramName, 'enabled'], routeParams);
            }
          }
        }
      }
    }
  },
};
