/**
 * No Post-Navigate Action Rule
 * Detects unreachable actions after goToURL navigation (with auto-fix)
 */

import type { Rule, FixFunction } from '../../types';
import type { ActionModel, EventModel, Component, ProjectFiles } from '@layr/types';

interface PostNavigateData {
  actionIndex: number;
  navigateActionName: string;
}

/**
 * Check if an action is a navigation action (goToURL or redirect)
 */
function isNavigationAction(action: ActionModel): boolean {
  if (action.type === 'Custom' || action.type === undefined) {
    // Check for goToURL action (standard library navigation)
    return action.name === 'goToURL';
  }
  return false;
}

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Fix: Remove post-navigate actions
 */
const removePostNavigateFix: FixFunction = ({ files, path }) => {
  const result = deepClone(files);

  // Navigate to the actions array
  let current: any = result;
  for (let i = 0; i < path.length - 1; i++) {
    if (current === undefined || current === null) return undefined;
    current = current[path[i]];
  }

  const lastKey = path[path.length - 1];
  if (typeof lastKey !== 'number' || !Array.isArray(current)) return undefined;

  // Find the navigation action index
  const navIndex = current.findIndex((a: ActionModel, idx: number) => {
    if (idx < lastKey) return false;
    return isNavigationAction(a);
  });

  if (navIndex === -1) return undefined;

  // Remove all actions after the navigation
  current.splice(navIndex + 1);

  return result;
};

export const noPostNavigateAction: Rule<PostNavigateData, ActionModel> = {
  code: 'no post navigate action',
  level: 'warning',
  category: 'workflows',
  visit: (report, ctx) => {
    // Helper to check actions for post-navigate issues
    const checkActions = (
      actions: ActionModel[] | undefined,
      component: Component,
      basePath: (string | number)[]
    ): void => {
      if (!actions || actions.length === 0) return;

      // Find navigation action (only if there are at least 2 actions)
      if (actions.length >= 2) {
        for (let i = 0; i < actions.length - 1; i++) {
          const action = actions[i];
          if (!action) continue;

          if (isNavigationAction(action)) {
            // Report each action after navigation as unreachable
            for (let j = i + 1; j < actions.length; j++) {
              if (actions[j]) {
                report(
                  { actionIndex: j, navigateActionName: action.name || 'goToURL' },
                  [...basePath, j],
                  ['remove-post-navigate']
                );
              }
            }
            break; // Only report for first navigation action
          }
        }
      }

      // Recurse into nested actions (always, regardless of array length)
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        if (action.type === 'Switch') {
          for (let j = 0; j < (action.cases?.length || 0); j++) {
            const case_ = action.cases?.[j];
            if (case_) {
              checkActions(case_.actions, component, [...basePath, i, 'cases', j, 'actions']);
            }
          }
          if (action.default) {
            checkActions(action.default.actions, component, [...basePath, i, 'default', 'actions']);
          }
        } else if (action.type === 'Fetch') {
          if (action.onSuccess) {
            checkActions(action.onSuccess.actions, component, [...basePath, i, 'onSuccess', 'actions']);
          }
          if (action.onError) {
            checkActions(action.onError.actions, component, [...basePath, i, 'onError', 'actions']);
          }
          if (action.onMessage) {
            checkActions(action.onMessage.actions, component, [...basePath, i, 'onMessage', 'actions']);
          }
        } else if (action.type === 'TriggerWorkflow') {
          if (action.callbacks) {
            for (const [callbackName, callback] of Object.entries(action.callbacks)) {
              checkActions(callback.actions, component, [...basePath, i, 'callbacks', callbackName, 'actions']);
            }
          }
        } else if (action.type === 'Custom' || action.type === undefined) {
          if (action.events) {
            for (const [eventName, event] of Object.entries(action.events)) {
              checkActions(event.actions, component, [...basePath, i, 'events', eventName, 'actions']);
            }
          }
        }
      }
    };

    // Helper to check EventModel
    const checkEventModel = (
      event: EventModel | undefined,
      component: Component,
      basePath: (string | number)[]
    ): void => {
      if (!event?.actions) return;
      checkActions(event.actions, component, basePath);
    };

    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check workflows
      for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
        if (!workflow) continue;
        checkActions(workflow.actions, component, ['components', name, 'workflows', workflowName, 'actions']);
      }

      // Check events
      for (const [eventName, event] of Object.entries(component.events || {})) {
        if (!event) continue;
        checkEventModel(event as EventModel, component, ['components', name, 'events', eventName, 'actions']);
      }

      // Check onLoad
      checkEventModel(component.onLoad, component, ['components', name, 'onLoad', 'actions']);

      // Check onAttributeChange
      checkEventModel(component.onAttributeChange, component, ['components', name, 'onAttributeChange', 'actions']);

      // Check node events
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        if (node.events) {
          for (const [eventName, event] of Object.entries(node.events)) {
            if (event) {
              checkEventModel(event as EventModel, component, ['components', name, 'nodes', nodeId, 'events', eventName, 'actions']);
            }
          }
        }
      }
    }
  },
  fixes: {
    'remove-post-navigate': removePostNavigateFix,
  },
};
