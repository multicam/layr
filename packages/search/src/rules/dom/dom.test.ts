/**
 * Tests for DOM linting rules
 */

import { describe, test, expect } from 'bun:test';
import { nonEmptyVoidElementRule } from './nonEmptyVoidElementRule';
import { missingAltAttributeRule } from './missingAltAttributeRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('nonEmptyVoidElementRule', () => {
  test('reports void elements with children', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'img',
            children: ['child1'],
          },
          node2: {
            type: 'element',
            tag: 'br',
            children: ['child2'],
          },
          node3: {
            type: 'element',
            tag: 'div',
            children: ['child3'], // div is not void, should not report
          },
        },
      },
    });

    nonEmptyVoidElementRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    expect(issues[0].data.tag).toBe('img');
    expect(issues[1].data.tag).toBe('br');
  });

  test('does not report void elements without children', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'img',
            children: [],
          },
          node2: {
            type: 'element',
            tag: 'br',
            children: [],
          },
        },
      },
    });

    nonEmptyVoidElementRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects all void element types', () => {
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    const issues: any[] = [];

    const nodes: Record<string, any> = {};
    voidElements.forEach((tag, i) => {
      nodes[`node${i}`] = {
        type: 'element',
        tag,
        children: ['child'],
      };
    });

    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes,
      },
    });

    nonEmptyVoidElementRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(voidElements.length);
  });
});

describe('missingAltAttributeRule', () => {
  test('reports img elements without alt attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'img',
            children: [],
            // no attrs at all
          },
        },
      },
    });

    missingAltAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.tag).toBe('img');
  });

  test('reports img elements with empty alt attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              alt: { type: 'value', value: '' }, // empty string
            },
          },
        },
      },
    });

    missingAltAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('does not report img elements with valid alt attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              alt: { type: 'value', value: 'A descriptive text' },
            },
          },
          node2: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              alt: { type: 'path', path: ['Variables', 'someVar'] }, // dynamic alt
            },
          },
        },
      },
    });

    missingAltAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report non-img elements', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            // no alt attribute
          },
        },
      },
    });

    missingAltAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
