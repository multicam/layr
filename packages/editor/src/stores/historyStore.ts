import { create } from 'zustand';
import type { Project } from '@layr/types';
import { useProjectStore } from './projectStore';

interface HistoryState {
  past: Project[];
  future: Project[];
  isRecording: boolean;
  
  undo: () => void;
  redo: () => void;
  push: (state: Project) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  isRecording: true,
  
  undo: () => {
    const { past, future, isRecording } = get();
    if (past.length === 0 || !isRecording) return;
    
    const current = useProjectStore.getState().project;
    if (!current) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    set({
      past: newPast,
      future: [current, ...future],
    });
    
    useProjectStore.getState().setProject(previous);
  },
  
  redo: () => {
    const { past, future, isRecording } = get();
    if (future.length === 0 || !isRecording) return;
    
    const current = useProjectStore.getState().project;
    if (!current) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    set({
      past: [...past, current],
      future: newFuture,
    });
    
    useProjectStore.getState().setProject(next);
  },
  
  push: (state) => {
    const { past, future, isRecording } = get();
    if (!isRecording) return;
    
    // Clear future on new action
    set({
      past: [...past, state].slice(-MAX_HISTORY),
      future: [],
    });
  },
  
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  
  clear: () => set({ past: [], future: [] }),
  
  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false }),
}));

// Hook to track project changes
export function useHistoryTracking() {
  const project = useProjectStore(s => s.project);
  const push = useHistoryStore(s => s.push);
  
  // This would be called on project changes
  const saveSnapshot = () => {
    if (project) {
      push(JSON.parse(JSON.stringify(project)));
    }
  };
  
  return { saveSnapshot };
}
