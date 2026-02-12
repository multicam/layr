import type { Component, NodeModel, ComponentData } from '@layr/types';
import type { Signal } from '@layr/core';
import { createNode } from './node';

export interface RenderContext {
  dataSignal: Signal<ComponentData>;
  component: Component;
  root: Element;
  abortSignal: AbortSignal;
}

/**
 * Render a component to DOM elements
 */
export function renderComponent(ctx: RenderContext): Element[] {
  const nodes = ctx.component.nodes;
  const root = nodes['root'];
  
  if (!root) {
    return [];
  }
  
  return createNode(root, nodes, ctx);
}
