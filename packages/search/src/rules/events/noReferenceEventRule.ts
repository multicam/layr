/**
 * No Reference Event Rule
 * Detects events that are defined but never triggered
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component, ComponentEvent } from '@layr/types';

export const noReferenceEventRule: Rule<{ eventName: string }> = {
  code: 'no reference event',
  level: 'warning',
  category: 'events',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.events) continue;

      // Collect all defined event names (events is an array)
      const definedEvents = new Set<string>();
      for (const event of component.events as ComponentEvent[]) {
        if (event?.name) {
          definedEvents.add(event.name);
        }
      }

      // Find all TriggerEvent references in this component
      const triggeredEvents = new Set<string>();

      const collectTriggerEvents = (actions: ActionModel[] | undefined): void => {
        if (!actions) return;

        for (const action of actions) {
          if (!action) continue;

          if (action.type === 'TriggerEvent') {
            triggeredEvents.add(action.name);
          }

          // Recurse into nested actions
          if (action.type === 'Switch') {
            for (const case_ of action.cases || []) {
              collectTriggerEvents(case_?.actions);
            }
            if (action.default) {
              collectTriggerEvents(action.default.actions);
            }
          } else if (action.type === 'Fetch') {
            collectTriggerEvents(action.onSuccess?.actions);
            collectTriggerEvents(action.onError?.actions);
            collectTriggerEvents(action.onMessage?.actions);
          } else if (action.type === 'TriggerWorkflow') {
            for (const callback of Object.values(action.callbacks || {})) {
              collectTriggerEvents(callback?.actions);
            }
          } else if (action.type === 'Custom' || action.type === undefined) {
            for (const event of Object.values(action.events || {})) {
              collectTriggerEvents(event?.actions);
            }
          }
        }
      };

      // Check workflows
      for (const workflow of Object.values(component.workflows || {})) {
        if (workflow) {
          collectTriggerEvents(workflow.actions);
        }
      }

      // Check events (events can trigger other events)
      // Note: component.events is ComponentEvent[] which doesn't have actions
      // The actions are defined separately, e.g., in workflows or onLoad

      // Check onLoad
      if (component.onLoad) {
        collectTriggerEvents(component.onLoad.actions);
      }

      // Check onAttributeChange
      if (component.onAttributeChange) {
        collectTriggerEvents(component.onAttributeChange.actions);
      }

      // Check node events
      for (const node of Object.values(component.nodes || {})) {
        if (!node?.events) continue;
        for (const event of Object.values(node.events)) {
          if (event) {
            collectTriggerEvents((event as EventModel).actions);
          }
        }
      }

      // Report events that are never triggered
      for (const eventName of definedEvents) {
        if (!triggeredEvents.has(eventName)) {
          // Find the index of this event in the array
          const eventIndex = (component.events as ComponentEvent[]).findIndex(e => e?.name === eventName);
          report({ eventName }, ['components', compName, 'events', eventIndex]);
        }
      }
    }
  },
};
