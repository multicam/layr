/**
 * Duplicate URL Parameter Rule
 * Detects routes with duplicate URL parameter names
 */

import type { Rule } from '../../types';

/**
 * Extract URL parameter names from a route path
 * e.g., "/users/:id/posts/:id" -> ["id", "id"]
 */
function extractPathParams(path: string): string[] {
  const params: string[] = [];
  const regex = /:([^/]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]);
  }

  return params;
}

/**
 * Find duplicate parameter names in an array
 */
function findDuplicates(params: string[]): Map<string, number[]> {
  const duplicates = new Map<string, number[]>();
  const seen = new Map<string, number[]>();

  params.forEach((param, index) => {
    const indices = seen.get(param) || [];
    indices.push(index);
    seen.set(param, indices);
  });

  for (const [param, indices] of seen) {
    if (indices.length > 1) {
      duplicates.set(param, indices);
    }
  }

  return duplicates;
}

export const duplicateUrlParameterRule: Rule<{
  paramName: string;
  occurrences: number;
}> = {
  code: 'duplicate url parameter',
  level: 'error',
  category: 'routing',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.route?.path) continue;

      const path = component.route.path;
      const params = extractPathParams(path);
      const duplicates = findDuplicates(params);

      for (const [paramName, indices] of duplicates) {
        report(
          { paramName, occurrences: indices.length },
          ['components', compName, 'route', 'path']
        );
      }
    }
  },
};
