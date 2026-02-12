import type { Project, Component } from '@layr/types';

export interface SplitRoute {
  pageName: string;
  route: string;
  components: string[];
}

/**
 * Split project into per-page bundles
 */
export function splitRoutes(project: Project): SplitRoute[] {
  const routes: SplitRoute[] = [];
  const components = project.files?.components || {};
  
  for (const [name, component] of Object.entries(components)) {
    // Only pages have routes
    if (component.route) {
      const included = takeIncludedComponents(component, components);
      
      routes.push({
        pageName: name,
        route: component.route.path,
        components: included,
      });
    }
  }
  
  return routes;
}

/**
 * Get all components included by a page
 */
export function takeIncludedComponents(
  page: Component,
  allComponents: Record<string, Component>
): string[] {
  const included = new Set<string>();
  
  collectIncluded(page, allComponents, included);
  
  return Array.from(included);
}

/**
 * Recursively collect included components
 */
function collectIncluded(
  component: Component,
  allComponents: Record<string, Component>,
  included: Set<string>
): void {
  if (included.has(component.name)) {
    return;
  }
  
  included.add(component.name);
  
  // Find component references in nodes
  for (const node of Object.values(component.nodes || {})) {
    if (node.type === 'component') {
      const childName = (node as any).name;
      if (childName && allComponents[childName]) {
        collectIncluded(allComponents[childName], allComponents, included);
      }
    }
    
    // Recurse into children
    const children = (node as any).children || [];
    for (const childId of children) {
      const child = component.nodes[childId];
      if (child?.type === 'component') {
        const childName = (child as any).name;
        if (childName && allComponents[childName]) {
          collectIncluded(allComponents[childName], allComponents, included);
        }
      }
    }
  }
}
