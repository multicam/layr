/**
 * Unknown Context Provider Workflow Rule
 * Detects context subscriptions referencing workflows not exposed by the provider
 */

import type { Rule } from '../../types';
import type { Component } from '@layr/types';

export const unknownContextProviderWorkflowRule: Rule<{
  contextName: string;
  workflowName: string;
  providerName: string;
}> = {
  code: 'unknown context provider workflow',
  level: 'error',
  category: 'contexts',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.contexts) continue;

      for (const [contextKey, context] of Object.entries(component.contexts)) {
        if (!context) continue;

        const providerName = context.componentName || contextKey;
        const packageName = context.package;

        // Find the provider component
        let provider: Component | undefined;
        if (packageName) {
          provider = ctx.files.packages?.[packageName]?.components?.[providerName];
        } else {
          provider = ctx.files.components?.[providerName];
        }

        // If provider doesn't exist, skip (handled by unknownContextProviderRule)
        if (!provider) continue;

        // Get exposed workflows from provider
        const exposedWorkflows = new Set<string>();
        for (const [workflowName, workflow] of Object.entries(provider.workflows || {})) {
          if (workflow?.exposeInContext) {
            exposedWorkflows.add(workflowName);
          }
        }

        // Check each requested workflow in the context subscription
        for (const workflowName of context.workflows || []) {
          if (!exposedWorkflows.has(workflowName)) {
            report(
              { contextName: contextKey, workflowName, providerName },
              ['components', compName, 'contexts', contextKey]
            );
          }
        }
      }
    }
  },
};
