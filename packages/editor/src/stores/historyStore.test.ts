import { describe, test, expect, beforeEach } from 'bun:test';
import { useHistoryStore } from './historyStore';
import { useProjectStore } from './projectStore';
import type { Project } from '@layr/types';

const createTestProject = (name: string): Project => ({
  project: { id: 'test', name, type: 'app', short_id: 'test' },
  commit: 'initial',
  files: {
    components: {
      home: {
        name: 'home',
        route: { path: '/' },
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: [] },
        },
      },
    },
  },
});

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ past: [], future: [], isRecording: true });
    useProjectStore.setState({ project: null, activeComponent: null });
  });

  describe('push', () => {
    test('adds state to past', () => {
      const project = createTestProject('Project1');
      useHistoryStore.getState().push(project);

      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().past[0]).toEqual(project);
    });

    test('clears future on new push', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useHistoryStore.getState().push(project1);
      useHistoryStore.getState().push(project2);

      // Simulate undo creating future
      useHistoryStore.setState({ past: [], future: [project1] });

      const project3 = createTestProject('Project3');
      useHistoryStore.getState().push(project3);

      expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    test('does not push when not recording', () => {
      useHistoryStore.setState({ isRecording: false });

      const project = createTestProject('Project1');
      useHistoryStore.getState().push(project);

      expect(useHistoryStore.getState().past).toHaveLength(0);
    });

    test('limits history to MAX_HISTORY', () => {
      const store = useHistoryStore.getState();

      // Push 60 items (MAX_HISTORY is 50)
      for (let i = 0; i < 60; i++) {
        store.push(createTestProject(`Project${i}`));
      }

      expect(useHistoryStore.getState().past).toHaveLength(50);
      // Should keep the most recent 50
      expect(useHistoryStore.getState().past[0].project.name).toBe('Project10');
      expect(useHistoryStore.getState().past[49].project.name).toBe('Project59');
    });
  });

  describe('undo', () => {
    test('does nothing when past is empty', () => {
      useProjectStore.getState().setProject(createTestProject('Current'));
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().future).toHaveLength(0);
      expect(useProjectStore.getState().project?.project.name).toBe('Current');
    });

    test('does nothing when not recording', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useProjectStore.getState().setProject(project2);
      useHistoryStore.getState().push(project1);
      useHistoryStore.setState({ isRecording: false });

      useHistoryStore.getState().undo();

      expect(useProjectStore.getState().project?.project.name).toBe('Project2');
    });

    test('does nothing when no current project', () => {
      const project1 = createTestProject('Project1');
      useHistoryStore.getState().push(project1);

      // No project set in projectStore
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().past).toHaveLength(1);
    });

    test('restores previous state and adds current to future', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useProjectStore.getState().setProject(project2);
      useHistoryStore.getState().push(project1);

      useHistoryStore.getState().undo();

      expect(useProjectStore.getState().project?.project.name).toBe('Project1');
      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(1);
      expect(useHistoryStore.getState().future[0].project.name).toBe('Project2');
    });

    test('handles multiple undos', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');
      const project3 = createTestProject('Project3');

      useHistoryStore.getState().push(project1);
      useHistoryStore.getState().push(project2);
      useProjectStore.getState().setProject(project3);

      useHistoryStore.getState().undo();
      expect(useProjectStore.getState().project?.project.name).toBe('Project2');

      useHistoryStore.getState().undo();
      expect(useProjectStore.getState().project?.project.name).toBe('Project1');
    });
  });

  describe('redo', () => {
    test('does nothing when future is empty', () => {
      useProjectStore.getState().setProject(createTestProject('Current'));
      useHistoryStore.getState().redo();

      expect(useProjectStore.getState().project?.project.name).toBe('Current');
    });

    test('does nothing when not recording', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useProjectStore.getState().setProject(project1);
      useHistoryStore.setState({ future: [project2], isRecording: false });

      useHistoryStore.getState().redo();

      expect(useProjectStore.getState().project?.project.name).toBe('Project1');
    });

    test('does nothing when no current project', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useHistoryStore.setState({ future: [project2] });
      // No current project in projectStore

      useHistoryStore.getState().redo();

      expect(useHistoryStore.getState().future).toHaveLength(1);
    });

    test('restores next state and adds current to past', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');

      useProjectStore.getState().setProject(project1);
      useHistoryStore.setState({ past: [], future: [project2] });

      useHistoryStore.getState().redo();

      expect(useProjectStore.getState().project?.project.name).toBe('Project2');
      expect(useHistoryStore.getState().future).toHaveLength(0);
      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().past[0].project.name).toBe('Project1');
    });

    test('handles multiple redos', () => {
      const project1 = createTestProject('Project1');
      const project2 = createTestProject('Project2');
      const project3 = createTestProject('Project3');

      useProjectStore.getState().setProject(project1);
      useHistoryStore.setState({ future: [project2, project3] });

      useHistoryStore.getState().redo();
      expect(useProjectStore.getState().project?.project.name).toBe('Project2');

      useHistoryStore.getState().redo();
      expect(useProjectStore.getState().project?.project.name).toBe('Project3');
    });
  });

  describe('canUndo', () => {
    test('returns false when past is empty', () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false);
    });

    test('returns true when past has items', () => {
      useHistoryStore.getState().push(createTestProject('Project1'));
      expect(useHistoryStore.getState().canUndo()).toBe(true);
    });
  });

  describe('canRedo', () => {
    test('returns false when future is empty', () => {
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });

    test('returns true when future has items', () => {
      useHistoryStore.setState({ future: [createTestProject('Project1')] });
      expect(useHistoryStore.getState().canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    test('clears past and future', () => {
      useHistoryStore.getState().push(createTestProject('Project1'));
      useHistoryStore.setState({ future: [createTestProject('Project2')] });

      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    test('does not affect isRecording', () => {
      useHistoryStore.setState({ isRecording: false });
      useHistoryStore.getState().push(createTestProject('Project1'));

      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().isRecording).toBe(false);
    });
  });

  describe('startRecording / stopRecording', () => {
    test('startRecording enables recording', () => {
      useHistoryStore.setState({ isRecording: false });
      useHistoryStore.getState().startRecording();

      expect(useHistoryStore.getState().isRecording).toBe(true);
    });

    test('stopRecording disables recording', () => {
      useHistoryStore.setState({ isRecording: true });
      useHistoryStore.getState().stopRecording();

      expect(useHistoryStore.getState().isRecording).toBe(false);
    });
  });
});
