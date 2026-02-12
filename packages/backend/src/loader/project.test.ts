import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { loadProject, listProjects, getProjectMtime } from './project';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PROJECTS_DIR = path.join(process.cwd(), 'projects');
const TEST_PROJECT_PATH = path.join(TEST_PROJECTS_DIR, 'test-project');
const TEST_PROJECT_FILE = path.join(TEST_PROJECT_PATH, 'project.json');

const testProject = {
  project: {
    id: 'test-id',
    name: 'Test Project',
    type: 'app',
    short_id: 'test',
  },
  commit: 'initial',
  files: {
    components: {
      'home': {
        name: 'home',
        route: { path: '/' },
        nodes: {},
      },
      'about': {
        name: 'about',
        route: { path: '/about' },
        nodes: {},
      },
    },
  },
};

describe('project loader', () => {
  beforeAll(() => {
    // Create test project
    if (!fs.existsSync(TEST_PROJECT_PATH)) {
      fs.mkdirSync(TEST_PROJECT_PATH, { recursive: true });
    }
    fs.writeFileSync(TEST_PROJECT_FILE, JSON.stringify(testProject));
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(TEST_PROJECT_FILE)) {
      fs.unlinkSync(TEST_PROJECT_FILE);
    }
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      fs.rmdirSync(TEST_PROJECT_PATH);
    }
  });

  describe('loadProject', () => {
    test('loads existing project', () => {
      const result = loadProject('test-project');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-project');
      expect(result?.project.project.name).toBe('Test Project');
    });

    test('returns null for non-existent project', () => {
      const result = loadProject('nonexistent');
      expect(result).toBeNull();
    });

    test('returns project path', () => {
      const result = loadProject('test-project');
      expect(result?.path).toContain('test-project');
    });
  });

  describe('listProjects', () => {
    test('includes test-project', () => {
      const projects = listProjects();
      expect(projects).toContain('test-project');
    });

    test('returns array', () => {
      const projects = listProjects();
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe('getProjectMtime', () => {
    test('returns modification time', () => {
      const mtime = getProjectMtime('test-project');
      expect(mtime).toBeGreaterThan(0);
    });

    test('returns 0 for non-existent project', () => {
      const mtime = getProjectMtime('nonexistent');
      expect(mtime).toBe(0);
    });
  });
});
