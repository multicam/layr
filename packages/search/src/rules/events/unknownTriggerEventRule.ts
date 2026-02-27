/**
 * Unknown Trigger Event Rule
 * Checks for TriggerEvent actions that reference events not defined on the component
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component } from '@layr/types';

export const unknownTriggerEventRule: Rule<{ eventName: string }, ActionModel> = {
  code: 'unknown trigger event',
  level: 'error',
  category: 'events',
  visit: (report, ctx) => {
    // Helper to check actions recursively
    const checkActions = (actions: ActionModel[] | undefined, component: Component, basePath: (string | number)[]): void => {
      if (!actions) return;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        if (action.type === 'TriggerEvent') {
          // Check if the event is defined on the component
          // events can be an array of { name: string } or a Record
          const componentEvents = new Set<string>();
          const events = component.events;
          if (Array.isArray(events)) {
            for (const evt of events) {
              if (evt?.name) componentEvents.add(evt.name);
            }
          } else if (events) {
            for (const evtName of Object.keys(events)) {
              componentEvents.add(evtName);
            }
          }
          if (!componentEvents.has(action.name)) {
            report({ eventName: action.name }, [...basePath, i]);
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
    const checkEventModel = (event: EventModel | undefined, component: Component, basePath: (string | number)[]): void => {
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
