import { create } from 'zustand';
import type { NodeModel } from '@layr/types';

interface ClipboardState {
  nodes: NodeModel[];
  sourceComponentId: string | null;
  
  copy: (nodes: NodeModel[], sourceId: string) => void;
  paste: () => NodeModel[] | null;
  clear: () => void;
  hasContent: () => boolean;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  nodes: [],
  sourceComponentId: null,
  
  copy: (nodes, sourceId) => {
    // Deep clone nodes
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      sourceComponentId: sourceId,
    });
    
    // Also copy to system clipboard as JSON
    try {
      navigator.clipboard.writeText(JSON.stringify({
        type: 'layr-nodes',
        nodes: get().nodes,
        sourceId,
      }));
    } catch (e) {
      console.warn('Could not copy to system clipboard:', e);
    }
  },
  
  paste: () => {
    const { nodes } = get();
    if (nodes.length === 0) return null;
    
    // Return deep cloned nodes with new IDs
    return JSON.parse(JSON.stringify(nodes));
  },
  
  clear: () => set({ nodes: [], sourceComponentId: null }),
  
  hasContent: () => get().nodes.length > 0,
}));

// Read from system clipboard
export async function readSystemClipboard(): Promise<{ nodes: NodeModel[]; sourceId: string } | null> {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    if (data.type === 'layr-nodes' && Array.isArray(data.nodes)) {
      return { nodes: data.nodes, sourceId: data.sourceId };
    }
  } catch (e) {
    // Not valid JSON or not our format
  }
  return null;
}
