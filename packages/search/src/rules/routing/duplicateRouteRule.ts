/**
 * Duplicate Route Rule
 * Detects multiple pages with the same route pattern
 */

import type { Rule } from '../../types';

/**
 * Normalize a route path for comparison
 * Replaces parameter values like :id with a placeholder
 */
function normalizeRoute(path: string): string {
  // Replace :param with :_ for comparison
  // This ensures /users/:id and /users/:name are considered the same route
  return path.replace(/:[^/]+/g, ':_');
}

/**
 * Extract route key from a component's route
 */
function getRouteKey(route: { path: string } | undefined): string | null {
  if (!route?.path) return null;
  return normalizeRoute(route.path);
}

export const duplicateRouteRule: Rule<{
  routePattern: string;
  duplicatePages: string[];
}> = {
  code: 'duplicate route',
  level: 'error',
  category: 'routing',
  visit: (report, ctx) => {
    // Build a map of normalized routes to component names
    const routeMap = new Map<string, string[]>();

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.route) continue;

      const routeKey = getRouteKey(component.route);
      if (!routeKey) continue;

      const existing = routeMap.get(routeKey) || [];
      existing.push(compName);
      routeMap.set(routeKey, existing);
    }

    // Report duplicates
    for (const [routeKey, pages] of routeMap) {
      if (pages.length > 1) {
        // Report for all but the first one
        // Each duplicate page gets reported with the original route pattern
        for (let i = 1; i < pages.length; i++) {
          const component = ctx.files.components?.[pages[i]];
          const originalPath = component?.route?.path || routeKey;

          report(
            { routePattern: originalPath, duplicatePages: pages },
            ['components', pages[i], 'route']
          );
        }
      }
    }
  },
};
