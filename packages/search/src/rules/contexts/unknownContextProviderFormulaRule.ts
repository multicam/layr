/**
 * Unknown Context Provider Formula Rule
 * Detects context subscriptions referencing formulas not exposed by the provider
 */

import type { Rule } from '../../types';
import type { Component, ComponentContext } from '@layr/types';

export const unknownContextProviderFormulaRule: Rule<{
  contextName: string;
  formulaName: string;
  providerName: string;
}> = {
  code: 'unknown context provider formula',
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

        // Get exposed formulas from provider
        const exposedFormulas = new Set<string>();
        for (const [formulaName, formula] of Object.entries(provider.formulas || {})) {
          if (formula?.exposeInContext) {
            exposedFormulas.add(formulaName);
          }
        }

        // Check each requested formula in the context subscription
        for (const formulaName of context.formulas || []) {
          if (!exposedFormulas.has(formulaName)) {
            report(
              { contextName: contextKey, formulaName, providerName },
              ['components', compName, 'contexts', contextKey]
            );
          }
        }
      }
    }
  },
};
