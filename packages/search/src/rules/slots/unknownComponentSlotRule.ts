/**
 * Unknown Component Slot Rule
 * Checks for nodes placed in slots that are not declared by the target component
 */

import type { Rule } from '../../types';
import type { NodeModel, ComponentNodeModel } from '@layr/types';

export const unknownComponentSlotRule: Rule<{ slotName: string; componentName: string }> = {
  code: 'unknown component slot',
  level: 'error',
  category: 'slots',
  visit: (report, ctx) => {
    // Get all components and packages for lookups
    const getComponent = (name: string, packageName?: string): { component: any; isPackage: boolean } | null => {
      if (packageName) {
        const pkg = ctx.files.packages?.[packageName];
        const component = pkg?.components?.[name];
        return component ? { component, isPackage: true } : null;
      }

      // Check if it's a package reference (e.g., "package/component")
      if (name.includes('/')) {
        const [pkgName, compName] = name.split('/');
        const pkg = ctx.files.packages?.[pkgName];
        const component = pkg?.components?.[compName];
        return component ? { component, isPackage: true } : null;
      }

      // Check local components
      const localComponent = ctx.files.components?.[name];
      if (localComponent) {
        return { component: localComponent, isPackage: false };
      }

      // Check packages
      for (const pkg of Object.values(ctx.files.packages || {})) {
        if (pkg?.components?.[name]) {
          return { component: pkg.components[name], isPackage: true };
        }
      }

      return null;
    };

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check all nodes for slot assignments
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        // Check if this node is assigned to a slot (has a slot property)
        if (node.slot) {
          // Find the parent component node to get the target component
          const parentComponentNode = findParentComponentNode(component.nodes, nodeId);

          if (parentComponentNode) {
            const targetComponentInfo = getComponent(parentComponentNode.name, parentComponentNode.package);

            if (targetComponentInfo) {
              // Get slots defined on the target component
              const targetSlots = new Set<string>();

              // Check for slot nodes in the target component
              for (const targetNode of Object.values(targetComponentInfo.component.nodes || {})) {
                if ((targetNode as NodeModel).type === 'slot') {
                  const slotNode = targetNode as any;
                  if (slotNode.name) {
                    targetSlots.add(slotNode.name);
                  } else {
                    // Default slot
                    targetSlots.add('default');
                  }
                }
              }

              // If no slots defined but target has slot children, default slot exists
              if (targetSlots.size === 0) {
                for (const targetNode of Object.values(targetComponentInfo.component.nodes || {})) {
                  if ((targetNode as NodeModel).type === 'slot') {
                    targetSlots.add('default');
                    break;
                  }
                }
              }

              // Check if the assigned slot exists
              if (!targetSlots.has(node.slot) && targetSlots.size > 0) {
                report(
                  { slotName: node.slot, componentName: parentComponentNode.name },
                  ['components', compName, 'nodes', nodeId]
                );
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Find the parent component node for a given node
 */
function findParentComponentNode(
  nodes: Record<string, NodeModel>,
  targetNodeId: string
): ComponentNodeModel | null {
  // Build a map of node to its parent
  const nodeToParent = new Map<string, string>();

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!node) continue;

    if (node.type !== 'text') {
      for (const childId of (node as any).children || []) {
        nodeToParent.set(childId, nodeId);
      }
    }
  }

  // Walk up the tree to find a component node
  let currentId: string | undefined = targetNodeId;
  while (currentId) {
    const parentId = nodeToParent.get(currentId);
    if (!parentId) break;

    const parentNode = nodes[parentId];
    if (parentNode?.type === 'component') {
      return parentNode as ComponentNodeModel;
    }

    currentId = parentId;
  }

  return null;
}
