/**
 * Drag Reorder Operations
 * Handles reordering within container using View Transitions
 */

import type { DragState, Point } from './types';
import { tryStartViewTransition } from '@layr/runtime';

/**
 * Handle reordering within original container
 */
export function dragReorder(
  state: DragState,
  cursor: Point
): void {
  if (state.mode !== 'reorder' || state.isTransitioning) return;
  
  // Find best permutation using overlap detection
  const bestPermutation = findBestPermutation(state, cursor);
  
  if (!bestPermutation) return;
  
  // Check if we need to move
  const currentNextSibling = state.element.nextElementSibling;
  if (currentNextSibling === bestPermutation.nextSibling) return;
  
  // Animate reorder with View Transition
  state.isTransitioning = true;
  
  // Assign view-transition-names to visible siblings
  const visibleSiblings = getVisibleSiblings(state.element, state.initialContainer);
  assignTransitionNames(state.element, visibleSiblings, 'item');
  
  tryStartViewTransition(() => {
    // Move element to new position
    state.initialContainer.insertBefore(state.element, bestPermutation.nextSibling);
    
    // Update offset to maintain visual position
    const newRect = state.element.getBoundingClientRect();
    state.offset = {
      x: cursor.x - newRect.left,
      y: cursor.y - newRect.top,
    };
  }).finished.finally(() => {
    // Clean up transition names
    cleanupTransitionNames(state.element, visibleSiblings);
    state.isTransitioning = false;
  });
}

/**
 * Find best permutation using overlap detection
 */
function findBestPermutation(
  state: DragState,
  cursor: Point
): { nextSibling: Node | null; rect: DOMRect } | null {
  const elementCenter = {
    x: cursor.x - state.offset.x + state.element.offsetWidth / 2,
    y: cursor.y - state.offset.y + state.element.offsetHeight / 2,
  };
  
  const padding = 100;
  let best: { nextSibling: Node | null; rect: DOMRect; distance: number } | null = null;
  
  for (const perm of state.reorderPermutations) {
    // Check overlap with padding
    const inHorizontalRange = 
      elementCenter.x >= perm.rect.left - padding &&
      elementCenter.x <= perm.rect.right + padding;
    const inVerticalRange = 
      elementCenter.y >= perm.rect.top - padding &&
      elementCenter.y <= perm.rect.bottom + padding;
    
    if (!inHorizontalRange || !inVerticalRange) continue;
    
    // Calculate distance to center
    const permCenter = {
      x: perm.rect.left + perm.rect.width / 2,
      y: perm.rect.top + perm.rect.height / 2,
    };
    const distance = Math.sqrt(
      Math.pow(elementCenter.x - permCenter.x, 2) +
      Math.pow(elementCenter.y - permCenter.y, 2)
    );
    
    if (!best || distance < best.distance) {
      best = { ...perm, distance };
    }
  }
  
  return best;
}

/**
 * Get visible siblings in viewport
 */
function getVisibleSiblings(element: HTMLElement, container: HTMLElement): HTMLElement[] {
  const siblings: HTMLElement[] = [];
  const rect = container.getBoundingClientRect();
  
  for (const child of Array.from(container.children)) {
    if (child === element) continue;
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.id?.includes(')')) continue; // Skip repeated items
    
    const childRect = child.getBoundingClientRect();
    const isInViewport = 
      childRect.bottom > 0 && childRect.top < window.innerHeight &&
      childRect.right > 0 && childRect.left < window.innerWidth;
    
    if (isInViewport) {
      siblings.push(child);
    }
  }
  
  return siblings;
}

/**
 * Assign view-transition-names to elements
 */
function assignTransitionNames(
  element: HTMLElement,
  siblings: HTMLElement[],
  prefix: string
): void {
  element.style.viewTransitionName = `${prefix}-dragged`;
  siblings.forEach((sibling, i) => {
    sibling.style.viewTransitionName = `${prefix}-${i}`;
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
