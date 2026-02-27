/**
 * Switch Unreachable Case Rule
 * Detects switch cases that are unreachable because a prior case always matches
 *
 * This happens when:
 * - An earlier case has a condition that is always true
 * - An earlier case catches all values (default at wrong position)
 * - Cases have overlapping conditions
 */

import type { Rule } from '../../types';
import type { Action, Component, Workflow } from '@layr/types';

/**
 * Check if a formula is statically true
 */
function isStaticallyTrue(formula: any): boolean {
  if (!formula) return false;

  if (formula.type === 'value') {
    return formula.value === true;
  }

  return false;
}

/**
 * Check if a formula is statically false
 */
function isStaticallyFalse(formula: any): boolean {
  if (!formula) return false;

  if (formula.type === 'value') {
    return formula.value === false;
  }

  return false;
}

/**
 * Find unreachable cases in a switch action
 */
function findUnreachableCases(switchAction: Action): { caseIndex: number; reason: string }[] {
  const unreachable: { caseIndex: number; reason: string }[] = [];

  // Switch action structure: { type: 'switch', cases: [...], default?: ... }
  const cases = (switchAction as any).cases || [];
  let hasAlwaysTrue = false;
  let hasDefault = false;

  for (let i = 0; i < cases.length; i++) {
    const switchCase = cases[i];
    if (!switchCase) continue;

    const condition = switchCase.condition;

    // If we've already seen an always-true case, this one is unreachable
    if (hasAlwaysTrue) {
      unreachable.push({ caseIndex: i, reason: 'prior-always-true' });
      continue;
    }

    // Check if this case is always true
    if (isStaticallyTrue(condition)) {
      hasAlwaysTrue = true;
    }

    // Check for default case (should be last)
    if (switchCase.isDefault) {
      hasDefault = true;
    }
  }

  // Check default case if it exists
  if ((switchAction as any).default) {
    if (hasAlwaysTrue) {
      unreachable.push({ caseIndex: -1, reason: 'default-after-always-true' });
    }
  }

  return unreachable;
}

/**
 * Recursively walk actions to find switch statements
 */
function walkActions(
  actions: Action[] | undefined,
  compName: string,
  workflowName: string | undefined,
  pathPrefix: (string | number)[],
  report: (data: { caseIndex: number; reason: string }, path: (string | number)[]) => void
): void {
  if (!actions) return;

  for (const action of actions) {
    if (!action) continue;

    // Check if this is a switch action
    if (action.type === 'switch') {
      const unreachable = findUnreachableCases(action);
      for (const { caseIndex, reason } of unreachable) {
        if (caseIndex >= 0) {
          report(
            { caseIndex, reason },
            [...pathPrefix, 'cases', caseIndex]
          );
        }
      }

      // Recursively check cases' actions
      const cases = (action as any).cases || [];
      for (let i = 0; i < cases.length; i++) {
        const switchCase = cases[i];
        if (switchCase?.actions) {
          walkActions(
            switchCase.actions,
            compName,
            workflowName,
            [...pathPrefix, 'cases', i, 'actions'],
            report
          );
        }
      }

      // Check default actions
      if ((action as any).default?.actions) {
        walkActions(
          (action as any).default.actions,
          compName,
          workflowName,
          [...pathPrefix, 'default', 'actions'],
          report
        );
      }
    }

    // Check other action types that might contain nested actions
    if (action.type === 'if') {
      const ifAction = action as any;
      if (ifAction.then) {
        walkActions(ifAction.then, compName, workflowName, [...pathPrefix, 'then'], report);
      }
      if (ifAction.else) {
        walkActions(ifAction.else, compName, workflowName, [...pathPrefix, 'else'], report);
      }
    }

    if (action.type === 'forEach') {
      const forEachAction = action as any;
      if (forEachAction.actions) {
        walkActions(forEachAction.actions, compName, workflowName, [...pathPrefix, 'actions'], report);
      }
    }

    if (action.type === 'parallel' || action.type === 'all') {
      const parallelAction = action as any;
      if (parallelAction.actions) {
        walkActions(parallelAction.actions, compName, workflowName, [...pathPrefix, 'actions'], report);
      }
    }
  }
}

export const switchUnreachableCaseRule: Rule<{ caseIndex: number; reason: string }> = {
  code: 'switch unreachable case',
  level: 'warning',
  category: 'logic',
  visit: (report, ctx) => {
    // Check event handlers in components
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check events
      if (component.events) {
        for (const [eventName, event] of Object.entries(component.events)) {
          if (!event?.actions) continue;

          walkActions(
            event.actions,
            compName,
            undefined,
            ['components', compName, 'events', eventName, 'actions'],
            report
          );
        }
      }

      // Check workflows
      if (component.workflows) {
        for (const [workflowName, workflow] of Object.entries(component.workflows)) {
          if (!workflow?.actions) continue;

          walkActions(
            workflow.actions,
            compName,
            workflowName,
            ['components', compName, 'workflows', workflowName, 'actions'],
            report
          );
        }
      }
    }
  },
};
