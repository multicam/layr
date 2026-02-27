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

  test('reports unbalanced brackets', () => {
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
                { property: 'width', value: 'attr(data-width]' }, // unbalanced bracket
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
    expect(issues[0].data.error).toBe('unbalanced brackets');
  });

  test('reports closing bracket before opening bracket', () => {
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
                { property: 'width', value: 'test]value' }, // ] before [
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
    expect(issues[0].data.error).toBe('unbalanced brackets');
  });

  test('reports unbalanced opening bracket', () => {
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
                { property: 'width', value: '[100px' }, // missing closing bracket
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
    expect(issues[0].data.error).toBe('unbalanced brackets');
  });

  test('does not report valid calc() syntax', () => {
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
                { property: 'width', value: 'calc(100px + 50px)' },
                { property: 'height', value: 'calc(100% - 20px)' },
                { property: 'margin', value: 'calc(10px * 2)' },
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

  test('reports invalid var() syntax - missing dashes', () => {
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
                { property: 'color', value: 'var(invalid-var)' }, // missing --
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
    expect(issues[0].data.error).toBe('invalid var() syntax');
  });

  test('does not report valid var() syntax', () => {
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
                { property: 'color', value: 'var(--valid-var)' },
                { property: 'width', value: 'var(--valid-var-with-fallback, 100px)' },
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

  test('reports invalid url() syntax', () => {
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
                { property: 'background-image', value: 'url()' }, // url() with no argument
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
    expect(issues[0].data.error).toBe('invalid url() syntax');
  });

  test('does not report valid url() syntax', () => {
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
                { property: 'background-image', value: 'url("image.png")' },
                { property: 'background', value: "url('image.png')" },
                { property: 'mask-image', value: 'url(image.png)' },
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

  test('reports invalid hex color in background property', () => {
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
                { property: 'background', value: '#xyz' }, // invalid hex
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

  test('reports invalid hex color in border-color property', () => {
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
                { property: 'border-color', value: '#12' }, // invalid hex length
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

  test('does not report valid hex colors', () => {
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
                { property: 'color', value: '#fff' },
                { property: 'color', value: '#ffff' },
                { property: 'color', value: '#ffffff' },
                { property: 'color', value: '#ffffffff' },
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

  test('skips non-string values', () => {
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
                { property: 'color', value: 123 as any }, // non-string value
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

  test('handles null breakpoint styles', () => {
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
              default: null as any,
              mobile: [],
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

  test('handles null style declaration', () => {
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
              default: [null as any],
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

  test('remove-invalid-style fix removes invalid style', () => {
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
                { property: 'width', value: '' }, // invalid
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

    // Apply the fix
    const fix = invalidStyleSyntaxRule.fixes?.['remove-invalid-style'];
    expect(fix).toBeDefined();

    const fixedFiles = fix!({
      files,
      path: issues[0].path,
    });

    expect(fixedFiles).toBeDefined();
    const styles = (fixedFiles as any).components.Component1.nodes.node1.styles.default;
    expect(styles.length).toBe(1);
    expect(styles[0].property).toBe('color');
  });

  test('fix returns undefined for short path', () => {
    const fix = invalidStyleSyntaxRule.fixes?.['remove-invalid-style'];

    const result = fix!({
      files: { components: {} },
      path: ['components'], // too short
    });

    expect(result).toBeUndefined();
  });

  test('fix returns undefined when styles not found', () => {
    const fix = invalidStyleSyntaxRule.fixes?.['remove-invalid-style'];

    const result = fix!({
      files: {
        components: {
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
        },
      },
      path: ['components', 'Component1', 'nodes', 'node1', 'styles', 'default', 'color'],
    });

    expect(result).toBeUndefined();
  });

  test('handles component without nodes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: undefined as any,
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

  test('handles null node', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: null,
          },
        },
      },
    };

    invalidStyleSyntaxRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles non-element nodes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'value', value: 'Hello' },
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

  test('reports undefined class names', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'value', value: 'undefined-class' },
            },
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

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.classname === 'undefined-class')).toBe(true);
  });

  test('does not report utility classes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'value', value: 'hidden flex absolute' },
            },
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

  test('does not report class names defined in global styles', () => {
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
              attrs: {
                className: { type: 'value', value: 'global-class' },
              },
            },
          },
        },
      },
      {
        classes: {
          'global-class': { color: 'red' },
        },
      }
    );

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report class names defined in themes', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'element',
              tag: 'div',
              children: [],
              attrs: {
                className: { type: 'value', value: 'theme-class' },
              },
            },
          },
        },
      },
      themes: {
        default: {
          classes: {
            'theme-class': { color: 'blue' },
          },
        },
      },
    };

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report class names defined in component styles', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          styles: {
            classes: {
              'component-class': { color: 'green' },
            },
          },
          nodes: {
            node1: {
              type: 'element',
              tag: 'div',
              children: [],
              attrs: {
                className: { type: 'value', value: 'component-class' },
              },
            },
          },
        },
      },
    };

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report class names defined in node styles', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'value', value: 'node-class' },
            },
            styles: {
              default: [
                { className: 'node-class', property: 'color', value: 'yellow' },
              ],
            },
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

  test('handles class attribute (alternative to className)', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              class: { type: 'value', value: 'undefined-via-class-attr' },
            },
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

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.classname === 'undefined-via-class-attr')).toBe(true);
  });

  test('handles array class names', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'value', value: ['hidden', 'undefined-array-class'] },
            },
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

    // 'hidden' is a utility class, 'undefined-array-class' should be reported
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.classname === 'undefined-array-class')).toBe(true);
  });

  test('handles class names in concatenate function', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: {
                type: 'function',
                name: '@toddle/concatenate',
                args: {
                  parts: { type: 'value', value: 'undefined-concat-class' },
                },
              },
            },
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

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.data.classname === 'undefined-concat-class')).toBe(true);
  });

  test('does not report dynamic class names (path type)', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'path', path: ['Variables', 'dynamicClass'] },
            },
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

    // Dynamic class names can't be validated statically
    expect(issues).toHaveLength(0);
  });

  test('handles multiple classes in one string', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              className: { type: 'value', value: 'hidden undefined-class-1 undefined-class-2' },
            },
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

    // Should report both undefined classes
    expect(issues.filter(i => i.data.classname === 'undefined-class-1').length).toBeGreaterThanOrEqual(1);
    expect(issues.filter(i => i.data.classname === 'undefined-class-2').length).toBeGreaterThanOrEqual(1);
  });

  test('handles null component gracefully', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        nullComponent: null,
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
      },
    };

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles null theme gracefully', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'element',
              tag: 'div',
              children: [],
              attrs: {
                className: { type: 'value', value: 'flex' },
              },
            },
          },
        },
      },
      themes: {
        nullTheme: null,
      },
    };

    unknownClassnameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
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
