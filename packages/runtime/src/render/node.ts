import type { NodeModel, Component, Formula } from '@layr/types';
import type { RenderContext } from './component';
import { shouldRender, createRepeatedNodes } from './condition';

/**
 * Create DOM elements from a node
 */
export function createNode(
  node: NodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  listItem: any = null
): Element[] {
  // Get document at call time, not module load time
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) {
    return [];
  }
  
  // Check condition
  if (!shouldRender(node, ctx)) {
    return [];
  }
  
  // Handle repeat
  const repeatedItems = createRepeatedNodes(node, allNodes, ctx);
  
  if (repeatedItems.length > 1 || repeatedItems[0]?.listItem !== null) {
    const elements: Element[] = [];
    
    for (const { listItem: itemContext } of repeatedItems) {
      const childCtx: RenderContext = {
        ...ctx,
        dataSignal: ctx.dataSignal,
      };
      
      if (itemContext) {
        const currentData = ctx.dataSignal.get();
        childCtx.dataSignal = ctx.dataSignal.map(() => ({
          ...currentData,
          ListItem: itemContext,
        }));
      }
      
      const childElements = createSingle(node, allNodes, childCtx, doc);
      elements.push(...childElements);
    }
    
    return elements;
  }
  
  // Single render (no repeat)
  return createSingle(node, allNodes, ctx, doc);
}

/**
 * Create a single node (internal)
 */
function createSingle(
  node: NodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  doc: Document
): Element[] {
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
      const attrValue = (value as any)?.type === 'value' ? (value as any).value : '';
      if (key === 'class' || key === 'className') {
        element.setAttribute('class', String(attrValue || ''));
      } else if (key.startsWith('on')) {
        // Event handler
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
