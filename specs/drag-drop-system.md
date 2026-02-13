# Drag & Drop System

## 1. Overview

### Purpose
The drag and drop system enables visual manipulation of DOM nodes within the Layr editor preview. It supports **reordering** elements within their container and **inserting** elements into different containers, with smooth View Transition API animations, real-time visual feedback, and bidirectional communication with the parent editor frame.

### Jobs to Be Done
- **Reorder siblings** within a container by dragging to new positions
- **Move elements** between containers by dragging outside the original parent
- **Copy elements** by holding Alt during drag (creates a duplicate at the target location)
- **Provide visual feedback** with drop highlights, stacked repeated nodes, and animated transitions
- **Calculate valid drop targets** as lines between elements, respecting layout direction (block/inline)
- **Disambiguate nested containers** when drop lines overlap at container boundaries
- **Communicate operations** to the editor so the component tree data model stays in sync

### Scope
- Drag initialization, movement tracking, and drop finalization
- Two operation modes: reorder (within container) and insert (cross-container)
- Insert area calculation with block/inline layout detection
- Visual feedback: drop highlights, repeated node stacking, View Transitions
- PostMessage protocol between preview iframe and parent editor
- Component-aware restrictions (cannot insert into component internals)

---

## 2. Architecture

### Operation Modes

The system operates in two modes with seamless transitions between them:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Reorder** | Cursor inside original container (no meta key) | Reposition element among siblings using pre-calculated permutations |
| **Insert** | Cursor outside original container OR meta key pressed | Move element to a different container at a calculated insert position |

### Mode Transitions

```
drag-started → Reorder mode (always starts here)
  │
  ├─ Cursor leaves container → Insert mode
  │   └─ Cursor re-enters container → Reorder mode
  │
  ├─ Meta key pressed → Insert mode (forced)
  │   └─ Meta key released → Reorder mode (if cursor in container)
  │
  └─ drag-ended → Finalize at current mode's target position
```

### File Structure

| File | Responsibility |
|------|---------------|
| `dragStarted.ts` | Initialize drag state, calculate reorder permutations, position repeated nodes |
| `dragReorder.ts` | Handle reordering within original container using overlap detection |
| `dragMove.ts` | Handle insert mode — calculate insert areas, find nearest drop line |
| `dragEnded.ts` | Finalize drop, animate to target, clean up state |
| `getInsertAreas.ts` | Calculate all possible drop locations as geometric lines |
| `dropHighlight.ts` | Create and manage visual drop indicator overlays |

---

## 3. Data Models

### DragState

Core state object maintained throughout a drag operation:

```typescript
type DragState = {
  mode: 'reorder' | 'insert'
  elementType: 'element' | 'component' | 'text'
  copy?: HTMLElement
  element: HTMLElement
  repeatedNodes: HTMLElement[]
  offset: Point
  lastCursorPosition: Point
  initialContainer: HTMLElement
  initialNextSibling: Element | null
  initialRect: DOMRect
  reorderPermutations: Array<{
    nextSibling: Node | null
    rect: DOMRect
  }>
  isTransitioning: boolean
  selectedInsertAreaIndex?: number
  insertAreas?: Array<InsertArea>
  destroying: boolean
}
```

| Field | Description |
|-------|-------------|
| `mode` | Current operation mode — switches between `'reorder'` and `'insert'` |
| `elementType` | What's being dragged — determines visual color coding |
| `copy` | Clone element when Alt-dragging (acts as placeholder at original position) |
| `element` | The actual DOM element being dragged |
| `repeatedNodes` | Other loop iterations of the same node (identified by `data-id` pattern) |
| `offset` | Drag offset from cursor to element origin |
| `lastCursorPosition` | Current cursor position (updated on every mousemove) |
| `initialContainer` | Original parent element |
| `initialNextSibling` | Original next sibling (for cancel/restore) |
| `initialRect` | Element's bounding rect at drag start |
| `reorderPermutations` | Pre-calculated target positions within container |
| `isTransitioning` | Lock flag to prevent concurrent View Transitions |
| `selectedInsertAreaIndex` | Currently selected drop target index (insert mode) |
| `insertAreas` | Lazy-loaded array of all possible drop locations |
| `destroying` | Flag to stop animation loops during cleanup |

### InsertArea

Represents a possible drop location as a geometric line:

```typescript
type InsertArea = {
  layout: 'block' | 'inline'
  parent: Element
  index: number
  center: Point
  size: number
  direction: 1 | -1
}
```

| Field | Description |
|-------|-------------|
| `layout` | Detected layout direction of the container |
| `parent` | Target container element |
| `index` | Child index to insert at within the container |
| `center` | Center point of the drop line in viewport coordinates |
| `size` | Length of the drop line in pixels |
| `direction` | Offset direction for overlapping lines (1 = after, -1 = before) |

### Supporting Types

```typescript
type Point = { x: number; y: number }
type Line = { x1: number; y1: number; x2: number; y2: number }
```

---

## 4. Drag Lifecycle

### Phase 1: Drag Start

**Trigger:** `drag-started` PostMessage from editor with cursor position `{x, y}`.

**Steps:**

1. **Collect repeated nodes** — find all loop siblings sharing the same base `data-id` pattern (e.g., `0.1.2(0)`, `0.1.2(1)` for base `0.1.2`)

2. **Position repeated nodes** as a visual stack behind the dragged element:
   - Set CSS custom properties: `--drag-repeat-node-width`, `--drag-repeat-node-height`, `--drag-repeat-node-translate`, `--drag-repeat-node-rotate`
   - Random rotation between -4.5deg and +4.5deg per node
   - Only first 3 visible (via opacity)

3. **Determine element type:**
   - **Component:** `data-node-id="root"` AND `data-id !== "0"` (not the page root)
   - **Element:** everything else

4. **Initialize DragState** with mode `'reorder'`

5. **Handle copy mode** — if Alt key pressed, clone element with reduced opacity and insert at original position as placeholder

6. **Calculate reorder permutations** — for each valid sibling position:
   - Skip repeated nodes (data-id ending in `)`)
   - Skip component elements (has `data-component` attribute)
   - Temporarily move element before each sibling to capture target DOMRect
   - Also test final append position (unless container is a component)
   - Store `{nextSibling, rect}` pairs

7. **Start animation loop** — `requestAnimationFrame` loop that smoothly interpolates repeated nodes toward the dragged element position (factor 0.4)

8. **Apply visual feedback:**
   - Add drag CSS class to element
   - Post `'highlight'` message to editor with container ID
   - Create drop highlight overlay with color based on element type

### Phase 2: Cursor Movement

**Trigger:** `mousemove` PostMessage from editor with `{x, y, metaKey}`.

**Steps:**

1. **Update cursor position** in drag state

2. **Auto-follow cursor** — if cursor moves outside the dragged element's rect, gently pull element toward cursor (interpolation factor 0.1 applied to offset)

3. **Determine mode:**
   - If cursor inside initial container AND meta key not pressed → **Reorder mode**
   - If cursor outside initial container OR meta key pressed → **Insert mode**

4. **Delegate to mode handler** (`dragReorder()` or `dragMove()`)

5. **Update element position** — set CSS `translate` to `cursor - offset`

### Phase 3a: Reorder Mode

**One-time switch from insert → reorder:**
1. Set `mode = 'reorder'`
2. Swap CSS classes (remove move class, add reorder class)
3. Move element back to initial container at initial next sibling position
4. Restore repeated nodes opacity (full for first 3)
5. Adjust offset to compensate for position change
6. Post highlight message, re-apply drop highlight

**Continuous reordering:**
1. **Find best permutation** using overlap detection:
   - Check if dragged element center overlaps each permutation rect (with 100px padding)
   - Among overlapping positions, select nearest by center-to-center distance
   - Return null if no overlap found

2. **Animate reorder** if target position changed:
   - Set `isTransitioning = true` (prevents concurrent transitions)
   - Assign `view-transition-name` to viewport-visible siblings (`item-0`, `item-1`, etc.)
   - Dragged element gets `__drag-item` transition name
   - Execute View Transition: update DOM order, adjust offset to maintain visual position
   - Clean up transition names when finished

### Phase 3b: Insert Mode

**One-time switch from reorder → insert:**
1. Set `mode = 'insert'`
2. **Calculate insert areas** — call `getInsertAreas()` to compute all drop lines (cached)
3. Move element to `document.body` (detached from original container)
4. Swap CSS classes (remove reorder class, add move class)
5. Set CSS custom properties for absolute positioning
6. Reduce repeated nodes opacity to 0.2

**Continuous tracking:**
1. **Convert insert areas to geometric lines:**
   - Block layout → horizontal line at center point with width = size
   - Inline layout → vertical line at center point with height = size

2. **Find nearest line** using perpendicular distance from cursor to each line segment

3. **Update highlights:**
   - Store selected insert area index in drag state
   - Post `'highlight'` message with parent container ID
   - Draw external drop highlight at the line position with gradient effect

### Phase 4: Drag End

**Trigger:** `drag-ended` PostMessage from editor with optional `canceled` flag.

**Steps:**

1. Set `destroying = true` to stop animation loops

2. **Determine final container:**
   - Insert mode (not canceled) → selected insert area's parent
   - Otherwise → initial container

3. **Assign View Transition names** to all affected elements:
   - Dragged element: `dropped-item-self`
   - Siblings in viewport: `dropped-item-sibling-N`
   - Repeated nodes in viewport: `dropped-item-repeated-N`

4. **Execute transition** with DOM update callback:
   - **Canceled:** remove copy (if exists), restore to initial position
   - **Insert mode:** insert at selected area's parent at calculated child index
   - **Cleanup:** remove drag classes, remove `translate` style, reinsert repeated nodes after element (reversed order), remove drop highlights

5. **Post-transition cleanup:** remove all `view-transition-name` properties

6. **Post `nodeMoved` message to editor** with:
   - `copy: boolean` — whether this was an Alt-drag copy
   - `parent: string` — `data-id` of target container
   - `index: number` — child index within target container

---

## 5. Insert Area Calculation

### Algorithm

The insert area calculation produces a list of geometric lines representing every valid drop position in the document.

**Step 1: Query containers**
- Select all elements with `[data-id]:not([data-component])`
- Exclude repeated instances (data-id containing `)`)

**Step 2: For each container, analyze children**
- Get all children with `data-node-id` (exclude repeated)
- For each child, calculate drop lines based on sibling relationships

**Step 3: Detect layout direction**
- **Block layout:** all sibling pairs satisfy `prevRect.bottom <= nextRect.top`
- **Inline layout:** otherwise
- Zero-size elements ignored in detection

**Step 4: Calculate drop lines**

For **block layout** (horizontal lines):
- Before first element: line at element top if previous wraps, or at container/first-child top
- Between elements: line at midpoint `(prevRect.bottom + nextRect.top) / 2`
- Between wrapped elements: line at current element top (no gap for midpoint)
- After last element: line at element bottom

For **inline layout** (vertical lines):
- Same logic but using `left`/`right` instead of `top`/`bottom`
- Lines are vertical with height = element height

**Step 5: Offset overlapping lines**

When child container boundaries align with parent container boundaries, multiple drop lines overlap at the same coordinate. The algorithm:
1. For each insert area, count how many other areas have:
   - Different parent
   - Same layout and center coordinate
   - Nested relationship (parent contains this area's parent)
2. Offset by `count * direction` pixels

This creates 1px separation between "insert as last child of inner container" and "insert as next sibling of inner container in outer container."

### Example: Overlapping Lines

```
Container A
  └─ Container B (full width)
      └─ Element

At Element's bottom boundary:
  Line 1: "After Element" in Container B (offset -1px)
  Line 2: "After Container B" in Container A (offset +1px)
```

### Nearest Line Detection

Uses perpendicular distance from cursor point to line segment:
1. Calculate projection point `t` along line segment (clamped to [0, 1])
2. Compute squared distance from cursor to projection point
3. Select line with minimum distance
4. Return both the line and the normalized projection point (used for gradient positioning)

---

## 6. Visual Feedback

### Color Coding

| Element Type | Color | Hex |
|-------------|-------|-----|
| Regular element | Blue | `#2563EB` |
| Component | Pink/Purple | `#D946EF` |

Applied to drop highlight outlines and insert line indicators.

### Drop Highlight (Reorder Mode)

Created as a `<div>` with class `__drop-area`, positioned via CSS custom properties:

```css
--drop-area-left: {element.offsetLeft + containerLeft}px
--drop-area-top: {element.offsetTop + containerTop}px
--drop-area-width: {element.offsetWidth}px
--drop-area-height: {element.offsetHeight}px
--drop-area-outline-color: #{color}
--drop-area-border-radius: {element computed border-radius}
--dashed-line-color: color-mix(in srgb, #{color} 33%, transparent)
```

Positioned as a fixed overlay matching the target element's size and position, with matching border radius.

### Drop Line (Insert Mode)

Created as a `<div>` with class `__drop-area-line`:

**Block layout (horizontal line):**
```css
--drop-area-width: {length}px
--drop-area-height: 4px
--drop-area-translate: -50% -2px
```

**Inline layout (vertical line):**
```css
--drop-area-width: 4px
--drop-area-height: {length}px
--drop-area-translate: -2px -50%
```

**Radial gradient effect:** centered at the projection point along the line, creates a fade from solid color to 33% opacity. Minimum radius 75px.

### Repeated Node Stack Effect

When dragging an element that's part of a loop, all iterations display as a stacked deck:
- Random rotation per node (-4.5 to +4.5 degrees)
- Only first 3 visible
- Smooth trailing animation via `requestAnimationFrame` (factor 0.4)
- Opacity reduced to 0.2 in insert mode, full in reorder mode

### View Transition Animations

Used for smooth DOM reordering without visual jumps:
- Check `document.startViewTransition` support
- Skip if user prefers reduced motion
- Assign unique `view-transition-name` to each animated element
- Only assign to elements in viewport (performance optimization)
- Clean up names after transition completes

---

## 7. PostMessage Protocol

### Editor → Preview Messages

| Message Type | Payload | Handler |
|-------------|---------|---------|
| `drag-started` | `{ x, y }` | Initializes drag state, starts tracking |
| `drag-ended` | `{ canceled?: true }` | Finalizes or cancels drop |
| `mousemove` | `{ x, y, metaKey }` | Updates position, triggers mode logic |
| `keydown` | `{ key, altKey, metaKey }` | Alt toggles copy, meta forces insert |
| `keyup` | `{ key, altKey, metaKey }` | Same as keydown (tracks key state) |

### Preview → Editor Messages

| Message Type | Payload | When Sent |
|-------------|---------|-----------|
| `highlight` | `{ highlightedNodeId: string \| null }` | Container changes during drag |
| `nodeMoved` | `{ copy, parent, index }` | Successful drop completes |

### `nodeMoved` Message Detail

```typescript
{
  type: 'nodeMoved'
  copy: boolean           // true = Alt-drag copy operation
  parent: string | null   // data-id of target container
  index: number           // child index within target container
}
```

The editor uses this message to update the component tree data model, ensuring the visual drag result is persisted to the project definition.

---

## 8. Component-Aware Restrictions

### Rules

1. **Cannot reorder within component internals** — siblings with `data-component` attribute are excluded from permutation calculation
2. **Cannot insert into components** — elements with `[data-component]` excluded from container query
3. **Cannot append to component containers** — final append position skipped when container has `data-component`
4. **Components are atomic** — they can be moved as units but their internal structure is off-limits

### Detection

```typescript
function elementIsComponent(element: Element): boolean {
  return (
    element.getAttribute('data-node-id') === 'root' &&
    element.getAttribute('data-id') !== '0'
  )
}
```

A component is identified by:
- Having `data-node-id="root"` (it's the root element of a component)
- NOT having `data-id="0"` (which would be the page root, not a nested component)

### Data Attribute System

| Attribute | Set During | Purpose |
|-----------|-----------|---------|
| `data-node-id` | Element creation | Node type identifier (e.g., `'root'`, child index) |
| `data-id` | Element creation | Hierarchical path (e.g., `'0.1.2'`) |
| `data-component` | Component creation | Component name — marks element as component boundary |

---

## 9. Keyboard Modifiers

### Alt Key — Copy Toggle

Holding or releasing Alt during a drag restarts the operation:
1. Detect alt key change
2. End current drag with `canceled: true`
3. Restart drag with new `asCopy` value
4. Adjust offset to maintain visual continuity

When copying:
- A clone of the element is created with reduced opacity
- The clone stays at the original position as a placeholder
- On drop, both original and clone persist (editor creates a new component instance)

### Meta Key — Force Insert Mode

Holding Meta/Cmd forces insert mode even when the cursor is inside the original container. This allows:
- Inserting at a different position within the same container
- Choosing specific insert positions that reorder mode doesn't offer

When meta is pressed, the exclude list changes:
- **Without meta:** exclude both element and original container from insert areas
- **With meta:** exclude only the element (allows inserting into original container)

---

## 10. Edge Cases

### Nested Containers with Overlapping Boundaries
Overlapping drop lines are offset by 1px per nesting level using the `offsetDropLines()` post-processing step. The `direction` field ensures "before" and "after" lines offset in opposite directions.

### Wrapped Flex/Grid Items
The layout detection algorithm handles wrapped elements:
- Detects wrapping when `prevRect.bottom >= nextRect.top` (block) or `prevRect.right >= nextRect.left` (inline)
- Creates drop lines at element boundaries rather than midpoints when wrapping is detected

### Zero-Size Elements
Elements with `width + height === 0` are ignored in layout direction detection to prevent invisible elements from corrupting block/inline classification.

### Repeated Nodes (Loop Iterations)
- Identified by `data-id` containing `)`
- Excluded from: permutation calculation, insert area containers, insert area siblings
- All iterations move together as a unit
- Visual stack effect shows multiple items being dragged

### Text Nodes
`DragState.elementType` supports `'text'` but no special drag handling exists. Text nodes are only selectable via meta-click or double-click, which prevents accidental text-node dragging.

### Conditional Rendering
Only rendered elements appear in insert area calculations (uses `querySelectorAll` on live DOM). Hidden conditional branches are automatically excluded.

### Rapid Mode Switching
The `isTransitioning` flag prevents concurrent View Transitions. If the user moves the cursor rapidly between reorder and insert zones, transitions queue naturally via the flag check.

### Cancel Operation
When `drag-ended` arrives with `canceled: true`:
- Copy element (if any) is removed
- Dragged element restores to initial container at initial next sibling position
- All visual effects cleaned up
- No `nodeMoved` message sent to editor

---

## 11. Performance Optimizations

| Optimization | Technique |
|-------------|-----------|
| **Pre-calculated permutations** | All reorder positions computed once at drag start |
| **Lazy insert areas** | Only computed when first entering insert mode |
| **Viewport-only transitions** | View Transition names assigned only to elements in viewport |
| **Squared distance comparison** | Avoids `Math.sqrt()` in nearest-line loop |
| **Animation interpolation** | `requestAnimationFrame` with 0.4 factor for smooth trailing |
| **Cached insert areas** | Stored in `dragState.insertAreas` after first calculation |
| **Single DOM query** | `querySelectorAll` called once per insert area calculation |

---

## 12. External Dependencies

| Dependency | Usage |
|------------|-------|
| View Transitions API | Smooth DOM reordering animations |
| PostMessage API | Bidirectional editor ↔ preview communication |
| `requestAnimationFrame` | Repeated node follow animation |
| CSS Custom Properties | Dynamic positioning of highlights and repeated nodes |
| `DOMRect` / `getBoundingClientRect()` | Position calculations for permutations and insert areas |
| `prefers-reduced-motion` | Skips View Transitions when user preference set |

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxDepth` | 100 | Maximum nesting depth |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Depth limit:** Throw `LimitExceededError`

---

## Invariants

### Operation Invariants

1. **I-OP-ATOMIC:** Operations MUST be atomic.
2. **I-OP-ISOLATED:** Operations MUST be isolated.
3. **I-OP-CLEANUP:** Cleanup MUST be guaranteed.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-ATOMIC | Runtime | Rollback |
| I-OP-ISOLATED | Runtime | Sandbox |
| I-OP-CLEANUP | Runtime | Force cleanup |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section with operation limits
- Added Invariants section with 3 operation invariants
- Added Error Handling section with error types
