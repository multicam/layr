/**
 * Action System Types
 * Based on specs/action-system.md
 *
 * Field names match the JSON schema (schemas.ts is the source of truth).
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
  | SetURLParametersAction
  | TriggerWorkflowAction
  | WorkflowCallbackAction;

// ============================================================================
// Action Types
// ============================================================================

export interface SetVariableAction {
  type: 'SetVariable';
  name: string;
  data?: Formula;
}

export interface TriggerEventAction {
  type: 'TriggerEvent';
  name: string;
  data?: Formula;
}

export interface SwitchAction {
  type: 'Switch';
  data?: Formula;
  cases: Array<{ condition: Formula; actions: ActionModel[] }>;
  default?: { actions: ActionModel[] };
}

export interface FetchAction {
  type: 'Fetch';
  name: string;
  inputs?: Array<{ name: string; formula?: Formula }>;
  onSuccess?: { actions: ActionModel[] };
  onError?: { actions: ActionModel[] };
  onMessage?: { actions: ActionModel[] };
}

export interface AbortFetchAction {
  type: 'AbortFetch';
  name: string;
}

export interface CustomAction {
  type?: 'Custom';
  name: string;
  package?: string;
  version?: 2;
  arguments?: CustomActionArgument[];
  data?: Formula;
  events?: Record<string, { actions: ActionModel[]; dummyEvent?: unknown }>;
}

export interface CustomActionArgument {
  name: string;
  formula: Formula;
}

export interface SetURLParameterAction {
  type: 'SetURLParameter';
  name: string;
  data?: Formula;
  historyMode?: 'push' | 'replace';
}

export interface SetURLParametersAction {
  type: 'SetURLParameters';
  parameters: Array<{ name: string; formula: Formula }>;
  historyMode?: 'push' | 'replace';
}

export interface TriggerWorkflowAction {
  type: 'TriggerWorkflow';
  name: string;
  parameters?: Array<{ name: string; formula?: Formula }>;
  callbacks?: Record<string, { actions: ActionModel[] }>;
  componentName?: string;
  package?: string;
}

export interface WorkflowCallbackAction {
  type: 'TriggerWorkflowCallback';
  name: string;
  data?: Formula;
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
  return a.type === 'Custom' || a.type === undefined;
}

export function isSetURLParameterAction(a: ActionModel): a is SetURLParameterAction {
  return a.type === 'SetURLParameter';
}

export function isSetURLParametersAction(a: ActionModel): a is SetURLParametersAction {
  return a.type === 'SetURLParameters';
}

export function isTriggerWorkflowAction(a: ActionModel): a is TriggerWorkflowAction {
  return a.type === 'TriggerWorkflow';
}

export function isWorkflowCallbackAction(a: ActionModel): a is WorkflowCallbackAction {
  return a.type === 'TriggerWorkflowCallback';
}
