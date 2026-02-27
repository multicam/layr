/**
 * Duplicate Formula Argument Name Rule
 * Detects formulas with duplicate argument names
 */

import type { Rule } from '../../types';

export const duplicateFormulaArgumentNameRule: Rule<{
  argName: string;
  occurrences: number;
}> = {
  code: 'duplicate formula argument name',
  level: 'error',
  category: 'formulas',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.formulas) continue;

      for (const [formulaName, formula] of Object.entries(component.formulas)) {
        if (!formula?.arguments) continue;

        // Count argument occurrences
        const argCounts = new Map<string, number>();
        for (const arg of formula.arguments) {
          if (!arg?.name) continue;
          const count = argCounts.get(arg.name) || 0;
          argCounts.set(arg.name, count + 1);
        }

        // Report duplicates
        for (const [argName, count] of argCounts) {
          if (count > 1) {
            report(
              { argName, occurrences: count },
              ['components', compName, 'formulas', formulaName, 'arguments']
            );
          }
        }
      }
    }

    // Also check project-level formulas
    for (const [formulaName, formula] of Object.entries(ctx.files.formulas || {})) {
      if (!formula?.arguments) continue;

      // Count argument occurrences
      const argCounts = new Map<string, number>();
      for (const arg of formula.arguments) {
        if (!arg?.name) continue;
        const count = argCounts.get(arg.name) || 0;
        argCounts.set(arg.name, count + 1);
      }

      // Report duplicates
      for (const [argName, count] of argCounts) {
        if (count > 1) {
          report(
            { argName, occurrences: count },
            ['formulas', formulaName, 'arguments']
          );
        }
      }
    }
  },
};
