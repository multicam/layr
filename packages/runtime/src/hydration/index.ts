/**
 * Hydration System
 * Based on specs/hydration-system.md
 */

import type { Component, ComponentData } from '@layr/types';
import type { Signal } from '@layr/core';
import { createSignal } from '@layr/core';
import type { RenderContext } from '../render/component';

export interface HydrationResult {
  dataSignal: Signal<ComponentData>;
  cleanup: () => void;
}

export interface HydrationContext extends RenderContext {
  document: Document;
  root: Element;
  abortSignal: AbortSignal;
}

/**
 * Hydrate a page from SSR HTML
 */
export function hydratePage(
  component: Component,
  initialData: ComponentData,
  root: Element
): HydrationResult {
  const dataSignal = createSignal<ComponentData>(initialData);
  const abortController = new AbortController();
  
  const ctx: HydrationContext = {
    dataSignal,
    component,
    root,
    document: root.ownerDocument || document,
    abortSignal: abortController.signal,
  };
  
  hydrateChildren(component, ctx, root);
  
  return {
    dataSignal,
    cleanup: () => abortController.abort(),
  };
}

function hydrateChildren(
  component: Component,
  ctx: HydrationContext,
  parent: Element
): void {
  const nodes = component.nodes;
  
  for (const child of parent.children) {
    const nodeId = child.getAttribute('data-node-id');
    if (nodeId && nodes[nodeId]) {
      hydrateNode(nodes[nodeId], component, ctx, child);
    }
  }
}

function hydrateNode(
  nodeModel: any,
  component: Component,
  ctx: HydrationContext,
  element: Element
): void {
  // Attach event handlers
  if (nodeModel.events) {
    for (const [eventName, eventHandler] of Object.entries(nodeModel.events)) {
      if (eventHandler) {
        attachNodeEvent(element, eventName, eventHandler, ctx);
      }
    }
  }
  
  // Hydrate children
  if (nodeModel.children) {
    for (const childId of nodeModel.children) {
      const childNode = component.nodes[childId];
      if (childNode) {
        const childElement = findChildByNodeId(element, childId);
        if (childElement) {
          hydrateNode(childNode, component, ctx, childElement);
        }
      }
    }
  }
}

function findChildByNodeId(parent: Element, nodeId: string): Element | null {
  for (const child of parent.children) {
    if (child.getAttribute('data-node-id') === nodeId) {
      return child;
    }
  }
  return parent.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
}

function attachNodeEvent(
  element: Element,
  eventName: string,
  handler: any,
  ctx: HydrationContext
): void {
  const listener = (e: Event) => {
    if (handler.actions) {
      for (const action of handler.actions) {
        console.log('Execute action:', action.type);
      }
    }
  };
  
  element.addEventListener(eventName, listener);
  ctx.abortSignal.addEventListener('abort', () => {
    element.removeEventListener(eventName, listener);
  });
}

/**
 * Read SSR data from script tag
 */
export function readSSRData(document: Document, id: string = 'layr-data'): ComponentData | null {
  const script = document.getElementById(id);
  if (!script) return null;

  try {
    const text = script.textContent;
    if (!text) return null;

    const data = JSON.parse(text);
    // Clear content after reading to prevent data leakage
    script.textContent = '';
    return data;
  } catch (e) {
    console.error('Failed to parse SSR data:', e);
    return null;
  }
}

/**
 * Auto-hydrate from document
 */
export function autoHydrate(
  component: Component,
  selector: string = '#App'
): HydrationResult | null {
  const root = document.querySelector(selector);
  if (!root) {
    console.error('Hydration root not found:', selector);
    return null;
  }
  
  const ssrData = readSSRData(document);
  const initialData: ComponentData = ssrData || { Attributes: {}, Variables: {}, Apis: {} };
  
  return hydratePage(component, initialData, root);
}
