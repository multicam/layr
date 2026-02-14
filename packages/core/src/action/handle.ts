/**
 * Action Execution Engine
 * Based on specs/action-system.md and specs/workflow-system.md
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
  SetURLParametersAction,
  TriggerWorkflowAction,
  WorkflowCallbackAction,
  ComponentWorkflow,
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
  providers?: Record<string, { component: any; ctx: ActionContext }>;
  package?: string;
  applyFormula?: (formula: any, ctx: any) => unknown;
  /** Current DOM event (for preventDefault/stopPropagation) */
  event?: Event;
  /** Preview mode flag */
  preview?: boolean;
  /** Cleanup callback registration */
  onUnmount?: (cleanup: () => void) => void;
}

// Maximum action depth
const MAX_ACTION_DEPTH = 100;

/**
 * Execute an action
 */
export function handleAction(
  action: ActionModel,
  ctx: ActionContext,
  event?: any,
  workflowCallback?: (name: string, data: unknown) => void,
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
        handleTriggerEvent(action, ctx, event);
        break;

      case 'Switch':
        handleSwitch(action, ctx, event, workflowCallback, depth);
        break;

      case 'Fetch':
        handleFetch(action, ctx, event, workflowCallback);
        break;

      case 'AbortFetch':
        handleAbortFetch(action, ctx);
        break;

      case 'Custom':
        handleCustom(action, ctx, event, workflowCallback, depth);
        break;

      case 'SetURLParameter':
        handleSetUrlParameter(action, ctx);
        break;

      case 'SetURLParameters':
        handleSetUrlParameters(action, ctx);
        break;

      case 'TriggerWorkflow':
        handleTriggerWorkflow(action, ctx, event, workflowCallback, depth);
        break;

      case 'TriggerWorkflowCallback':
        handleWorkflowCallback(action, ctx, event, workflowCallback);
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
  // Evaluate the formula for the variable value
  let value: unknown = null;
  if (ctx.applyFormula && action.data) {
    value = ctx.applyFormula(action.data, ctx);
  }
  
  // Update the data signal
  ctx.dataSignal.update(data => ({
    ...data,
    Variables: {
      ...data.Variables,
      [action.name]: value,
    },
  }));
}

function handleTriggerEvent(action: TriggerEventAction, ctx: ActionContext, event?: any): void {
  // Evaluate data formula
  let data: unknown = null;
  if (ctx.applyFormula && action.data) {
    data = ctx.applyFormula(action.data, { ...ctx, Event: event });
  }
  
  ctx.triggerEvent(action.name, data);
}

function handleSwitch(
  action: SwitchAction, 
  ctx: ActionContext, 
  event: any,
  workflowCallback: ((name: string, data: unknown) => void) | undefined,
  depth: number
): void {
  // Evaluate each case
  for (const case_ of action.cases) {
    // Evaluate condition
    let condition = false;
    if (ctx.applyFormula && case_.condition) {
      condition = !!ctx.applyFormula(case_.condition, { ...ctx, Event: event });
    }

    if (condition) {
      // Execute actions
      for (const subAction of case_.actions) {
        handleAction(subAction, ctx, event, workflowCallback, depth + 1);
      }
      return;
    }
  }

  // Execute default
  if (action.default?.actions) {
    for (const subAction of action.default.actions) {
      handleAction(subAction, ctx, event, workflowCallback, depth + 1);
    }
  }
}

function handleFetch(
  action: FetchAction, 
  ctx: ActionContext,
  event: any,
  workflowCallback: ((name: string, data: unknown) => void) | undefined
): void {
  // Trigger API fetch
  const api = ctx.apis[action.name];
  if (!api) {
    console.warn(`API not found: ${action.name}`);
    return;
  }

  // Evaluate input formulas
  const inputs: Record<string, unknown> = {};
  if (ctx.applyFormula && action.inputs) {
    for (const input of action.inputs) {
      if (input.formula) {
        inputs[input.name] = ctx.applyFormula(input.formula, { ...ctx, Event: event });
      }
    }
  }

  // Create callback handlers
  const callbacks = {
    onSuccess: (data: unknown) => {
      if (action.onSuccess?.actions) {
        const callbackCtx = { ...ctx };
        for (const subAction of action.onSuccess.actions) {
          handleAction(subAction, callbackCtx, data, workflowCallback);
        }
      }
    },
    onError: (error: unknown) => {
      if (action.onError?.actions) {
        for (const subAction of action.onError.actions) {
          handleAction(subAction, ctx, error, workflowCallback);
        }
      }
    },
    onMessage: (message: unknown) => {
      if (action.onMessage?.actions) {
        for (const subAction of action.onMessage.actions) {
          handleAction(subAction, ctx, message, workflowCallback);
        }
      }
    },
  };

  // Call fetch with inputs and callbacks
  if (api.fetch) {
    api.fetch({ inputs, callbacks });
  }
}

function handleAbortFetch(action: AbortFetchAction, ctx: ActionContext): void {
  const api = ctx.apis[action.name];
  if (api?.cancel) {
    api.cancel();
  }
}

function handleCustom(
  action: CustomAction, 
  ctx: ActionContext, 
  event: any,
  workflowCallback: ((name: string, data: unknown) => void) | undefined,
  depth: number
): void {
  // Look up custom action handler
  const handler = ctx.toddle?.getCustomAction?.(action.name, ctx.package);

  if (!handler) {
    console.warn(`Custom action not found: ${action.name}`);
    return;
  }

  // Evaluate arguments
  const args: Record<string, unknown> = {};
  if (ctx.applyFormula && action.arguments) {
    for (const arg of action.arguments) {
      args[arg.name] = ctx.applyFormula(arg.formula, { ...ctx, Event: event });
    }
  }

  // Create trigger function for nested events
  const triggerActionEvent = (triggerName: string, triggerData: unknown) => {
    const eventActions = (action as any).events?.[triggerName]?.actions;
    if (eventActions) {
      for (const subAction of eventActions) {
        handleAction(subAction, ctx, triggerData, workflowCallback, depth + 1);
      }
    }
  };

  // Execute handler
  const result = handler(args, { root: document, triggerActionEvent }, event);
  
  // Handle cleanup function
  if (typeof result === 'function') {
    ctx.dataSignal.subscribe(() => {}, { 
      destroy: result 
    });
  } else if (result?.then && typeof result.then === 'function') {
    result.then((cleanup: unknown) => {
      if (typeof cleanup === 'function') {
        ctx.dataSignal.subscribe(() => {}, { destroy: cleanup });
      }
    });
  }
}

function handleSetUrlParameter(action: SetURLParameterAction, ctx: ActionContext): void {
  // Evaluate data formula
  let value: string | null = null;
  if (ctx.applyFormula && action.data) {
    value = ctx.applyFormula(action.data, ctx) as string | null;
  }
  
  ctx.setUrlParameter(action.name, value);
}

function handleSetUrlParameters(action: SetURLParametersAction, ctx: ActionContext): void {
  for (const param of action.parameters) {
    // Evaluate param.formula and set
    let value: string | null = null;
    if (ctx.applyFormula && param.formula) {
      value = ctx.applyFormula(param.formula, ctx) as string | null;
    }
    ctx.setUrlParameter(param.name, value);
  }
}

function handleTriggerWorkflow(
  action: TriggerWorkflowAction, 
  ctx: ActionContext,
  event: any,
  outerCallback: ((name: string, data: unknown) => void) | undefined,
  depth: number
): void {
  // Find workflow
  let workflow: ComponentWorkflow | undefined;
  let workflowCtx = ctx;
  
  if (action.componentName) {
    // Context provider workflow - look up in providers
    const providerKey = ctx.package
      ? `${ctx.package}/${action.componentName}`
      : action.componentName;

    const provider = ctx.providers?.[providerKey] ?? ctx.providers?.[action.componentName];

    if (!provider) {
      console.warn(`Context provider not found: ${action.componentName}`);
      return;
    }

    workflow = provider.component.workflows?.[action.name];
    workflowCtx = provider.ctx;

    if (!workflow) {
      console.warn(`Workflow ${action.name} not found on provider ${action.componentName}`);
      return;
    }
  } else {
    // Local workflow
    workflow = ctx.component.workflows?.[action.name];

    if (!workflow) {
      console.warn(`Workflow ${action.name} does not exist on component ${ctx.component?.name}`);
      return;
    }
  }
  
  // Evaluate parameters in caller's context
  const params: Record<string, unknown> = {};
  if (ctx.applyFormula && action.parameters) {
    for (const param of action.parameters) {
      if (param.formula) {
        params[param.name] = ctx.applyFormula(param.formula, { ...ctx, Event: event });
      }
    }
  }
  
  // Create callback handler
  const callbackHandler = (callbackName: string, callbackData: unknown) => {
    const callback = action.callbacks?.[callbackName];
    if (callback?.actions) {
      // Callbacks execute in caller's context
      const callbackDataCtx = {
        ...ctx,
        Event: callbackData,
        Parameters: params,
      };
      
      for (const subAction of callback.actions) {
        handleAction(subAction, callbackDataCtx, callbackData, outerCallback, depth + 1);
      }
    }
  };
  
  // Execute workflow actions in workflow owner's context
  const workflowData = {
    ...workflowCtx.dataSignal.get(),
    Parameters: params,
  };
  
  for (const subAction of workflow.actions) {
    handleAction(subAction, workflowCtx, event, callbackHandler, depth + 1);
  }
}

function handleWorkflowCallback(
  action: WorkflowCallbackAction, 
  ctx: ActionContext,
  event: any,
  workflowCallback: ((name: string, data: unknown) => void) | undefined
): void {
  if (!workflowCallback) {
    console.warn('TriggerWorkflowCallback used outside of workflow context');
    return;
  }
  
  // Evaluate data formula
  let data: unknown = null;
  if (ctx.applyFormula && action.data) {
    data = ctx.applyFormula(action.data, { ...ctx, Event: event });
  }
  
  workflowCallback(action.name, data);
}
