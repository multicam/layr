/**
 * Unknown Set URL Parameter Rule
 * Detects SetURLParameter/SetURLParameters actions targeting parameters not defined in route
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component } from '@layr/types';

/**
 * Extract URL parameter names from a route path
 * e.g., "/users/:id/posts/:postId" -> ["id", "postId"]
 */
function extractPathParams(path: string): Set<string> {
  const params = new Set<string>();
  const regex = /:([^/]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    params.add(match[1]);
  }

  return params;
}

export const unknownSetUrlParameterRule: Rule<{ paramName: string }> = {
  code: 'unknown set url parameter',
  level: 'error',
  category: 'routing',
  visit: (report, ctx) => {
    // Helper to check actions recursively
    const checkActions = (
      actions: ActionModel[] | undefined,
      component: Component,
      basePath: (string | number)[],
      routeParams: Set<string>
    ): void => {
      if (!actions) return;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        if (action.type === 'SetURLParameter') {
          // Check if parameter exists in route
          if (!routeParams.has(action.name)) {
            report({ paramName: action.name }, [...basePath, i]);
          }
        }

        if (action.type === 'SetURLParameters') {
          // Check each parameter in the list
          for (let j = 0; j < (action.parameters?.length || 0); j++) {
            const param = action.parameters?.[j];
            if (param && !routeParams.has(param.name)) {
              report({ paramName: param.name }, [...basePath, i, 'parameters', j]);
            }
          }
        }

        // Recurse into nested actions
        if (action.type === 'Switch') {
          for (let j = 0; j < (action.cases?.length || 0); j++) {
            const case_ = action.cases?.[j];
            if (case_) {
              checkActions(case_.actions, component, [...basePath, i, 'cases', j, 'actions'], routeParams);
            }
          }
          if (action.default) {
            checkActions(action.default.actions, component, [...basePath, i, 'default', 'actions'], routeParams);
          }
        } else if (action.type === 'Fetch') {
          if (action.onSuccess) {
            checkActions(action.onSuccess.actions, component, [...basePath, i, 'onSuccess', 'actions'], routeParams);
          }
          if (action.onError) {
            checkActions(action.onError.actions, component, [...basePath, i, 'onError', 'actions'], routeParams);
          }
          if (action.onMessage) {
            checkActions(action.onMessage.actions, component, [...basePath, i, 'onMessage', 'actions'], routeParams);
          }
        } else if (action.type === 'TriggerWorkflow') {
          if (action.callbacks) {
            for (const [callbackName, callback] of Object.entries(action.callbacks)) {
              checkActions(callback.actions, component, [...basePath, i, 'callbacks', callbackName, 'actions'], routeParams);
            }
          }
        } else if (action.type === 'Custom' || action.type === undefined) {
          if (action.events) {
            for (const [eventName, event] of Object.entries(action.events)) {
              checkActions(event.actions, component, [...basePath, i, 'events', eventName, 'actions'], routeParams);
            }
          }
        }
      }
    };

    // Helper to check EventModel
    const checkEventModel = (
      event: EventModel | undefined,
      component: Component,
      basePath: (string | number)[],
      routeParams: Set<string>
    ): void => {
      if (!event?.actions) return;
      checkActions(event.actions, component, basePath, routeParams);
    };

    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Only check components with routes (pages)
      if (!component.route?.path) continue;

      const routeParams = extractPathParams(component.route.path);

      // Check workflows
      for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
        if (!workflow) continue;
        checkActions(workflow.actions, component, ['components', name, 'workflows', workflowName, 'actions'], routeParams);
      }

      // Check events
      for (const [eventName, event] of Object.entries(component.events || {})) {
        if (!event) continue;
        checkEventModel(event as EventModel, component, ['components', name, 'events', eventName, 'actions'], routeParams);
      }

      // Check onLoad
      checkEventModel(component.onLoad, component, ['components', name, 'onLoad', 'actions'], routeParams);

      // Check onAttributeChange
      checkEventModel(component.onAttributeChange, component, ['components', name, 'onAttributeChange', 'actions'], routeParams);

      // Check node events
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        if (node.events) {
          for (const [eventName, event] of Object.entries(node.events)) {
            if (event) {
              checkEventModel(event as EventModel, component, ['components', name, 'nodes', nodeId, 'events', eventName, 'actions'], routeParams);
            }
          }
        }
      }
    }
  },
};
