/**
 * Action System Types
 * Based on specs/action-system.md
 */

import type { Formula } from './formula';

// ============================================================================
// Action Model (Union Type)
// ============================================================================

export type ActionModel =
  | SetVariableAction
  | TriggerEventAction
  | SwitchAction
  | FetchAction
  | AbortFetchAction
  | CustomAction
  | SetURLParameterAction
  | SetMultiUrlParameterAction
  | TriggerWorkflowAction
  | WorkflowCallbackAction;

// ============================================================================
// Action Types
// ============================================================================

export interface SetVariableAction {
  type: 'SetVariable';
  variable: string;
  value: Formula;
}

export interface TriggerEventAction {
  type: 'TriggerEvent';
  event: string;
  data: Formula;
}

export interface SwitchAction {
  type: 'Switch';
  cases: Array<{ condition: Formula; actions: ActionModel[] }>;
  default: { actions: ActionModel[] };
}

export interface FetchAction {
  type: 'Fetch';
  api: string;
  onSuccess?: { actions: ActionModel[] };
  onError?: { actions: ActionModel[] };
  onMessage?: { actions: ActionModel[] };
}

export interface AbortFetchAction {
  type: 'AbortFetch';
  api: string;
}

export interface CustomAction {
  type: 'Custom';
  name: string;
  package?: string;
  version?: 2;
  arguments?: CustomActionArgument[];
  data?: Formula;
  events?: Record<string, { actions: ActionModel[] }>;
}

export interface CustomActionArgument {
  name: string;
  formula: Formula;
}

export interface SetURLParameterAction {
  type: 'SetURLParameter';
  parameter: string;
  value: Formula;
}

export interface SetMultiUrlParameterAction {
  type: 'SetMultiUrlParameter';
  parameters: Record<string, { formula: Formula }>;
}

export interface TriggerWorkflowAction {
  type: 'TriggerWorkflow';
  workflow: string;
  contextProvider?: string;
  parameters?: Record<string, { formula: Formula }>;
  callbacks?: Record<string, { actions: ActionModel[] }>;
}

export interface WorkflowCallbackAction {
  type: 'TriggerWorkflowCallback';
  event: string;
  data: Formula;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSetVariableAction(a: ActionModel): a is SetVariableAction {
  return a.type === 'SetVariable';
}

export function isTriggerEventAction(a: ActionModel): a is TriggerEventAction {
  return a.type === 'TriggerEvent';
}

export function isSwitchAction(a: ActionModel): a is SwitchAction {
  return a.type === 'Switch';
}

export function isFetchAction(a: ActionModel): a is FetchAction {
  return a.type === 'Fetch';
}

export function isAbortFetchAction(a: ActionModel): a is AbortFetchAction {
  return a.type === 'AbortFetch';
}

export function isCustomAction(a: ActionModel): a is CustomAction {
  return a.type === 'Custom';
}

export function isSetURLParameterAction(a: ActionModel): a is SetURLParameterAction {
  return a.type === 'SetURLParameter';
}

export function isSetMultiUrlParameterAction(a: ActionModel): a is SetMultiUrlParameterAction {
  return a.type === 'SetMultiUrlParameter';
}

export function isTriggerWorkflowAction(a: ActionModel): a is TriggerWorkflowAction {
  return a.type === 'TriggerWorkflow';
}

export function isWorkflowCallbackAction(a: ActionModel): a is WorkflowCallbackAction {
  return a.type === 'TriggerWorkflowCallback';
}
