import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselect: (id: string) => void;
  clearSelection: () => void;
  hover: (id: string | null) => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: [],
  hoveredId: null,
  
  select: (id, additive = false) => set((state) => {
    if (additive) {
      const alreadySelected = state.selectedIds.includes(id);
      if (alreadySelected) {
        return { selectedIds: state.selectedIds.filter(i => i !== id) };
      }
      return { selectedIds: [...state.selectedIds, id] };
    }
    return { selectedIds: [id] };
  }),
  
  selectMultiple: (ids) => set({ selectedIds: ids }),
  
  deselect: (id) => set((state) => ({
    selectedIds: state.selectedIds.filter(i => i !== id),
  })),
  
  clearSelection: () => set({ selectedIds: [] }),
  
  hover: (id) => set({ hoveredId: id }),
  
  isSelected: (id) => get().selectedIds.includes(id),
}));

// Selector hooks
export const useSelectedIds = () => useSelectionStore(s => s.selectedIds);
export const useHoveredId = () => useSelectionStore(s => s.hoveredId);
export const useIsSelected = (id: string) => useSelectionStore(s => s.selectedIds.includes(id));
export const useIsHovered = (id: string) => useSelectionStore(s => s.hoveredId === id);
