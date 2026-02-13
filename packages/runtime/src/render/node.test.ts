import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import type { RenderContext } from './component';
import type { Component, NodeModel } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let mockDoc: Document;

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
    window = new Window();
    mockDoc = window.document;
    (globalThis as any).document = mockDoc;
    await import('./node');
  });

  describe('text nodes', () => {
    test('creates text node with value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: 'Hello World' } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(1);
      expect(elements[0].textContent).toBe('Hello World');
      expect(elements[0].getAttribute('data-node-type')).toBe('text');
    });

    test('creates text node with null value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: null } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(1);
      expect(elements[0].textContent).toBe('');
    });

    test('creates text node with undefined value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: undefined } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(1);
    });

    test('creates text node with number value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: 42 } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].textContent).toBe('42');
    });

    test('creates text node with empty string', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'text', value: { type: 'value', value: '' } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].textContent).toBe('');
    });

    test('sets data-node-id', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { id: 'text-123', type: 'text', value: { type: 'value', value: 'test' } },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('data-node-id')).toBe('text-123');
    });
  });

  describe('element nodes', () => {
    test('creates div element', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'element', tag: 'div', children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(1);
      expect((elements[0] as any).tagName).toBe('DIV');
    });

    test('creates element with no tag defaults to div', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'element', tag: '', children: [] } as any,
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect((elements[0] as any).tagName).toBe('DIV');
    });

    test('creates various element types', async () => {
      const { createNode } = await import('./node');
      const tags = ['span', 'p', 'h1', 'section', 'article', 'button', 'a', 'img'];
      for (const tag of tags) {
        const nodes: Record<string, NodeModel> = {
          root: { type: 'element', tag, children: [] },
        };
        const ctx = createMockContext({ name: 'Test', nodes });
        const elements = createNode(nodes.root, nodes, ctx);
        expect((elements[0] as any).tagName).toBe(tag.toUpperCase());
      }
    });

    test('sets string attributes', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'input',
          attrs: {
            type: { type: 'value', value: 'text' },
            placeholder: { type: 'value', value: 'Enter name' },
            disabled: { type: 'value', value: 'disabled' },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('type')).toBe('text');
      expect(elements[0].getAttribute('placeholder')).toBe('Enter name');
      expect(elements[0].getAttribute('disabled')).toBe('disabled');
    });

    test('sets class attribute', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'div',
          attrs: {
            class: { type: 'value', value: 'btn btn-primary' },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('class')).toBe('btn btn-primary');
    });

    test('sets className attribute', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'div',
          attrs: {
            className: { type: 'value', value: 'container' },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('class')).toBe('container');
    });

    test('handles null attribute value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'div',
          attrs: {
            title: { type: 'value', value: null },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('title')).toBe('');
    });

    test('handles undefined attribute value', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'div',
          attrs: {
            'data-test': { type: 'value', value: undefined },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('data-test')).toBe('');
    });

    test('renders children in order', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'element', tag: 'ul', children: ['li1', 'li2', 'li3'] },
        li1: { type: 'element', tag: 'li', children: [] },
        li2: { type: 'element', tag: 'li', children: [] },
        li3: { type: 'element', tag: 'li', children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].children.length).toBe(3);
    });

    test('ignores missing children', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'element', tag: 'div', children: ['missing'] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].children.length).toBe(0);
    });

    test('handles event handler attributes', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: {
          type: 'element',
          tag: 'button',
          attrs: {
            onClick: { type: 'value', value: 'handler' },
          },
          children: [],
        },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      // Event handlers are not set as attributes
      expect(elements.length).toBe(1);
    });
  });

  describe('component nodes', () => {
    test('creates component placeholder', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'component', name: 'Button', attrs: {}, children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(1);
      expect(elements[0].getAttribute('data-component')).toBe('Button');
    });

    test('handles missing component name', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'component', name: '', attrs: {}, children: [] } as any,
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('data-component')).toBe('unknown');
    });

    test('sets node id on component', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { id: 'comp-1', type: 'component', name: 'Card', attrs: {}, children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements[0].getAttribute('data-node-id')).toBe('comp-1');
    });
  });

  describe('slot nodes', () => {
    test('renders slot children', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'slot', children: ['child1', 'child2'] },
        child1: { type: 'element', tag: 'span', children: [] },
        child2: { type: 'element', tag: 'p', children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(2);
    });

    test('returns empty array for empty slot', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'slot', children: [] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(0);
    });

    test('ignores missing slot children', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'slot', children: ['missing'] },
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(0);
    });
  });

  describe('unknown node types', () => {
    test('returns empty array for unknown type', async () => {
      const { createNode } = await import('./node');
      const nodes: Record<string, NodeModel> = {
        root: { type: 'unknown' } as any,
      };
      const ctx = createMockContext({ name: 'Test', nodes });
      const elements = createNode(nodes.root, nodes, ctx);
      expect(elements.length).toBe(0);
    });
  });
});

describe('createNode with condition', () => {
  beforeAll(async () => {
    window = new Window();
    mockDoc = window.document;
    (globalThis as any).document = mockDoc;
    await import('./node');
  });

  test('returns empty array when condition is false', async () => {
    const { createNode } = await import('./node');
    const nodes: Record<string, NodeModel> = {
      root: { 
        type: 'text', 
        value: { type: 'value', value: 'Hidden' },
        condition: { type: 'value', value: false },
      },
    };
    const ctx = createMockContext({ name: 'Test', nodes });
    const elements = createNode(nodes.root, nodes, ctx);
    expect(elements).toHaveLength(0);
  });

  test('renders when condition is true', async () => {
    const { createNode } = await import('./node');
    const nodes: Record<string, NodeModel> = {
      root: { 
        type: 'text', 
        value: { type: 'value', value: 'Visible' },
        condition: { type: 'value', value: true },
      },
    };
    const ctx = createMockContext({ name: 'Test', nodes });
    const elements = createNode(nodes.root, nodes, ctx);
    expect(elements).toHaveLength(1);
    expect(elements[0].textContent).toBe('Visible');
  });
});

describe('createNode with repeat', () => {
  beforeAll(async () => {
    window = new Window();
    mockDoc = window.document;
    (globalThis as any).document = mockDoc;
    await import('./node');
  });

  test('renders multiple items from repeat', async () => {
    const { createNode } = await import('./node');
    const nodes: Record<string, NodeModel> = {
      root: { 
        type: 'element',
        tag: 'li',
        children: [],
        repeat: { type: 'value', value: [1, 2, 3] },
      },
    };
    const ctx = createMockContext({ name: 'Test', nodes });
    const elements = createNode(nodes.root, nodes, ctx);
    expect(elements).toHaveLength(3);
  });

  test('renders single item without repeat', async () => {
    const { createNode } = await import('./node');
    const nodes: Record<string, NodeModel> = {
      root: { type: 'element', tag: 'div', children: [] },
    };
    const ctx = createMockContext({ name: 'Test', nodes });
    const elements = createNode(nodes.root, nodes, ctx);
    expect(elements).toHaveLength(1);
  });
});
