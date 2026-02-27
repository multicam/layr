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
});
