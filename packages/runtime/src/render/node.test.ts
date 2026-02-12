import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import type { RenderContext } from './component';
import type { Component, NodeModel } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let mockDoc: Document;

// Create mock context
function createMockContext(component: Component): RenderContext {
  const dataSignal = new Signal({
    Attributes: {},
    Variables: {},
    Apis: {},
  });
  
  const root = mockDoc.createElement('div');
  
  return {
    dataSignal,
    component,
    root,
    abortSignal: new AbortController().signal,
  };
}

describe('createNode', () => {
  beforeAll(async () => {
    // Set up happy-dom
    window = new Window();
    mockDoc = window.document;
    (globalThis as any).document = mockDoc;
    
    // Re-import the module to pick up the global
    await import('./node');
  });

  describe('text nodes', () => {
    test('creates text node wrapper', async () => {
      const { createNode } = await import('./node');
      
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: 'Hello' } },
      };
      
      const component: Component = { name: 'Test', nodes };
      const ctx = createMockContext(component);
      
      const elements = createNode(nodes.root, nodes, ctx);
      
      expect(elements.length).toBeGreaterThan(0);
    });
  });
  
  describe('element nodes', () => {
    test('creates element', async () => {
      const { createNode } = await import('./node');
      
      const nodes: Record<string, NodeModel> = {
        root: { type: 'element', tag: 'div', children: [] },
      };
      
      const component: Component = { name: 'Test', nodes };
      const ctx = createMockContext(component);
      
      const elements = createNode(nodes.root, nodes, ctx);
      
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
