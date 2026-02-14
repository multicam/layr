/**
 * Drag Move Operations
 * Handles cross-container insertion using View Transitions
 */

import type { DragState, Point, InsertArea } from './types';
import { getInsertAreas, findNearestLine } from './getInsertAreas';
import { showDropHighlight, hideDropHighlight, showContainerHighlight } from './dropHighlight';
import { tryStartViewTransition } from '@layr/runtime';

const ELEMENT_COLOR = '#2563EB';
const COMPONENT_COLOR = '#D946EF';

/**
 * Handle insert mode (cross-container)
 */
export function dragMove(
  state: DragState,
  cursor: Point
): void {
  if (state.mode !== 'insert') return;
  
  // Lazy-load insert areas on first call
  if (!state.insertAreas) {
    state.insertAreas = getInsertAreas(state.element, state.initialContainer);
  }
  
  // Find nearest line
  const nearest = findNearestLine(cursor, state.insertAreas);
  
  if (!nearest) return;
  
  // Update selected insert area
  state.selectedInsertAreaIndex = state.insertAreas.indexOf(nearest.area);
  
  // Show container highlight
  const color = state.elementType === 'component' ? COMPONENT_COLOR : ELEMENT_COLOR;
  showContainerHighlight(nearest.area.parent, color);
  
  // Show drop highlight
  showDropHighlight(nearest.area, color);
}

/**
 * Switch from reorder to insert mode
 */
export function switchToInsertMode(state: DragState): void {
  if (state.mode === 'insert') return;
  
  state.mode = 'insert';
  
  // Calculate insert areas
  state.insertAreas = getInsertAreas(state.element, state.initialContainer);
  
  // Move element to body
  document.body.appendChild(state.element);
  state.element.classList.add('__drag-mode--move');
  state.element.classList.remove('__drag-mode--reorder');
  
  // Set absolute positioning
  state.element.style.position = 'fixed';
  state.element.style.zIndex = '9999';
  
  // Reduce repeated nodes opacity
  for (const node of state.repeatedNodes) {
    node.style.opacity = '0.2';
  }
}

/**
 * Switch from insert to reorder mode
 */
export function switchToReorderMode(state: DragState): void {
  if (state.mode === 'reorder') return;
  
  state.mode = 'reorder';
  state.insertAreas = undefined;
  
  // Move element back to initial container
  state.initialContainer.insertBefore(state.element, state.initialNextSibling);
  state.element.classList.add('__drag-mode--reorder');
  state.element.classList.remove('__drag-mode--move');
  
  // Reset positioning
  state.element.style.position = '';
  state.element.style.zIndex = '';
  
  // Restore repeated nodes opacity
  for (let i = 0; i < Math.min(3, state.repeatedNodes.length); i++) {
    state.repeatedNodes[i].style.opacity = '1';
  }
  
  hideDropHighlight();
}

/**
 * Finalize insert at drop location
 */
export function finalizeInsert(
  state: DragState,
  canceled: boolean
): { parent: string | null; index: number } | null {
  if (canceled || state.mode !== 'insert') return null;
  
  const selectedArea = state.insertAreas?.[state.selectedInsertAreaIndex ?? -1];
  if (!selectedArea) return null;
  
  return {
    parent: selectedArea.parent.getAttribute('data-id'),
    index: selectedArea.index,
  };
}

/**
 * Animate insert with View Transition
 */
export function animateInsert(
  state: DragState,
  targetParent: HTMLElement,
  targetIndex: number
): Promise<void> {
  return new Promise((resolve) => {
    // Assign transition names
    const visibleSiblings = getVisibleSiblings(targetParent);
    assignTransitionNames(state.element, visibleSiblings, 'insert');
    
    tryStartViewTransition(() => {
      // Insert at target position
      const targetChild = targetParent.children[targetIndex];
      targetParent.insertBefore(state.element, targetChild);
      
      // Reset positioning
      state.element.style.position = '';
      state.element.style.zIndex = '';
      state.element.style.transform = '';
    }).finished.finally(() => {
      // Clean up
      cleanupTransitionNames(state.element, visibleSiblings);
      hideDropHighlight();
      resolve();
    });
  });
}

/**
 * Get visible siblings in target container
 */
function getVisibleSiblings(container: HTMLElement): HTMLElement[] {
  const siblings: HTMLElement[] = [];
  
  for (const child of Array.from(container.children)) {
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
  prefix: string
): void {
  element.style.viewTransitionName = `${prefix}-self`;
  siblings.forEach((sibling, i) => {
    sibling.style.viewTransitionName = `${prefix}-sibling-${i}`;
  });
}

/**
 * Clean up view-transition-names
 */
function cleanupTransitionNames(
  element: HTMLElement,
  siblings: HTMLElement[]
): void {
  element.style.viewTransitionName = '';
  siblings.forEach(sibling => {
    sibling.style.viewTransitionName = '';
  });
}
