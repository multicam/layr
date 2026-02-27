# Drag & Drop

Visual drag-and-drop system running inside the preview iframe. Supports reordering elements within their container and inserting into different containers, with View Transition animations and PostMessage coordination with the parent editor.

**Package:** `packages/editor/src/dnd/`

---

## Phase Summary

| Feature | Status |
|---------|--------|
| Reorder mode (within container) | [MVP] |
| Insert mode (cross-container) | [MVP] |
| Insert area calculation | [MVP] |
| View Transitions API animations | [MVP] |
| Repeated node (loop) stacking effect | [MVP] |
| Copy mode (Alt drag) | [MVP] |
| Meta key force-insert mode | [MVP] |
| Container + drop line highlights | [MVP] |
| PostMessage coordination | [MVP] |
| `prefers-reduced-motion` support | [MVP] |

---

## File Structure

| File | Responsibility |
|------|---------------|
| `types.ts` | `DragState`, `InsertArea`, `Point`, `DragMode`, `ElementType` |
| `dragStarted.ts` | Initialize drag; collect repeated nodes; calculate permutations |
| `dragReorder.ts` | Reorder within original container via overlap detection |
| `dragMove.ts` | Insert mode: lazy insert areas, find nearest line, switch modes |
| `dragEnded.ts` | Finalize drop; View Transition; send `nodeMoved` to editor |
| `getInsertAreas.ts` | Calculate all drop locations as geometric lines; offset overlaps |
| `dropHighlight.ts` | Create/destroy drop highlight and container highlight DOM elements |
| `index.ts` | Re-export all public functions and types |

---

## Data Types

```typescript
// packages/editor/src/dnd/types.ts

type DragMode = 'reorder' | 'insert';
type ElementType = 'element' | 'component' | 'text';

interface Point { x: number; y: number }

interface InsertArea {
  layout: 'block' | 'inline';
  parent: Element;       // target container
  index: number;         // child index to insert at
  center: Point;         // center of the drop line in viewport coords
  size: number;          // length of the line in px
  direction: 1 | -1;    // offset direction for overlapping lines
}

interface DragState {
  mode: DragMode;
  elementType: ElementType;
  copy?: HTMLElement;                    // clone for Alt-drag copy mode
  element: HTMLElement;                  // the dragged element
  repeatedNodes: HTMLElement[];          // loop siblings
  offset: Point;                         // cursor offset from element origin
  lastCursorPosition: Point;
  initialContainer: HTMLElement;
  initialNextSibling: Element | null;    // for cancel/restore
  initialRect: DOMRect;                  // rect at drag start
  reorderPermutations: Array<{
    nextSibling: Node | null;
    rect: DOMRect;
  }>;
  isTransitioning: boolean;             // View Transition lock
  selectedInsertAreaIndex?: number;
  insertAreas?: InsertArea[];           // lazy-loaded
  destroying: boolean;                  // stops rAF loop
}
```

---

## Drag Lifecycle

### Phase 1: Drag Start

**Trigger:** `drag-started` PostMessage from editor with `{ x, y }`.

**Executed in `dragStarted(element, cursor, options?)`:**

1. **Collect repeated nodes** — find siblings whose `data-id` matches pattern `baseId(\d+)` (loop iterations)
2. **Determine element type:**
   - Component: `data-node-id === 'root'` AND `data-id !== '0'`
   - Text: has `[data-text-node]` child
   - Element: everything else
3. **Position repeated nodes** as stacked cards (CSS custom properties):
   - `--drag-repeat-node-width/height` from dragged element rect
   - `--drag-repeat-node-translate`: `(i+1)*4px, (i+1)*4px`
   - `--drag-repeat-node-rotate`: random `-4.5` to `+4.5` degrees
   - Opacity: first 3 visible (`1`), rest hidden (`0`)
4. **Handle copy mode** (Alt key / `options.asCopy`): clone element, set `opacity: 0.5`, insert before original
5. **Calculate reorder permutations** — for each valid sibling position (excluding repeated items, component containers): trial-insert element and capture `DOMRect`; also test append position if container has no `data-component`
6. **Initialize `DragState`** with `mode: 'reorder'`
7. **Add CSS classes** — `__drag-mode--reorder` on element; `__drag-repeat-node` on siblings
8. **Show container highlight** (blue `#2563EB` or pink `#D946EF`)
9. **Start rAF follow animation** — loop interpolates repeated nodes toward dragged element (factor 0.4)

### Phase 2: Cursor Movement

**Trigger:** `mousemove` PostMessage from editor with `{ x, y, metaKey }`.

1. Update `state.lastCursorPosition`
2. Auto-follow offset: if cursor outside element rect, gently pull element (factor 0.1)
3. Determine mode:
   - Cursor inside `initialContainer` AND no `metaKey` → reorder
   - Cursor outside OR `metaKey` → insert
4. Delegate to `dragReorder()` or `dragMove()` (with mode switch if needed)
5. Update element CSS `translate` to `cursor - offset`

### Phase 3a: Reorder Mode

**Mode switch (insert → reorder):** restore element to `initialContainer`, swap CSS classes, restore repeated nodes opacity.

**Continuous via `dragReorder(state, cursor)`:**

1. Find best permutation — check if element center overlaps each permutation rect (±100px padding); among overlapping, select minimum Euclidean distance to center
2. If target position changed:
   - Set `isTransitioning = true`
   - Assign `view-transition-name` to viewport-visible siblings (`item-0`, `item-1`, ...) and dragged element (`item-dragged`)
   - Execute View Transition: `insertBefore(element, nextSibling)`; update offset
   - Clean up transition names in `.finished`

### Phase 3b: Insert Mode

**Mode switch (reorder → insert), executed once in `switchToInsertMode(state)`:**

1. Set `mode = 'insert'`
2. Lazy-calculate `insertAreas` via `getInsertAreas(element, initialContainer)`
3. Move element to `document.body` (detached from original container)
4. Apply `position: fixed; z-index: 9999`
5. Reduce repeated nodes opacity to `0.2`

**Continuous via `dragMove(state, cursor)`:**

1. `findNearestLine(cursor, insertAreas)` → perpendicular distance to each line
2. Update `selectedInsertAreaIndex`
3. Update container highlight on `nearest.area.parent`
4. Draw drop line highlight at nearest insert area

### Phase 4: Drag End

**Trigger:** `drag-ended` PostMessage from editor with optional `{ canceled }`.

**Executed in `dragEnded(state, options?)`:**

1. Set `state.destroying = true` (stops rAF loop)
2. Determine final position:
   - Reorder: `initialContainer.indexOf(element)` → `{ parent: data-id, index }`
   - Insert: `insertAreas[selectedInsertAreaIndex]` → `{ parent: data-id, index }`
   - Canceled: position = null
3. Assign `view-transition-name`:
   - `dropped-item-self` on dragged element
   - `dropped-item-sibling-N` on visible siblings
   - `dropped-item-repeated-N` on repeated nodes
4. Execute `tryStartViewTransition(() => { ... })`:
   - **Canceled:** restore to `initialContainer` at `initialNextSibling`; remove copy
   - **Insert mode:** `area.parent.insertBefore(element, area.parent.children[area.index])`
   - Reset `position`, `zIndex`, `transform` on element; remove drag CSS classes
5. Clean up transition names in `.finished`
6. `cleanup(state)`: hide highlights; remove CSS custom properties from repeated nodes; remove copy element
7. **Return** `{ copy: boolean, parent: string | null, index: number }` or `null` if canceled
8. Caller posts `nodeMoved` message to editor

---

## Insert Area Calculation

**`getInsertAreas(excludeElement, excludeContainer): InsertArea[]`**

```
1. querySelectorAll('[data-id]')
   → exclude: excludeElement, [data-component], data-id containing ')'

2. For each element:
   → get parent (skip if parent === excludeContainer)
   → get siblings with [data-id] (no [data-component])
   → detect layout direction

3. detectLayout(siblings):
   → block: all pairs satisfy prevRect.bottom <= nextRect.top
   → inline: otherwise
   → zero-size elements ignored

4. Create InsertAreas:
   Block (horizontal lines):
     - before first: y = element.top
     - between: y = (prev.bottom + next.top) / 2
     - after last: y = element.bottom
   Inline (vertical lines):
     - same logic with x/left/right

5. offsetOverlappingLines:
   → group by rounded center coordinates
   → offset each duplicate by i * direction pixels
```

**Example — overlapping boundaries:**
```
Container A
  └── Container B (full width)
        └── Element

At Element's bottom:
  Area 1: "after Element" in B    → direction -1, offset -1px
  Area 2: "after B" in A          → direction +1, offset +1px
```

---

## Nearest Line Detection

**`findNearestLine(cursor, areas): { area, distance } | null`**

Uses axis-aligned perpendicular distance:
- Block layout: `abs(cursor.y - area.center.y)`
- Inline layout: `abs(cursor.x - area.center.x)`

Returns area with minimum distance.

---

## Visual Feedback

### Color Coding

| Element type | Color | Hex |
|-------------|-------|-----|
| Regular element | Blue | `#2563EB` |
| Component | Pink/Purple | `#D946EF` |

### Container Highlight

```css
/* Applied inline via showContainerHighlight() */
outline: 2px solid {color};
outline-offset: -2px;
```

Cleared with `hideContainerHighlight()`.

### Drop Line (Insert Mode)

Created as `<div class="__drop-area-line">` appended to `document.body`:

| Layout | Width | Height | Position offset |
|--------|-------|--------|-----------------|
| Block | `size`px | `4px` | centered at `center.x`, `center.y - 2px` |
| Inline | `4px` | `size`px | centered at `center.x - 2px`, `center.y` |

Background: `radial-gradient(circle at 50% 50%, {color} 0%, {color}33 75%, transparent 100%)`.

### Repeated Node Stack

- CSS custom properties per repeated node for position + rotation
- rAF loop interpolates `--drag-follow-x/y` toward dragged element (factor 0.4)
- Opacity: `1` in reorder mode, `0.2` in insert mode, `0` for nodes beyond index 3

---

## PostMessage Coordination

### Editor → Preview (drag messages)

| Type | Payload | Handler |
|------|---------|---------|
| `drag-started` | `{ x, y }` | `dragStarted()` |
| `drag-ended` | `{ canceled?: boolean }` | `dragEnded()` |
| `mousemove` | `{ x, y, metaKey? }` | Mode check + `dragReorder()`/`dragMove()` |
| `keydown` | `{ key, altKey, metaKey }` | Alt: restart in copy/non-copy; meta: force insert |
| `keyup` | `{ key, altKey, metaKey }` | Same |

### Preview → Editor (drag messages)

| Type | Payload | Sent when |
|------|---------|-----------|
| `highlight` | `{ highlightedNodeId: string \| null }` | Container changes during drag |
| `nodeMoved` | `{ copy: boolean, parent: string \| null, index: number }` | Successful drop (not canceled) |

**`nodeMoved` payload:**

```typescript
interface NodeMovedMessage {
  copy: boolean;           // true = Alt-drag copy operation
  parent: string | null;   // data-id of target container
  index: number;           // child index in target container
}
```

Editor calls `moveNode(componentId, nodeId, parent, index)` on receipt. No message sent on canceled drags.

---

## Component-Aware Restrictions

```typescript
// Component detection
function elementIsComponent(el: Element): boolean {
  return el.getAttribute('data-node-id') === 'root' && el.getAttribute('data-id') !== '0';
}
```

| Rule | Implementation |
|------|---------------|
| Cannot reorder within component internals | Siblings with `data-component` excluded from permutation list |
| Cannot insert into component elements | `[data-component]` excluded from container query |
| Cannot append to component containers | Final append position skipped when container has `data-component` |
| Components are atomic units | Can be moved as a whole; internal structure off-limits |

### Data Attributes

| Attribute | Set by | Purpose |
|-----------|--------|---------|
| `data-id` | Runtime | Hierarchical path (e.g., `0.1.2`); repeated items end in `(N)` |
| `data-node-id` | Runtime | Node type identifier (e.g., `root`) |
| `data-component` | Runtime | Marks element as a component boundary |

---

## Keyboard Modifiers

### Alt Key — Copy Toggle

Toggle during live drag:
1. End current drag with `canceled: true`
2. Restart with `asCopy = !asCopy`
3. Adjust offset for visual continuity

Copy behavior: original stays in place; clone follows cursor; on drop, editor inserts a new node.

### Meta/Cmd Key — Force Insert

With meta held, cursor inside `initialContainer` still activates insert mode. Exclude list changes:
- Without meta: exclude element AND initialContainer from insert areas
- With meta: exclude only element (allows re-insertion into original container at different index)

---

## Performance Optimizations

| Optimization | Technique |
|-------------|-----------|
| Pre-calculated permutations | All reorder positions computed once at drag start |
| Lazy insert areas | `getInsertAreas()` called only when first entering insert mode; cached in `state.insertAreas` |
| Viewport-only transitions | `view-transition-name` assigned only to elements in viewport |
| Reduced-motion support | View Transitions skipped via `prefers-reduced-motion` check in `tryStartViewTransition()` |
| rAF lock | `isTransitioning` prevents concurrent View Transitions |
| Single DOM query | `querySelectorAll` called once per insert area calculation |

---

## Edge Cases

| Case | Handling |
|------|---------|
| Canceled drag | Restore element to `initialNextSibling`; no `nodeMoved` sent |
| View Transitions not supported | `tryStartViewTransition()` falls back to immediate DOM mutation |
| Rapid mode switching | `isTransitioning` queues transitions naturally |
| Wrapped flex/grid items | Layout detection handles wrap: creates lines at boundaries not midpoints |
| Zero-size elements | Ignored in layout direction detection |
| Repeated nodes in loop | All iterations move together; identified by `data-id` containing `)` |
| No insert area found | `dragMove()` returns early; no highlight change |

---

## Cross-References

- PostMessage types and PreviewBridge: `specs/25-preview-system.md`
- Editor store for `moveNode` on drop: `specs/24-editor.md`
