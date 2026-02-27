/**
 * Unknown Context Provider Rule
 * Detects context subscriptions referencing provider components that don't exist
 */

import type { Rule } from '../../types';

export const unknownContextProviderRule: Rule<{
  contextName: string;
  providerName: string;
}> = {
  code: 'unknown context provider',
  level: 'error',
  category: 'contexts',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.contexts) continue;

      for (const [contextKey, context] of Object.entries(component.contexts)) {
        if (!context) continue;

        const providerName = context.componentName || contextKey;
        const packageName = context.package;

        // Check if provider component exists
        let providerExists = false;

        if (packageName) {
          // Check in package components
          const packageComponents = ctx.files.packages?.[packageName]?.components;
          providerExists = !!(packageComponents?.[providerName]);
        } else {
          // Check in project components
          providerExists = !!(ctx.files.components?.[providerName]);
        }

        if (!providerExists) {
          report(
            { contextName: contextKey, providerName },
            ['components', compName, 'contexts', contextKey]
          );
        }
      }
    }
  },
};
