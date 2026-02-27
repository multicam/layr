/**
 * Tests for API linting rules
 */

import { describe, test, expect } from 'bun:test';
import { noReferenceApiRule } from './noReferenceApiRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('noReferenceApiRule', () => {
  test('reports unused APIs', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          unusedApi: {
            name: 'unusedApi',
            type: 'v2',
          },
        },
      },
    });

    noReferenceApiRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.apiName).toBe('unusedApi');
  });

  test('does not report fetched APIs', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          usedApi: {
            name: 'usedApi',
            type: 'v2',
          },
        },
        events: {
          onLoad: {
            actions: [
              { type: 'Fetch', name: 'usedApi' },
            ],
          },
        },
      },
    });

    noReferenceApiRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report APIs with autoFetch', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          autoFetchApi: {
            name: 'autoFetchApi',
            type: 'v2',
            autoFetch: { type: 'value', value: true },
          },
        },
      },
    });

    noReferenceApiRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // autoFetch APIs are fetched automatically
    expect(issues).toHaveLength(0);
  });

  test('handles components without APIs', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    noReferenceApiRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    noReferenceApiRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
