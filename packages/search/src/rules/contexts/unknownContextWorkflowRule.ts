/**
 * Unknown Context Workflow Rule
 * Detects TriggerWorkflow actions with componentName that reference workflows not exposed by the provider
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component, ComponentContext } from '@layr/types';

export const unknownContextWorkflowRule: Rule<{
  providerName: string;
  workflowName: string;
}> = {
  code: 'unknown context workflow',
  level: 'error',
  category: 'contexts',
  visit: (report, ctx) => {
    // Helper to check actions recursively
    const checkActions = (
      actions: ActionModel[] | undefined,
      component: Component,
      basePath: (string | number)[]
    ): void => {
      if (!actions) return;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        // Check if TriggerWorkflow with componentName (context workflow)
        if (action.type === 'TriggerWorkflow' && action.componentName) {
          const providerName = action.componentName;
          const packageName = action.package;

          // Find the context subscription for this provider
          let context: ComponentContext | undefined;
          for (const ctx of Object.values(component.contexts || {})) {
            if (!ctx) continue;
            const ctxProviderName = ctx.componentName || Object.keys(component.contexts || {}).find(
              k => component.contexts?.[k] === ctx
            );
            if (ctxProviderName === providerName || ctx.componentName === providerName) {
              context = ctx;
              break;
            }
          }

          // If no context subscription, skip (handled by other rules)
          if (!context) continue;

          // Check if the workflow is in the declared workflows
          const declaredWorkflows = new Set(context.workflows || []);
          if (!declaredWorkflows.has(action.name)) {
            report(
              { providerName, workflowName: action.name },
              [...basePath, i]
            );
          }
        }

        // Recurse into nested actions
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

      // Only check components with context subscriptions
      if (!component.contexts || Object.keys(component.contexts).length === 0) continue;

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
};
