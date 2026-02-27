/**
 * No Reference Node Rule
 * Detects nodes that exist in the component's nodes map but are not reachable from the root node
 *
 * This indicates orphaned/dead code in the component tree.
 */

import type { Rule } from '../../types';
import type { Component, ComponentNode } from '@layr/types';

/**
 * Collect all reachable node IDs starting from the root
 */
function collectReachableNodes(component: Component): Set<string> {
  const reachable = new Set<string>();
  const nodes = component.nodes || {};

  // Find root node - typically the first node or a node marked as root
  // In toddle, the root is usually the node with id 'root' or the first node
  let rootId: string | undefined;

  // Look for explicit root marker or use 'root' as convention
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (nodeId === 'root' || (node as any).isRoot) {
      rootId = nodeId;
      break;
    }
  }

  // If no explicit root, use the first node
  if (!rootId) {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length > 0) {
      rootId = nodeIds[0];
    }
  }

  if (!rootId) return reachable;

  // BFS to find all reachable nodes
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    if (!nodes[nodeId]) continue;

    reachable.add(nodeId);
    const node = nodes[nodeId];

    // Add children to queue
    if (node.type === 'element' && node.children) {
      for (const childId of node.children) {
        if (typeof childId === 'string' && !reachable.has(childId)) {
          queue.push(childId);
        }
      }
    }

    // Add slot children
    if (node.type === 'slot' && (node as any).children) {
      for (const childId of (node as any).children) {
        if (typeof childId === 'string' && !reachable.has(childId)) {
          queue.push(childId);
        }
      }
    }

    // Add conditional branches
    if ((node as any).condition) {
      // Conditional nodes might have truthy/falsy branches
      if ((node as any).truthy && typeof (node as any).truthy === 'string') {
        queue.push((node as any).truthy);
      }
      if ((node as any).falsy && typeof (node as any).falsy === 'string') {
        queue.push((node as any).falsy);
      }
    }

    // Add repeat template
    if ((node as any).repeat) {
      const repeat = (node as any).repeat;
      if (repeat.template && typeof repeat.template === 'string') {
        queue.push(repeat.template);
      }
    }
  }

  return reachable;
}

export const noReferenceNodeRule: Rule<{ nodeId: string }> = {
  code: 'no reference node',
  level: 'warning',
  category: 'misc',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      const reachable = collectReachableNodes(component);
      const allNodeIds = Object.keys(component.nodes);

      // Report nodes that exist but aren't reachable
      for (const nodeId of allNodeIds) {
        if (!reachable.has(nodeId)) {
          report({ nodeId }, ['components', compName, 'nodes', nodeId]);
        }
      }
    }
  },
};
