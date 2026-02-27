/**
 * Tests for routing linting rules
 */

import { describe, test, expect } from 'bun:test';
import { duplicateRouteRule } from './duplicateRouteRule';
import { duplicateUrlParameterRule } from './duplicateUrlParameterRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('duplicateRouteRule', () => {
  test('reports duplicate routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users' },
        nodes: {},
      },
      Page2: {
        name: 'Page2',
        route: { path: '/users' },
        nodes: {},
      },
    });

    duplicateRouteRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.routePattern).toBe('/users');
    expect(issues[0].data.duplicatePages).toContain('Page1');
    expect(issues[0].data.duplicatePages).toContain('Page2');
  });

  test('reports routes with different param names but same pattern', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
      },
      Page2: {
        name: 'Page2',
        route: { path: '/users/:userId' },
        nodes: {},
      },
    });

    duplicateRouteRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('does not report unique routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users' },
        nodes: {},
      },
      Page2: {
        name: 'Page2',
        route: { path: '/users/:id' },
        nodes: {},
      },
      Page3: {
        name: 'Page3',
        route: { path: '/products' },
        nodes: {},
      },
    });

    duplicateRouteRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
      Component2: {
        name: 'Component2',
        nodes: {},
      },
    });

    duplicateRouteRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports multiple duplicates', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/home' },
        nodes: {},
      },
      Page2: {
        name: 'Page2',
        route: { path: '/home' },
        nodes: {},
      },
      Page3: {
        name: 'Page3',
        route: { path: '/home' },
        nodes: {},
      },
    });

    duplicateRouteRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Reports all but the first (2 duplicates)
    expect(issues).toHaveLength(2);
  });
});

describe('duplicateUrlParameterRule', () => {
  test('reports duplicate parameters in route', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id/posts/:id' },
        nodes: {},
      },
    });

    duplicateUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('id');
    expect(issues[0].data.occurrences).toBe(2);
  });

  test('reports multiple different duplicate parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/orgs/:orgId/users/:userId/posts/:orgId/:userId' },
        nodes: {},
      },
    });

    duplicateUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    const paramNames = issues.map(i => i.data.paramName);
    expect(paramNames).toContain('orgId');
    expect(paramNames).toContain('userId');
  });

  test('does not report unique parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:userId/posts/:postId' },
        nodes: {},
      },
    });

    duplicateUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles routes without parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/static/route' },
        nodes: {},
      },
    });

    duplicateUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    duplicateUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
