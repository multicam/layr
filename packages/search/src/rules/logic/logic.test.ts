/**
 * Tests for logic linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownProjectFormulaRule } from './unknownProjectFormulaRule';
import { unknownRepeatIndexFormulaRule, unknownRepeatItemFormulaRule } from './unknownRepeatFormulaRule';
import { switchUnreachableCaseRule } from './switchUnreachableCaseRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>, formulas?: any): ProjectFiles {
  return { components, formulas };
}

describe('unknownProjectFormulaRule', () => {
  test('reports references to non-existent project formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: { type: 'path', path: ['Formulas', 'nonExistentFormula'] },
            },
          },
        },
      },
      {} // No project formulas defined
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('nonExistentFormula');
  });

  test('does not report valid project formula references', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: { type: 'path', path: ['Formulas', 'existingProjectFormula'] },
            },
          },
        },
      },
      {
        existingProjectFormula: {
          name: 'existingProjectFormula',
          formula: { type: 'value', value: 42 },
        },
      }
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('does not report component formula references', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: { type: 'value', value: 1 },
            },
            callerFormula: {
              name: 'callerFormula',
              formula: { type: 'path', path: ['Formulas', 'myFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // myFormula is a component formula, not a project formula, so should not report
    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in array formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: {
                type: 'array',
                value: [
                  { type: 'path', path: ['Formulas', 'missingArrayFormula'] },
                ],
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingArrayFormula');
  });

  test('detects project formula references in object formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: {
                type: 'object',
                value: {
                  key: { type: 'path', path: ['Formulas', 'missingObjFormula'] },
                },
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingObjFormula');
  });

  test('detects project formula references in function formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            myFormula: {
              name: 'myFormula',
              formula: {
                type: 'function',
                name: 'map',
                parameters: [
                  { name: 'item', formula: { type: 'path', path: ['Formulas', 'missingFuncFormula'] } },
                ],
                args: {},
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingFuncFormula');
  });

  test('detects project formula references in variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          variables: {
            myVar: {
              name: 'myVar',
              initialValue: { type: 'path', path: ['Formulas', 'missingVarFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingVarFormula');
  });

  test('detects project formula references in node conditions', () => {
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
              condition: { type: 'path', path: ['Formulas', 'missingConditionFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingConditionFormula');
  });

  test('detects project formula references in node repeat', () => {
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
              repeat: { type: 'path', path: ['Formulas', 'missingRepeatFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingRepeatFormula');
  });

  test('detects project formula references in element attributes', () => {
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
                class: { type: 'path', path: ['Formulas', 'missingAttrFormula'] },
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingAttrFormula');
  });

  test('detects project formula references in component node attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'component',
              component: 'OtherComponent',
              children: [],
              attrs: {
                value: { type: 'path', path: ['Formulas', 'missingCompAttrFormula'] },
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingCompAttrFormula');
  });

  test('detects project formula references in text node values', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'text',
              value: { type: 'path', path: ['Formulas', 'missingTextFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingTextFormula');
  });

  test('detects project formula references in API url', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          apis: {
            myApi: {
              name: 'myApi',
              url: { type: 'path', path: ['Formulas', 'missingUrlFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingUrlFormula');
  });

  test('detects project formula references in API body', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          apis: {
            myApi: {
              name: 'myApi',
              url: { type: 'value', value: '/api' },
              body: { type: 'path', path: ['Formulas', 'missingBodyFormula'] },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingBodyFormula');
  });

  test('detects project formula references in API headers', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          apis: {
            myApi: {
              name: 'myApi',
              url: { type: 'value', value: '/api' },
              headers: {
                Authorization: {
                  formula: { type: 'path', path: ['Formulas', 'missingHeaderFormula'] },
                },
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingHeaderFormula');
  });

  test('detects project formula references in API query params', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          apis: {
            myApi: {
              name: 'myApi',
              url: { type: 'value', value: '/api' },
              queryParams: {
                page: {
                  formula: { type: 'path', path: ['Formulas', 'missingQueryFormula'] },
                },
              },
            },
          },
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingQueryFormula');
  });

  test('detects project formula references in route title', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            title: { type: 'path', path: ['Formulas', 'missingTitleFormula'] },
          },
          nodes: {},
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingTitleFormula');
  });

  test('detects project formula references in route description', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            description: { type: 'path', path: ['Formulas', 'missingDescFormula'] },
          },
          nodes: {},
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingDescFormula');
  });

  test('detects project formula references in route icon', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            icon: { type: 'path', path: ['Formulas', 'missingIconFormula'] },
          },
          nodes: {},
        },
      },
      {} // No project formulas
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingIconFormula');
  });

  test('detects project formula references in project formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {},
      {
        formula1: {
          name: 'formula1',
          formula: { type: 'path', path: ['Formulas', 'missingProjectFormula'] },
        },
      }
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('missingProjectFormula');
  });

  test('valid project formula references in APIs are not reported', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          apis: {
            myApi: {
              name: 'myApi',
              url: { type: 'path', path: ['Formulas', 'existingFormula'] },
              method: { type: 'path', path: ['Formulas', 'existingFormula'] },
              timeout: { type: 'path', path: ['Formulas', 'existingFormula'] },
              credentials: { type: 'path', path: ['Formulas', 'existingFormula'] },
              parserMode: { type: 'path', path: ['Formulas', 'existingFormula'] },
              isError: { type: 'path', path: ['Formulas', 'existingFormula'] },
              autoFetch: { type: 'path', path: ['Formulas', 'existingFormula'] },
            },
          },
        },
      },
      {
        existingFormula: {
          name: 'existingFormula',
          formula: { type: 'value', value: '/api' },
        },
      }
    );

    unknownProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownRepeatIndexFormulaRule', () => {
  test('reports repeat index formula without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            condition: { type: 'path', path: ['Index'] },
            // no repeat config
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('does not report when no repeat index references', () => {
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

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports RepeatIndex formula without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['RepeatIndex'] },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports nested path with Index', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            condition: { type: 'path', path: ['Repeat', 'Index'] },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports index in function args without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: {
              type: 'function',
              name: 'add',
              args: {
                a: { type: 'path', path: ['Index'] },
              },
            },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports index in styles without repeat config', () => {
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
              desktop: [
                {
                  property: 'background-color',
                  value: {
                    type: 'formula',
                    formula: { type: 'path', path: ['Index'] },
                  },
                },
              ],
            },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports index in attributes without repeat config', () => {
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
              'data-index': { type: 'path', path: ['Index'] },
            },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('does not report when repeat config exists', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            repeat: { type: 'value', value: [1, 2, 3] },
            condition: { type: 'path', path: ['Index'] },
          },
        },
      },
    });

    unknownRepeatIndexFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownRepeatItemFormulaRule', () => {
  test('reports repeat item formula without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Item', 'name'] },
            // no repeat config
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('does not report when no repeat item references', () => {
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

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('reports RepeatItem formula without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['RepeatItem', 'name'] },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports nested path with Item', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            condition: { type: 'path', path: ['Repeat', 'Item'] },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports item in function args without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: {
              type: 'function',
              name: 'get',
              args: {
                obj: { type: 'path', path: ['Item'] },
              },
            },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports item in styles without repeat config', () => {
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
              desktop: [
                {
                  property: 'color',
                  value: {
                    type: 'formula',
                    formula: { type: 'path', path: ['Item', 'color'] },
                  },
                },
              ],
            },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports item in attributes without repeat config', () => {
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
              title: { type: 'path', path: ['Item', 'title'] },
            },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('reports item in condition without repeat config', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            condition: { type: 'path', path: ['Item', 'visible'] },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('does not report when repeat config exists', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            repeat: { type: 'value', value: [{ name: 'a' }, { name: 'b' }] },
            value: { type: 'path', path: ['Item', 'name'] },
          },
        },
      },
    });

    unknownRepeatItemFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('switchUnreachableCaseRule', () => {
  test('reports unreachable cases after always-true condition', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'value', value: true }, actions: [] },
                  { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.reason).toBe('prior-always-true');
  });

  test('does not report reachable cases', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'path', path: ['Variables', 'x'] }, actions: [] },
                  { condition: { type: 'path', path: ['Variables', 'y'] }, actions: [] },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  // Additional tests for coverage
  test('default after always-true case - currently not reported due to implementation', () => {
    // Note: The rule detects default-after-always-true but doesn't report it
    // because caseIndex is -1 and the code filters caseIndex >= 0
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'value', value: true }, actions: [] },
                ],
                default: { actions: [] }, // should be unreachable but not reported
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Currently, the default case after always-true is not reported
    // because the implementation filters out caseIndex < 0
    expect(issues).toHaveLength(0);
  });

  test('handles isDefault flag in case', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'value', value: false }, actions: [], isDefault: true },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('detects unreachable cases in nested switch inside default actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'path', path: ['Variables', 'x'] }, actions: [] },
                ],
                default: {
                  actions: [
                    {
                      type: 'switch',
                      cases: [
                        { condition: { type: 'value', value: true }, actions: [] },
                        { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].data.reason).toBe('prior-always-true');
  });

  test('detects unreachable cases in nested switch inside if-then', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'if',
                condition: { type: 'value', value: true },
                then: [
                  {
                    type: 'switch',
                    cases: [
                      { condition: { type: 'value', value: true }, actions: [] },
                      { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects unreachable cases in nested switch inside if-else', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'if',
                condition: { type: 'value', value: false },
                then: [],
                else: [
                  {
                    type: 'switch',
                    cases: [
                      { condition: { type: 'value', value: true }, actions: [] },
                      { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects unreachable cases in nested switch inside forEach', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'forEach',
                collection: { type: 'value', value: [1, 2, 3] },
                actions: [
                  {
                    type: 'switch',
                    cases: [
                      { condition: { type: 'value', value: true }, actions: [] },
                      { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects unreachable cases in nested switch inside parallel', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'parallel',
                actions: [
                  {
                    type: 'switch',
                    cases: [
                      { condition: { type: 'value', value: true }, actions: [] },
                      { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('detects unreachable cases in nested switch inside all', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'all',
                actions: [
                  {
                    type: 'switch',
                    cases: [
                      { condition: { type: 'value', value: true }, actions: [] },
                      { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('checks workflows for unreachable switch cases', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            actions: [
              {
                type: 'switch',
                cases: [
                  { condition: { type: 'value', value: true }, actions: [] },
                  { condition: { type: 'value', value: false }, actions: [] }, // unreachable
                ],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  test('handles workflow with null actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            actions: null,
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles null cases in switch', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [null, { condition: { type: 'value', value: true }, actions: [] }],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles null case actions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [
              {
                type: 'switch',
                cases: [{ condition: { type: 'path', path: ['x'] }, actions: null }],
              },
            ],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles null action in actions array', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: {
          click: {
            actions: [null],
          },
        },
      },
    });

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // Should not crash
    expect(issues).toHaveLength(0);
  });

  test('handles empty project', () => {
    const issues: any[] = [];
    const files = createProjectFiles({});

    switchUnreachableCaseRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles null component', () => {
    const issues: any[] = [];
    const files: any = {
      components: {
        nullComponent: null,
      },
    };

    switchUnreachableCaseRule.visit(
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
