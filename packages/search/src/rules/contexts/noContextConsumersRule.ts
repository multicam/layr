/**
 * No Context Consumers Rule
 * Detects context providers that have no consumers
 */

import type { Rule } from '../../types';
import type { Component } from '@layr/types';

export const noContextConsumersRule: Rule<{
  providerName: string;
  exposedFormulas: string[];
  exposedWorkflows: string[];
}> = {
  code: 'no context consumers',
  level: 'warning',
  category: 'contexts',
  visit: (report, ctx) => {
    // Use memo to build a map of all context consumers
    const consumersByProvider = ctx.memo('context-consumers-map', () => {
      const map = new Map<string, string[]>();

      for (const [compName, component] of Object.entries(ctx.files.components || {})) {
        if (!component?.contexts) continue;

        for (const [contextKey, context] of Object.entries(component.contexts)) {
          if (!context) continue;

          const providerName = context.componentName || contextKey;
          const packageName = context.package;
          const fullKey = packageName ? `${packageName}/${providerName}` : providerName;

          const consumers = map.get(fullKey) || [];
          consumers.push(compName);
          map.set(fullKey, consumers);
        }
      }

      return map;
    });

    // Find all providers and check if they have consumers
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check if this component is a context provider
      const exposedFormulas: string[] = [];
      const exposedWorkflows: string[] = [];

      for (const [formulaName, formula] of Object.entries(component.formulas || {})) {
        if (formula?.exposeInContext) {
          exposedFormulas.push(formulaName);
        }
      }

      for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
        if (workflow?.exposeInContext) {
          exposedWorkflows.push(workflowName);
        }
      }

      // If this component exposes nothing, it's not a provider
      if (exposedFormulas.length === 0 && exposedWorkflows.length === 0) continue;

      // Check if there are any consumers
      const consumers = consumersByProvider.get(compName);
      if (!consumers || consumers.length === 0) {
        report(
          {
            providerName: compName,
            exposedFormulas,
            exposedWorkflows,
          },
          ['components', compName]
        );
      }
    }
  },
};
