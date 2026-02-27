/**
 * Tests for attribute linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownComponentAttributeRule } from './unknownComponentAttributeRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('unknownComponentAttributeRule', () => {
  test('reports unknown attributes passed to component', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Button: {
        name: 'Button',
        nodes: {},
        attributes: {
          label: { name: 'label' },
        },
      },
      Page: {
        name: 'Page',
        nodes: {
          'button-node': {
            type: 'component',
            name: 'Button',
            attrs: {
              label: { type: 'value', value: 'Click me' },
              color: { type: 'value', value: 'red' }, // Not defined on Button!
            },
            children: [],
          },
        },
      },
    });

    unknownComponentAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.attrName).toBe('color');
    expect(issues[0].data.componentName).toBe('Button');
  });

  test('does not report valid attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Button: {
        name: 'Button',
        nodes: {},
        attributes: {
          label: { name: 'label' },
          disabled: { name: 'disabled' },
        },
      },
      Page: {
        name: 'Page',
        nodes: {
          'button-node': {
            type: 'component',
            name: 'Button',
            attrs: {
              label: { type: 'value', value: 'Click me' },
              disabled: { type: 'value', value: true },
            },
            children: [],
          },
        },
      },
    });

    unknownComponentAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles component without attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Simple: {
        name: 'Simple',
        nodes: {},
      },
      Page: {
        name: 'Page',
        nodes: {
          'simple-node': {
            type: 'component',
            name: 'Simple',
            attrs: {
              extraAttr: { type: 'value', value: 'test' },
            },
            children: [],
          },
        },
      },
    });

    unknownComponentAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not report if target component has no attributes defined
    expect(issues).toHaveLength(0);
  });

  test('handles non-existent component references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page: {
        name: 'Page',
        nodes: {
          'missing-node': {
            type: 'component',
            name: 'NonExistent',
            attrs: {
              someAttr: { type: 'value', value: 'test' },
            },
            children: [],
          },
        },
      },
    });

    unknownComponentAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not report if target component doesn't exist (unknownComponentRule handles that)
    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    unknownComponentAttributeRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
