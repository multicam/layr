/**
 * Project Walker
 * Walks project structure using visitor pattern
 * Based on specs/search-and-linting.md
 */

import type { ProjectFiles, Component, NodeModel, Formula, ActionModel, CustomRoute, Theme } from '@layr/types';
import type { NodeType, Visitor, RuleContext } from './types';

// ============================================================================
// Memoization
// ============================================================================

export function createMemo() {
  const cache = new Map<string, unknown>();
  
  return <T>(key: string, factory: () => T): T => {
    if (cache.has(key)) {
      return cache.get(key) as T;
    }
    const value = factory();
    cache.set(key, value);
    return value;
  };
}

// ============================================================================
// Project Walker
// ============================================================================

export interface WalkState {
  files: ProjectFiles;
  packageName?: string;
  component?: Component;
}

export function* walkProject(
  files: ProjectFiles,
  visitors: Visitor[],
  options?: { pathsToVisit?: (string | number)[][] }
): Generator<{ visitor: Visitor; value: unknown; path: (string | number)[]; ctx: RuleContext }> {
  
  const memo = createMemo();
  const ctx: RuleContext = { files, memo };
  
  // Get visitors by node type
  const visitorsByType = new Map<NodeType, Visitor[]>();
  for (const visitor of visitors) {
    const existing = visitorsByType.get(visitor.nodeType) || [];
    existing.push(visitor);
    visitorsByType.set(visitor.nodeType, existing);
  }
  
  const shouldVisit = (path: (string | number)[]): boolean => {
    if (!options?.pathsToVisit?.length) return true;
    return options.pathsToVisit.some(p => 
      path.length >= p.length && p.every((seg, i) => seg === path[i])
    );
  };
  
  const visit = (nodeType: NodeType, value: unknown, path: (string | number)[]) => {
    if (!shouldVisit(path)) return;
    const typeVisitors = visitorsByType.get(nodeType) || [];
    for (const visitor of typeVisitors) {
      yield { visitor, value, path, ctx };
    }
  };
  
  // Walk components
  for (const [name, component] of Object.entries(files.components || {})) {
    if (!component) continue;
    
    yield* visit('component', component, ['components', name]);
    
    // Walk nodes
    yield* walkNodes(component, files, visitorsByType, ['components', name], ctx, shouldVisit);
    
    // Walk formulas
    for (const [formulaName, formula] of Object.entries(component.formulas || {})) {
      if (!formula) continue;
      yield* visit('formula', formula, ['components', name, 'formulas', formulaName]);
    }
    
    // Walk variables
    for (const [varName, variable] of Object.entries(component.variables || {})) {
      if (!variable) continue;
      yield* visit('variable', variable, ['components', name, 'variables', varName]);
    }
    
    // Walk workflows
    for (const [workflowName, workflow] of Object.entries(component.workflows || {})) {
      if (!workflow) continue;
      yield* visit('workflow', workflow, ['components', name, 'workflows', workflowName]);
      
      // Walk workflow actions
      for (let i = 0; i < (workflow.actions?.length || 0); i++) {
        const action = workflow.actions?.[i];
        if (action) {
          yield* visit('action-model', action, ['components', name, 'workflows', workflowName, 'actions', i]);
          yield* walkActions(action, visitorsByType, ['components', name, 'workflows', workflowName, 'actions', i], ctx, shouldVisit);
        }
      }
    }
    
    // Walk events
    for (const [eventName, event] of Object.entries(component.events || {})) {
      if (!event) continue;
      yield* visit('event', event, ['components', name, 'events', eventName]);
      
      // Walk event actions
      for (let i = 0; i < (event.actions?.length || 0); i++) {
        const action = event.actions?.[i];
        if (action) {
          yield* visit('action-model', action, ['components', name, 'events', eventName, 'actions', i]);
          yield* walkActions(action, visitorsByType, ['components', name, 'events', eventName, 'actions', i], ctx, shouldVisit);
        }
      }
    }
    
    // Walk attributes
    for (const [attrName, attribute] of Object.entries(component.attributes || {})) {
      if (!attribute) continue;
      yield* visit('attribute', attribute, ['components', name, 'attributes', attrName]);
    }
    
    // Walk contexts
    for (const [ctxName, context] of Object.entries(component.contexts || {})) {
      if (!context) continue;
      yield* visit('context', context, ['components', name, 'contexts', ctxName]);
    }
    
    // Walk onLoad
    if (component.onLoad) {
      for (let i = 0; i < (component.onLoad.actions?.length || 0); i++) {
        const action = component.onLoad.actions?.[i];
        if (action) {
          yield* visit('action-model', action, ['components', name, 'onLoad', 'actions', i]);
          yield* walkActions(action, visitorsByType, ['components', name, 'onLoad', 'actions', i], ctx, shouldVisit);
        }
      }
    }
    
    // Walk onAttributeChange
    if (component.onAttributeChange) {
      for (let i = 0; i < (component.onAttributeChange.actions?.length || 0); i++) {
        const action = component.onAttributeChange.actions?.[i];
        if (action) {
          yield* visit('action-model', action, ['components', name, 'onAttributeChange', 'actions', i]);
          yield* walkActions(action, visitorsByType, ['components', name, 'onAttributeChange', 'actions', i], ctx, shouldVisit);
        }
      }
    }
    
    // Walk APIs
    for (const [apiName, api] of Object.entries(component.apis || {})) {
      if (!api) continue;
      yield* visit('api', api, ['components', name, 'apis', apiName]);
    }
  }
  
  // Walk routes
  for (const [routeName, route] of Object.entries(files.routes || {})) {
    if (!route) continue;
    yield* visit('route', route, ['routes', routeName]);
    
    // Walk route formulas
    for (const key of ['title', 'description', 'icon'] as const) {
      if ((route as any)[key]) {
        yield* visit('route-formula', (route as any)[key], ['routes', routeName, key]);
      }
    }
  }
  
  // Walk themes
  for (const [themeName, theme] of Object.entries(files.themes || {})) {
    if (!theme) continue;
    yield* visit('theme', theme, ['themes', themeName]);
  }
  
  // Walk project-level formulas
  for (const [formulaName, formula] of Object.entries(files.formulas || {})) {
    if (!formula) continue;
    yield* visit('formula', formula, ['formulas', formulaName]);
  }
  
  // Walk project-level actions
  for (const [actionName, action] of Object.entries(files.actions || {})) {
    if (!action) continue;
    yield* visit('action-model', action, ['actions', actionName]);
  }
}

// ============================================================================
// Node Walker
// ============================================================================

function* walkNodes(
  component: Component,
  files: ProjectFiles,
  visitorsByType: Map<NodeType, Visitor[]>,
  basePath: (string | number)[],
  ctx: RuleContext,
  shouldVisit: (path: (string | number)[]) => boolean
): Generator<{ visitor: Visitor; value: unknown; path: (string | number)[]; ctx: RuleContext }> {
  
  const visit = (nodeType: NodeType, value: unknown, path: (string | number)[]) => {
    if (!shouldVisit(path)) return [];
    const typeVisitors = visitorsByType.get(nodeType) || [];
    return typeVisitors.map(visitor => ({ visitor, value, path, ctx }));
  };
  
  const walkNode = function* (node: NodeModel, path: (string | number)[]): Generator<{ visitor: Visitor; value: unknown; path: (string | number)[]; ctx: RuleContext }> {
    yield* visit('component-node', node, path);
    
    if (node.type === 'element') {
      // Walk element attributes (formulas)
      for (const [attrName, attrValue] of Object.entries(node.attrs || {})) {
        if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
          yield* visit('formula', attrValue, [...path, 'attrs', attrName]);
        }
      }
      
      // Walk element styles
      for (const [styleName, styleValue] of Object.entries(node.style || {})) {
        if (styleValue && typeof styleValue === 'object' && 'type' in styleValue) {
          yield* visit('style-declaration', { name: styleName, value: styleValue }, [...path, 'style', styleName]);
        }
      }
      
      // Walk element events
      for (const [eventName, event] of Object.entries(node.events || {})) {
        if (!event) continue;
        for (let i = 0; i < (event.actions?.length || 0); i++) {
          const action = event.actions?.[i];
          if (action) {
            yield* visit('action-model', action, [...path, 'events', eventName, 'actions', i]);
            yield* walkActions(action, visitorsByType, [...path, 'events', eventName, 'actions', i], ctx, shouldVisit);
          }
        }
      }
      
      // Walk children
      for (let i = 0; i < (node.children?.length || 0); i++) {
        const child = node.children?.[i];
        if (typeof child === 'string') {
          // It's a reference to another node
          const childNode = component.nodes?.[child];
          if (childNode) {
            yield* walkNode(childNode, [...basePath, 'nodes', child]);
          }
        }
      }
    } else if (node.type === 'component') {
      // Walk component attributes
      for (const [attrName, attrValue] of Object.entries(node.attrs || {})) {
        if (attrValue && typeof attrValue === 'object' && 'type' in attrValue) {
          yield* visit('formula', attrValue, [...path, 'attrs', attrName]);
        }
      }
      
      // Walk component events
      for (const [eventName, event] of Object.entries(node.events || {})) {
        if (!event) continue;
        for (let i = 0; i < (event.actions?.length || 0); i++) {
          const action = event.actions?.[i];
          if (action) {
            yield* visit('action-model', action, [...path, 'events', eventName, 'actions', i]);
            yield* walkActions(action, visitorsByType, [...path, 'events', eventName, 'actions', i], ctx, shouldVisit);
          }
        }
      }
    } else if (node.type === 'text') {
      // Walk text value formula
      if (node.value && typeof node.value === 'object' && 'type' in node.value) {
        yield* visit('formula', node.value, [...path, 'value']);
      }
    }
    
    // Walk condition formula
    if (node.condition) {
      yield* visit('formula', node.condition, [...path, 'condition']);
    }
    
    // Walk repeat formula
    if (node.repeat) {
      yield* visit('formula', node.repeat, [...path, 'repeat']);
    }
  };
  
  // Start from root node
  if (component.nodes?.root) {
    yield* walkNode(component.nodes.root, [...basePath, 'nodes', 'root']);
  }
}

// ============================================================================
// Action Walker
// ============================================================================

function* walkActions(
  action: ActionModel,
  visitorsByType: Map<NodeType, Visitor[]>,
  basePath: (string | number)[],
  ctx: RuleContext,
  shouldVisit: (path: (string | number)[]) => boolean
): Generator<{ visitor: Visitor; value: unknown; path: (string | number)[]; ctx: RuleContext }> {
  
  const visit = (nodeType: NodeType, value: unknown, path: (string | number)[]) => {
    if (!shouldVisit(path)) return [];
    const typeVisitors = visitorsByType.get(nodeType) || [];
    return typeVisitors.map(visitor => ({ visitor, value, path, ctx }));
  };
  
  switch (action.type) {
    case 'Switch':
      // Walk cases
      for (let i = 0; i < (action.cases?.length || 0); i++) {
        const case_ = action.cases?.[i];
        if (case_) {
          for (let j = 0; j < (case_.actions?.length || 0); j++) {
            const subAction = case_.actions?.[j];
            if (subAction) {
              yield* visit('action-model', subAction, [...basePath, 'cases', i, 'actions', j]);
              yield* walkActions(subAction, visitorsByType, [...basePath, 'cases', i, 'actions', j], ctx, shouldVisit);
            }
          }
        }
      }
      // Walk default
      if (action.default) {
        for (let j = 0; j < (action.default.actions?.length || 0); j++) {
          const subAction = action.default.actions?.[j];
          if (subAction) {
            yield* visit('action-model', subAction, [...basePath, 'default', 'actions', j]);
            yield* walkActions(subAction, visitorsByType, [...basePath, 'default', 'actions', j], ctx, shouldVisit);
          }
        }
      }
      break;
      
    case 'Fetch':
      // Walk callbacks
      for (const callbackType of ['onSuccess', 'onError', 'onMessage'] as const) {
        const callback = (action as any)[callbackType];
        if (callback?.actions) {
          for (let j = 0; j < callback.actions.length; j++) {
            const subAction = callback.actions[j];
            if (subAction) {
              yield* visit('action-model', subAction, [...basePath, callbackType, 'actions', j]);
              yield* walkActions(subAction, visitorsByType, [...basePath, callbackType, 'actions', j], ctx, shouldVisit);
            }
          }
        }
      }
      break;
      
    case 'TriggerWorkflow':
      // Walk callbacks
      if (action.callbacks) {
        for (const [callbackName, callback] of Object.entries(action.callbacks)) {
          if (callback?.actions) {
            for (let j = 0; j < callback.actions.length; j++) {
              const subAction = callback.actions[j];
              if (subAction) {
                yield* visit('action-model', subAction, [...basePath, 'callbacks', callbackName, 'actions', j]);
                yield* walkActions(subAction, visitorsByType, [...basePath, 'callbacks', callbackName, 'actions', j], ctx, shouldVisit);
              }
            }
          }
        }
      }
      break;
  }
}
