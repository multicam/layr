/**
 * Drag Started Operations
 * Initializes drag state and calculates permutations
 */

import type { DragState, ElementType } from './types';
import { showDropHighlight, showContainerHighlight } from './dropHighlight';

/**
 * Initialize drag operation
 */
export function dragStarted(
  element: HTMLElement,
  cursor: { x: number; y: number },
  options?: { asCopy?: boolean; altKey?: boolean }
): DragState {
  // Collect repeated nodes
  const repeatedNodes = collectRepeatedNodes(element);
  
  // Determine element type
  const elementType = determineElementType(element);
  
  // Calculate initial state
  const rect = element.getBoundingClientRect();
  const initialContainer = element.parentElement!;
  const initialNextSibling = element.nextElementSibling;
  
  // Position repeated nodes as stacked cards
  positionRepeatedNodes(repeatedNodes, rect);
  
  // Calculate reorder permutations
  const reorderPermutations = calculateReorderPermutations(element, initialContainer);
  
  // Handle copy mode
  let copy: HTMLElement | undefined;
  if (options?.asCopy || options?.altKey) {
    copy = element.cloneNode(true) as HTMLElement;
    copy.style.opacity = '0.5';
    initialContainer.insertBefore(copy, element);
  }
  
  // Initialize drag state
  const state: DragState = {
    mode: 'reorder',
    elementType,
    copy,
    element,
    repeatedNodes,
    offset: {
      x: cursor.x - rect.left,
      y: cursor.y - rect.top,
    },
    lastCursorPosition: cursor,
    initialContainer,
    initialNextSibling,
    initialRect: rect,
    reorderPermutations,
    isTransitioning: false,
    destroying: false,
  };
  
  // Add drag classes
  element.classList.add('__drag-mode--reorder');
  for (const node of repeatedNodes) {
    node.classList.add('__drag-repeat-node');
  }
  
  // Show container highlight
  const color = elementType === 'component' ? '#D946EF' : '#2563EB';
  showContainerHighlight(initialContainer, color);
  
  // Start animation loop
  startFollowAnimation(state);
  
  return state;
}

/**
 * Collect repeated nodes (loop iterations)
 */
function collectRepeatedNodes(element: HTMLElement): HTMLElement[] {
  const dataId = element.dataset.id;
  if (!dataId || !dataId.includes('(')) return [];
  
  // Extract base ID (e.g., "0.1.2" from "0.1.2(0)")
  const baseId = dataId.replace(/\(\d+\)$/, '');
  
  // Find all iterations
  const siblings = Array.from(element.parentElement?.children || []);
  return siblings.filter(sibling => {
    if (!(sibling instanceof HTMLElement)) return false;
    if (sibling === element) return false;
    const siblingId = sibling.dataset.id || '';
    // Match pattern like "0.1.2(0)", "0.1.2(1)", etc.
    return siblingId.match(new RegExp(`^${baseId}\\(\\d+\\)$`));
  }) as HTMLElement[];
}

/**
 * Determine element type
 */
function determineElementType(element: HTMLElement): ElementType {
  // Component: root node that's not the page root
  if (element.dataset.nodeId === 'root' && element.dataset.id !== '0') {
    return 'component';
  }
  
  // Text node
  if (element.querySelector('[data-text-node]')) {
    return 'text';
  }
  
  return 'element';
}

/**
 * Position repeated nodes as stacked cards
 */
function positionRepeatedNodes(nodes: HTMLElement[], draggedRect: DOMRect): void {
  nodes.forEach((node, i) => {
    // Set CSS custom properties
    node.style.setProperty('--drag-repeat-node-width', `${draggedRect.width}px`);
    node.style.setProperty('--drag-repeat-node-height', `${draggedRect.height}px`);
    node.style.setProperty('--drag-repeat-node-translate', `${(i + 1) * 4}px, ${(i + 1) * 4}px`);
    
    // Random rotation
    const rotation = (Math.random() - 0.5) * 9; // -4.5 to +4.5 degrees
    node.style.setProperty('--drag-repeat-node-rotate', `${rotation}deg`);
    
    // Only first 3 visible
    node.style.opacity = i < 3 ? '1' : '0';
  });
}

/**
 * Calculate reorder permutations
 */
function calculateReorderPermutations(
  element: HTMLElement,
  container: HTMLElement
): Array<{ nextSibling: Node | null; rect: DOMRect }> {
  const permutations: Array<{ nextSibling: Node | null; rect: DOMRect }> = [];
  
  const siblings = Array.from(container.children).filter(child => {
    if (child === element) return false;
    if (!(child instanceof HTMLElement)) return false;
    if (child.dataset.id?.includes(')')) return false; // Skip repeated items
    if (child.hasAttribute('data-component')) return false; // Skip component containers
    return true;
  });
  
  for (const sibling of siblings) {
    // Try inserting before each sibling
    const originalNext = element.nextElementSibling;
    container.insertBefore(element, sibling);
    const rect = element.getBoundingClientRect();
    permutations.push({ nextSibling: sibling, rect });
    container.insertBefore(element, originalNext);
  }
  
  // Try appending at end (if container is not a component)
  if (!container.hasAttribute('data-component')) {
    const originalNext = element.nextElementSibling;
    container.appendChild(element);
    const rect = element.getBoundingClientRect();
    permutations.push({ nextSibling: null, rect });
    container.insertBefore(element, originalNext);
  }
  
  return permutations;
}

/**
 * Start animation loop for repeated nodes following
 */
function startFollowAnimation(state: DragState): void {
  const animate = () => {
    if (state.destroying) return;
    
    // Interpolate repeated nodes toward dragged element
    const draggedRect = state.element.getBoundingClientRect();
    
    for (let i = 0; i < state.repeatedNodes.length; i++) {
      const node = state.repeatedNodes[i];
      const targetTranslate = {
        x: draggedRect.left - state.initialRect.left,
        y: draggedRect.top - state.initialRect.top,
      };
      
      // Get current position
      const currentTranslate = {
        x: parseFloat(node.style.getPropertyValue('--drag-follow-x') || '0'),
        y: parseFloat(node.style.getPropertyValue('--drag-follow-y') || '0'),
      };
      
      // Interpolate with factor 0.4
      const factor = 0.4;
      const newTranslate = {
        x: currentTranslate.x + (targetTranslate.x - currentTranslate.x) * factor,
        y: currentTranslate.y + (targetTranslate.y - currentTranslate.y) * factor,
      };
      
      node.style.setProperty('--drag-follow-x', `${newTranslate.x}px`);
      node.style.setProperty('--drag-follow-y', `${newTranslate.y}px`);
    }
    
    requestAnimationFrame(animate);
  };
  
  requestAnimationFrame(animate);
}
