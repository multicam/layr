/**
 * Tests for new routing linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownUrlParameterRule } from './unknownUrlParameterRule';
import { unknownSetUrlParameterRule } from './unknownSetUrlParameterRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('unknownUrlParameterRule', () => {
  test('reports URL parameter references not in route', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'userId'] }, // userId not in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('userId');
  });

  test('does not report valid URL parameter references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] }, // id is in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports all invalid URL parameters with multiple params', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/orgs/:orgId/users/:userId' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] }, // id not in route
          },
          node2: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'orgId'] }, // orgId is in route
          },
          node3: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'postId'] }, // postId not in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    const paramNames = issues.map(i => i.data.paramName);
    expect(paramNames).toContain('id');
    expect(paramNames).toContain('postId');
  });

  test('handles components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Components without routes don't have URL params, so all refs are invalid
    // But we only check pages (components with routes)
    expect(issues).toHaveLength(0);
  });
});

describe('unknownSetUrlParameterRule', () => {
  test('reports SetURLParameter targeting non-existent param', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParam: {
            name: 'updateParam',
            parameters: [],
            actions: [
              { type: 'SetURLParameter', name: 'userId', data: { type: 'value', value: '123' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('userId');
  });

  test('does not report SetURLParameter targeting valid param', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParam: {
            name: 'updateParam',
            parameters: [],
            actions: [
              { type: 'SetURLParameter', name: 'id', data: { type: 'value', value: '456' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports SetURLParameters with invalid params', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParams: {
            name: 'updateParams',
            parameters: [],
            actions: [
              {
                type: 'SetURLParameters',
                parameters: [
                  { name: 'id', formula: { type: 'value', value: '1' } }, // valid
                  { name: 'page', formula: { type: 'value', value: '2' } }, // invalid
                ],
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('page');
  });
});
