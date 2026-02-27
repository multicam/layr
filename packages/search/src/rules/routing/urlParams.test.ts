/**
 * Tests for new routing linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownUrlParameterRule } from './unknownUrlParameterRule';
import { unknownSetUrlParameterRule } from './unknownSetUrlParameterRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('unknownUrlParameterRule', () => {
  test('reports URL parameter references not in route', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'userId'] }, // userId not in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('userId');
  });

  test('does not report valid URL parameter references', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] }, // id is in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports all invalid URL parameters with multiple params', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/orgs/:orgId/users/:userId' },
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] }, // id not in route
          },
          node2: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'orgId'] }, // orgId is in route
          },
          node3: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'postId'] }, // postId not in route
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    const paramNames = issues.map(i => i.data.paramName);
    expect(paramNames).toContain('id');
    expect(paramNames).toContain('postId');
  });

  test('handles components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['URL', 'id'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Components without routes don't have URL params, so all refs are invalid
    // But we only check pages (components with routes)
    expect(issues).toHaveLength(0);
  });

  test('checks URL params in nested array formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        formulas: {
          myFormula: {
            name: 'myFormula',
            formula: {
              type: 'array',
              value: [
                { type: 'path', path: ['URL', 'invalidArrayParam'] },
              ],
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidArrayParam');
  });

  test('checks URL params in deeply nested array formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        formulas: {
          myFormula: {
            name: 'myFormula',
            formula: {
              type: 'array',
              value: [
                {
                  type: 'array',
                  value: [
                    { type: 'path', path: ['URL', 'invalidDeepParam'] },
                  ],
                },
              ],
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidDeepParam');
  });

  test('checks URL params in variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        variables: {
          myVar: {
            name: 'myVar',
            initialValue: { type: 'path', path: ['URL', 'invalidVarParam'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidVarParam');
  });

  test('checks URL params in node repeat', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            repeat: { type: 'path', path: ['URL', 'invalidRepeatParam'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidRepeatParam');
  });

  test('checks URL params in element attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'element',
            tag: 'a',
            children: [],
            attrs: {
              href: { type: 'path', path: ['URL', 'invalidAttrParam'] },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidAttrParam');
  });

  test('checks URL params in component node attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          node1: {
            type: 'component',
            component: 'ChildComponent',
            children: [],
            attrs: {
              value: { type: 'path', path: ['URL', 'invalidCompParam'] },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidCompParam');
  });

  test('checks URL params in route title', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: {
          path: '/users/:id',
          title: { type: 'path', path: ['URL', 'invalidTitleParam'] },
        },
        nodes: {},
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidTitleParam');
  });

  test('checks URL params in route description', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: {
          path: '/users/:id',
          description: { type: 'path', path: ['URL', 'invalidDescParam'] },
        },
        nodes: {},
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidDescParam');
  });

  test('checks URL params in route icon', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: {
          path: '/users/:id',
          icon: { type: 'path', path: ['URL', 'invalidIconParam'] },
        },
        nodes: {},
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidIconParam');
  });

  test('checks URL params in API url', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'path', path: ['URL', 'invalidApiUrlParam'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidApiUrlParam');
  });

  test('checks URL params in API body', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            body: { type: 'path', path: ['URL', 'invalidBodyParam'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidBodyParam');
  });

  test('checks URL params in API headers', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            headers: {
              'X-User-ID': {
                formula: { type: 'path', path: ['URL', 'invalidHeaderParam'] },
              },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidHeaderParam');
  });

  test('checks URL params in API header enabled formula', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            headers: {
              'X-Custom': {
                formula: { type: 'value', value: 'test' },
                enabled: { type: 'path', path: ['URL', 'invalidEnabledParam'] },
              },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidEnabledParam');
  });

  test('checks URL params in API queryParams', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            queryParams: {
              page: {
                formula: { type: 'path', path: ['URL', 'invalidQueryParam'] },
              },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidQueryParam');
  });

  test('checks URL params in API queryParam enabled formula', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            queryParams: {
              filter: {
                formula: { type: 'value', value: 'test' },
                enabled: { type: 'path', path: ['URL', 'invalidQueryEnabledParam'] },
              },
            },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidQueryEnabledParam');
  });

  test('valid URL params in APIs are not reported', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'path', path: ['URL', 'id'] },
            body: { type: 'path', path: ['URL', 'id'] },
          },
        },
      },
    });

    unknownUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownSetUrlParameterRule', () => {
  test('reports SetURLParameter targeting non-existent param', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParam: {
            name: 'updateParam',
            parameters: [],
            actions: [
              { type: 'SetURLParameter', name: 'userId', data: { type: 'value', value: '123' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('userId');
  });

  test('does not report SetURLParameter targeting valid param', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParam: {
            name: 'updateParam',
            parameters: [],
            actions: [
              { type: 'SetURLParameter', name: 'id', data: { type: 'value', value: '456' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports SetURLParameters with invalid params', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          updateParams: {
            name: 'updateParams',
            parameters: [],
            actions: [
              {
                type: 'SetURLParameters',
                parameters: [
                  { name: 'id', formula: { type: 'value', value: '1' } }, // valid
                  { name: 'page', formula: { type: 'value', value: '2' } }, // invalid
                ],
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('page');
  });

  test('checks SetURLParameter in Switch cases', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
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
                      { type: 'SetURLParameter', name: 'invalidCase', data: { type: 'value', value: '123' } },
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

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidCase');
  });

  test('checks SetURLParameter in Switch default', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          switchWorkflow: {
            name: 'switchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Switch',
                data: { type: 'value', value: 'a' },
                cases: [],
                default: {
                  actions: [
                    { type: 'SetURLParameter', name: 'invalidDefault', data: { type: 'value', value: '123' } },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidDefault');
  });

  test('checks SetURLParameter in Fetch onSuccess', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          fetchWorkflow: {
            name: 'fetchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onSuccess: {
                  actions: [
                    { type: 'SetURLParameter', name: 'invalidSuccess', data: { type: 'value', value: '123' } },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidSuccess');
  });

  test('checks SetURLParameter in Fetch onError', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          fetchWorkflow: {
            name: 'fetchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onError: {
                  actions: [
                    { type: 'SetURLParameter', name: 'invalidError', data: { type: 'value', value: '123' } },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidError');
  });

  test('checks SetURLParameter in Fetch onMessage', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          fetchWorkflow: {
            name: 'fetchWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onMessage: {
                  actions: [
                    { type: 'SetURLParameter', name: 'invalidMessage', data: { type: 'value', value: '123' } },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidMessage');
  });

  test('checks SetURLParameter in TriggerWorkflow callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
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
                      { type: 'SetURLParameter', name: 'invalidCallback', data: { type: 'value', value: '123' } },
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

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidCallback');
  });

  test('checks SetURLParameter in Custom action events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
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
                      { type: 'SetURLParameter', name: 'invalidCustom', data: { type: 'value', value: '123' } },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidCustom');
  });

  test('checks SetURLParameter in component-level events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        events: {
          click: {
            actions: [
              { type: 'SetURLParameter', name: 'invalidEvent', data: { type: 'value', value: '123' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidEvent');
  });

  test('checks SetURLParameter in onLoad', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        onLoad: {
          actions: [
            { type: 'SetURLParameter', name: 'invalidOnLoad', data: { type: 'value', value: '123' } },
          ],
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidOnLoad');
  });

  test('checks SetURLParameter in onAttributeChange', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        onAttributeChange: {
          actions: [
            { type: 'SetURLParameter', name: 'invalidAttrChange', data: { type: 'value', value: '123' } },
          ],
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidAttrChange');
  });

  test('checks SetURLParameter in node events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {
          button: {
            type: 'element',
            tag: 'button',
            children: [],
            events: {
              click: {
                actions: [
                  { type: 'SetURLParameter', name: 'invalidNodeEvent', data: { type: 'value', value: '123' } },
                ],
              },
            },
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.paramName).toBe('invalidNodeEvent');
  });

  test('handles null action in array', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          nullActionWorkflow: {
            name: 'nullActionWorkflow',
            parameters: [],
            actions: [
              null as any,
              { type: 'SetURLParameter', name: 'id', data: { type: 'value', value: '123' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles SetURLParameters with null parameters array', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Page1: {
        name: 'Page1',
        route: { path: '/users/:id' },
        nodes: {},
        workflows: {
          nullParamsWorkflow: {
            name: 'nullParamsWorkflow',
            parameters: [],
            actions: [
              { type: 'SetURLParameters', parameters: null } as any,
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not check components without routes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          updateParam: {
            name: 'updateParam',
            parameters: [],
            actions: [
              { type: 'SetURLParameter', name: 'invalidParam', data: { type: 'value', value: '123' } },
            ],
          },
        },
      },
    });

    unknownSetUrlParameterRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});
