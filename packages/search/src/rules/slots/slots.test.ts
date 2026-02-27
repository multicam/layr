/**
 * Tests for slot linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownComponentSlotRule } from './unknownComponentSlotRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('unknownComponentSlotRule', () => {
  test('reports unknown slot references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Container: {
        name: 'Container',
        nodes: {
          'slot-default': {
            type: 'slot',
            name: 'default',
            children: [],
          },
        },
      },
      Page: {
        name: 'Page',
        nodes: {
          'container-node': {
            type: 'component',
            name: 'Container',
            attrs: {},
            children: ['content-node'],
          },
          'content-node': {
            type: 'element',
            tag: 'div',
            children: [],
            slot: 'nonExistentSlot', // This slot doesn't exist in Container
          },
        },
      },
    });

    unknownComponentSlotRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.slotName).toBe('nonExistentSlot');
    expect(issues[0].data.componentName).toBe('Container');
  });

  test('does not report valid slot references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Container: {
        name: 'Container',
        nodes: {
          'slot-default': {
            type: 'slot',
            name: 'default',
            children: [],
          },
          'slot-sidebar': {
            type: 'slot',
            name: 'sidebar',
            children: [],
          },
        },
      },
      Page: {
        name: 'Page',
        nodes: {
          'container-node': {
            type: 'component',
            name: 'Container',
            attrs: {},
            children: ['content-node'],
          },
          'content-node': {
            type: 'element',
            tag: 'div',
            children: [],
            slot: 'default', // Valid slot
          },
        },
      },
    });

    unknownComponentSlotRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without slots', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Simple: {
        name: 'Simple',
        nodes: {
          'root': {
            type: 'element',
            tag: 'div',
            children: [],
          },
        },
      },
      Page: {
        name: 'Page',
        nodes: {
          'simple-node': {
            type: 'component',
            name: 'Simple',
            attrs: {},
            children: ['content-node'],
          },
          'content-node': {
            type: 'element',
            tag: 'span',
            children: [],
            slot: 'default', // No slots defined in Simple
          },
        },
      },
    });

    unknownComponentSlotRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not report if target component has no slots defined
    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    unknownComponentSlotRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
