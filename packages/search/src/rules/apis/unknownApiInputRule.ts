/**
 * Unknown API Input Rule
 * Checks for Fetch actions using input keys not defined in the API
 */

import type { Rule } from '../../types';
import type { ActionModel, EventModel, Component, ComponentAPI } from '@layr/types';

export const unknownApiInputRule: Rule<{ apiName: string; inputName: string }, ActionModel> = {
  code: 'unknown api input',
  level: 'error',
  category: 'apis',
  visit: (report, ctx) => {
    // Get valid input keys for an API
    const getValidInputKeys = (api: ComponentAPI): Set<string> => {
      const keys = new Set<string>();

      // Add all formula-based fields that can be inputs
      if (api.url) keys.add('url');
      if (api.body) keys.add('body');
      if (api.method) keys.add('method');
      if (api.timeout) keys.add('timeout');
      if (api.credentials) keys.add('credentials');
      if (api.parserMode) keys.add('parserMode');
      if (api.isError) keys.add('isError');

      // Add headers
      if (api.headers) {
        for (const headerName of Object.keys(api.headers)) {
          keys.add(`headers.${headerName}`);
        }
      }

      // Add query params
      if (api.queryParams) {
        for (const paramName of Object.keys(api.queryParams)) {
          keys.add(`queryParams.${paramName}`);
        }
      }

      // V1 fields
      if (api.path) keys.add('path');
      if (api.headersV1) keys.add('headers');
      if (api.bodyV1) keys.add('body');

      return keys;
    };

    // Helper to check actions recursively
    const checkActions = (actions: ActionModel[] | undefined, component: Component, basePath: (string | number)[]): void => {
      if (!actions) return;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        if (action.type === 'Fetch') {
          const api = component.apis?.[action.name];
          if (api && action.inputs) {
            const validKeys = getValidInputKeys(api);
            for (const input of action.inputs) {
              if (!validKeys.has(input.name)) {
                report(
                  { apiName: action.name, inputName: input.name },
                  [...basePath, i, 'inputs', input.name]
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
