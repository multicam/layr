import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { useClipboardStore, readSystemClipboard } from './clipboardStore';
import type { NodeModel } from '@layr/types';

// Mock crypto.randomUUID
let uuidCounter = 0;
const originalRandomUUID = crypto.randomUUID;

beforeEach(() => {
  useClipboardStore.setState({ nodes: [], sourceComponentId: null });
  uuidCounter = 0;
  crypto.randomUUID = () => `uuid-${++uuidCounter}`;
});

describe('clipboardStore', () => {
  describe('copy', () => {
    test('stores nodes and source component ID', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
        { id: 'node2', type: 'element', tag: 'div', children: [] },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');

      const state = useClipboardStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.nodes[0]).toEqual(nodes[0]);
      expect(state.nodes[1]).toEqual(nodes[1]);
      expect(state.sourceComponentId).toBe('component1');
    });

    test('deep clones nodes (not same reference)', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');

      // Mutating original should not affect stored
      nodes[0].id = 'changed';
      expect(useClipboardStore.getState().nodes[0].id).toBe('node1');
    });

    test('clears previous clipboard content', () => {
      const nodes1: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'First' } },
      ];
      const nodes2: NodeModel[] = [
        { id: 'node2', type: 'text', value: { type: 'value', value: 'Second' } },
      ];

      useClipboardStore.getState().copy(nodes1, 'comp1');
      useClipboardStore.getState().copy(nodes2, 'comp2');

      expect(useClipboardStore.getState().nodes).toHaveLength(1);
      expect(useClipboardStore.getState().nodes[0].id).toBe('node2');
      expect(useClipboardStore.getState().sourceComponentId).toBe('comp2');
    });

    test('handles empty nodes array', () => {
      useClipboardStore.getState().copy([], 'component1');

      expect(useClipboardStore.getState().nodes).toHaveLength(0);
      expect(useClipboardStore.getState().sourceComponentId).toBe('component1');
    });
  });

  describe('paste', () => {
    test('returns null when clipboard is empty', () => {
      const result = useClipboardStore.getState().paste();
      expect(result).toBeNull();
    });

    test('returns cloned nodes with new IDs', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
        { id: 'node2', type: 'element', tag: 'div', children: [] },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      const pasted = useClipboardStore.getState().paste();

      expect(pasted).toHaveLength(2);
      expect(pasted![0].id).toBe('uuid-1');
      expect(pasted![1].id).toBe('uuid-2');
    });

    test('does not modify original clipboard nodes', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      useClipboardStore.getState().paste();

      // Clipboard still has original nodes
      expect(useClipboardStore.getState().nodes[0].id).toBe('node1');
    });

    test('updates children references with new IDs', () => {
      const nodes: NodeModel[] = [
        {
          id: 'parent',
          type: 'element',
          tag: 'div',
          children: ['child1', 'child2'],
        },
        { id: 'child1', type: 'text', value: { type: 'value', value: 'Child 1' } },
        { id: 'child2', type: 'text', value: { type: 'value', value: 'Child 2' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      const pasted = useClipboardStore.getState().paste()!;

      // Parent should have updated children references
      const pastedParent = pasted.find(n => n.id === 'uuid-1') as any;
      expect(pastedParent.children).toEqual(['uuid-2', 'uuid-3']);
    });

    test('handles nodes without children property', () => {
      const nodes: NodeModel[] = [
        { id: 'text1', type: 'text', value: { type: 'value', value: 'Hello' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      const pasted = useClipboardStore.getState().paste();

      expect(pasted).toHaveLength(1);
      expect(pasted![0].id).toBe('uuid-1');
      expect('children' in pasted![0]).toBe(false);
    });

    test('handles complex nested structures', () => {
      const nodes: NodeModel[] = [
        {
          id: 'root',
          type: 'element',
          tag: 'div',
          children: ['level1'],
        },
        {
          id: 'level1',
          type: 'element',
          tag: 'section',
          children: ['level2'],
        },
        {
          id: 'level2',
          type: 'text',
          value: { type: 'value', value: 'Deep' },
        },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      const pasted = useClipboardStore.getState().paste()!;

      expect(pasted).toHaveLength(3);
      // root -> level1 -> level2 mapping
      const root = pasted.find(n => n.id === 'uuid-1') as any;
      const level1 = pasted.find(n => n.id === 'uuid-2') as any;

      expect(root.children).toEqual(['uuid-2']);
      expect(level1.children).toEqual(['uuid-3']);
    });
  });

  describe('clear', () => {
    test('clears clipboard content', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      useClipboardStore.getState().clear();

      expect(useClipboardStore.getState().nodes).toHaveLength(0);
      expect(useClipboardStore.getState().sourceComponentId).toBeNull();
    });
  });

  describe('hasContent', () => {
    test('returns false when clipboard is empty', () => {
      expect(useClipboardStore.getState().hasContent()).toBe(false);
    });

    test('returns true when clipboard has nodes', () => {
      const nodes: NodeModel[] = [
        { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
      ];

      useClipboardStore.getState().copy(nodes, 'component1');
      expect(useClipboardStore.getState().hasContent()).toBe(true);
    });
  });
});

describe('readSystemClipboard', () => {
  test('returns null when clipboard API fails', async () => {
    // Override clipboard API temporarily
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: () => Promise.reject(new Error('Not allowed')),
      },
      configurable: true,
    });

    const result = await readSystemClipboard();
    expect(result).toBeNull();

    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });

  test('returns null for invalid JSON', async () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: () => Promise.resolve('not valid json'),
      },
      configurable: true,
    });

    const result = await readSystemClipboard();
    expect(result).toBeNull();

    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });

  test('returns null for wrong type', async () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: () => Promise.resolve(JSON.stringify({ type: 'other-format', nodes: [] })),
      },
      configurable: true,
    });

    const result = await readSystemClipboard();
    expect(result).toBeNull();

    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });

  test('returns parsed data for valid layr-nodes', async () => {
    const nodes: NodeModel[] = [
      { id: 'node1', type: 'text', value: { type: 'value', value: 'Hello' } },
    ];
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: () => Promise.resolve(JSON.stringify({
          type: 'layr-nodes',
          nodes,
          sourceId: 'component1',
        })),
      },
      configurable: true,
    });

    const result = await readSystemClipboard();
    expect(result).toEqual({ nodes, sourceId: 'component1' });

    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });

  test('returns null when nodes is not an array', async () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: () => Promise.resolve(JSON.stringify({
          type: 'layr-nodes',
          nodes: 'not-an-array',
          sourceId: 'component1',
        })),
      },
      configurable: true,
    });

    const result = await readSystemClipboard();
    expect(result).toBeNull();

    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });
});
