import type { Project } from '@layr/types';
import * as fs from 'fs';
import * as path from 'path';

// Resolve relative to monorepo root (packages/backend/src/loader -> root)
const PROJECTS_DIR = path.join(import.meta.dir, '..', '..', '..', '..', 'projects');

export interface LoadedProject {
  id: string;
  project: Project;
  path: string;
}

/**
 * Load a project from the projects directory
 */
export function loadProject(projectId: string): LoadedProject | null {
  // Reject path traversal attempts
  if (projectId.includes('/') || projectId.includes('\\') || projectId === '..' || projectId === '.') {
    return null;
  }

  const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');

  // Defense-in-depth: verify resolved path stays within PROJECTS_DIR
  const resolvedProjectsDir = path.resolve(PROJECTS_DIR);
  const resolvedProjectPath = path.resolve(projectPath);
  if (!resolvedProjectPath.startsWith(resolvedProjectsDir + '/')) {
    return null;
  }

  if (!fs.existsSync(projectPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(projectPath, 'utf-8');
    const project = JSON.parse(content) as Project;

    return {
      id: projectId,
      project,
      path: projectPath,
    };
  } catch (e) {
    console.error(`Failed to load project ${projectId}:`, e);
    return null;
  }
}

/**
 * List available projects
 */
export function listProjects(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(PROJECTS_DIR)
    .filter(name => {
      const projectPath = path.join(PROJECTS_DIR, name, 'project.json');
      return fs.existsSync(projectPath);
    });
}

/**
 * Get the project modification time
 */
export function getProjectMtime(projectId: string): number {
  // Reject path traversal attempts
  if (projectId.includes('/') || projectId.includes('\\') || projectId === '..' || projectId === '.') {
    return 0;
  }

  const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');

  // Defense-in-depth: verify resolved path stays within PROJECTS_DIR
  const resolvedProjectsDir = path.resolve(PROJECTS_DIR);
  const resolvedProjectPath = path.resolve(projectPath);
  if (!resolvedProjectPath.startsWith(resolvedProjectsDir + '/')) {
    return 0;
  }

  if (!fs.existsSync(projectPath)) {
    return 0;
  }

  try {
    const stat = fs.statSync(projectPath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}
