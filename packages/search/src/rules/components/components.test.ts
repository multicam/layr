/**
 * Tests for component linting rules
 */

import { describe, test, expect } from 'bun:test';
import { noReferenceComponentRule } from './noReferenceComponentRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('noReferenceComponentRule', () => {
  test('reports components that are never used', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      UnusedComponent: {
        name: 'UnusedComponent',
        nodes: {},
      },
      Page1: {
        name: 'Page1',
        route: { path: '/' },
        nodes: {},
      },
    });

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.componentName).toBe('UnusedComponent');
  });

  test('does not report pages (components with routes)', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/' },
        nodes: {},
      },
    });

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report exported components', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      ExportedComponent: {
        name: 'ExportedComponent',
        nodes: {},
        exported: true,
      },
    });

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report components used in other components', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Button: {
        name: 'Button',
        nodes: {},
      },
      Card: {
        name: 'Card',
        nodes: {
          buttonNode: {
            type: 'component',
            name: 'Button',
          },
        },
      },
    });

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Button is used by Card, but Card itself is unused
    expect(issues).toHaveLength(1);
    expect(issues[0].data.componentName).toBe('Card');
  });

  test('does not report custom elements', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      CustomElement: {
        name: 'CustomElement',
        nodes: {},
        customElement: {
          enabled: { type: 'value', value: true },
        },
      },
    });

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles empty projects', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    noReferenceComponentRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
