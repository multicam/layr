/**
 * Non-Empty Void Element Rule
 * Detects void HTML elements that have children (invalid HTML)
 *
 * Void elements in HTML: area, base, br, col, embed, hr, img, input,
 *                         link, meta, param, source, track, wbr
 */

import type { Rule } from '../../types';

// HTML void elements - elements that cannot have children
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export const nonEmptyVoidElementRule: Rule<{ tag: string; childrenCount: number }> = {
  code: 'non empty void element',
  level: 'error',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;
        if (VOID_ELEMENTS.has(elementNode.tag)) {
          const children = elementNode.children || [];
          if (children.length > 0) {
            report(
              { tag: elementNode.tag, childrenCount: children.length },
              ['components', compName, 'nodes', nodeId]
            );
          }
        }
      }
    }
  },
};
