/**
 * Tests for workflow linting rules
 */

import { describe, test, expect } from 'bun:test';
import { duplicateWorkflowParameterRule } from './duplicateWorkflowParameterRule';
import { noPostNavigateAction } from './noPostNavigateAction';
import { unknownTriggerWorkflowParameterRule } from './unknownTriggerWorkflowParameterRule';
import { noReferenceComponentWorkflowRule } from './noReferenceComponentWorkflowRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('duplicateWorkflowParameterRule', () => {
  test('reports duplicate workflow parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [
              { name: 'id' },
              { name: 'name' },
              { name: 'id' }, // duplicate!
            ],
            actions: [],
          },
        },
      },
    });

    duplicateWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('id');
    expect(issues[0].data.occurrences).toBe(2);
  });

  test('reports multiple different duplicate parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [
              { name: 'id' },
              { name: 'name' },
              { name: 'id' }, // duplicate!
              { name: 'name' }, // duplicate!
            ],
            actions: [],
          },
        },
      },
    });

    duplicateWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    const paramNames = issues.map(i => i.data.paramName);
    expect(paramNames).toContain('id');
    expect(paramNames).toContain('name');
  });

  test('does not report unique workflow parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [
              { name: 'id' },
              { name: 'name' },
              { name: 'value' },
            ],
            actions: [],
          },
        },
      },
    });

    duplicateWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without workflows', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    duplicateWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('noPostNavigateAction', () => {
  test('reports actions after goToURL', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          navigateAndMore: {
            name: 'navigateAndMore',
            parameters: [],
            actions: [
              { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
              { type: 'SetVariable', name: 'y', data: { type: 'value', value: 2 } }, // unreachable!
            ],
          },
        },
      },
    });

    noPostNavigateAction.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    expect(issues[0].fixes).toContain('remove-post-navigate');
  });

  test('does not report when goToURL is last action', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          navigateAtEnd: {
            name: 'navigateAtEnd',
            parameters: [],
            actions: [
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } },
              { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
            ],
          },
        },
      },
    });

    noPostNavigateAction.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles empty action arrays', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          emptyWorkflow: {
            name: 'emptyWorkflow',
            parameters: [],
            actions: [],
          },
        },
      },
    });

    noPostNavigateAction.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('checks nested actions in Switch', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          switchAndNavigate: {
            name: 'switchAndNavigate',
            parameters: [],
            actions: [
              {
                type: 'Switch',
                data: { type: 'value', value: true },
                cases: [
                  {
                    condition: { type: 'value', value: true },
                    actions: [
                      { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                      { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                    ],
                  },
                ],
                default: { actions: [] },
              },
            ],
          },
        },
      },
    });

    noPostNavigateAction.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });
});

describe('unknownTriggerWorkflowParameterRule', () => {
  test('reports unknown workflow parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'validParam' }],
            actions: [],
          },
          callerWorkflow: {
            name: 'callerWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'targetWorkflow',
                parameters: [
                  { name: 'validParam', formula: { type: 'value', value: 1 } },
                  { name: 'invalidParam', formula: { type: 'value', value: 2 } }, // unknown!
                ],
              },
            ],
          },
        },
      },
    });

    unknownTriggerWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidParam');
    expect(issues[0].data.workflowName).toBe('targetWorkflow');
  });

  test('does not report valid workflow parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'id' }, { name: 'name' }],
            actions: [],
          },
          callerWorkflow: {
            name: 'callerWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'targetWorkflow',
                parameters: [
                  { name: 'id', formula: { type: 'value', value: 1 } },
                  { name: 'name', formula: { type: 'value', value: 'test' } },
                ],
              },
            ],
          },
        },
      },
    });

    unknownTriggerWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles workflows without parameters', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [],
            actions: [],
          },
          callerWorkflow: {
            name: 'callerWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'targetWorkflow',
                parameters: [
                  { name: 'unexpectedParam', formula: { type: 'value', value: 1 } },
                ],
              },
            ],
          },
        },
      },
    });

    unknownTriggerWorkflowParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
  });
});

describe('noReferenceComponentWorkflowRule', () => {
  test('reports unused workflows', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          usedWorkflow: {
            name: 'usedWorkflow',
            parameters: [],
            actions: [
              { type: 'TriggerWorkflow', name: 'unusedWorkflow', parameters: [] },
            ],
          },
          unusedWorkflow: {
            name: 'unusedWorkflow',
            parameters: [],
            actions: [],
          },
        },
      },
    });

    noReferenceComponentWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // usedWorkflow calls unusedWorkflow, but usedWorkflow itself is never called
    expect(issues).toHaveLength(2);
    const workflowNames = issues.map(i => i.data.workflowName);
    expect(workflowNames).toContain('usedWorkflow');
    expect(workflowNames).toContain('unusedWorkflow');
  });

  test('does not report triggered workflows', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              { type: 'TriggerWorkflow', name: 'myWorkflow', parameters: [] },
            ],
          },
        },
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [],
          },
        },
      },
    });

    noReferenceComponentWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without workflows', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    noReferenceComponentWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
