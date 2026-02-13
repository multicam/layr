/**
 * Introspection and Traversal System
 * Based on specs/introspection-and-traversal.md
 * 
 * Provides generator-based traversal for formulas, actions, and components.
 */

import type {
  Formula,
  ActionModel,
  Component,
  NodeModel,
  ElementNodeModel,
  ComponentNodeModel,
  TextNodeModel,
  SlotNodeModel,
  ComponentFormula,
  ComponentAPI,
  EventModel,
} from '@layr/types';

// ============================================================================
// Traversal Result Types
// ============================================================================

export interface FormulaVisit {
  path: (string | number)[];
  formula: Formula;
  packageName?: string;
}

export interface ActionVisit {
  path: (string | number)[];
  action: ActionModel;
}

// ============================================================================
// Global Formulas Registry Type
// ============================================================================

export interface GlobalFormulas {
  formulas: Record<string, ComponentFormula>;
  packages?: Record<string, {
    formulas: Record<string, ComponentFormula>;
  }>;
}

// ============================================================================
// Formula Traversal
// ============================================================================

/**
 * Recursively walks a formula tree, yielding each formula node.
 */
export function* getFormulasInFormula(
  formula: Formula | undefined | null,
  options: {
    path?: (string | number)[];
    // TODO: Implement cycle detection - currently scaffolding only.
    // Should .add() formula identifiers and .has() to skip already-visited formulas.
    visitedFormulas?: Set<string>;
    packageName?: string;
  } = {}
): Generator<FormulaVisit> {
  if (!formula) return;

  const {
    path = [],
    visitedFormulas = new Set<string>(),
    packageName,
  } = options;

  // Yield this formula
  yield { path: [...path], formula, packageName };

  switch (formula.type) {
    case 'value':
    case 'path':
      // Leaf nodes - no children
      break;

    case 'record':
    case 'object':
    case 'array':
    case 'or':
    case 'and':
      for (let i = 0; i < (formula.arguments?.length ?? 0); i++) {
        const arg = formula.arguments![i];
        yield* getFormulasInFormula(arg.formula, {
          path: [...path, 'arguments', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'function': {
      // Visit arguments
      for (let i = 0; i < (formula.arguments?.length ?? 0); i++) {
        const arg = formula.arguments![i];
        yield* getFormulasInFormula(arg.formula, {
          path: [...path, 'arguments', i, 'formula'],
          visitedFormulas,
          packageName: formula.package ?? packageName,
        });
      }
      break;
    }

    case 'apply':
      for (let i = 0; i < (formula.arguments?.length ?? 0); i++) {
        const arg = formula.arguments![i];
        yield* getFormulasInFormula(arg.formula, {
          path: [...path, 'arguments', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'switch':
      // Visit case conditions and formulas
      for (let i = 0; i < formula.cases.length; i++) {
        const case_ = formula.cases[i];
        yield* getFormulasInFormula(case_.condition, {
          path: [...path, 'cases', i, 'condition'],
          visitedFormulas,
          packageName,
        });
        yield* getFormulasInFormula(case_.formula, {
          path: [...path, 'cases', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      // Visit default
      yield* getFormulasInFormula(formula.default, {
        path: [...path, 'default'],
        visitedFormulas,
        packageName,
      });
      break;
  }
}

// ============================================================================
// Action Traversal
// ============================================================================

/**
 * Recursively walks an action tree, yielding all formulas found within it.
 */
export function* getFormulasInAction(
  action: ActionModel | ActionModel[] | undefined | null,
  options: {
    path?: (string | number)[];
    visitedFormulas?: Set<string>;
    packageName?: string;
  } = {}
): Generator<FormulaVisit> {
  if (!action) return;

  // Handle array of actions
  if (Array.isArray(action)) {
    for (let i = 0; i < action.length; i++) {
      yield* getFormulasInAction(action[i], {
        ...options,
        path: [...(options.path ?? []), i],
      });
    }
    return;
  }

  const { path = [], visitedFormulas = new Set<string>(), packageName } = options;

  switch (action.type) {
    case 'AbortFetch':
      // No formulas
      break;

    case 'Fetch':
      // Visit inputs
      for (let i = 0; i < (action.inputs?.length ?? 0); i++) {
        const input = action.inputs![i];
        if (input.formula) {
          yield* getFormulasInFormula(input.formula, {
            path: [...path, 'inputs', i, 'formula'],
            visitedFormulas,
            packageName,
          });
        }
      }
      // Visit callbacks
      yield* getFormulasInAction(action.onSuccess?.actions, {
        path: [...path, 'onSuccess', 'actions'],
        visitedFormulas,
        packageName,
      });
      yield* getFormulasInAction(action.onError?.actions, {
        path: [...path, 'onError', 'actions'],
        visitedFormulas,
        packageName,
      });
      yield* getFormulasInAction(action.onMessage?.actions, {
        path: [...path, 'onMessage', 'actions'],
        visitedFormulas,
        packageName,
      });
      break;

    case 'SetVariable':
      if (action.data) {
        yield* getFormulasInFormula(action.data, {
          path: [...path, 'data'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'TriggerEvent':
      if (action.data) {
        yield* getFormulasInFormula(action.data, {
          path: [...path, 'data'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'TriggerWorkflowCallback':
      if (action.data) {
        yield* getFormulasInFormula(action.data, {
          path: [...path, 'data'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'SetURLParameter':
      if (action.data) {
        yield* getFormulasInFormula(action.data, {
          path: [...path, 'data'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'SetURLParameters':
      for (let i = 0; i < (action.parameters?.length ?? 0); i++) {
        const param = action.parameters![i];
        yield* getFormulasInFormula(param.formula, {
          path: [...path, 'parameters', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'TriggerWorkflow':
      for (let i = 0; i < (action.parameters?.length ?? 0); i++) {
        const param = action.parameters![i];
        yield* getFormulasInFormula(param.formula, {
          path: [...path, 'parameters', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      break;

    case 'Switch':
      if (action.data) {
        yield* getFormulasInFormula(action.data, {
          path: [...path, 'data'],
          visitedFormulas,
          packageName,
        });
      }
      for (let i = 0; i < action.cases.length; i++) {
        const case_ = action.cases[i];
        yield* getFormulasInFormula(case_.condition, {
          path: [...path, 'cases', i, 'condition'],
          visitedFormulas,
          packageName,
        });
        yield* getFormulasInAction(case_.actions, {
          path: [...path, 'cases', i, 'actions'],
          visitedFormulas,
          packageName,
        });
      }
      yield* getFormulasInAction(action.default?.actions, {
        path: [...path, 'default', 'actions'],
        visitedFormulas,
        packageName,
      });
      break;

    case 'Custom':
    case undefined:
    case null:
      // Custom action - visit arguments
      for (let i = 0; i < (action.arguments?.length ?? 0); i++) {
        const arg = action.arguments![i];
        yield* getFormulasInFormula(arg.formula, {
          path: [...path, 'arguments', i, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      // Visit events
      if (action.events) {
        for (const eventName of Object.keys(action.events)) {
          yield* getFormulasInAction(action.events[eventName].actions, {
            path: [...path, 'events', eventName, 'actions'],
            visitedFormulas,
            packageName,
          });
        }
      }
      break;
  }
}

/**
 * Recursively walks an action tree, yielding each action model.
 */
export function* getActionsInAction(
  action: ActionModel | undefined | null | ActionModel[],
  path: (string | number)[] = []
): Generator<ActionVisit> {
  if (!action) return;

  // Handle array of actions
  if (Array.isArray(action)) {
    for (let i = 0; i < action.length; i++) {
      yield* getActionsInAction(action[i], [...path, i]);
    }
    return;
  }

  // Yield this action
  yield { path: [...path], action };

  switch (action.type) {
    case 'AbortFetch':
    case 'SetURLParameter':
    case 'SetURLParameters':
    case 'SetVariable':
    case 'TriggerEvent':
    case 'TriggerWorkflow':
    case 'TriggerWorkflowCallback':
      // Leaf actions
      break;

    case 'Fetch':
      yield* getActionsInAction(action.onSuccess?.actions, [...path, 'onSuccess', 'actions']);
      yield* getActionsInAction(action.onError?.actions, [...path, 'onError', 'actions']);
      yield* getActionsInAction(action.onMessage?.actions, [...path, 'onMessage', 'actions']);
      break;

    case 'Custom':
    case undefined:
    case null:
      if (action.events) {
        for (const eventName of Object.keys(action.events)) {
          yield* getActionsInAction(action.events[eventName].actions, [...path, 'events', eventName, 'actions']);
        }
      }
      break;

    case 'Switch':
      for (let i = 0; i < action.cases.length; i++) {
        yield* getActionsInAction(action.cases[i].actions, [...path, 'cases', i, 'actions']);
      }
      yield* getActionsInAction(action.default?.actions, [...path, 'default', 'actions']);
      break;
  }
}

// ============================================================================
// Node Traversal
// ============================================================================

/**
 * Get all formulas in a node.
 */
export function* getFormulasInNode(
  node: NodeModel,
  nodeId: string,
  options: {
    visitedFormulas?: Set<string>;
    packageName?: string;
  } = {}
): Generator<FormulaVisit> {
  const { visitedFormulas = new Set<string>(), packageName } = options;

  // Common: condition, repeat, repeatKey
  if (node.condition) {
    yield* getFormulasInFormula(node.condition, {
      path: ['nodes', nodeId, 'condition'],
      visitedFormulas,
      packageName,
    });
  }
  if (node.repeat) {
    yield* getFormulasInFormula(node.repeat, {
      path: ['nodes', nodeId, 'repeat'],
      visitedFormulas,
      packageName,
    });
  }
  if (node.repeatKey) {
    yield* getFormulasInFormula(node.repeatKey, {
      path: ['nodes', nodeId, 'repeatKey'],
      visitedFormulas,
      packageName,
    });
  }

  switch (node.type) {
    case 'text': {
      const textNode = node as TextNodeModel;
      yield* getFormulasInFormula(textNode.value, {
        path: ['nodes', nodeId, 'value'],
        visitedFormulas,
        packageName,
      });
      break;
    }

    case 'element': {
      const elemNode = node as ElementNodeModel;
      // Attributes
      for (const attrName of Object.keys(elemNode.attrs ?? {})) {
        yield* getFormulasInFormula(elemNode.attrs![attrName], {
          path: ['nodes', nodeId, 'attrs', attrName],
          visitedFormulas,
          packageName,
        });
      }
      // Events
      for (const eventName of Object.keys(elemNode.events ?? {})) {
        yield* getFormulasInAction(elemNode.events![eventName].actions, {
          path: ['nodes', nodeId, 'events', eventName, 'actions'],
          visitedFormulas,
          packageName,
        });
      }
      // Classes
      for (const className of Object.keys(elemNode.classes ?? {})) {
        const classDef = elemNode.classes![className];
        if (classDef.formula) {
          yield* getFormulasInFormula(classDef.formula, {
            path: ['nodes', nodeId, 'classes', className, 'formula'],
            visitedFormulas,
            packageName,
          });
        }
      }
      // Custom properties
      for (const propName of Object.keys(elemNode.customProperties ?? {})) {
        yield* getFormulasInFormula(elemNode.customProperties![propName].formula, {
          path: ['nodes', nodeId, 'customProperties', propName, 'formula'],
          visitedFormulas,
          packageName,
        });
      }
      // Variants
      for (let i = 0; i < (elemNode.variants?.length ?? 0); i++) {
        const variant = elemNode.variants![i];
        for (const propName of Object.keys(variant.customProperties ?? {})) {
          yield* getFormulasInFormula(variant.customProperties![propName].formula, {
            path: ['nodes', nodeId, 'variants', i, 'customProperties', propName, 'formula'],
            visitedFormulas,
            packageName,
          });
        }
      }
      break;
    }

    case 'component': {
      const compNode = node as ComponentNodeModel;
      // Attributes
      for (const attrName of Object.keys(compNode.attrs ?? {})) {
        yield* getFormulasInFormula(compNode.attrs![attrName], {
          path: ['nodes', nodeId, 'attrs', attrName],
          visitedFormulas,
          packageName: compNode.package ?? packageName,
        });
      }
      // Events
      for (const eventName of Object.keys(compNode.events ?? {})) {
        yield* getFormulasInAction(compNode.events![eventName].actions, {
          path: ['nodes', nodeId, 'events', eventName, 'actions'],
          visitedFormulas,
          packageName: compNode.package ?? packageName,
        });
      }
      // Custom properties
      for (const propName of Object.keys(compNode.customProperties ?? {})) {
        yield* getFormulasInFormula(compNode.customProperties![propName].formula, {
          path: ['nodes', nodeId, 'customProperties', propName, 'formula'],
          visitedFormulas,
          packageName: compNode.package ?? packageName,
        });
      }
      break;
    }

    case 'slot':
      // Slot nodes have no formulas beyond common fields
      break;
  }
}

/**
 * Get all actions in a node.
 */
export function* getActionsInNode(
  node: NodeModel,
  nodeId: string,
  path: (string | number)[] = ['nodes', nodeId]
): Generator<ActionVisit> {
  switch (node.type) {
    case 'element':
    case 'component': {
      const nodeWithEvents = node as ElementNodeModel | ComponentNodeModel;
      for (const eventName of Object.keys(nodeWithEvents.events ?? {})) {
        yield* getActionsInAction(nodeWithEvents.events![eventName].actions, [...path, 'events', eventName, 'actions']);
      }
      break;
    }
  }
}

// ============================================================================
// Component Traversal
// ============================================================================

/**
 * Get all formulas in a component.
 */
export function* getFormulasInComponent(
  component: Component,
  options: {
    visitedFormulas?: Set<string>;
    packageName?: string;
  } = {}
): Generator<FormulaVisit> {
  const { visitedFormulas = new Set<string>(), packageName } = options;

  // Route formulas (for pages)
  if (component.route) {
    if (component.route.info?.title?.formula) {
      yield* getFormulasInFormula(component.route.info.title.formula, {
        path: ['route', 'info', 'title', 'formula'],
        visitedFormulas,
        packageName,
      });
    }
    if (component.route.info?.description?.formula) {
      yield* getFormulasInFormula(component.route.info.description.formula, {
        path: ['route', 'info', 'description', 'formula'],
        visitedFormulas,
        packageName,
      });
    }
  }

  // Component formulas
  for (const formulaName of Object.keys(component.formulas ?? {})) {
    const compFormula = component.formulas![formulaName];
    yield* getFormulasInFormula(compFormula.formula, {
      path: ['formulas', formulaName, 'formula'],
      visitedFormulas,
      packageName,
    });
  }

  // Variable initial values
  for (const varName of Object.keys(component.variables ?? {})) {
    const variable = component.variables![varName];
    yield* getFormulasInFormula(variable.initialValue, {
      path: ['variables', varName, 'initialValue'],
      visitedFormulas,
      packageName,
    });
  }

  // Workflows
  for (const workflowName of Object.keys(component.workflows ?? {})) {
    const workflow = component.workflows![workflowName];
    yield* getFormulasInAction(workflow.actions, {
      path: ['workflows', workflowName, 'actions'],
      visitedFormulas,
      packageName,
    });
  }

  // APIs
  for (const apiName of Object.keys(component.apis ?? {})) {
    const api = component.apis![apiName];
    yield* getFormulasInApi(api, {
      path: ['apis', apiName],
      visitedFormulas,
      packageName,
    });
  }

  // Lifecycle events
  if (component.onLoad) {
    yield* getFormulasInAction(component.onLoad.actions, {
      path: ['onLoad', 'actions'],
      visitedFormulas,
      packageName,
    });
  }
  if (component.onAttributeChange) {
    yield* getFormulasInAction(component.onAttributeChange.actions, {
      path: ['onAttributeChange', 'actions'],
      visitedFormulas,
      packageName,
    });
  }

  // Nodes
  for (const nodeId of Object.keys(component.nodes ?? {})) {
    const node = component.nodes![nodeId];
    yield* getFormulasInNode(node, nodeId, { visitedFormulas, packageName });
  }
}

/**
 * Get all actions in a component.
 */
export function* getActionsInComponent(
  component: Component,
  path: (string | number)[] = []
): Generator<ActionVisit> {
  // Workflows
  for (const workflowName of Object.keys(component.workflows ?? {})) {
    const workflow = component.workflows![workflowName];
    yield* getActionsInAction(workflow.actions, [...path, 'workflows', workflowName, 'actions']);
  }

  // APIs
  for (const apiName of Object.keys(component.apis ?? {})) {
    const api = component.apis![apiName];
    if (api.client?.onCompleted) {
      yield* getActionsInAction(api.client.onCompleted.actions, [...path, 'apis', apiName, 'client', 'onCompleted', 'actions']);
    }
    if (api.client?.onFailed) {
      yield* getActionsInAction(api.client.onFailed.actions, [...path, 'apis', apiName, 'client', 'onFailed', 'actions']);
    }
  }

  // Lifecycle
  if (component.onLoad) {
    yield* getActionsInAction(component.onLoad.actions, [...path, 'onLoad', 'actions']);
  }
  if (component.onAttributeChange) {
    yield* getActionsInAction(component.onAttributeChange.actions, [...path, 'onAttributeChange', 'actions']);
  }

  // Nodes
  for (const nodeId of Object.keys(component.nodes ?? {})) {
    const node = component.nodes![nodeId];
    yield* getActionsInNode(node, nodeId, [...path, 'nodes', nodeId]);
  }
}

// ============================================================================
// API Traversal
// ============================================================================

/**
 * Get all formulas in an API definition.
 */
export function* getFormulasInApi(
  api: ComponentAPI,
  options: {
    path?: (string | number)[];
    visitedFormulas?: Set<string>;
    packageName?: string;
  } = {}
): Generator<FormulaVisit> {
  const { path = ['api'], visitedFormulas = new Set<string>(), packageName } = options;

  // Common fields
  if (api.autoFetch) {
    yield* getFormulasInFormula(api.autoFetch, {
      path: [...path, 'autoFetch'],
      visitedFormulas,
      packageName,
    });
  }

  if (api.url) {
    yield* getFormulasInFormula(api.url, {
      path: [...path, 'url'],
      visitedFormulas,
      packageName,
    });
  }

  if (api.method) {
    yield* getFormulasInFormula(api.method, {
      path: [...path, 'method'],
      visitedFormulas,
      packageName,
    });
  }

  if (api.body) {
    yield* getFormulasInFormula(api.body, {
      path: [...path, 'body'],
      visitedFormulas,
      packageName,
    });
  }

  // Headers
  for (const headerName of Object.keys(api.headers ?? {})) {
    const header = api.headers![headerName];
    yield* getFormulasInFormula(header.formula, {
      path: [...path, 'headers', headerName, 'formula'],
      visitedFormulas,
      packageName,
    });
    if (header.enabled) {
      yield* getFormulasInFormula(header.enabled, {
        path: [...path, 'headers', headerName, 'enabled'],
        visitedFormulas,
        packageName,
      });
    }
  }

  // Query params
  for (const paramName of Object.keys(api.queryParams ?? {})) {
    const param = api.queryParams![paramName];
    yield* getFormulasInFormula(param.formula, {
      path: [...path, 'queryParams', paramName, 'formula'],
      visitedFormulas,
      packageName,
    });
    if (param.enabled) {
      yield* getFormulasInFormula(param.enabled, {
        path: [...path, 'queryParams', paramName, 'enabled'],
        visitedFormulas,
        packageName,
      });
    }
  }

  // Client callbacks
  if (api.client?.onCompleted) {
    yield* getFormulasInAction(api.client.onCompleted.actions, {
      path: [...path, 'client', 'onCompleted', 'actions'],
      visitedFormulas,
      packageName,
    });
  }
  if (api.client?.onFailed) {
    yield* getFormulasInAction(api.client.onFailed.actions, {
      path: [...path, 'client', 'onFailed', 'actions'],
      visitedFormulas,
      packageName,
    });
  }
  if (api.client?.onMessage) {
    yield* getFormulasInAction(api.client.onMessage.actions, {
      path: [...path, 'client', 'onMessage', 'actions'],
      visitedFormulas,
      packageName,
    });
  }
}

// ============================================================================
// Reference Collection
// ============================================================================

/**
 * Collect all formula references from a component.
 */
export function collectFormulaReferences(component: Component): Set<string> {
  const references = new Set<string>();

  for (const visit of getFormulasInComponent(component)) {
    if (visit.formula.type === 'function') {
      references.add(visit.formula.name);
      if (visit.packageName) {
        references.add(`${visit.packageName}/${visit.formula.name}`);
      }
    }
  }

  return references;
}

/**
 * Collect all action references from a component.
 */
export function collectActionReferences(component: Component): Set<string> {
  const references = new Set<string>();

  for (const visit of getActionsInComponent(component)) {
    if (visit.action.type === 'Custom' || visit.action.type === undefined || visit.action.type === null) {
      const name = visit.action.name;
      if (name) {
        references.add(name);
      }
    }
  }

  return references;
}

/**
 * Collect all sub-components referenced by a component.
 */
export function collectSubComponentNames(
  component: Component,
  getComponent: (name: string, packageName?: string) => Component | undefined,
  packageName?: string,
  visited: Set<string> = new Set()
): string[] {
  const names: string[] = [];

  for (const nodeId of Object.keys(component.nodes ?? {})) {
    const node = component.nodes![nodeId];

    if (node.type === 'component') {
      const compNode = node as ComponentNodeModel;
      const compName = compNode.name;
      const compPackage = compNode.package ?? packageName;
      const key = compPackage ? `${compPackage}/${compName}` : compName;

      if (!visited.has(key)) {
        visited.add(key);
        names.push(key);

        // Recurse
        const subComponent = getComponent(compName, compPackage);
        if (subComponent) {
          names.push(...collectSubComponentNames(subComponent, getComponent, compPackage, visited));
        }
      }
    }
  }

  return names;
}
