import type { Project } from '@layr/types';
import * as fs from 'fs';
import * as path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

export interface LoadedProject {
  id: string;
  project: Project;
  path: string;
}

/**
 * Load a project from the projects directory
 */
export function loadProject(projectId: string): LoadedProject | null {
  const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
  
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
  const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
  
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
