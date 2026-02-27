/**
 * Tests for DOM linting rules
 */

import { describe, test, expect } from 'bun:test';
import { nonEmptyVoidElementRule } from './nonEmptyVoidElementRule';
import { missingAltAttributeRule } from './missingAltAttributeRule';
import { missingMetaDescriptionRule } from './missingMetaDescriptionRule';
import { invalidListChildrenRule } from './invalidListChildrenRule';
import { elementWithoutInteractiveContentRule } from './elementWithoutInteractiveContentRule';
import { imageWithoutDimensionRule } from './imageWithoutDimensionRule';
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

describe('missingMetaDescriptionRule', () => {
  test('reports page components without meta description', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page: {
        name: 'Page',
        route: { path: '/' },
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
      },
    });

    missingMetaDescriptionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('does not report components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component: {
        name: 'Component',
        // no route
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
      },
    });

    missingMetaDescriptionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('invalidListChildrenRule', () => {
  test('reports ul with non-li children', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          ul1: {
            type: 'element',
            tag: 'ul',
            children: ['div1'],
          },
          div1: {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
      },
    });

    invalidListChildrenRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.tag).toBe('ul');
    expect(issues[0].data.invalidChildren).toContain('div');
  });

  test('does not report ul with li children', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          ul1: {
            type: 'element',
            tag: 'ul',
            children: ['li1'],
          },
          li1: {
            type: 'element',
            tag: 'li',
            children: [],
          },
        },
      },
    });

    invalidListChildrenRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('elementWithoutInteractiveContentRule', () => {
  test('reports div with click handler but no interactive role', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          div1: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: { actions: [] },
            },
          },
        },
      },
    });

    elementWithoutInteractiveContentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.tag).toBe('div');
  });

  test('does not report button with click handler', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          btn1: {
            type: 'element',
            tag: 'button',
            children: [],
            events: {
              click: { actions: [] },
            },
          },
        },
      },
    });

    elementWithoutInteractiveContentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report div with role=button', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          div1: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: { actions: [] },
            },
            attrs: {
              role: { type: 'value', value: 'button' },
            },
          },
        },
      },
    });

    elementWithoutInteractiveContentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('imageWithoutDimensionRule', () => {
  test('reports img without dimensions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            // no width, height, or styles
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.tag).toBe('img');
  });

  test('does not report img with width attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              width: { type: 'value', value: 100 },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
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
          div1: {
            type: 'element',
            tag: 'div',
            children: [],
            // no dimensions
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with height attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              height: { type: 'value', value: 100 },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with width attribute as path', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              width: { type: 'path', path: ['Variables', 'width'] },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with width attribute as function', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              width: { type: 'function' },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with height attribute as path', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              height: { type: 'path', path: ['Variables', 'height'] },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with height attribute as function', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              height: { type: 'function' },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with width style', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [{ property: 'width', value: '100px' }],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with height style', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [{ property: 'height', value: '100px' }],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report img with aspect-ratio style', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [{ property: 'aspect-ratio', value: '16/9' }],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports img with empty width style value', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [{ property: 'width', value: '' }],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('reports img with empty height attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              height: { type: 'value', value: '' },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('reports img with null width attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              width: { type: 'value', value: null },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('reports img with null height attribute', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              height: { type: 'value', value: null },
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('handles styles with null breakpoint styles', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: null,
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('handles styles with null style declarations', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [null as any],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });

  test('handles multiple breakpoints with dimension in one', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Test: {
        name: 'Test',
        nodes: {
          img1: {
            type: 'element',
            tag: 'img',
            children: [],
            styles: {
              desktop: [],
              mobile: [{ property: 'width', value: '100px' }],
            },
          },
        },
      },
    });

    imageWithoutDimensionRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
