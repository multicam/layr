/**
 * Tests for Context linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownContextProviderRule } from './unknownContextProviderRule';
import { unknownContextProviderFormulaRule } from './unknownContextProviderFormulaRule';
import { unknownContextProviderWorkflowRule } from './unknownContextProviderWorkflowRule';
import { noContextConsumersRule } from './noContextConsumersRule';
import { unknownContextFormulaRule } from './unknownContextFormulaRule';
import { unknownContextWorkflowRule } from './unknownContextWorkflowRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('unknownContextProviderRule', () => {
  test('reports context subscription to non-existent provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          NonExistentProvider: {
            formulas: ['someFormula'],
            workflows: [],
          },
        },
      },
    });

    unknownContextProviderRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.providerName).toBe('NonExistentProvider');
    expect(issues[0].data.contextName).toBe('NonExistentProvider');
  });

  test('does not report context subscription to existing provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          exposedFormula: {
            name: 'exposedFormula',
            formula: { type: 'value', value: 'test' },
            exposeInContext: true,
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: ['exposedFormula'],
            workflows: [],
            componentName: 'Provider',
          },
        },
      },
    });

    unknownContextProviderRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownContextProviderFormulaRule', () => {
  test('reports formula not exposed by provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          exposedFormula: {
            name: 'exposedFormula',
            formula: { type: 'value', value: 'test' },
            exposeInContext: true,
          },
          privateFormula: {
            name: 'privateFormula',
            formula: { type: 'value', value: 'private' },
            // exposeInContext NOT set
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: ['exposedFormula', 'privateFormula'],
            workflows: [],
            componentName: 'Provider',
          },
        },
      },
    });

    unknownContextProviderFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('privateFormula');
  });

  test('does not report formulas exposed by provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          exposedFormula: {
            name: 'exposedFormula',
            formula: { type: 'value', value: 'test' },
            exposeInContext: true,
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: ['exposedFormula'],
            workflows: [],
            componentName: 'Provider',
          },
        },
      },
    });

    unknownContextProviderFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownContextProviderWorkflowRule', () => {
  test('reports workflow not exposed by provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        workflows: {
          exposedWorkflow: {
            name: 'exposedWorkflow',
            parameters: [],
            actions: [],
            exposeInContext: true,
          },
          privateWorkflow: {
            name: 'privateWorkflow',
            parameters: [],
            actions: [],
            // exposeInContext NOT set
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: [],
            workflows: ['exposedWorkflow', 'privateWorkflow'],
            componentName: 'Provider',
          },
        },
      },
    });

    unknownContextProviderWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('privateWorkflow');
  });

  test('does not report workflows exposed by provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        workflows: {
          exposedWorkflow: {
            name: 'exposedWorkflow',
            parameters: [],
            actions: [],
            exposeInContext: true,
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: [],
            workflows: ['exposedWorkflow'],
            componentName: 'Provider',
          },
        },
      },
    });

    unknownContextProviderWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('noContextConsumersRule', () => {
  test('reports provider with no consumers', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          exposedFormula: {
            name: 'exposedFormula',
            formula: { type: 'value', value: 'test' },
            exposeInContext: true,
          },
        },
      },
      Other: {
        name: 'Other',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        // No contexts defined
      },
    });

    noContextConsumersRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.providerName).toBe('Provider');
  });

  test('does not report provider with consumers', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Provider: {
        name: 'Provider',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          exposedFormula: {
            name: 'exposedFormula',
            formula: { type: 'value', value: 'test' },
            exposeInContext: true,
          },
        },
      },
      Consumer: {
        name: 'Consumer',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        contexts: {
          Provider: {
            formulas: ['exposedFormula'],
            workflows: [],
            componentName: 'Provider',
          },
        },
      },
    });

    noContextConsumersRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report component that is not a provider', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Regular: {
        name: 'Regular',
        nodes: { root: { type: 'element', tag: 'div', children: [] } },
        formulas: {
          internalFormula: {
            name: 'internalFormula',
            formula: { type: 'value', value: 'test' },
            // exposeInContext NOT set
          },
        },
      },
    });

    noContextConsumersRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownContextFormulaRule', () => {
  test('reports formula reference to undeclared context', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              value: { type: 'path', path: ['Contexts', 'UndeclaredContext', 'someFormula'] },
            },
          },
        },
        // No contexts defined
      },
    });

    unknownContextFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.contextKey).toBe('UndeclaredContext');
  });

  test('reports formula reference to formula not in context subscription', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              value: { type: 'path', path: ['Contexts', 'MyContext', 'undeclaredFormula'] },
            },
          },
        },
        contexts: {
          MyContext: {
            formulas: ['declaredFormula'],
            workflows: [],
          },
        },
      },
    });

    unknownContextFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('undeclaredFormula');
  });

  test('does not report formula reference to declared context formula', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {
              value: { type: 'path', path: ['Contexts', 'MyContext', 'declaredFormula'] },
            },
          },
        },
        contexts: {
          MyContext: {
            formulas: ['declaredFormula'],
            workflows: [],
          },
        },
      },
    });

    unknownContextFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownContextWorkflowRule', () => {
  test('reports TriggerWorkflow with undeclared context workflow', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'undeclaredWorkflow',
                    componentName: 'MyProvider',
                    parameters: [],
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
    expect(issues[0].data.providerName).toBe('MyProvider');
  });

  test('does not report TriggerWorkflow with declared context workflow', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'declaredWorkflow',
                    componentName: 'MyProvider',
                    parameters: [],
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report regular TriggerWorkflow without componentName', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'localWorkflow',
                    // No componentName - this is a local workflow
                    parameters: [],
                  },
                ],
              },
            },
          },
        },
        workflows: {
          localWorkflow: {
            name: 'localWorkflow',
            parameters: [],
            actions: [],
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  // Additional coverage tests
  test('detects unknown workflow in Switch case', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Switch',
                    cases: [
                      {
                        condition: { type: 'value', value: true },
                        actions: [
                          {
                            type: 'TriggerWorkflow',
                            name: 'undeclaredWorkflow',
                            componentName: 'MyProvider',
                            parameters: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in Switch default', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Switch',
                    cases: [],
                    default: {
                      actions: [
                        {
                          type: 'TriggerWorkflow',
                          name: 'undeclaredWorkflow',
                          componentName: 'MyProvider',
                          parameters: [],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in Fetch onSuccess', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Fetch',
                    api: 'myApi',
                    onSuccess: {
                      actions: [
                        {
                          type: 'TriggerWorkflow',
                          name: 'undeclaredWorkflow',
                          componentName: 'MyProvider',
                          parameters: [],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in Fetch onError', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Fetch',
                    api: 'myApi',
                    onError: {
                      actions: [
                        {
                          type: 'TriggerWorkflow',
                          name: 'undeclaredWorkflow',
                          componentName: 'MyProvider',
                          parameters: [],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in Fetch onMessage', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Fetch',
                    api: 'myApi',
                    onMessage: {
                      actions: [
                        {
                          type: 'TriggerWorkflow',
                          name: 'undeclaredWorkflow',
                          componentName: 'MyProvider',
                          parameters: [],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in TriggerWorkflow callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'declaredWorkflow',
                    componentName: 'MyProvider',
                    parameters: [],
                    callbacks: {
                      onComplete: {
                        actions: [
                          {
                            type: 'TriggerWorkflow',
                            name: 'undeclaredWorkflow',
                            componentName: 'MyProvider',
                            parameters: [],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in Custom action events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'Custom',
                    name: 'customAction',
                    events: {
                      onSuccess: {
                        actions: [
                          {
                            type: 'TriggerWorkflow',
                            name: 'undeclaredWorkflow',
                            componentName: 'MyProvider',
                            parameters: [],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('handles action with undefined type', () => {
    const issues: any[] = [];
    const files: any = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    // type is undefined
                    events: {
                      someEvent: {
                        actions: [
                          {
                            type: 'TriggerWorkflow',
                            name: 'undeclaredWorkflow',
                            componentName: 'MyProvider',
                            parameters: [],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('handles null event entries', () => {
    const issues: any[] = [];
    const files: any = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'declaredWorkflow',
                    componentName: 'MyProvider',
                    parameters: [],
                  },
                ],
              },
              hover: null, // null event
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles component without contexts', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'someWorkflow',
                    componentName: 'SomeProvider',
                    parameters: [],
                  },
                ],
              },
            },
          },
        },
        // No contexts
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash or report (no context subscription)
    expect(issues).toHaveLength(0);
  });

  test('detects unknown workflow in component onLoad', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {},
        onLoad: {
          actions: [
            {
              type: 'TriggerWorkflow',
              name: 'undeclaredWorkflow',
              componentName: 'MyProvider',
              parameters: [],
            },
          ],
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in component onAttributeChange', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {},
        onAttributeChange: {
          actions: [
            {
              type: 'TriggerWorkflow',
              name: 'undeclaredWorkflow',
              componentName: 'MyProvider',
              parameters: [],
            },
          ],
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in component workflow', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {},
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              {
                type: 'TriggerWorkflow',
                name: 'undeclaredWorkflow',
                componentName: 'MyProvider',
                parameters: [],
              },
            ],
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('detects unknown workflow in node events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: {
            type: 'element',
            tag: 'div',
            children: [],
            events: {
              click: {
                actions: [
                  {
                    type: 'TriggerWorkflow',
                    name: 'undeclaredWorkflow',
                    componentName: 'MyProvider',
                    parameters: [],
                  },
                ],
              },
            },
          },
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.workflowName).toBe('undeclaredWorkflow');
  });

  test('handles null node', () => {
    const issues: any[] = [];
    const files: any = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {
          root: null,
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles null workflow', () => {
    const issues: any[] = [];
    const files: any = createProjectFiles({
      Consumer: {
        name: 'Consumer',
        nodes: {},
        workflows: {
          nullWorkflow: null,
        },
        contexts: {
          MyProvider: {
            formulas: [],
            workflows: ['declaredWorkflow'],
            componentName: 'MyProvider',
          },
        },
      },
    });

    unknownContextWorkflowRule.visit(
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
