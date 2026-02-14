import { useEffect } from 'react';
import { useHistoryStore, useSelectionStore, useClipboardStore, useProjectStore } from '../stores';
import type { NodeModel } from '@layr/types';

export function useKeyboardShortcuts() {
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  const canUndo = useHistoryStore(s => s.canUndo);
  const canRedo = useHistoryStore(s => s.canRedo);
  
  const clearSelection = useSelectionStore(s => s.clearSelection);
  const selectMultiple = useSelectionStore(s => s.selectMultiple);
  const selectedIds = useSelectionStore(s => s.selectedIds);
  
  const removeNode = useProjectStore(s => s.removeNode);
  const addNode = useProjectStore(s => s.addNode);
  const activeComponent = useProjectStore(s => s.activeComponent);
  const project = useProjectStore(s => s.project);
  
  const copyToClipboard = useClipboardStore(s => s.copy);
  const pasteFromClipboard = useClipboardStore(s => s.paste);
  const hasClipboardContent = useClipboardStore(s => s.hasContent);
  
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
      if (isMeta && e.key === 'c' && selectedIds.length > 0 && activeComponent) {
        e.preventDefault();
        const component = project?.files?.components?.[activeComponent];
        if (component) {
          const nodesToCopy = selectedIds
            .map(id => component.nodes[id])
            .filter((n): n is NodeModel => !!n);
          if (nodesToCopy.length > 0) {
            copyToClipboard(nodesToCopy, activeComponent);
          }
        }
        return;
      }
      
      // Paste: Ctrl/Cmd + V
      if (isMeta && e.key === 'v' && activeComponent) {
        e.preventDefault();
        const pastedNodes = pasteFromClipboard();
        if (pastedNodes && pastedNodes.length > 0) {
          // Find a parent to paste into (selected node or root)
          const component = project?.files?.components?.[activeComponent];
          let parentId = 'root';
          
          if (selectedIds.length > 0 && component) {
            const selectedNode = component.nodes[selectedIds[0]];
            if (selectedNode && 'children' in selectedNode) {
              parentId = selectedIds[0];
            }
          }
          
          // Add nodes and select them
          const newIds: string[] = [];
          for (const node of pastedNodes) {
            addNode(activeComponent, parentId, node);
            newIds.push(node.id!);
          }
          selectMultiple(newIds);
        }
        return;
      }
      
      // Duplicate: Ctrl/Cmd + D
      if (isMeta && e.key === 'd' && selectedIds.length > 0 && activeComponent) {
        e.preventDefault();
        const component = project?.files?.components?.[activeComponent];
        if (component) {
          const nodesToCopy = selectedIds
            .map(id => component.nodes[id])
            .filter((n): n is NodeModel => !!n);
          
          if (nodesToCopy.length > 0) {
            // Find parent of first selected node
            let parentId = 'root';
            for (const [id, node] of Object.entries(component.nodes)) {
              if ('children' in node && Array.isArray(node.children)) {
                if (node.children.includes(selectedIds[0])) {
                  parentId = id;
                  break;
                }
              }
            }
            
            // Copy and paste immediately
            copyToClipboard(nodesToCopy, activeComponent);
            const pastedNodes = pasteFromClipboard();
            if (pastedNodes) {
              const newIds: string[] = [];
              for (const node of pastedNodes) {
                addNode(activeComponent, parentId, node);
                newIds.push(node.id!);
              }
              selectMultiple(newIds);
            }
          }
        }
        return;
      }
      
      // Escape - deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }
      
      // Arrow keys for nudging (future enhancement - would need to update styles)
      // if (!isMeta && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      //   e.preventDefault();
      //   // Nudge selected element by 1px (or 10px with shift)
      //   return;
      // }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, redo, canUndo, canRedo, 
    clearSelection, selectMultiple, selectedIds, 
    removeNode, addNode, activeComponent, project,
    copyToClipboard, pasteFromClipboard
  ]);
}
