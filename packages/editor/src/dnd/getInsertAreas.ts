import type { InsertArea, Point } from './types';

/**
 * Calculate all valid drop locations as geometric lines
 */
export function getInsertAreas(
  excludeElement: Element,
  excludeContainer: Element
): InsertArea[] {
  const areas: InsertArea[] = [];
  
  // Query all elements with data-id (excluding components and repeated items)
  const elements = Array.from(document.querySelectorAll('[data-id]')).filter(el => {
    if (el === excludeElement) return false;
    if (el.hasAttribute('data-component')) return false;
    if ((el as HTMLElement).dataset.id?.includes(')')) return false; // Repeated item
    return true;
  });
  
  for (const element of elements) {
    const parent = element.parentElement;
    if (!parent || parent === excludeContainer) continue;
    
    const siblings = Array.from(parent.children).filter(
      child => child.hasAttribute('data-id') && !child.hasAttribute('data-component')
    );
    
    const elementIndex = siblings.indexOf(element);
    const layout = detectLayout(siblings);
    
    // Before this element
    if (elementIndex === 0) {
      areas.push(createInsertArea(parent, 0, element, 'before', layout));
    }
    
    // After this element
    areas.push(createInsertArea(parent, elementIndex + 1, element, 'after', layout));
  }
  
  // Offset overlapping lines
  return offsetOverlappingLines(areas);
}

function detectLayout(siblings: Element[]): 'block' | 'inline' {
  if (siblings.length < 2) return 'block';
  
  for (let i = 1; i < siblings.length; i++) {
    const prev = siblings[i - 1].getBoundingClientRect();
    const curr = siblings[i].getBoundingClientRect();
    
    // Check if wrapped
    if (prev.bottom <= curr.top) {
      return 'block'; // Vertical stacking
    }
    if (prev.right <= curr.left) {
      return 'inline'; // Horizontal arrangement
    }
  }
  
  return 'block';
}

function createInsertArea(
  parent: Element,
  index: number,
  reference: Element,
  position: 'before' | 'after',
  layout: 'block' | 'inline'
): InsertArea {
  const rect = reference.getBoundingClientRect();
  
  return {
    layout,
    parent,
    index,
    center: layout === 'block'
      ? { x: rect.left + rect.width / 2, y: position === 'before' ? rect.top : rect.bottom }
      : { x: position === 'before' ? rect.left : rect.right, y: rect.top + rect.height / 2 },
    size: layout === 'block' ? rect.width : rect.height,
    direction: position === 'before' ? -1 : 1,
  };
}

function offsetOverlappingLines(areas: InsertArea[]): InsertArea[] {
  // Group by similar center position
  const grouped = new Map<string, InsertArea[]>();
  
  for (const area of areas) {
    const key = `${Math.round(area.center.x)}-${Math.round(area.center.y)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(area);
  }
  
  // Offset overlapping
  const result: InsertArea[] = [];
  
  for (const group of grouped.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      group.forEach((area, i) => {
        result.push({
          ...area,
          center: area.layout === 'block'
            ? { ...area.center, y: area.center.y + (i * area.direction) }
            : { ...area.center, x: area.center.x + (i * area.direction) },
        });
      });
    }
  }
  
  return result;
}

/**
 * Find nearest drop line to cursor
 */
export function findNearestLine(
  cursor: Point,
  areas: InsertArea[]
): { area: InsertArea; distance: number } | null {
  if (areas.length === 0) return null;
  
  let nearest = areas[0];
  let minDistance = Infinity;
  
  for (const area of areas) {
    const distance = area.layout === 'block'
      ? Math.abs(cursor.y - area.center.y)
      : Math.abs(cursor.x - area.center.x);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = area;
    }
  }
  
  return { area: nearest, distance: minDistance };
}
