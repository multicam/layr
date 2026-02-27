/**
 * Tests for logic linting rules
 */

import { describe, test, expect } from 'bun:test';
import { unknownProjectFormulaRule } from './unknownProjectFormulaRule';
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
});
