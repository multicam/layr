/**
 * Missing Alt Attribute Rule
 * Detects <img> elements that are missing the alt attribute (accessibility)
 */

import type { Rule } from '../../types';
import type { Formula } from '@layr/types';

/**
 * Check if a formula statically evaluates to an empty/missing value
 * Only returns true for formulas that are definitely empty
 */
function isDefinitelyEmpty(formula: Formula | undefined): boolean {
  if (!formula) return true;

  if (formula.type === 'value') {
    const val = formula.value;
    return val === null || val === undefined || val === '';
  }

  return false;
}

/**
 * Check if a formula might have a value (not statically empty)
 */
function hasValue(formula: Formula | undefined): boolean {
  if (!formula) return false;

  if (formula.type === 'value') {
    const val = formula.value;
    return val !== null && val !== undefined && val !== '';
  }

  // Dynamic formulas might have values
  if (formula.type === 'path' || formula.type === 'function') {
    return true;
  }

  return false;
}

export const missingAltAttributeRule: Rule<{ tag: string }> = {
  code: 'missing alt attribute',
  level: 'warning',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;
        if (elementNode.tag === 'img') {
          const attrs = elementNode.attrs || {};
          const altAttr = attrs['alt'];

          // Report if alt is missing or definitely empty
          if (!hasValue(altAttr)) {
            report({ tag: elementNode.tag }, ['components', compName, 'nodes', nodeId]);
          }
        }
      }
    }
  },
};
