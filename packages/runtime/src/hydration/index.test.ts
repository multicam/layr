import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { hydratePage, readSSRData, autoHydrate } from './index';
import type { Component } from '@layr/types';

let window: Window;
let document: Document;

describe('Hydration System', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
  });

  describe('hydratePage', () => {
    test('returns hydration result with cleanup', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const initialData = {
        Attributes: { title: 'Hello' },
        Variables: { count: 0 },
        Apis: {},
      };
      
      const root = document.createElement('div');
      root.setAttribute('id', 'App');
      
      const result = hydratePage(component, initialData, root);
      
      expect(result.dataSignal).toBeDefined();
      expect(result.cleanup).toBeDefined();
      
      // Cleanup should work
      result.cleanup();
    });

    test('signal contains initial data', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const initialData = {
        Attributes: {},
        Variables: { message: 'Hello World' },
        Apis: {},
      };
      
      const root = document.createElement('div');
      const result = hydratePage(component, initialData, root);
      
      const data = result.dataSignal.get();
      expect(data.Variables.message).toBe('Hello World');
      
      result.cleanup();
    });
  });

  describe('readSSRData', () => {
    test('reads data from script tag', () => {
      const script = document.createElement('script');
      script.setAttribute('id', 'layr-data');
      script.textContent = JSON.stringify({
        Attributes: {},
        Variables: { x: 42 },
        Apis: {},
      });
      document.body.appendChild(script);
      
      const data = readSSRData(document, 'layr-data');
      
      expect(data).toBeDefined();
      expect(data?.Variables.x).toBe(42);
      
      document.body.removeChild(script);
    });

    test('returns null when script not found', () => {
      const data = readSSRData(document, 'nonexistent');
      expect(data).toBeNull();
    });

    test('returns null on invalid JSON', () => {
      const script = document.createElement('script');
      script.setAttribute('id', 'invalid-data');
      script.textContent = 'not valid json';
      document.body.appendChild(script);
      
      const data = readSSRData(document, 'invalid-data');
      expect(data).toBeNull();
      
      document.body.removeChild(script);
    });
  });

  describe('autoHydrate', () => {
    test('returns null when root not found', () => {
      const component: Component = {
        name: 'Test',
        nodes: {},
      };
      
      const result = autoHydrate(component, '#Nonexistent');
      expect(result).toBeNull();
    });

    test('hydrates from SSR data', () => {
      // Set up DOM
      const root = document.createElement('div');
      root.setAttribute('id', 'App');
      document.body.appendChild(root);
      
      const script = document.createElement('script');
      script.setAttribute('id', 'layr-data');
      script.textContent = JSON.stringify({
        Attributes: {},
        Variables: { hydrated: true },
        Apis: {},
      });
      document.body.appendChild(script);
      
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const result = autoHydrate(component, '#App');
      
      expect(result).toBeDefined();
      expect(result?.dataSignal.get().Variables.hydrated).toBe(true);
      
      result?.cleanup();
      
      document.body.removeChild(root);
      document.body.removeChild(script);
    });
  });
});

describe('hydration with event handlers', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
  });

  test('hydrates nodes with event handlers', () => {
    const component: Component = {
      name: 'Button',
      nodes: {
        root: { 
          id: 'btn',
          type: 'element', 
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', variable: 'clicked', value: { type: 'value', value: true } }],
            },
          },
        },
      },
    };
    
    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');
    
    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    
    // Handler should be attached
    expect(result.dataSignal).toBeDefined();
    
    result.cleanup();
  });

  test('hydrates nested children', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child'] },
        child: { id: 'child', type: 'element', tag: 'span', children: [] },
      },
    };
    
    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    const child = document.createElement('span');
    child.setAttribute('data-node-id', 'child');
    root.appendChild(child);
    
    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });
});
