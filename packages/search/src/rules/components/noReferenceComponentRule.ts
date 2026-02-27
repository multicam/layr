/**
 * No Reference Component Rule
 * Detects components that are defined but never used (excluding pages and exports)
 */

import type { Rule } from '../../types';
import type { NodeModel } from '@layr/types';

export const noReferenceComponentRule: Rule<{ componentName: string }> = {
  code: 'no reference component',
  level: 'warning',
  category: 'components',
  visit: (report, ctx) => {
    const components = ctx.files.components || {};
    const packages = ctx.files.packages || {};

    // Collect all component names
    const allComponentNames = new Set(Object.keys(components));

    // Collect all referenced component names
    const referencedComponents = new Set<string>();

    for (const [compName, component] of Object.entries(components)) {
      if (!component?.nodes) continue;

      for (const node of Object.values(component.nodes)) {
        if (!node) continue;

        // Component nodes reference other components
        if (node.type === 'component') {
          // If package is specified, it's from a package (not a local reference)
          if (!node.package && node.name) {
            referencedComponents.add(node.name);
          }
        }
      }
    }

    // Check package components as well
    for (const pkg of Object.values(packages)) {
      if (!pkg?.components) continue;

      for (const component of Object.values(pkg.components)) {
        if (!component?.nodes) continue;

        for (const node of Object.values(component.nodes)) {
          if (!node) continue;

          if (node.type === 'component') {
            if (!node.package && node.name) {
              referencedComponents.add(node.name);
            }
          }
        }
      }
    }

    // Report unreferenced components (excluding pages and exports)
    for (const compName of allComponentNames) {
      const component = components[compName];
      if (!component) continue;

      // Skip pages (components with routes)
      if (component.route?.path) continue;

      // Skip exported components
      if (component.exported) continue;

      // Skip custom elements
      if (component.customElement) continue;

      // Report if not referenced
      if (!referencedComponents.has(compName)) {
        report({ componentName: compName }, ['components', compName]);
      }
    }
  },
};
