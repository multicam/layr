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

  test('checks nested actions in Fetch onMessage', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          fetchAndNavigate: {
            name: 'fetchAndNavigate',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onMessage: {
                  actions: [
                    { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                    { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                  ],
                },
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

  test('checks nested actions in Fetch onSuccess with navigation', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          fetchAndNavigate: {
            name: 'fetchAndNavigate',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onSuccess: {
                  actions: [
                    { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                    { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                  ],
                },
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

  test('checks nested actions in TriggerWorkflow callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          callbackWorkflow: {
            name: 'callbackWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'otherWorkflow',
                parameters: [],
                callbacks: {
                  onComplete: {
                    actions: [
                      { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                      { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                    ],
                  },
                },
              },
            ],
          },
          otherWorkflow: {
            name: 'otherWorkflow',
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

    expect(issues).toHaveLength(1);
  });

  test('checks nested actions in Custom action events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          customWorkflow: {
            name: 'customWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Custom',
                name: 'myCustomAction',
                events: {
                  onComplete: {
                    actions: [
                      { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                      { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                    ],
                  },
                },
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

  test('checks component-level events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
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

  test('checks onLoad event', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        onLoad: {
          actions: [
            { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
            { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
          ],
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

  test('checks onAttributeChange event', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        onAttributeChange: {
          actions: [
            { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
            { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
          ],
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

  test('checks node events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          button: {
            type: 'element',
            tag: 'button',
            children: [],
            events: {
              click: {
                actions: [
                  { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
                  { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
                ],
              },
            },
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

  test('remove-post-navigate fix removes unreachable actions', () => {
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
              { type: 'SetVariable', name: 'pre', data: { type: 'value', value: 0 } },
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

    // The fix is applied to the path of the unreachable action
    // The fix finds the navigation action and removes all actions after it
    // Apply the fix
    const fix = noPostNavigateAction.fixes?.['remove-post-navigate'];
    expect(fix).toBeDefined();

    // The fix function expects the path of the issue, but it needs to find the parent actions array
    // The path is like ['components', 'Component1', 'workflows', 'navigateAndMore', 'actions', 2]
    // The fix finds the navigation action (index 1) and removes actions after it
    const fixedFiles = fix!({
      files,
      path: ['components', 'Component1', 'workflows', 'navigateAndMore', 'actions', 1], // Pass the goToURL action path
    });

    expect(fixedFiles).toBeDefined();
    const fixedActions = (fixedFiles as any).components.Component1.workflows.navigateAndMore.actions;
    expect(fixedActions).toHaveLength(2); // Only pre-action and goToURL remain
    expect(fixedActions[0].name).toBe('pre');
    expect(fixedActions[1].name).toBe('goToURL');
  });

  test('handles null action in array', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          nullActionWorkflow: {
            name: 'nullActionWorkflow',
            parameters: [],
            actions: [
              null as any,
              { type: 'Custom', name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] },
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } },
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

  test('handles goToURL with undefined type', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          undefinedTypeWorkflow: {
            name: 'undefinedTypeWorkflow',
            parameters: [],
            actions: [
              { name: 'goToURL', arguments: [{ name: 'url', formula: { type: 'value', value: '/home' } }] }, // type is undefined
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } }, // unreachable!
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

  test('fix returns undefined when no navigation action found', () => {
    const fix = noPostNavigateAction.fixes?.['remove-post-navigate'];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          noNavigateWorkflow: {
            name: 'noNavigateWorkflow',
            parameters: [],
            actions: [
              { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } },
            ],
          },
        },
      },
    });

    const result = fix!({
      files,
      path: ['components', 'Component1', 'workflows', 'noNavigateWorkflow', 'actions', 1],
    });

    expect(result).toBeUndefined();
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

  test('checks TriggerWorkflow in Switch cases', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'valid' }],
            actions: [],
          },
          switchWorkflow: {
            name: 'switchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Switch',
                data: { type: 'value', value: 'a' },
                cases: [
                  {
                    condition: { type: 'value', value: 'a' },
                    actions: [
                      {
                        type: 'TriggerWorkflow',
                        name: 'targetWorkflow',
                        parameters: [{ name: 'invalid', formula: { type: 'value', value: 1 } }],
                      },
                    ],
                  },
                ],
                default: {
                  actions: [
                    {
                      type: 'TriggerWorkflow',
                        name: 'targetWorkflow',
                        parameters: [{ name: 'valid', formula: { type: 'value', value: 1 } }],
                    },
                  ],
                },
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
    expect(issues[0].data.paramName).toBe('invalid');
  });

  test('checks TriggerWorkflow in Fetch callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'data' }],
            actions: [],
          },
          fetchWorkflow: {
            name: 'fetchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onSuccess: {
                  actions: [
                    {
                      type: 'TriggerWorkflow',
                      name: 'targetWorkflow',
                      parameters: [{ name: 'invalidSuccess', formula: { type: 'value', value: 1 } }],
                    },
                  ],
                },
                onError: {
                  actions: [
                    {
                      type: 'TriggerWorkflow',
                      name: 'targetWorkflow',
                      parameters: [{ name: 'invalidError', formula: { type: 'value', value: 1 } }],
                    },
                  ],
                },
                onMessage: {
                  actions: [
                    {
                      type: 'TriggerWorkflow',
                      name: 'targetWorkflow',
                      parameters: [{ name: 'invalidMessage', formula: { type: 'value', value: 1 } }],
                    },
                  ],
                },
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

    expect(issues).toHaveLength(3);
    const paramNames = issues.map(i => i.data.paramName);
    expect(paramNames).toContain('invalidSuccess');
    expect(paramNames).toContain('invalidError');
    expect(paramNames).toContain('invalidMessage');
  });

  test('checks TriggerWorkflow in TriggerWorkflow callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'value' }],
            actions: [],
          },
          callerWorkflow: {
            name: 'callerWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'targetWorkflow',
                parameters: [{ name: 'value', formula: { type: 'value', value: 1 } }],
                callbacks: {
                  onComplete: {
                    actions: [
                      {
                        type: 'TriggerWorkflow',
                        name: 'targetWorkflow',
                        parameters: [{ name: 'invalidCallback', formula: { type: 'value', value: 1 } }],
                      },
                    ],
                  },
                },
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
    expect(issues[0].data.paramName).toBe('invalidCallback');
  });

  test('checks TriggerWorkflow in Custom action events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [{ name: 'data' }],
            actions: [],
          },
          customWorkflow: {
            name: 'customWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Custom',
                name: 'customAction',
                events: {
                  onComplete: {
                    actions: [
                      {
                        type: 'TriggerWorkflow',
                        name: 'targetWorkflow',
                        parameters: [{ name: 'invalidEvent', formula: { type: 'value', value: 1 } }],
                      },
                    ],
                  },
                },
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
    expect(issues[0].data.paramName).toBe('invalidEvent');
  });

  test('checks TriggerWorkflow in events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'targetWorkflow',
                parameters: [{ name: 'invalidEventParam', formula: { type: 'value', value: 1 } }],
              },
            ],
          },
        },
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [],
            actions: [],
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
    expect(issues[0].data.paramName).toBe('invalidEventParam');
  });

  test('checks TriggerWorkflow in onLoad', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        onLoad: {
          actions: [
            {
              type: 'TriggerWorkflow',
              name: 'targetWorkflow',
              parameters: [{ name: 'invalidOnLoad', formula: { type: 'value', value: 1 } }],
            },
          ],
        },
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [],
            actions: [],
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
    expect(issues[0].data.paramName).toBe('invalidOnLoad');
  });

  test('checks TriggerWorkflow in onAttributeChange', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        onAttributeChange: {
          actions: [
            {
              type: 'TriggerWorkflow',
              name: 'targetWorkflow',
              parameters: [{ name: 'invalidAttrChange', formula: { type: 'value', value: 1 } }],
            },
          ],
        },
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [],
            actions: [],
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
    expect(issues[0].data.paramName).toBe('invalidAttrChange');
  });

  test('checks TriggerWorkflow in node events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          button: {
            type: 'element',
            tag: 'button',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'targetWorkflow',
                    parameters: [{ name: 'invalidNodeEvent', formula: { type: 'value', value: 1 } }],
                  },
                ],
              },
            },
          },
        },
        workflows: {
          targetWorkflow: {
            name: 'targetWorkflow',
            parameters: [],
            actions: [],
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
    expect(issues[0].data.paramName).toBe('invalidNodeEvent');
  });

  test('handles cross-component workflow triggers', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          crossWorkflow: {
            name: 'crossWorkflow',
            parameters: [{ name: 'validParam' }],
            actions: [],
          },
        },
      },
      Component2: {
        name: 'Component2',
        nodes: {},
        workflows: {
          callerWorkflow: {
            name: 'callerWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'crossWorkflow',
                componentName: 'Component1',
                parameters: [{ name: 'invalidCrossParam', formula: { type: 'value', value: 1 } }],
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
    expect(issues[0].data.paramName).toBe('invalidCrossParam');
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
