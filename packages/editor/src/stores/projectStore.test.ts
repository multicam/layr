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

    test('sets activeComponent to first component', () => {
      const project: Project = {
        project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
        commit: 'initial',
        files: {
          components: {
            about: { name: 'about', route: { path: '/about' }, nodes: {} },
            home: { name: 'home', route: { path: '/' }, nodes: {} },
          },
        },
      };

      useProjectStore.getState().setProject(project);
      expect(useProjectStore.getState().activeComponent).toBe('about');
    });

    test('handles project with no components', () => {
      const project: Project = {
        project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
        commit: 'initial',
        files: { components: {} },
      };

      useProjectStore.getState().setProject(project);
      expect(useProjectStore.getState().activeComponent).toBeNull();
    });

    test('handles project without files', () => {
      const project: Project = {
        project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
        commit: 'initial',
      };

      useProjectStore.getState().setProject(project);
      expect(useProjectStore.getState().activeComponent).toBeNull();
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

  describe('updateComponent', () => {
    test('updates component properties', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().updateComponent('home', { name: 'updated-home' });

      const component = useProjectStore.getState().project?.files?.components?.home;
      expect(component?.name).toBe('updated-home');
    });

    test('does nothing when no project', () => {
      useProjectStore.getState().updateComponent('home', { name: 'updated' });
      // Should not throw
    });

    test('does nothing when component does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().updateComponent('nonexistent', { name: 'updated' });
      // Should not throw or affect other components
      expect(useProjectStore.getState().project?.files?.components?.home.name).toBe('home');
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

    test('adds node at specific index', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      const newNode: NodeModel = {
        id: 'newNode',
        type: 'text',
        value: { type: 'value', value: 'New' },
      };

      useProjectStore.getState().addNode('home', 'root', newNode, 0);

      const children = (useProjectStore.getState().project?.files?.components?.home.nodes.root as any).children;
      expect(children[0]).toBe('newNode');
    });

    test('does nothing when no project', () => {
      const newNode: NodeModel = { id: 'new', type: 'text', value: { type: 'value', value: '' } };
      useProjectStore.getState().addNode('home', 'root', newNode);
      // Should not throw
    });

    test('does nothing when component does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      const newNode: NodeModel = { id: 'new', type: 'text', value: { type: 'value', value: '' } };
      useProjectStore.getState().addNode('nonexistent', 'root', newNode);

      // Should not throw
    });

    test('does nothing when parent node has no children property', () => {
      const project = createTestProject();
      project.files!.components!.home.nodes.textNode = {
        id: 'textNode',
        type: 'text',
        value: { type: 'value', value: 'Text' },
      };
      useProjectStore.getState().setProject(project);

      const newNode: NodeModel = { id: 'new', type: 'text', value: { type: 'value', value: '' } };
      useProjectStore.getState().addNode('home', 'textNode', newNode);

      // Should not throw - text node has no children array
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

    test('removes node and all descendants', () => {
      const project = createTestProject();
      project.files!.components!.home.nodes = {
        root: { id: 'root', type: 'element', tag: 'div', children: ['parent'] },
        parent: { id: 'parent', type: 'element', tag: 'section', children: ['child1', 'child2'] },
        child1: { id: 'child1', type: 'text', value: { type: 'value', value: 'Child 1' } },
        child2: { id: 'child2', type: 'text', value: { type: 'value', value: 'Child 2' } },
      };
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().removeNode('home', 'parent');

      const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
      expect(nodes?.parent).toBeUndefined();
      expect(nodes?.child1).toBeUndefined();
      expect(nodes?.child2).toBeUndefined();
    });

    test('does nothing when no project', () => {
      useProjectStore.getState().removeNode('home', 'text1');
      // Should not throw
    });

    test('does nothing when component does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().removeNode('nonexistent', 'text1');
      // Should not throw
    });
  });

  describe('moveNode', () => {
    test('moves node to new parent', () => {
      const project = createTestProject();
      project.files!.components!.home.nodes = {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child'] },
        container: { id: 'container', type: 'element', tag: 'section', children: [] },
        child: { id: 'child', type: 'text', value: { type: 'value', value: 'Child' } },
      };
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().moveNode('home', 'child', 'container', 0);

      const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
      expect((nodes?.root as any).children).not.toContain('child');
      expect((nodes?.container as any).children).toContain('child');
    });

    test('inserts at correct index', () => {
      const project = createTestProject();
      project.files!.components!.home.nodes = {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child'] },
        container: { id: 'container', type: 'element', tag: 'section', children: ['a', 'b'] },
        child: { id: 'child', type: 'text', value: { type: 'value', value: 'Child' } },
        a: { id: 'a', type: 'text', value: { type: 'value', value: 'A' } },
        b: { id: 'b', type: 'text', value: { type: 'value', value: 'B' } },
      };
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().moveNode('home', 'child', 'container', 1);

      const nodes = useProjectStore.getState().project?.files?.components?.home.nodes;
      expect((nodes?.container as any).children).toEqual(['a', 'child', 'b']);
    });

    test('does nothing when no project', () => {
      useProjectStore.getState().moveNode('home', 'child', 'container', 0);
      // Should not throw
    });

    test('does nothing when component does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().moveNode('nonexistent', 'child', 'container', 0);
      // Should not throw
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

    test('does nothing when no project', () => {
      useProjectStore.getState().updateNode('home', 'text1', { value: { type: 'value', value: '' } });
      // Should not throw
    });

    test('does nothing when component does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().updateNode('nonexistent', 'text1', { value: { type: 'value', value: '' } });
      // Should not throw
    });

    test('does nothing when node does not exist', () => {
      const project = createTestProject();
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().updateNode('home', 'nonexistent', { value: { type: 'value', value: '' } });
      // Should not throw
    });
  });

  describe('setThemeConfig', () => {
    test('sets theme config', () => {
      const project = createTestProject();
      project.files!.config = {};
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().setThemeConfig({
        primary: '#ff0000',
        mode: 'light',
      });

      const config = useProjectStore.getState().project?.files?.config;
      expect(config?.theme).toEqual({ primary: '#ff0000', mode: 'light' });
    });

    test('creates config if it does not exist', () => {
      const project = createTestProject();
      delete project.files!.config;
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().setThemeConfig({
        primary: '#00ff00',
      });

      const config = useProjectStore.getState().project?.files?.config;
      expect(config?.theme).toEqual({ primary: '#00ff00' });
    });

    test('creates files if it does not exist', () => {
      const project: Project = {
        project: { id: 'test', name: 'Test', type: 'app', short_id: 'test' },
        commit: 'initial',
      };
      useProjectStore.getState().setProject(project);

      useProjectStore.getState().setThemeConfig({
        primary: '#0000ff',
      });

      const files = useProjectStore.getState().project?.files;
      expect(files?.config?.theme).toEqual({ primary: '#0000ff' });
    });

    test('does nothing when no project', () => {
      useProjectStore.getState().setThemeConfig({ primary: '#ff0000' });
      // Should not throw
    });
  });
});
