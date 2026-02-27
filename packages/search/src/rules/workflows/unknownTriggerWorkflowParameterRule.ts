/**
 * Unknown Trigger Workflow Parameter Rule
 * Checks for TriggerWorkflow actions that pass parameters not declared by the workflow
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component, ComponentWorkflow } from '@layr/types';

export const unknownTriggerWorkflowParameterRule: Rule<{ paramName: string; workflowName: string }> = {
  code: 'unknown trigger workflow parameter',
  level: 'error',
  category: 'workflows',
  visit: (report, ctx) => {
    // Helper to get a component's workflow
    const getWorkflow = (componentName: string, workflowName: string, packageName?: string): ComponentWorkflow | null => {
      let component: any = null;

      if (packageName) {
        const pkg = ctx.files.packages?.[packageName];
        component = pkg?.components?.[componentName];
      } else if (componentName.includes('/')) {
        const [pkgName, compName] = componentName.split('/');
        const pkg = ctx.files.packages?.[pkgName];
        component = pkg?.components?.[compName];
      } else {
        component = ctx.files.components?.[componentName];
      }

      return component?.workflows?.[workflowName] || null;
    };

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

        if (action.type === 'TriggerWorkflow') {
          // Determine which component's workflow is being triggered
          const targetComponentName = action.componentName || component.name;

          // Get the workflow
          let workflow: ComponentWorkflow | null = null;
          if (action.componentName) {
            workflow = getWorkflow(action.componentName, action.name, action.package);
          } else {
            workflow = component.workflows?.[action.name] || null;
          }

          if (workflow) {
            // Get declared parameters
            const declaredParams = new Set(
              (workflow.parameters || []).map((p) => p.name)
            );

            // Check each passed parameter
            for (const param of action.parameters || []) {
              if (!declaredParams.has(param.name)) {
                report(
                  { paramName: param.name, workflowName: action.name },
                  [...basePath, i]
                );
              }
            }
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
  }
};
