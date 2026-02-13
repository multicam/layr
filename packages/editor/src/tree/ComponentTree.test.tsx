import { describe, test, expect, beforeEach } from 'bun:test';
import { useProjectStore, useSelectionStore } from '../stores';

// Test store state instead of component rendering (avoids DnD complexity)
describe('ComponentTree state', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, activeComponent: null });
    useSelectionStore.setState({ selectedIds: [], hoveredId: null });
  });

  test('handles no project state', () => {
    expect(useProjectStore.getState().project).toBeNull();
  });

  test('loads project correctly', () => {
    const project = {
      project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
      commit: 'initial',
      files: {
        components: {
          home: {
            name: 'home',
            nodes: {
              root: { id: 'root', type: 'element', tag: 'div', children: [] },
            },
          },
        },
      },
    };

    useProjectStore.getState().setProject(project);
    
    expect(useProjectStore.getState().project).not.toBeNull();
    expect(useProjectStore.getState().activeComponent).toBe('home');
    
    const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
    expect(nodes?.root).toBeDefined();
    expect((nodes?.root as any).tag).toBe('div');
  });

  test('tree node selection works', () => {
    useSelectionStore.getState().select('root');
    expect(useSelectionStore.getState().selectedIds).toContain('root');
    
    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selectedIds).toEqual([]);
  });

  test('tree node hover works', () => {
    useSelectionStore.getState().hover('root');
    expect(useSelectionStore.getState().hoveredId).toBe('root');
    
    useSelectionStore.getState().hover(null);
    expect(useSelectionStore.getState().hoveredId).toBeNull();
  });
});
