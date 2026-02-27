/**
 * Duplicate Workflow Parameter Rule
 * Detects workflows with duplicate parameter names
 */

import type { Rule } from '../../types';

export const duplicateWorkflowParameterRule: Rule<{
  paramName: string;
  occurrences: number;
}> = {
  code: 'duplicate workflow parameter',
  level: 'error',
  category: 'workflows',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.workflows) continue;

      for (const [workflowName, workflow] of Object.entries(component.workflows)) {
        if (!workflow?.parameters) continue;

        // Count parameter occurrences
        const paramCounts = new Map<string, number>();
        for (const param of workflow.parameters) {
          if (!param?.name) continue;
          const count = paramCounts.get(param.name) || 0;
          paramCounts.set(param.name, count + 1);
        }

        // Report duplicates
        for (const [paramName, count] of paramCounts) {
          if (count > 1) {
            report(
              { paramName, occurrences: count },
              ['components', compName, 'workflows', workflowName, 'parameters']
            );
          }
        }
      }
    }
  },
};
