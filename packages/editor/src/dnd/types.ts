export type DragMode = 'reorder' | 'insert';

export type ElementType = 'element' | 'component' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface InsertArea {
  layout: 'block' | 'inline';
  parent: Element;
  index: number;
  center: Point;
  size: number;
  direction: 1 | -1;
}

export interface DragState {
  mode: DragMode;
  elementType: ElementType;
  copy?: HTMLElement;
  element: HTMLElement;
  repeatedNodes: HTMLElement[];
  offset: Point;
  lastCursorPosition: Point;
  initialContainer: HTMLElement;
  initialNextSibling: Element | null;
  initialRect: DOMRect;
  reorderPermutations: Array<{
    nextSibling: Node | null;
    rect: DOMRect;
  }>;
  isTransitioning: boolean;
  selectedInsertAreaIndex?: number;
  insertAreas?: InsertArea[];
  destroying: boolean;
}
