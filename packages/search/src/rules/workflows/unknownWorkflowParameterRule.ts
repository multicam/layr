/**
 * Unknown Workflow Parameter Rule
 * Checks for Parameters.X formulas referencing non-existent workflow parameters
 */

import type { Rule } from '../../types';
import type { Formula, ActionModel, ComponentWorkflow } from '@layr/types';

export const unknownWorkflowParameterRule: Rule<{ parameterName: string }, Formula> = {
  code: 'unknown workflow parameter',
  level: 'error',
  category: 'workflows',
  visit: (report, ctx) => {
    // Helper to walk formulas and check Parameters.X references
    const walkFormula = (formula: Formula | undefined, workflow: ComponentWorkflow, basePath: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;

      if (formula.type === 'path') {
        const pathParts = formula.path;
        if (pathParts?.[0] === 'Parameters') {
          const paramName = pathParts[1] as string;
          // Check if parameter exists in workflow
          const paramExists = workflow.parameters?.some(p => p.name === paramName);
          if (!paramExists) {
            report({ parameterName: paramName }, basePath);
          }
        }
      }

      // Recursively check nested formulas
      for (const [key, value] of Object.entries(formula)) {
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              walkFormula(value[i] as Formula, workflow, [...basePath, key, i]);
            }
          } else if ((value as any).type) {
            walkFormula(value as Formula, workflow, [...basePath, key]);
          }
        }
      }
    };

    // Helper to check actions recursively
    const checkActions = (actions: ActionModel[] | undefined, workflow: ComponentWorkflow, basePath: (string | number)[]): void => {
      if (!actions) return;

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;

        // Check formula fields in actions
        if (action.type === 'SetVariable' && action.data) {
          walkFormula(action.data, workflow, [...basePath, i, 'data']);
        }
        if (action.type === 'TriggerEvent' && action.data) {
          walkFormula(action.data, workflow, [...basePath, i, 'data']);
        }
        if (action.type === 'Switch' && action.data) {
          walkFormula(action.data, workflow, [...basePath, i, 'data']);
          // Check case conditions
          for (let j = 0; j < (action.cases?.length || 0); j++) {
            const case_ = action.cases?.[j];
            if (case_?.condition) {
              walkFormula(case_.condition, workflow, [...basePath, i, 'cases', j, 'condition']);
            }
            checkActions(case_?.actions, workflow, [...basePath, i, 'cases', j, 'actions']);
          }
          checkActions(action.default?.actions, workflow, [...basePath, i, 'default', 'actions']);
        }
        if (action.type === 'Fetch') {
          // Check input formulas
          for (const input of action.inputs || []) {
            if (input.formula) {
              walkFormula(input.formula, workflow, [...basePath, i, 'inputs', input.name]);
            }
          }
          checkActions(action.onSuccess?.actions, workflow, [...basePath, i, 'onSuccess', 'actions']);
          checkActions(action.onError?.actions, workflow, [...basePath, i, 'onError', 'actions']);
          checkActions(action.onMessage?.actions, workflow, [...basePath, i, 'onMessage', 'actions']);
        }
        if (action.type === 'SetURLParameter' && action.data) {
          walkFormula(action.data, workflow, [...basePath, i, 'data']);
        }
        if (action.type === 'SetURLParameters') {
          for (const param of action.parameters || []) {
            walkFormula(param.formula, workflow, [...basePath, i, 'parameters', param.name]);
          }
        }
        if (action.type === 'TriggerWorkflow') {
          for (const param of action.parameters || []) {
            if (param.formula) {
              walkFormula(param.formula, workflow, [...basePath, i, 'parameters', param.name]);
            }
          }
          if (action.callbacks) {
            for (const [callbackName, callback] of Object.entries(action.callbacks)) {
              checkActions(callback.actions, workflow, [...basePath, i, 'callbacks', callbackName, 'actions']);
            }
          }
        }
        if (action.type === 'TriggerWorkflowCallback' && action.data) {
          walkFormula(action.data, workflow, [...basePath, i, 'data']);
        }
        if (action.type === 'Custom' || action.type === undefined) {
          // Check arguments
          for (const arg of action.arguments || []) {
            walkFormula(arg.formula, workflow, [...basePath, i, 'arguments', arg.name]);
          }
          if (action.data) {
            walkFormula(action.data, workflow, [...basePath, i, 'data']);
          }
          if (action.events) {
            for (const [eventName, event] of Object.entries(action.events)) {
              checkActions(event.actions, workflow, [...basePath, i, 'events', eventName, 'actions']);
            }
          }
        }
      }
    };

    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;

      // Check each workflow's actions
      for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
        if (!workflow) continue;
        checkActions(workflow.actions, workflow, ['components', compName, 'workflows', workflowName, 'actions']);
      }
    }
  }
};
