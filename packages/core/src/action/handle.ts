/**
 * Action Execution Engine
 * Based on specs/action-system.md
 */

import type {
  ActionModel,
  SetVariableAction,
  TriggerEventAction,
  SwitchAction,
  FetchAction,
  AbortFetchAction,
  CustomAction,
  SetURLParameterAction,
  SetMultiUrlParameterAction,
  TriggerWorkflowAction,
  WorkflowCallbackAction,
} from '@layr/types';
import type { Signal } from '../signal/signal';
import type { ComponentData } from '@layr/types';

export interface ActionContext {
  dataSignal: Signal<ComponentData>;
  apis: Record<string, any>;
  component: any;
  triggerEvent: (name: string, data: unknown) => void;
  triggerWorkflow?: (name: string, params: Record<string, unknown>) => void;
  workflowCallback?: (name: string, data: unknown) => void;
  setUrlParameter: (key: string, value: string | null) => void;
  toddle: any;
  env: any;
}

// Maximum action depth
const MAX_ACTION_DEPTH = 100;

/**
 * Execute an action
 */
export function handleAction(
  action: ActionModel,
  ctx: ActionContext,
  depth: number = 0
): void {
  // Depth check
  if (depth > MAX_ACTION_DEPTH) {
    console.error(`Action depth limit exceeded (${MAX_ACTION_DEPTH})`);
    return;
  }

  try {
    switch (action.type) {
      case 'SetVariable':
        handleSetVariable(action, ctx);
        break;
      
      case 'TriggerEvent':
        handleTriggerEvent(action, ctx);
        break;
      
      case 'Switch':
        handleSwitch(action, ctx, depth);
        break;
      
      case 'Fetch':
        handleFetch(action, ctx);
        break;
      
      case 'AbortFetch':
        handleAbortFetch(action, ctx);
        break;
      
      case 'Custom':
        handleCustom(action, ctx, depth);
        break;
      
      case 'SetURLParameter':
        handleSetUrlParameter(action, ctx);
        break;
      
      case 'SetMultiUrlParameter':
        handleSetMultiUrlParameter(action, ctx);
        break;
      
      case 'TriggerWorkflow':
        handleTriggerWorkflow(action, ctx, depth);
        break;
      
      case 'TriggerWorkflowCallback':
        handleWorkflowCallback(action, ctx);
        break;
      
      default:
        console.warn(`Unknown action type: ${(action as any).type}`);
    }
  } catch (e) {
    console.error('Action execution error:', e);
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

function handleSetVariable(action: SetVariableAction, ctx: ActionContext): void {
  // This would use applyFormula to evaluate action.value
  // For now, placeholder
  console.log('SetVariable:', action.variable);
}

function handleTriggerEvent(action: TriggerEventAction, ctx: ActionContext): void {
  // Evaluate data formula and trigger event
  ctx.triggerEvent(action.event, null); // Placeholder
}

function handleSwitch(action: SwitchAction, ctx: ActionContext, depth: number): void {
  // Evaluate each case
  for (const case_ of action.cases) {
    // Evaluate condition
    const condition = false; // Placeholder - would use applyFormula
    
    if (condition) {
      // Execute actions
      for (const subAction of case_.actions) {
        handleAction(subAction, ctx, depth + 1);
      }
      return;
    }
  }
  
  // Execute default
  for (const subAction of action.default.actions) {
    handleAction(subAction, ctx, depth + 1);
  }
}

function handleFetch(action: FetchAction, ctx: ActionContext): void {
  // Trigger API fetch
  const api = ctx.apis[action.api];
  if (!api) {
    console.warn(`API not found: ${action.api}`);
    return;
  }
  
  // api.fetch() would be called here
}

function handleAbortFetch(action: AbortFetchAction, ctx: ActionContext): void {
  const api = ctx.apis[action.api];
  if (api?.cancel) {
    api.cancel();
  }
}

function handleCustom(action: CustomAction, ctx: ActionContext, depth: number): void {
  // Look up custom action handler
  const handler = ctx.toddle?.actions?.[action.name];
  
  if (!handler) {
    console.warn(`Custom action not found: ${action.name}`);
    return;
  }
  
  // Execute with arguments
  // Would evaluate arguments and call handler
}

function handleSetUrlParameter(action: SetURLParameterAction, ctx: ActionContext): void {
  // Evaluate value and set URL parameter
  ctx.setUrlParameter(action.parameter, null); // Placeholder
}

function handleSetMultiUrlParameter(action: SetMultiUrlParameterAction, ctx: ActionContext): void {
  for (const [key, param] of Object.entries(action.parameters)) {
    // Evaluate param.formula and set
    ctx.setUrlParameter(key, null); // Placeholder
  }
}

function handleTriggerWorkflow(action: TriggerWorkflowAction, ctx: ActionContext, depth: number): void {
  if (ctx.triggerWorkflow) {
    // Evaluate parameters
    const params: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(action.parameters ?? {})) {
      // params[key] = applyFormula(param.formula, ...)
    }
    
    ctx.triggerWorkflow(action.workflow, params);
  }
}

function handleWorkflowCallback(action: WorkflowCallbackAction, ctx: ActionContext): void {
  if (ctx.workflowCallback) {
    // Evaluate data
    ctx.workflowCallback(action.event, null); // Placeholder
  }
}
