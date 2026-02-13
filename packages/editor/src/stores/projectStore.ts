import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, Component, NodeModel } from '@layr/types';

interface ProjectState {
  project: Project | null;
  activeComponent: string | null;
  
  // Actions
  setProject: (project: Project) => void;
  setActiveComponent: (componentId: string) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  addNode: (componentId: string, parentId: string, node: NodeModel, index?: number) => void;
  removeNode: (componentId: string, nodeId: string) => void;
  moveNode: (componentId: string, nodeId: string, newParentId: string, index: number) => void;
  updateNode: (componentId: string, nodeId: string, updates: Partial<NodeModel>) => void;
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    project: null,
    activeComponent: null,
    
    setProject: (project) => set({ 
      project,
      activeComponent: Object.keys(project.files?.components || {})[0] || null,
    }),
    
    setActiveComponent: (componentId) => set({ activeComponent: componentId }),
    
    updateComponent: (id, updates) => set((state) => {
      if (!state.project) return;
      const component = state.project.files?.components?.[id];
      if (component) {
        Object.assign(component, updates);
      }
    }),
    
    addNode: (componentId, parentId, node, index) => set((state) => {
      if (!state.project) return;
      const component = state.project.files?.components?.[componentId];
      if (!component) return;
      
      // Add node to nodes map
      component.nodes[node.id] = node;
      
      // Add to parent's children
      const parent = component.nodes[parentId];
      if (parent && 'children' in parent) {
        const children = (parent.children as string[]) || [];
        if (index !== undefined) {
          children.splice(index, 0, node.id);
        } else {
          children.push(node.id);
        }
        (parent as any).children = children;
      }
    }),
    
    removeNode: (componentId, nodeId) => set((state) => {
      if (!state.project) return;
      const component = state.project.files?.components?.[componentId];
      if (!component) return;

      // Recursively collect all descendant nodes
      const toRemove = new Set<string>();
      const collect = (id: string) => {
        toRemove.add(id);
        const node = component.nodes[id];
        if (node && 'children' in node && Array.isArray(node.children)) {
          for (const childId of node.children) collect(childId);
        }
      };
      collect(nodeId);

      // Remove from parent's children
      for (const node of Object.values(component.nodes)) {
        if ('children' in node && Array.isArray(node.children)) {
          const idx = node.children.indexOf(nodeId);
          if (idx !== -1) {
            node.children.splice(idx, 1);
          }
        }
      }

      // Remove all collected nodes
      for (const id of toRemove) delete component.nodes[id];
    }),
    
    moveNode: (componentId, nodeId, newParentId, index) => set((state) => {
      if (!state.project) return;
      const component = state.project.files?.components?.[componentId];
      if (!component) return;
      
      // Remove from old parent
      for (const node of Object.values(component.nodes)) {
        if ('children' in node && Array.isArray(node.children)) {
          const idx = node.children.indexOf(nodeId);
          if (idx !== -1) {
            node.children.splice(idx, 1);
          }
        }
      }
      
      // Add to new parent
      const newParent = component.nodes[newParentId];
      if (newParent && 'children' in newParent) {
        const children = (newParent.children as string[]) || [];
        children.splice(index, 0, nodeId);
        (newParent as any).children = children;
      }
    }),
    
    updateNode: (componentId, nodeId, updates) => set((state) => {
      if (!state.project) return;
      const component = state.project.files?.components?.[componentId];
      if (!component) return;
      
      const node = component.nodes[nodeId];
      if (node) {
        Object.assign(node, updates);
      }
    }),
  }))
);
