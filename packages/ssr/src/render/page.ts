import type { Component, NodeModel } from '@layr/types';

export interface RenderResult {
  html: string;
  apiCache: Record<string, any>;
  customProperties: Record<string, string>;
}

/**
 * Render a page component to HTML
 */
export function renderPageBody(component: Component): RenderResult {
  const apiCache: Record<string, any> = {};
  const customProperties: Record<string, string> = {};
  
  const bodyHtml = renderComponent(component, {
    apiCache,
    customProperties,
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
  
  return renderNode(root, nodes, ctx);
}

/**
 * Render a single node
 */
function renderNode(node: NodeModel, allNodes: Record<string, NodeModel>, ctx: RenderContext): string {
  // Check condition
  // TODO: Evaluate condition formula
  
  // Handle repeat
  // TODO: Evaluate repeat formula
  
  switch (node.type) {
    case 'text':
      return renderTextNode(node);
    case 'element':
      return renderElementNode(node, allNodes, ctx);
    case 'component':
      return renderComponentNode(node, allNodes, ctx);
    case 'slot':
      return renderSlotNode(node, allNodes, ctx);
    default:
      return '';
  }
}

/**
 * Render a text node
 */
function renderTextNode(node: any): string {
  const value = node.value?.type === 'value' ? String(node.value.value ?? '') : '';
  const encoded = escapeHtml(value);
  return `<span data-node-type="text" data-node-id="${node.id || ''}">${encoded}</span>`;
}

/**
 * Render an element node
 */
function renderElementNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext): string {
  const tag = node.tag || 'div';
  const attrs = buildAttributes(node.attrs);
  const children = (node.children || [])
    .map((childId: string) => {
      const child = allNodes[childId];
      return child ? renderNode(child, allNodes, ctx) : '';
    })
    .join('');
  
  // Void elements
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  
  if (voidElements.includes(tag)) {
    return `<${tag}${attrs} />`;
  }
  
  return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Render a component node
 */
function renderComponentNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext): string {
  // TODO: Look up and render actual component
  const name = node.name || 'unknown';
  return `<div data-component="${name}"><!-- component placeholder --></div>`;
}

/**
 * Render a slot node
 */
function renderSlotNode(node: any, allNodes: Record<string, NodeModel>, ctx: RenderContext): string {
  const children = (node.children || [])
    .map((childId: string) => {
      const child = allNodes[childId];
      return child ? renderNode(child, allNodes, ctx) : '';
    })
    .join('');
  
  return children;
}

/**
 * Build HTML attributes string
 */
function buildAttributes(attrs: Record<string, any> = {}): string {
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(attrs)) {
    // TODO: Evaluate formula
    const attrValue = value?.type === 'value' ? value.value : '';
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
