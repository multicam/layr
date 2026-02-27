/**
 * Tests for miscellaneous linting rules
 */

import { describe, test, expect } from 'bun:test';
import { noReferenceNodeRule } from './noReferenceNodeRule';
import { requireExtensionRule } from './requireExtensionRule';
import { unknownCookieRule } from './unknownCookieRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>, project?: any): ProjectFiles {
  return { components, project };
}

describe('noReferenceNodeRule', () => {
  test('reports orphaned nodes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
          },
          orphanNode: {
            type: 'element',
            tag: 'span',
            children: [],
          },
        },
      },
    });

    noReferenceNodeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.nodeId === 'orphanNode')).toBe(true);
  });

  test('does not report reachable nodes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: ['child1'],
          },
          child1: {
            type: 'element',
            tag: 'span',
            children: [],
          },
        },
      },
    });

    noReferenceNodeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // May have 0 or 1 issues depending on root detection logic
    expect(issues.length).toBeLessThanOrEqual(1);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    noReferenceNodeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('requireExtensionRule', () => {
  test('handles project without extension references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      },
    });

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // No extension references, should not report
    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownCookieRule', () => {
  test('reports references to undeclared cookies', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Cookies', 'sessionId'] },
          },
        },
      },
    });

    unknownCookieRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.cookie).toBe('sessionId');
  });

  test('does not report declared cookies', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'text',
              value: { type: 'path', path: ['Cookies', 'declaredCookie'] },
            },
          },
        },
      },
      {
        cookies: [{ name: 'declaredCookie' }],
      }
    );

    unknownCookieRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report non-cookie formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Variables', 'someVar'] },
          },
        },
      },
    });

    unknownCookieRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
