/**
 * Drag Ended Operations
 * Finalizes drag and sends results to editor
 */

import type { DragState } from './types';
import { tryStartViewTransition } from '@layr/runtime';
import { hideDropHighlight, hideContainerHighlight } from './dropHighlight';

/**
 * Finalize drag operation
 */
export function dragEnded(
  state: DragState,
  options?: { canceled?: boolean }
): { copy: boolean; parent: string | null; index: number } | null {
  state.destroying = true;
  
  const { canceled = false } = options || {};
  const copy = !!state.copy;
  
  // Determine final position
  let parent: string | null = null;
  let index = 0;
  
  if (!canceled) {
    if (state.mode === 'reorder') {
      // Get final position in container
      const siblings = Array.from(state.initialContainer.children);
      const currentIndex = siblings.indexOf(state.element);
      parent = state.initialContainer.getAttribute('data-id');
      index = currentIndex;
    } else if (state.insertAreas && state.selectedInsertAreaIndex !== undefined) {
      // Get insert position
      const area = state.insertAreas[state.selectedInsertAreaIndex];
      if (area) {
        parent = area.parent.getAttribute('data-id');
        index = area.index;
      }
    }
  }
  
  // Animate to final position
  finalizeWithTransition(state, canceled);
  
  // Clean up
  cleanup(state);
  
  // Return result for PostMessage
  if (canceled) {
    return null;
  }
  
  return { copy, parent, index };
}

/**
 * Finalize with View Transition
 */
function finalizeWithTransition(state: DragState, canceled: boolean): void {
  // Assign transition names
  const visibleSiblings = getVisibleSiblings(state);
  assignTransitionNames(state.element, visibleSiblings, state.repeatedNodes);
  
  tryStartViewTransition(() => {
    if (canceled) {
      // Restore to initial position
      state.initialContainer.insertBefore(state.element, state.initialNextSibling);
      
      // Remove copy if exists
      if (state.copy) {
        state.copy.remove();
      }
    } else if (state.mode === 'insert') {
      // Insert at selected area
      const area = state.insertAreas?.[state.selectedInsertAreaIndex ?? -1];
      if (area) {
        const targetChild = area.parent.children[area.index];
        area.parent.insertBefore(state.element, targetChild);
      }
    }
    
    // Reset element styles
    state.element.style.position = '';
    state.element.style.zIndex = '';
    state.element.style.transform = '';
    state.element.classList.remove('__drag-mode--reorder', '__drag-mode--move');
  }).finished.finally(() => {
    // Clean up transition names
    cleanupTransitionNames(state.element, visibleSiblings, state.repeatedNodes);
  });
}

/**
 * Get visible siblings for transition
 */
function getVisibleSiblings(state: DragState): HTMLElement[] {
  const container = state.mode === 'reorder' ? state.initialContainer : document.body;
  const siblings: HTMLElement[] = [];
  
  for (const child of Array.from(container.children)) {
    if (child === state.element) continue;
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.id?.includes(')')) continue;
    
    const rect = child.getBoundingClientRect();
    const isInViewport = 
      rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
    
    if (isInViewport) {
      siblings.push(child);
    }
  }
  
  return siblings;
}

/**
 * Assign view-transition-names
 */
function assignTransitionNames(
  element: HTMLElement,
  siblings: HTMLElement[],
  repeatedNodes: HTMLElement[]
): void {
  element.style.viewTransitionName = 'dropped-item-self';
  siblings.forEach((sibling, i) => {
    sibling.style.viewTransitionName = `dropped-item-sibling-${i}`;
  });
  repeatedNodes.forEach((node, i) => {
    node.style.viewTransitionName = `dropped-item-repeated-${i}`;
  });
}

/**
 * Clean up view-transition-names
 */
function cleanupTransitionNames(
  element: HTMLElement,
  siblings: HTMLElement[],
  repeatedNodes: HTMLElement[]
): void {
  element.style.viewTransitionName = '';
  siblings.forEach(sibling => {
    sibling.style.viewTransitionName = '';
  });
  repeatedNodes.forEach(node => {
    node.style.viewTransitionName = '';
  });
}

/**
 * Clean up drag state
 */
function cleanup(state: DragState): void {
  // Hide highlights
  hideDropHighlight();
  hideContainerHighlight(state.initialContainer);
  
  // Clean up repeated nodes
  for (const node of state.repeatedNodes) {
    node.classList.remove('__drag-repeat-node');
    node.style.removeProperty('--drag-repeat-node-width');
    node.style.removeProperty('--drag-repeat-node-height');
    node.style.removeProperty('--drag-repeat-node-translate');
    node.style.removeProperty('--drag-repeat-node-rotate');
    node.style.removeProperty('--drag-follow-x');
    node.style.removeProperty('--drag-follow-y');
    node.style.opacity = '';
  }
  
  // Clean up copy
  if (state.copy) {
    state.copy.remove();
  }
}
