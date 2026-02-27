/**
 * Unknown Component Attribute Rule
 * Checks for component instances that pass attributes not declared by the target component
 */

import type { Rule } from '../../types';
import type { ComponentNodeModel } from '@layr/types';

export const unknownComponentAttributeRule: Rule<{ attrName: string; componentName: string }> = {
  code: 'unknown component attribute',
  level: 'error',
  category: 'attributes',
  visit: (report, ctx) => {
    // Helper to get a component by name
    const getComponent = (name: string, packageName?: string): any | null => {
      if (packageName) {
        const pkg = ctx.files.packages?.[packageName];
        return pkg?.components?.[name] || null;
      }

      // Check if it's a package reference (e.g., "package/component")
      if (name.includes('/')) {
        const [pkgName, compName] = name.split('/');
        const pkg = ctx.files.packages?.[pkgName];
        return pkg?.components?.[compName] || null;
      }

      // Check local components
      const localComponent = ctx.files.components?.[name];
      if (localComponent) {
        return localComponent;
      }

      // Check packages
      for (const pkg of Object.values(ctx.files.packages || {})) {
        if (pkg?.components?.[name]) {
          return pkg.components[name];
        }
      }

      return null;
    };

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check all component nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node || node.type !== 'component') continue;

        const componentNode = node as ComponentNodeModel;
        const targetComponent = getComponent(componentNode.name, componentNode.package);

        if (targetComponent) {
          // Get attributes defined on the target component
          const definedAttrs = new Set(Object.keys(targetComponent.attributes || {}));

          // If target component has no attributes defined, don't report anything
          // (we can't know what's valid)
          if (definedAttrs.size === 0) continue;

          // Check each passed attribute
          for (const attrName of Object.keys(componentNode.attrs || {})) {
            if (!definedAttrs.has(attrName)) {
              report(
                { attrName, componentName: componentNode.name },
                ['components', compName, 'nodes', nodeId, 'attrs', attrName]
              );
            }
          }
        }
      }
    }
  }
};
