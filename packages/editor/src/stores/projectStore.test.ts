import { describe, test, expect, beforeEach } from 'bun:test';
import { useProjectStore } from './projectStore';
import type { Project, Component, NodeModel } from '@layr/types';

const createTestProject = (): Project => ({
  project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
  commit: 'initial',
  files: {
    components: {
      home: {
        name: 'home',
        route: { path: '/' },
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['text1'] },
          text1: { id: 'text1', type: 'text', value: { type: 'value', value: 'Hello' } },
        },
      },
    },
  },
});

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, activeComponent: null });
  });

  describe('setProject', () => {
    test('sets project and activeComponent', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);
      
      expect(useProjectStore.getState().project).toBe(project);
      expect(useProjectStore.getState().activeComponent).toBe('home');
    });
  });

  describe('setActiveComponent', () => {
    test('changes active component', () => {
      const project = createTestProject();
      project.files!.components!.about = {
        name: 'about',
        route: { path: '/about' },
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
      };
      
      useProjectStore.getState().setProject(project);
      useProjectStore.getState().setActiveComponent('about');
      
      expect(useProjectStore.getState().activeComponent).toBe('about');
    });
  });

  describe('addNode', () => {
    test('adds node to component', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);
      
      const newNode: NodeModel = {
        id: 'newNode',
        type: 'text',
        value: { type: 'value', value: 'New text' },
      };
      
      useProjectStore.getState().addNode('home', 'root', newNode);
      
      const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
      expect(nodes?.newNode).toBeDefined();
      expect((nodes?.root as any).children).toContain('newNode');
    });
  });

  describe('removeNode', () => {
    test('removes node from component', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);
      
      useProjectStore.getState().removeNode('home', 'text1');
      
      const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
      expect(nodes?.text1).toBeUndefined();
      expect((nodes?.root as any).children).not.toContain('text1');
    });
  });

  describe('updateNode', () => {
    test('updates node properties', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);
      
      useProjectStore.getState().updateNode('home', 'text1', {
        value: { type: 'value', value: 'Updated' },
      });
      
      const node = useProjectStore.getState().project?.files?.components?.home.nodes.text1;
      expect((node as any).value.value).toBe('Updated');
    });
  });
});
