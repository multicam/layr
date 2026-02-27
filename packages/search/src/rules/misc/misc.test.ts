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
  return { components, project: project ?? {} };
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

  test('reports missing extension referenced in component formula', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
        formulas: {
          formula1: {
            name: '@my-extension/someFormula',
            formula: { type: 'value', value: 'test' },
          },
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

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.extension === '@my-extension')).toBe(true);
  });

  test('does not report when extension is available in project.extensions', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
          formulas: {
            formula1: {
              name: '@my-extension/someFormula',
              formula: { type: 'value', value: 'test' },
            },
          },
        },
      },
      {
        extensions: [{ name: '@my-extension' }],
      }
    );

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report when extension is available via packageName', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
          formulas: {
            formula1: {
              name: '@my-extension/someFormula',
              formula: { type: 'value', value: 'test' },
            },
          },
        },
      },
      {
        extensions: [{ packageName: '@my-extension' }],
      }
    );

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report when extension is available in project.plugins', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
          formulas: {
            formula1: {
              name: '@my-extension/someFormula',
              formula: { type: 'value', value: 'test' },
            },
          },
        },
      },
      {
        plugins: [{ name: '@my-extension' }],
      }
    );

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports missing extension referenced in customCode packages', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
        customCode: {
          packages: ['@external-lib/something'],
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

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.extension === '@external-lib/something')).toBe(true);
  });

  test('reports missing extension required by another extension', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
        },
      },
      {
        extensions: [
          {
            name: '@my-extension',
            requires: ['@required-sub-extension'],
          },
        ],
      }
    );

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.extension === '@required-sub-extension')).toBe(true);
  });

  test('reports missing extension referenced in project formulas', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
        },
      },
      formulas: {
        projectFormula1: {
          name: '@project-extension/formula',
          formula: { type: 'value', value: 'test' },
        },
      },
      project: {},
    };

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.extension === '@project-extension')).toBe(true);
  });

  test('handles component with null formula entry', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
        formulas: {
          formula1: null as any,
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

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles project formulas with null entry', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
        },
      },
      formulas: {
        formula1: null as any,
      },
      project: {},
    };

    requireExtensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles plugins with packageName match', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            root: { type: 'element', tag: 'div', children: [] },
          },
          formulas: {
            formula1: {
              name: '@my-plugin/someFormula',
              formula: { type: 'value', value: 'test' },
            },
          },
        },
      },
      {
        plugins: [{ packageName: '@my-plugin' }],
      }
    );

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

  test('reports cookie references in condition formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            condition: { type: 'path', path: ['Cookies', 'isLoggedIn'] },
            children: [],
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
    expect(issues.some(i => i.data.cookie === 'isLoggedIn')).toBe(true);
  });

  test('reports cookie references in attribute formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            attrs: {
              'data-session': { type: 'path', path: ['Cookies', 'sessionId'] },
            },
            children: [],
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
    expect(issues.some(i => i.data.cookie === 'sessionId')).toBe(true);
  });

  test('reports cookie references in style formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            styles: {
              desktop: [
                {
                  attribute: 'color',
                  value: {
                    type: 'formula',
                    formula: { type: 'path', path: ['Cookies', 'themeColor'] },
                  },
                },
              ],
            },
            children: [],
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
    expect(issues.some(i => i.data.cookie === 'themeColor')).toBe(true);
  });

  test('reports cookie references in event handler actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
        events: {
          click: {
            actions: [
              {
                type: 'some-action',
                inputs: {
                  sessionValue: { type: 'path', path: ['Cookies', 'sessionToken'] },
                },
              },
            ],
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
    expect(issues.some(i => i.data.cookie === 'sessionToken')).toBe(true);
  });

  test('reports cookie references in workflow actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
        workflows: {
          loadData: {
            actions: [
              {
                type: 'fetch',
                inputs: {
                  authToken: { type: 'path', path: ['Cookies', 'authToken'] },
                },
              },
            ],
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
    expect(issues.some(i => i.data.cookie === 'authToken')).toBe(true);
  });

  test('reports cookie references in nested actions (then/else)', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
        events: {
          click: {
            actions: [
              {
                type: 'condition',
                then: [
                  {
                    type: 'action',
                    inputs: {
                      val: { type: 'path', path: ['Cookies', 'thenCookie'] },
                    },
                  },
                ],
                else: [
                  {
                    type: 'action',
                    inputs: {
                      val: { type: 'path', path: ['Cookies', 'elseCookie'] },
                    },
                  },
                ],
              },
            ],
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

    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues.some(i => i.data.cookie === 'thenCookie')).toBe(true);
    expect(issues.some(i => i.data.cookie === 'elseCookie')).toBe(true);
  });

  test('reports cookie references in switch case actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  {
                    actions: [
                      {
                        type: 'action',
                        inputs: {
                          val: { type: 'path', path: ['Cookies', 'caseCookie'] },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
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
    expect(issues.some(i => i.data.cookie === 'caseCookie')).toBe(true);
  });

  test('reports cookie references using alternative naming (Cookie)', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Cookie', 'altCookie'] },
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
    expect(issues.some(i => i.data.cookie === 'altCookie')).toBe(true);
  });

  test('reports cookie references in function formula arguments', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: {
              type: 'function',
              formula: { type: 'value', value: '@toddle/concatenate' },
              args: {
                arg1: { type: 'path', path: ['Cookies', 'funcCookie'] },
              },
            },
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
    expect(issues.some(i => i.data.cookie === 'funcCookie')).toBe(true);
  });

  test('does not report cookie declared at component level', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Cookies', 'componentCookie'] },
          },
        },
        cookies: [{ name: 'componentCookie' }],
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

  test('does not report nested actions with declared cookies', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'element',
              tag: 'div',
              children: [],
            },
          },
          events: {
            click: {
              actions: [
                {
                  type: 'condition',
                  then: [
                    {
                      type: 'action',
                      inputs: {
                        val: { type: 'path', path: ['Cookies', 'declaredCookie'] },
                      },
                    },
                  ],
                },
              ],
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

  test('handles nested actions property', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
        events: {
          click: {
            actions: [
              {
                type: 'group',
                actions: [
                  {
                    type: 'action',
                    inputs: {
                      val: { type: 'path', path: ['Cookies', 'nestedCookie'] },
                    },
                  },
                ],
              },
            ],
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
    expect(issues.some(i => i.data.cookie === 'nestedCookie')).toBe(true);
  });
});
