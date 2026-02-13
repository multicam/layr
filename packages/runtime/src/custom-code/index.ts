/**
 * Custom Code & Tree-Shaking System
 * Based on specs/custom-code-system.md
 * 
 * Manages user-defined JavaScript formulas and actions.
 */

import type { Formula } from '@layr/types';

// ============================================================================
// Custom Formula Types
// ============================================================================

export interface ToddleFormula {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; formula?: Formula; testValue?: unknown }>;
  exported?: boolean;
  variableArguments?: boolean;
  formula: Formula;
}

export interface CodeFormula {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; formula?: Formula; testValue?: unknown }>;
  exported?: boolean;
  variableArguments?: boolean;
  version?: 2;
  handler: string | FormulaHandler;
}

export type PluginFormula = ToddleFormula | CodeFormula;

export type FormulaHandler = (args: Record<string, unknown>, ctx: FormulaContext) => unknown;

// ============================================================================
// Custom Action Types
// ============================================================================

export interface PluginActionV2 {
  name: string;
  version: 2;
  description?: string;
  arguments?: Array<{ name: string; formula?: Formula }>;
  events?: Record<string, { dummyEvent?: unknown }>;
  variableArguments?: boolean;
  exported?: boolean;
  handler: ActionHandlerV2;
}

export type PluginAction = PluginActionV2;

export type ActionHandlerV2 = (
  args: Record<string, unknown>,
  ctx: ActionContext,
  event?: unknown
) => void | (() => void) | Promise<void> | Promise<() => void>;

// ============================================================================
// Context Types
// ============================================================================

export interface FormulaContext {
  root?: Document | ShadowRoot;
  env?: Record<string, unknown>;
}

export interface ActionContext {
  triggerActionEvent: (trigger: string, data?: unknown, event?: unknown) => void;
  root: Document | ShadowRoot;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isToddleFormula(formula: PluginFormula): formula is ToddleFormula {
  return 'formula' in formula;
}

export function isCodeFormula(formula: PluginFormula): formula is CodeFormula {
  return 'handler' in formula;
}

export function isPluginActionV2(action: PluginAction): action is PluginActionV2 {
  return 'version' in action && action.version === 2;
}

// ============================================================================
// Custom Code Registry
// ============================================================================

export interface CustomCodeRegistry {
  formulas: Record<string, Record<string, PluginFormula>>;
  actions: Record<string, Record<string, PluginAction>>;
}

/**
 * Create an empty custom code registry.
 */
export function createCustomCodeRegistry(): CustomCodeRegistry {
  return {
    formulas: {},
    actions: {},
  };
}

/**
 * Register a custom formula.
 */
export function registerFormula(
  registry: CustomCodeRegistry,
  packageName: string,
  formula: PluginFormula
): void {
  if (!registry.formulas[packageName]) {
    registry.formulas[packageName] = {};
  }
  registry.formulas[packageName][formula.name] = formula;
}

/**
 * Register a custom action.
 */
export function registerAction(
  registry: CustomCodeRegistry,
  packageName: string,
  action: PluginAction
): void {
  if (!registry.actions[packageName]) {
    registry.actions[packageName] = {};
  }
  registry.actions[packageName][action.name] = action;
}

/**
 * Get a custom formula.
 */
export function getFormula(
  registry: CustomCodeRegistry,
  name: string,
  packageName?: string
): PluginFormula | undefined {
  if (packageName) {
    return registry.formulas[packageName]?.[name];
  }
  
  // Search all packages
  for (const pkg of Object.keys(registry.formulas)) {
    const formula = registry.formulas[pkg]?.[name];
    if (formula) return formula;
  }
  
  return undefined;
}

/**
 * Get a custom action.
 */
export function getAction(
  registry: CustomCodeRegistry,
  name: string,
  packageName?: string
): PluginAction | undefined {
  if (packageName) {
    return registry.actions[packageName]?.[name];
  }
  
  // Search all packages
  for (const pkg of Object.keys(registry.actions)) {
    const action = registry.actions[pkg]?.[name];
    if (action) return action;
  }
  
  return undefined;
}

// ============================================================================
// Code Generation
// ============================================================================

/**
 * Generate a safe function name from a string.
 */
export function safeFunctionName(name: string): string {
  // Remove non-alphanumeric characters except underscore
  let safe = name.replace(/[^a-zA-Z0-9_]/g, '');

  // Remove leading digits
  safe = safe.replace(/^[0-9]+/, '');

  // Fallback if nothing left
  return safe || '_fn';
}

/**
 * Generate JavaScript code for a custom formula handler.
 */
export function generateFormulaCode(
  packageName: string,
  formula: CodeFormula
): string {
  const safeName = safeFunctionName(formula.name);
  const handlerCode = typeof formula.handler === 'string'
    ? formula.handler
    : `(${formula.handler.toString()})`;

  return `
// Formula: ${formula.name}
// Package: ${packageName}
${formula.description ? `// ${(formula.description || '').replace(/\n/g, ' ')}` : ''}

const ${safeName} = ${handlerCode};

export const formula = {
  name: ${JSON.stringify(formula.name)},
  ${formula.description ? `description: ${JSON.stringify(formula.description)},` : ''}
  ${formula.arguments ? `arguments: ${JSON.stringify(formula.arguments)},` : ''}
  handler: ${safeName}
};
`;
}

/**
 * Generate JavaScript code for a custom action handler.
 */
export function generateActionCode(
  packageName: string,
  action: PluginActionV2
): string {
  const safeName = safeFunctionName(action.name);
  const handlerCode = action.handler.toString();

  return `
// Action: ${action.name}
// Package: ${packageName}
${action.description ? `// ${(action.description || '').replace(/\n/g, ' ')}` : ''}

const ${safeName} = ${handlerCode};

export const action = {
  name: ${JSON.stringify(action.name)},
  version: 2,
  ${action.description ? `description: ${JSON.stringify(action.description)},` : ''}
  ${action.arguments ? `arguments: ${JSON.stringify(action.arguments)},` : ''}
  ${action.events ? `events: ${JSON.stringify(action.events)},` : ''}
  handler: ${safeName}
};
`;
}

// ============================================================================
// Reference Collection
// ============================================================================

/**
 * Collect all formula references from a component.
 */
export function collectFormulaRefs(
  formulas: Record<string, PluginFormula>,
  referenced: Set<string>
): Record<string, PluginFormula> {
  const result: Record<string, PluginFormula> = {};
  
  for (const name of referenced) {
    if (formulas[name]) {
      result[name] = formulas[name];
    }
  }
  
  return result;
}

/**
 * Collect all action references from a component.
 */
export function collectActionRefs(
  actions: Record<string, PluginAction>,
  referenced: Set<string>
): Record<string, PluginAction> {
  const result: Record<string, PluginAction> = {};
  
  for (const name of referenced) {
    if (actions[name]) {
      result[name] = actions[name];
    }
  }
  
  return result;
}

// ============================================================================
// Code Loading
// ============================================================================

/**
 * Load custom code from generated modules.
 */
export async function loadCustomCode(
  module: {
    formulas?: Record<string, PluginFormula>;
    actions?: Record<string, PluginAction>;
  },
  registry: CustomCodeRegistry,
  packageName: string
): Promise<void> {
  if (module.formulas) {
    for (const formula of Object.values(module.formulas)) {
      registerFormula(registry, packageName, formula);
    }
  }
  
  if (module.actions) {
    for (const action of Object.values(module.actions)) {
      registerAction(registry, packageName, action);
    }
  }
}

/**
 * Check if a package has any custom code.
 */
export function hasCustomCode(
  registry: CustomCodeRegistry,
  packageName: string
): boolean {
  const formulas = registry.formulas[packageName];
  const actions = registry.actions[packageName];

  return Boolean(
    (formulas && Object.keys(formulas).length > 0) ||
    (actions && Object.keys(actions).length > 0)
  );
}
