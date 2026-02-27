/**
 * Invalid List Children Rule
 * Detects <ul> and <ol> elements whose direct children are not <li> elements
 *
 * HTML spec requires that direct children of <ul> and <ol> must be <li> elements.
 */

import type { Rule } from '../../types';
import type { ComponentNode } from '@layr/types';

/**
 * Get the tag name of a child element node
 */
function getChildTagName(
  childId: string,
  nodes: Record<string, ComponentNode>
): string | null {
  const childNode = nodes[childId];
  if (!childNode || childNode.type !== 'element') {
    return null;
  }
  return childNode.tag;
}

export const invalidListChildrenRule: Rule<{ tag: string; invalidChildren: string[] }> = {
  code: 'invalid list children',
  level: 'error',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;

        // Only check ul and ol elements
        if (elementNode.tag !== 'ul' && elementNode.tag !== 'ol') continue;

        const children = elementNode.children || [];
        const invalidChildren: string[] = [];

        for (const childId of children) {
          // Children are stored as references to other node IDs
          if (typeof childId === 'string') {
            const childTag = getChildTagName(childId, component.nodes);

            // If it's an element and not an li, it's invalid
            if (childTag && childTag !== 'li') {
              invalidChildren.push(childTag);
            }
          }
        }

        if (invalidChildren.length > 0) {
          report(
            { tag: elementNode.tag, invalidChildren },
            ['components', compName, 'nodes', nodeId]
          );
        }
      }
    }
  },
};
