import type { Component, NodeModel, Formula, ComponentData } from '@layr/types';
import { isElementNode, isTextNode, isComponentNode } from '@layr/types';
import { applyFormula, toBoolean } from '@layr/core';
import type { FormulaContext } from '@layr/core';

export interface RenderResult {
  html: string;
  apiCache: Record<string, any>;
  customProperties: Record<string, string>;
}

export interface SSROptions {
  getComponent?: (name: string, packageName?: string) => Component | undefined;
}

// Validation patterns for security
const ATTR_NAME_RE = /^[a-zA-Z_][\w\-:.]*$/;
const TAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const MAX_RENDER_DEPTH = 100;
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/**
 * Render a page component to HTML
 */
export function renderPageBody(component: Component, options?: SSROptions): RenderResult {
  const apiCache: Record<string, any> = {};
  const customProperties: Record<string, string> = {};

  // Build initial component data from variable defaults
  const variables: Record<string, unknown> = {};
  for (const [name, variable] of Object.entries(component.variables ?? {})) {
    if (variable.initialValue?.type === 'value') {
      variables[name] = variable.initialValue.value;
    }
  }

  const data: ComponentData = {
    Attributes: {},
    Variables: variables,
    Apis: {},
  };

  const formulaCtx = buildFormulaContext(data, component);

  const bodyHtml = renderComponent(component, {
    apiCache,
    customProperties,
    formulaCtx,
    getComponent: options?.getComponent,
  });

  return {
    html: bodyHtml,
    apiCache,
    customProperties,
  };
}

interface RenderContext {
  apiCache: Record<string, any>;
  customProperties: Record<string, string>;
  formulaCtx: FormulaContext;
  getComponent?: (name: string, packageName?: string) => Component | undefined;
}

/**
 * Build a server-side FormulaContext
 */
function buildFormulaContext(data: ComponentData, component?: Component): FormulaContext {
  return {
    data,
    component,
    toddle: {
      getCustomFormula: () => undefined,
      errors: [],
    },
    env: {
      isServer: true,
    },
  };
}

/**
 * Safely evaluate a formula, returning null on error
 */
function safeApplyFormula(formula: Formula | undefined | null, ctx: FormulaContext): unknown {
  if (!formula) return null;
  try {
    return applyFormula(formula, ctx);
  } catch {
    return null;
  }
}

/**
 * Render a component to HTML string
 */
function renderComponent(component: Component, ctx: RenderContext): string {
  const nodes = component.nodes;
  const root = nodes['root'];

  if (!root) {
    return '';
  }

  return renderNode(root, nodes, ctx, 0);
}

/**
 * Render a single node
 */
function renderNode(node: NodeModel, allNodes: Record<string, NodeModel>, ctx: RenderContext, depth: number = 0): string {
  // Prevent infinite recursion
  if (depth >= MAX_RENDER_DEPTH) {
    return '<!-- max depth -->';
  }

  // Evaluate condition
  if (node.condition) {
    const conditionResult = safeApplyFormula(node.condition, ctx.formulaCtx);
    if (!toBoolean(conditionResult)) {
      return '';
    }
  }

  // Handle repeat
  if (node.repeat) {
    const items = safeApplyFormula(node.repeat, ctx.formulaCtx);
    if (Array.isArray(items)) {
      return items.map((item, index) => {
        const repeatCtx: RenderContext = {
          ...ctx,
          formulaCtx: {
            ...ctx.formulaCtx,
            data: {
              ...ctx.formulaCtx.data,
              ListItem: { item, index },
            },
          },
        };
        return renderNodeInner(node, allNodes, repeatCtx, depth);
      }).join('');
    }
    return '';
  }

  return renderNodeInner(node, allNodes, ctx, depth);
}

/**
 * Render a node's content (after condition/repeat evaluation)
 */
function renderNodeInner(node: NodeModel, allNodes: Record<string, NodeModel>, ctx: RenderContext, depth: number): string {
  if (isTextNode(node)) {
    return renderTextNode(node, ctx);
  }
  if (isElementNode(node)) {
    return renderElementNode(node, allNodes, ctx, depth);
  }
  if (isComponentNode(node)) {
    return renderComponentNode(node, allNodes, ctx, depth);
  }
  if (node.type === 'slot') {
    return renderSlotNode(node, allNodes, ctx, depth);
  }
  return '';
}

/**
 * Render a text node
 */
function renderTextNode(node: NodeModel & { value?: Formula }, ctx: RenderContext): string {
  const value = safeApplyFormula(node.value, ctx.formulaCtx);
  const encoded = escapeHtml(String(value ?? ''));
  return `<span data-node-type="text" data-node-id="${node.id || ''}">${encoded}</span>`;
}

/**
 * Render an element node
 */
function renderElementNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext, depth: number): string {
  // Validate tag name to prevent injection
  const rawTag = node.tag || 'div';
  const tag = TAG_NAME_RE.test(rawTag) ? rawTag : 'div';

  const attrs = buildAttributes(node.attrs, ctx);
  const children = (node.children || [])
    .map((childId: string) => {
      const child = allNodes[childId];
      return child ? renderNode(child, allNodes, ctx, depth + 1) : '';
    })
    .join('');

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrs} />`;
  }

  return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Render a component node
 */
function renderComponentNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext, depth: number): string {
  const name = node.name || 'unknown';
  const packageName = node.package;

  // Look up sub-component if resolver is available
  if (ctx.getComponent) {
    const subComponent = ctx.getComponent(name, packageName);
    if (subComponent) {
      // Build component data from attributes passed to the component node
      const attrs: Record<string, unknown> = {};
      for (const [attrName, formula] of Object.entries(node.attrs ?? {})) {
        attrs[attrName] = safeApplyFormula(formula as Formula, ctx.formulaCtx);
      }

      const variables: Record<string, unknown> = {};
      for (const [varName, variable] of Object.entries(subComponent.variables ?? {}) as [string, any][]) {
        if (variable.initialValue?.type === 'value') {
          variables[varName] = variable.initialValue.value;
        }
      }

      const subData: ComponentData = {
        Attributes: attrs,
        Variables: variables,
        Apis: {},
      };

      const subCtx: RenderContext = {
        ...ctx,
        formulaCtx: buildFormulaContext(subData, subComponent),
      };

      return renderComponent(subComponent, subCtx);
    }
  }

  // Fallback: render slot children if available
  const children = (node.children || [])
    .map((childId: string) => {
      const child = allNodes[childId];
      return child ? renderNode(child, allNodes, ctx, depth + 1) : '';
    })
    .join('');

  return `<div data-component="${escapeHtml(name)}">${children}</div>`;
}

/**
 * Render a slot node
 */
function renderSlotNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext, depth: number): string {
  const children = (node.children || [])
    .map((childId: string) => {
      const child = allNodes[childId];
      return child ? renderNode(child, allNodes, ctx, depth + 1) : '';
    })
    .join('');

  return children;
}

/**
 * Build HTML attributes string
 */
function buildAttributes(attrs: Record<string, any> = {}, ctx: RenderContext): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(attrs)) {
    // Validate attribute name to prevent injection
    if (!ATTR_NAME_RE.test(key)) continue;

    const attrValue = safeApplyFormula(value, ctx.formulaCtx);
    if (attrValue === null || attrValue === undefined || attrValue === false) continue;
    if (attrValue === true) {
      parts.push(` ${key}`);
      continue;
    }
    const encoded = escapeHtml(String(attrValue));
    parts.push(` ${key}="${encoded}"`);
  }

  return parts.join('');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
