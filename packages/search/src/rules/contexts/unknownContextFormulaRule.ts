/**
 * Unknown Context Formula Rule
 * Detects formulas that reference Contexts.X.Y where X is not declared or Y is not in the declared formulas
 */

import type { Rule } from '../../types';
import type { Formula, Component } from '@layr/types';

/**
 * Recursively find all path formulas that start with 'Contexts'
 */
function* findContextPathFormulas(
  formula: Formula | undefined,
  path: (string | number)[]
): Generator<{ formula: Formula; path: (string | number)[] }> {
  if (!formula) return;

  if (formula.type === 'path' && formula.path?.[0] === 'Contexts') {
    yield { formula, path };
  }

  // Recurse into nested formulas
  if (formula.type === 'object' || formula.type === 'record') {
    for (const [i, arg] of (formula.arguments || []).entries()) {
      yield* findContextPathFormulas(arg?.formula, [...path, 'arguments', i, 'formula']);
    }
  } else if (formula.type === 'array') {
    for (const [i, arg] of (formula.arguments || []).entries()) {
      yield* findContextPathFormulas(arg?.formula, [...path, 'arguments', i, 'formula']);
    }
  } else if (formula.type === 'or' || formula.type === 'and') {
    for (const [i, arg] of (formula.arguments || []).entries()) {
      yield* findContextPathFormulas(arg?.formula, [...path, 'arguments', i, 'formula']);
    }
  } else if (formula.type === 'function') {
    for (const [i, arg] of (formula.arguments || []).entries()) {
      yield* findContextPathFormulas(arg?.formula, [...path, 'arguments', i, 'formula']);
    }
  } else if (formula.type === 'apply') {
    for (const [i, arg] of (formula.arguments || []).entries()) {
      yield* findContextPathFormulas(arg?.formula, [...path, 'arguments', i, 'formula']);
    }
  } else if (formula.type === 'switch') {
    for (const [i, case_] of (formula.cases || []).entries()) {
      yield* findContextPathFormulas(case_?.condition, [...path, 'cases', i, 'condition']);
      yield* findContextPathFormulas(case_?.formula, [...path, 'cases', i, 'formula']);
    }
    yield* findContextPathFormulas(formula.default, [...path, 'default']);
  }
}

/**
 * Recursively find all formulas in a component
 */
function* findAllFormulas(
  component: Component,
  basePath: (string | number)[]
): Generator<{ formula: Formula; path: (string | number)[] }> {
  // Component formulas
  for (const [name, f] of Object.entries(component.formulas || {})) {
    if (!f) continue;
    yield* findContextPathFormulas(f.formula, [...basePath, 'formulas', name, 'formula']);
  }

  // Variable initial values
  for (const [name, v] of Object.entries(component.variables || {})) {
    if (!v) continue;
    yield* findContextPathFormulas(v.initialValue, [...basePath, 'variables', name, 'initialValue']);
  }

  // Nodes
  for (const [nodeId, node] of Object.entries(component.nodes || {})) {
    if (!node) continue;

    // Node condition
    if ('condition' in node && node.condition) {
      yield* findContextPathFormulas(node.condition as Formula, [...basePath, 'nodes', nodeId, 'condition']);
    }

    // Node repeat
    if ('repeat' in node && node.repeat) {
      yield* findContextPathFormulas(node.repeat as Formula, [...basePath, 'nodes', nodeId, 'repeat']);
    }

    // Element node attrs
    if (node.type === 'element' && 'attrs' in node) {
      const elementNode = node as any;
      for (const [attrName, attrFormula] of Object.entries(elementNode.attrs || {})) {
        yield* findContextPathFormulas(attrFormula as Formula, [...basePath, 'nodes', nodeId, 'attrs', attrName]);
      }
    }

    // Text node value
    if (node.type === 'text' && 'value' in node) {
      const textNode = node as any;
      yield* findContextPathFormulas(textNode.value as Formula, [...basePath, 'nodes', nodeId, 'value']);
    }

    // Component node attrs
    if (node.type === 'component' && 'attrs' in node) {
      const compNode = node as any;
      for (const [attrName, attrFormula] of Object.entries(compNode.attrs || {})) {
        yield* findContextPathFormulas(attrFormula as Formula, [...basePath, 'nodes', nodeId, 'attrs', attrName]);
      }
    }
  }
}

export const unknownContextFormulaRule: Rule<{
  contextKey: string;
  formulaName: string;
  availableFormulas: string[];
}> = {
  code: 'unknown context formula',
  level: 'error',
  category: 'contexts',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Build a map of available context formulas for this component
      const contextFormulas = new Map<string, Set<string>>();
      for (const [contextKey, context] of Object.entries(component.contexts || {})) {
        if (!context) continue;
        contextFormulas.set(contextKey, new Set(context.formulas || []));
      }

      // Find all context path formulas
      for (const { formula, path } of findAllFormulas(component, ['components', compName])) {
        const pathFormula = formula as { type: 'path'; path: string[] };
        const contextPath = pathFormula.path;

        // Contexts.X.Y format
        if (contextPath.length >= 3 && contextPath[0] === 'Contexts') {
          const contextKey = contextPath[1];
          const formulaName = contextPath[2];

          // Check if context is declared
          const availableFormulas = contextFormulas.get(contextKey);
          if (!availableFormulas) {
            report(
              { contextKey, formulaName, availableFormulas: [] },
              path
            );
            continue;
          }

          // Check if formula is in declared formulas
          if (!availableFormulas.has(formulaName)) {
            report(
              { contextKey, formulaName, availableFormulas: Array.from(availableFormulas) },
              path
            );
          }
        }
      }
    }
  },
};
