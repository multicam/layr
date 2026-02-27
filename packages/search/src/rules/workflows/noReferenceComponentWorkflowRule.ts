/**
 * No Reference Component Workflow Rule
 * Detects component workflows that are defined but never triggered
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component } from '@layr/types';

export const noReferenceComponentWorkflowRule: Rule<{ workflowName: string }> = {
  code: 'no reference component workflow',
  level: 'warning',
  category: 'workflows',
  visit: (report, ctx) => {
    // First pass: collect all defined workflows
    const componentWorkflows = new Map<string, Set<string>>();

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      const workflowNames = new Set(Object.keys(component.workflows || {}));
      componentWorkflows.set(compName, workflowNames);
    }

    // If no workflows defined, nothing to check
    if (componentWorkflows.size === 0) return;

    // Collect all triggered workflow references
    const triggeredWorkflows = new Map<string, Set<string>>();

    // Initialize sets for each component
    for (const compName of componentWorkflows.keys()) {
      triggeredWorkflows.set(compName, new Set());
    }

    // Helper to collect workflow triggers from actions
    const collectWorkflowTriggers = (
      actions: ActionModel[] | undefined,
      currentComponent: Component,
      currentCompName: string
    ): void => {
      if (!actions) return;

      for (const action of actions) {
        if (!action) continue;

        if (action.type === 'TriggerWorkflow') {
          // If componentName is specified, it's a cross-component reference
          // Otherwise, it's a reference to the current component's workflow
          if (action.componentName) {
            const targetSet = triggeredWorkflows.get(action.componentName);
            if (targetSet) {
              targetSet.add(action.name);
            }
          } else {
            const currentSet = triggeredWorkflows.get(currentCompName);
            if (currentSet) {
              currentSet.add(action.name);
            }
          }
        }

        // Recurse into nested actions
        if (action.type === 'Switch') {
          for (const case_ of action.cases || []) {
            collectWorkflowTriggers(case_.actions, currentComponent, currentCompName);
          }
          if (action.default) {
            collectWorkflowTriggers(action.default.actions, currentComponent, currentCompName);
          }
        } else if (action.type === 'Fetch') {
          collectWorkflowTriggers(action.onSuccess?.actions, currentComponent, currentCompName);
          collectWorkflowTriggers(action.onError?.actions, currentComponent, currentCompName);
          collectWorkflowTriggers(action.onMessage?.actions, currentComponent, currentCompName);
        } else if (action.type === 'TriggerWorkflow') {
          for (const callback of Object.values(action.callbacks || {})) {
            collectWorkflowTriggers(callback.actions, currentComponent, currentCompName);
          }
        } else if (action.type === 'Custom' || action.type === undefined) {
          for (const event of Object.values(action.events || {})) {
            collectWorkflowTriggers(event.actions, currentComponent, currentCompName);
          }
        }
      }
    };

    // Helper to collect from EventModel
    const collectFromEventModel = (
      event: EventModel | undefined,
      component: Component,
      compName: string
    ): void => {
      if (!event?.actions) return;
      collectWorkflowTriggers(event.actions, component, compName);
    };

    // Scan all components for workflow triggers from ENTRY POINTS only
    // (not from workflows themselves, as those might be dead code)
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check events (entry points)
      for (const [eventName, event] of Object.entries(component.events || {})) {
        if (!event) continue;
        collectFromEventModel(event as EventModel, component, compName);
      }

      // Check onLoad (entry point)
      collectFromEventModel(component.onLoad, component, compName);

      // Check onAttributeChange (entry point)
      collectFromEventModel(component.onAttributeChange, component, compName);

      // Check node events (entry points)
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        if (node.events) {
          for (const [eventName, event] of Object.entries(node.events)) {
            if (event) {
              collectFromEventModel(event as EventModel, component, compName);
            }
          }
        }
      }
    }

    // Report workflows that are never triggered
    for (const [compName, workflowNames] of componentWorkflows) {
      const triggered = triggeredWorkflows.get(compName) || new Set();

      for (const workflowName of workflowNames) {
        if (!triggered.has(workflowName)) {
          report({ workflowName }, ['components', compName, 'workflows', workflowName]);
        }
      }
    }
  },
};
