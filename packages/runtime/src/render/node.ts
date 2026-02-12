import type { NodeModel, Component, Formula } from '@layr/types';
import type { RenderContext } from './component';

// Get document from global scope
const doc = typeof document !== 'undefined' ? document : null;

/**
 * Create DOM elements from a node
 */
export function createNode(
  node: NodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext
): Element[] {
  if (!doc) {
    return [];
  }
  
  // Check condition
  // TODO: Evaluate condition formula
  
  // Handle repeat
  // TODO: Evaluate repeat formula
  
  switch (node.type) {
    case 'text':
      return [createTextNode(node, doc)];
    case 'element':
      return [createElementNode(node as any, allNodes, ctx, doc)];
    case 'component':
      return [createComponentNode(node as any, ctx, doc)];
    case 'slot':
      return createSlotNode(node as any, allNodes, ctx, doc);
    default:
      return [];
  }
}

/**
 * Create a text node wrapper
 */
function createTextNode(node: any, doc: Document): Element {
  const span = doc.createElement('span');
  span.setAttribute('data-node-type', 'text');
  span.setAttribute('data-node-id', node.id || '');
  
  const value = node.value?.type === 'value' ? String(node.value.value ?? '') : '';
  span.textContent = value;
  
  return span;
}

/**
 * Create an element node
 */
function createElementNode(
  node: any,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  doc: Document
): Element {
  const tag = node.tag || 'div';
  const element = doc.createElement(tag);
  
  element.setAttribute('data-node-id', node.id || '');
  
  // Set attributes
  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      // TODO: Evaluate formula
      const attrValue = (value as any)?.type === 'value' ? (value as any).value : '';
      if (key === 'class' || key === 'className') {
        element.setAttribute('class', String(attrValue || ''));
      } else if (key.startsWith('on')) {
        // Event handler
        const eventName = key.slice(2).toLowerCase();
        // TODO: Set up event handler
      } else {
        element.setAttribute(key, String(attrValue ?? ''));
      }
    }
  }
  
  // Render children
  const children = node.children || [];
  for (const childId of children) {
    const child = allNodes[childId];
    if (child) {
      const childElements = createNode(child, allNodes, ctx);
      for (const el of childElements) {
        element.appendChild(el);
      }
    }
  }
  
  return element;
}

/**
 * Create a component node
 */
function createComponentNode(node: any, ctx: RenderContext, doc: Document): Element {
  const name = node.name || 'unknown';
  const element = doc.createElement('div');
  element.setAttribute('data-component', name);
  element.setAttribute('data-node-id', node.id || '');
  
  // TODO: Look up and render actual component
  
  return element;
}

/**
 * Create a slot node
 */
function createSlotNode(
  node: any,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  doc: Document
): Element[] {
  const children = node.children || [];
  const elements: Element[] = [];
  
  for (const childId of children) {
    const child = allNodes[childId];
    if (child) {
      elements.push(...createNode(child, allNodes, ctx));
    }
  }
  
  return elements;
}
