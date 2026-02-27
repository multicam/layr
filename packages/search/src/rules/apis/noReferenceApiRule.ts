/**
 * No Reference API Rule
 * Detects APIs that are defined but never fetched
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component } from '@layr/types';

export const noReferenceApiRule: Rule<{ apiName: string }> = {
  code: 'no reference api',
  level: 'warning',
  category: 'apis',
  visit: (report, ctx) => {
    // First pass: collect all defined APIs
    const componentApis = new Map<string, Set<string>>();

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      const apiNames = new Set(Object.keys(component.apis || {}));
      if (apiNames.size > 0) {
        componentApis.set(compName, apiNames);
      }
    }

    // If no APIs defined, nothing to check
    if (componentApis.size === 0) return;

    // Collect all fetched API references
    const fetchedApis = new Map<string, Set<string>>();

    // Initialize sets for each component
    for (const compName of componentApis.keys()) {
      fetchedApis.set(compName, new Set());
    }

    // Helper to collect API fetches from actions
    const collectApiFetches = (
      actions: ActionModel[] | undefined,
      currentCompName: string
    ): void => {
      if (!actions) return;

      for (const action of actions) {
        if (!action) continue;

        if (action.type === 'Fetch') {
          const currentSet = fetchedApis.get(currentCompName);
          if (currentSet) {
            currentSet.add(action.name);
          }
        }

        // Recurse into nested actions
        if (action.type === 'Switch') {
          for (const case_ of action.cases || []) {
            collectApiFetches(case_.actions, currentCompName);
          }
          if (action.default) {
            collectApiFetches(action.default.actions, currentCompName);
          }
        } else if (action.type === 'Fetch') {
          collectApiFetches(action.onSuccess?.actions, currentCompName);
          collectApiFetches(action.onError?.actions, currentCompName);
          collectApiFetches(action.onMessage?.actions, currentCompName);
        } else if (action.type === 'TriggerWorkflow') {
          for (const callback of Object.values(action.callbacks || {})) {
            collectApiFetches(callback.actions, currentCompName);
          }
        } else if (action.type === 'Custom' || action.type === undefined) {
          for (const event of Object.values(action.events || {})) {
            collectApiFetches(event.actions, currentCompName);
          }
        }
      }
    };

    // Helper to collect from EventModel
    const collectFromEventModel = (
      event: EventModel | undefined,
      compName: string
    ): void => {
      if (!event?.actions) return;
      collectApiFetches(event.actions, compName);
    };

    // Scan all components for API fetches
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check workflows
      for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
        if (!workflow) continue;
        collectApiFetches(workflow.actions, compName);
      }

      // Check events
      for (const [eventName, event] of Object.entries(component.events || {})) {
        if (!event) continue;
        collectFromEventModel(event as EventModel, compName);
      }

      // Check onLoad
      collectFromEventModel(component.onLoad, compName);

      // Check onAttributeChange
      collectFromEventModel(component.onAttributeChange, compName);

      // Check node events
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;

        if (node.events) {
          for (const [eventName, event] of Object.entries(node.events)) {
            if (event) {
              collectFromEventModel(event as EventModel, compName);
            }
          }
        }
      }

      // Check API client callbacks (autoFetch triggers fetch internally)
      for (const [apiName, api] of Object.entries(component.apis || {})) {
        if (!api) continue;

        const client = (api as any).client;
        if (client?.onCompleted) {
          collectFromEventModel(client.onCompleted, compName);
        }
        if (client?.onFailed) {
          collectFromEventModel(client.onFailed, compName);
        }
        if (client?.onMessage) {
          collectFromEventModel(client.onMessage, compName);
        }
      }
    }

    // Report APIs that are never fetched (excluding those with autoFetch)
    for (const [compName, apiNames] of componentApis) {
      const fetched = fetchedApis.get(compName) || new Set();
      const component = ctx.files.components?.[compName];

      for (const apiName of apiNames) {
        // Skip if API has autoFetch enabled (it will be fetched automatically)
        const api = component?.apis?.[apiName];
        if (api?.autoFetch) {
          continue;
        }

        if (!fetched.has(apiName)) {
          report({ apiName }, ['components', compName, 'apis', apiName]);
        }
      }
    }
  },
};
