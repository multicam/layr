/**
 * Tests for formula linting rules
 */

import { describe, test, expect } from 'bun:test';
import { duplicateFormulaArgumentNameRule } from './duplicateFormulaArgumentNameRule';
import { noReferenceComponentFormulaRule } from './noReferenceComponentFormulaRule';
import { noReferenceProjectFormulaRule } from './noReferenceProjectFormulaRule';
import type { ProjectFiles, Component, ProjectFormula } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(
  components: Record<string, Component>,
  formulas?: Record<string, ProjectFormula>
): ProjectFiles {
  return { components, formulas };
}

describe('duplicateFormulaArgumentNameRule', () => {
  test('reports duplicate formula argument names', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          myFormula: {
            name: 'myFormula',
            arguments: [
              { name: 'x' },
              { name: 'y' },
              { name: 'x' }, // duplicate!
            ],
            formula: { type: 'value', value: null },
          },
        },
      },
    });

    duplicateFormulaArgumentNameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.argName).toBe('x');
    expect(issues[0].data.occurrences).toBe(2);
  });

  test('does not report unique argument names', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          myFormula: {
            name: 'myFormula',
            arguments: [
              { name: 'x' },
              { name: 'y' },
              { name: 'z' },
            ],
            formula: { type: 'value', value: null },
          },
        },
      },
    });

    duplicateFormulaArgumentNameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('checks project-level formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {},
      {
        globalFormula: {
          name: 'globalFormula',
          arguments: [
            { name: 'a' },
            { name: 'a' }, // duplicate!
          ],
          formula: { type: 'value', value: null },
        },
      }
    );

    duplicateFormulaArgumentNameRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.argName).toBe('a');
  });
});

describe('noReferenceComponentFormulaRule', () => {
  test('reports component formulas that are never called', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          unusedFormula: {
            name: 'unusedFormula',
            arguments: [],
            formula: { type: 'value', value: 42 },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('unusedFormula');
  });

  test('does not report formulas that are called', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Formulas', 'usedFormula'] },
          },
        },
        formulas: {
          usedFormula: {
            name: 'usedFormula',
            arguments: [],
            formula: { type: 'value', value: 42 },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles formulas calling other formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          formula1: {
            name: 'formula1',
            arguments: [],
            formula: { type: 'path', path: ['Formulas', 'formula2'] },
          },
          formula2: {
            name: 'formula2',
            arguments: [],
            formula: { type: 'value', value: 42 },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // formula1 references formula2, so only formula1 is unreferenced
    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('formula1');
  });

  test('detects formula references via apply', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          usedFormula: {
            name: 'usedFormula',
            arguments: [],
            formula: { type: 'value', value: 42 },
          },
          callerFormula: {
            name: 'callerFormula',
            arguments: [],
            formula: { type: 'apply', name: 'usedFormula', args: {} },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // usedFormula is referenced via apply, only callerFormula is unreferenced
    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('callerFormula');
  });

  test('detects formula references in variable initial values', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        variables: {
          myVar: {
            name: 'myVar',
            initialValue: { type: 'path', path: ['Formulas', 'usedInVar'] },
          },
        },
        formulas: {
          usedInVar: {
            name: 'usedInVar',
            arguments: [],
            formula: { type: 'value', value: 'test' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in node conditions', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            condition: { type: 'path', path: ['Formulas', 'usedInCondition'] },
          },
        },
        formulas: {
          usedInCondition: {
            name: 'usedInCondition',
            arguments: [],
            formula: { type: 'value', value: true },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in node repeats', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'div',
            children: [],
            repeat: { type: 'path', path: ['Formulas', 'usedInRepeat'] },
          },
        },
        formulas: {
          usedInRepeat: {
            name: 'usedInRepeat',
            arguments: [],
            formula: { type: 'value', value: [1, 2, 3] },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in element attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'input',
            children: [],
            attrs: {
              value: { type: 'path', path: ['Formulas', 'usedInAttr'] },
            },
          },
        },
        formulas: {
          usedInAttr: {
            name: 'usedInAttr',
            arguments: [],
            formula: { type: 'value', value: 'test' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in component node attributes', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'component',
            component: 'Child',
            children: [],
            attrs: {
              data: { type: 'path', path: ['Formulas', 'usedInCompAttr'] },
            },
          },
        },
        formulas: {
          usedInCompAttr: {
            name: 'usedInCompAttr',
            arguments: [],
            formula: { type: 'value', value: 'data' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in text node values', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'text',
            value: { type: 'path', path: ['Formulas', 'usedInText'] },
          },
        },
        formulas: {
          usedInText: {
            name: 'usedInText',
            arguments: [],
            formula: { type: 'value', value: 'Hello' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in API url', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'path', path: ['Formulas', 'usedInApiUrl'] },
          },
        },
        formulas: {
          usedInApiUrl: {
            name: 'usedInApiUrl',
            arguments: [],
            formula: { type: 'value', value: '/api/users' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in API headers', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            headers: {
              Authorization: {
                formula: { type: 'path', path: ['Formulas', 'usedInHeader'] },
              },
            },
          },
        },
        formulas: {
          usedInHeader: {
            name: 'usedInHeader',
            arguments: [],
            formula: { type: 'value', value: 'Bearer token' },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in API header enabled', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            headers: {
              'X-Custom': {
                formula: { type: 'value', value: 'test' },
                enabled: { type: 'path', path: ['Formulas', 'usedInHeaderEnabled'] },
              },
            },
          },
        },
        formulas: {
          usedInHeaderEnabled: {
            name: 'usedInHeaderEnabled',
            arguments: [],
            formula: { type: 'value', value: true },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in API queryParams', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            queryParams: {
              page: {
                formula: { type: 'path', path: ['Formulas', 'usedInQueryParam'] },
              },
            },
          },
        },
        formulas: {
          usedInQueryParam: {
            name: 'usedInQueryParam',
            arguments: [],
            formula: { type: 'value', value: 1 },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in API queryParam enabled', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        apis: {
          myApi: {
            name: 'myApi',
            url: { type: 'value', value: '/api' },
            queryParams: {
              filter: {
                formula: { type: 'value', value: 'test' },
                enabled: { type: 'path', path: ['Formulas', 'usedInQueryEnabled'] },
              },
            },
          },
        },
        formulas: {
          usedInQueryEnabled: {
            name: 'usedInQueryEnabled',
            arguments: [],
            formula: { type: 'value', value: true },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects formula references in nested array formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        formulas: {
          usedInArray: {
            name: 'usedInArray',
            arguments: [],
            formula: { type: 'value', value: 1 },
          },
          caller: {
            name: 'caller',
            arguments: [],
            formula: {
              type: 'array',
              value: [
                { formula: { type: 'path', path: ['Formulas', 'usedInArray'] } },
              ],
            },
          },
        },
      },
    });

    noReferenceComponentFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // usedInArray is referenced, caller is unreferenced
    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('caller');
  });
});

describe('noReferenceProjectFormulaRule', () => {
  test('reports project formulas that are never called', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {},
      {
        globalHelper: {
          name: 'globalHelper',
          arguments: [],
          formula: { type: 'value', value: 'help' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('globalHelper');
  });

  test('does not report project formulas called from components', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {
            node1: {
              type: 'text',
              value: { type: 'path', path: ['Formulas', 'globalHelper'] },
            },
          },
        },
      },
      {
        globalHelper: {
          name: 'globalHelper',
          arguments: [],
          formula: { type: 'value', value: 'help' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles empty project formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles({}, {});

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references via apply', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {},
      {
        helper: {
          name: 'helper',
          arguments: [],
          formula: { type: 'value', value: 'help' },
        },
        caller: {
          name: 'caller',
          arguments: [],
          formula: { type: 'apply', name: 'helper', args: {} },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // helper is referenced via apply, only caller is unreferenced
    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('caller');
  });

  test('detects project formula references in component variables', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          variables: {
            myVar: {
              name: 'myVar',
              initialValue: { type: 'path', path: ['Formulas', 'globalHelper'] },
            },
          },
        },
      },
      {
        globalHelper: {
          name: 'globalHelper',
          arguments: [],
          formula: { type: 'value', value: 'help' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in component node conditions', () => {
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
              condition: { type: 'path', path: ['Formulas', 'isVisible'] },
            },
          },
        },
      },
      {
        isVisible: {
          name: 'isVisible',
          arguments: [],
          formula: { type: 'value', value: true },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in component node repeats', () => {
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
              repeat: { type: 'path', path: ['Formulas', 'getItems'] },
            },
          },
        },
      },
      {
        getItems: {
          name: 'getItems',
          arguments: [],
          formula: { type: 'value', value: [1, 2, 3] },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
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
              tag: 'input',
              children: [],
              attrs: {
                value: { type: 'path', path: ['Formulas', 'getDefaultValue'] },
              },
            },
          },
        },
      },
      {
        getDefaultValue: {
          name: 'getDefaultValue',
          arguments: [],
          formula: { type: 'value', value: 'default' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
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
              component: 'Child',
              children: [],
              attrs: {
                data: { type: 'path', path: ['Formulas', 'getData'] },
              },
            },
          },
        },
      },
      {
        getData: {
          name: 'getData',
          arguments: [],
          formula: { type: 'value', value: {} },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
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
              value: { type: 'path', path: ['Formulas', 'getLabel'] },
            },
          },
        },
      },
      {
        getLabel: {
          name: 'getLabel',
          arguments: [],
          formula: { type: 'value', value: 'Label' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
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
              url: { type: 'path', path: ['Formulas', 'getApiUrl'] },
            },
          },
        },
      },
      {
        getApiUrl: {
          name: 'getApiUrl',
          arguments: [],
          formula: { type: 'value', value: '/api' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
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
                  formula: { type: 'path', path: ['Formulas', 'getAuthHeader'] },
                },
              },
            },
          },
        },
      },
      {
        getAuthHeader: {
          name: 'getAuthHeader',
          arguments: [],
          formula: { type: 'value', value: 'Bearer token' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in API header enabled', () => {
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
                'X-Custom': {
                  formula: { type: 'value', value: 'test' },
                  enabled: { type: 'path', path: ['Formulas', 'shouldEnableHeader'] },
                },
              },
            },
          },
        },
      },
      {
        shouldEnableHeader: {
          name: 'shouldEnableHeader',
          arguments: [],
          formula: { type: 'value', value: true },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in API queryParams', () => {
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
                  formula: { type: 'path', path: ['Formulas', 'getCurrentPage'] },
                },
              },
            },
          },
        },
      },
      {
        getCurrentPage: {
          name: 'getCurrentPage',
          arguments: [],
          formula: { type: 'value', value: 1 },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in API queryParam enabled', () => {
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
                filter: {
                  formula: { type: 'value', value: 'test' },
                  enabled: { type: 'path', path: ['Formulas', 'shouldFilter'] },
                },
              },
            },
          },
        },
      },
      {
        shouldFilter: {
          name: 'shouldFilter',
          arguments: [],
          formula: { type: 'value', value: true },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in route title', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            title: { type: 'path', path: ['Formulas', 'getPageTitle'] },
          },
          nodes: {},
        },
      },
      {
        getPageTitle: {
          name: 'getPageTitle',
          arguments: [],
          formula: { type: 'value', value: 'My Page' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in route description', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            description: { type: 'path', path: ['Formulas', 'getPageDescription'] },
          },
          nodes: {},
        },
      },
      {
        getPageDescription: {
          name: 'getPageDescription',
          arguments: [],
          formula: { type: 'value', value: 'Description' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in route icon', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Page1: {
          name: 'Page1',
          route: {
            path: '/test',
            icon: { type: 'path', path: ['Formulas', 'getPageIcon'] },
          },
          nodes: {},
        },
      },
      {
        getPageIcon: {
          name: 'getPageIcon',
          arguments: [],
          formula: { type: 'value', value: 'icon' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('detects project formula references in nested array formulas', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {
        Component1: {
          name: 'Component1',
          nodes: {},
          formulas: {
            caller: {
              name: 'caller',
              arguments: [],
              formula: {
                type: 'array',
                value: [
                  { formula: { type: 'path', path: ['Formulas', 'globalHelper'] } },
                ],
              },
            },
          },
        },
      },
      {
        globalHelper: {
          name: 'globalHelper',
          arguments: [],
          formula: { type: 'value', value: 'help' },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // globalHelper is referenced, component formula caller is not a project formula
    expect(issues).toHaveLength(0);
  });

  test('project formulas can reference each other but still need external reference', () => {
    const issues: any[] = [];
    const files = createProjectFiles(
      {},
      {
        helper1: {
          name: 'helper1',
          arguments: [],
          formula: { type: 'value', value: 'help1' },
        },
        helper2: {
          name: 'helper2',
          arguments: [],
          formula: { type: 'path', path: ['Formulas', 'helper1'] },
        },
      }
    );

    noReferenceProjectFormulaRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    // helper2 references helper1 so helper1 is not unreferenced
    // but helper2 itself is not referenced from any component
    expect(issues).toHaveLength(1);
    expect(issues[0].data.formulaName).toBe('helper2');
  });
});
