/**
 * Unknown Component Rule
 * Checks for references to non-existent components
 */

import type { Rule } from '../../types';

export const unknownComponentRule: Rule = {
  code: 'unknown component',
  level: 'error',
  category: 'components',
  visit: (report, ctx) => {
    // Collect all component names
    const componentNames = new Set<string>();
    for (const name of Object.keys(ctx.files.components || {})) {
      componentNames.add(name);
    }
    
    // Add package components
    for (const pkg of Object.values(ctx.files.packages || {})) {
      if (!pkg) continue;
      for (const name of Object.keys(pkg.components || {})) {
        componentNames.add(`${pkg.manifest.name}/${name}`);
      }
    }
    
    // Walk all nodes in components to find component references
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      // Check component nodes
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;
        
        if (node.type === 'component') {
          const refName = node.name as string;
          if (refName && !componentNames.has(refName) && !refName.startsWith('@toddle/')) {
            report({ componentName: refName }, ['components', compName, 'nodes', nodeId]);
          }
        }
      }
      
      // Check contexts that reference external components
      for (const [ctxName, context] of Object.entries(component.contexts || {})) {
        if (!context) continue;
        if (context.componentName && !componentNames.has(context.componentName)) {
          report({ componentName: context.componentName }, ['components', compName, 'contexts', ctxName]);
        }
      }
    }
  }
};
