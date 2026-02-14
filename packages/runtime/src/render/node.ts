import type { NodeModel, ElementNodeModel, TextNodeModel, ComponentNodeModel, SlotNodeModel, Formula } from '@layr/types';
import { isElementNode, isTextNode, isComponentNode, isSlotNode } from '@layr/types';
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
  if (isTextNode(node)) {
    return [createTextNode(node, doc)];
  }
  if (isElementNode(node)) {
    return [createElementNode(node, allNodes, ctx, doc)];
  }
  if (isComponentNode(node)) {
    return [createComponentNode(node, ctx, doc)];
  }
  if (isSlotNode(node)) {
    return createSlotNode(node, allNodes, ctx, doc);
  }
  return [];
}

/**
 * Create a text node wrapper
 */
function createTextNode(node: TextNodeModel, doc: Document): Element {
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
  node: ElementNodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  doc: Document
): Element {
  const TAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/;
  const tag = TAG_NAME_RE.test(node.tag) ? node.tag : 'div';
  const element = doc.createElement(tag);

  element.setAttribute('data-node-id', node.id || '');

  // Set attributes
  if (node.attrs) {
    for (const [key, formula] of Object.entries(node.attrs)) {
      const attrValue = formula?.type === 'value' ? formula.value : '';
      if (key === 'class' || key === 'className') {
        element.setAttribute('class', String(attrValue || ''));
      } else if (key.startsWith('on')) {
        // Event handler — skip
      } else {
        element.setAttribute(key, String(attrValue ?? ''));
      }
    }
  }

  // Render children
  for (const childId of node.children) {
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
function createComponentNode(node: ComponentNodeModel, ctx: RenderContext, doc: Document): Element {
  const element = doc.createElement('div');
  element.setAttribute('data-component', node.name || 'unknown');
  element.setAttribute('data-node-id', node.id || '');

  return element;
}

/**
 * Create a slot node
 */
function createSlotNode(
  node: SlotNodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext,
  doc: Document
): Element[] {
  const elements: Element[] = [];

  for (const childId of node.children) {
    const child = allNodes[childId];
    if (child) {
      elements.push(...createNode(child, allNodes, ctx));
    }
  }

  return elements;
}
