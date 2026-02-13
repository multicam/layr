import type { InsertArea, Point } from './types';

let dropHighlightElement: HTMLElement | null = null;

/**
 * Create or update drop highlight overlay
 */
export function showDropHighlight(
  area: InsertArea | null,
  color: string = '#2563eb'
): void {
  if (!area) {
    hideDropHighlight();
    return;
  }
  
  if (!dropHighlightElement) {
    dropHighlightElement = document.createElement('div');
    dropHighlightElement.className = '__drop-area-line';
    dropHighlightElement.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(dropHighlightElement);
  }
  
  const { layout, center, size } = area;
  
  Object.assign(dropHighlightElement.style, {
    background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color}33 75%, transparent 100%)`,
    left: layout === 'block' ? `${center.x - size / 2}px` : `${center.x - 2}px`,
    top: layout === 'block' ? `${center.y - 2}px` : `${center.y - size / 2}px`,
    width: layout === 'block' ? `${size}px` : '4px',
    height: layout === 'block' ? '4px' : `${size}px`,
  });
}

/**
 * Hide drop highlight
 */
export function hideDropHighlight(): void {
  if (dropHighlightElement) {
    dropHighlightElement.remove();
    dropHighlightElement = null;
  }
}

/**
 * Show container highlight
 */
export function showContainerHighlight(
  element: Element | null,
  color: string = '#2563eb'
): void {
  if (!element) return;
  
  // Add highlight class
  (element as HTMLElement).style.outline = `2px solid ${color}`;
  (element as HTMLElement).style.outlineOffset = '-2px';
}

/**
 * Hide container highlight
 */
export function hideContainerHighlight(element: Element | null): void {
  if (!element) return;
  (element as HTMLElement).style.outline = '';
  (element as HTMLElement).style.outlineOffset = '';
}
