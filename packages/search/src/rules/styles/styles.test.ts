/**
 * Tests for style linting rules
 */

import { describe, test, expect } from 'bun:test';
import { invalidStyleSyntaxRule } from './invalidStyleSyntaxRule';
import { unknownClassnameRule } from './unknownClassnameRule';
import { unknownCSSVariableRule } from './unknownCSSVariableRule';
import { noReferenceGlobalCSSVariableRule } from './noReferenceGlobalCSSVariableRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>, globalStyles?: any): ProjectFiles {
  return { components, globalStyles };
}

describe('invalidStyleSyntaxRule', () => {
  test('reports invalid CSS syntax', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: '' }, // empty value
              ],
            },
          },
        },
      },
    });

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.property).toBe('color');
    expect(issues[0].data.error).toBe('empty value');
  });

  test('reports unbalanced parentheses', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'width', value: 'calc(100px + 50px' }, // missing closing paren
              ],
            },
          },
        },
      },
    });

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('does not report valid CSS', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: 'red' },
                { property: 'width', value: '100px' },
              ],
            },
          },
        },
      },
    });

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report formula values', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: { type: 'formula', formula: { type: 'path', path: ['Variables', 'color'] } } },
              ],
            },
          },
        },
      },
    });

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports invalid hex color', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: '#gggggg' }, // invalid hex
              ],
            },
          },
        },
      },
    });

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.error).toBe('invalid hex color');
  });
});

describe('unknownClassnameRule', () => {
  test('handles components without className', () => {
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
      },
    });

    unknownClassnameRule.visit(
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

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownCSSVariableRule', () => {
  test('reports undefined CSS variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: 'var(--undefined-var)' },
              ],
            },
          },
        },
      },
    });

    unknownCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.variable).toBe('--undefined-var');
  });

  test('does not report defined CSS variables', () => {
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
              styles: {
                default: [
                  { property: 'color', value: 'var(--defined-var)' },
                ],
              },
            },
          },
        },
      },
      {
        cssVariables: {
          '--defined-var': 'red',
        },
      }
    );

    unknownCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles styles without CSS variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            styles: {
              default: [
                { property: 'color', value: 'red' },
              ],
            },
          },
        },
      },
    });

    unknownCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('noReferenceGlobalCSSVariableRule', () => {
  test('reports unused global CSS variables', () => {
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
              styles: {
                default: [
                  { property: 'color', value: 'red' }, // not using the variable
                ],
              },
            },
          },
        },
      },
      {
        cssVariables: {
          '--unused-var': 'blue',
        },
      }
    );

    noReferenceGlobalCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.variable).toBe('--unused-var');
  });

  test('does not report used global CSS variables', () => {
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
              styles: {
                default: [
                  { property: 'color', value: 'var(--used-var)' },
                ],
              },
            },
          },
        },
      },
      {
        cssVariables: {
          '--used-var': 'blue',
        },
      }
    );

    noReferenceGlobalCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles project without global CSS variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    noReferenceGlobalCSSVariableRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
