import { useEffect } from 'react';
import { useHistoryStore, useSelectionStore, useClipboardStore, useProjectStore } from '../stores';

export function useKeyboardShortcuts() {
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  const canUndo = useHistoryStore(s => s.canUndo);
  const canRedo = useHistoryStore(s => s.canRedo);
  
  const clearSelection = useSelectionStore(s => s.clearSelection);
  const selectedIds = useSelectionStore(s => s.selectedIds);
  const removeNode = useProjectStore(s => s.removeNode);
  const activeComponent = useProjectStore(s => s.activeComponent);
  
  const copy = useClipboardStore(s => s.copy);
  const paste = useClipboardStore(s => s.paste);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      const isMeta = e.metaKey || e.ctrlKey;
      
      // Undo: Ctrl/Cmd + Z
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }
      
      // Redo: Ctrl/Cmd + Shift + Z
      if (isMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (activeComponent && selectedIds.length > 0) {
          for (const nodeId of selectedIds) {
            removeNode(activeComponent, nodeId);
          }
          clearSelection();
        }
        return;
      }
      
      // Copy: Ctrl/Cmd + C
      if (isMeta && e.key === 'c') {
        e.preventDefault();
        // TODO: Copy selected nodes
        return;
      }
      
      // Paste: Ctrl/Cmd + V
      if (isMeta && e.key === 'v') {
        e.preventDefault();
        // TODO: Paste nodes
        return;
      }
      
      // Escape - deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, clearSelection, selectedIds, removeNode, activeComponent]);
}
