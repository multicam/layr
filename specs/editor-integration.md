# Editor Integration Specification

## Purpose

The Editor Integration system enables a live-preview iframe that responds to editor commands while reporting UI state, user interactions, and GraphQL schema data back. The preview runtime injects editor-specific behaviors (drag-drop, conditional overrides, timeline scrubbing, live style previews) while running the same component rendering engine as production.

### Jobs to Be Done

- Provide real-time component preview in an editor iframe with bidirectional PostMessage communication
- Support visual drag-and-drop of elements with reorder and cross-container insert modes
- Show selection and highlight overlays that track animated elements frame-by-frame
- Allow timeline animation scrubbing by controlling CSS animation state
- Enable live style preview with `!important` overrides and theme switching
- Support GraphQL API introspection for schema discovery
- Provide design mode (conditional overrides for hidden nodes) and test mode (normal rendering)
- Report keyboard, mouse, and component events back to the editor

---

## PostMessage Protocol

All communication between editor and preview uses `window.postMessage()` with strongly-typed discriminated unions.

### Inbound Messages (Editor → Preview)

#### Component & Data Updates

| Type | Payload | Description |
|------|---------|-------------|
| `component` | `{ component, scrollKey? }` | Updates current component, triggers re-render with scroll state restoration |
| `components` | `{ components }` | Updates all project components, forces re-render |
| `packages` | `{ packages }` | Loads package components, formulas, actions with namespace prefixing |
| `global_formulas` | `{ formulas, package? }` | Registers global formulas (project or package-scoped) |
| `global_actions` | `{ actions, package? }` | Registers global actions |
| `theme` | `{ theme }` | Inserts theme CSS into document head |
| `attrs` | `{ attrs }` | Updates component attributes/props |
| `mode` | `{ mode: 'design' \| 'test' }` | Toggles between design mode and test mode |
| `reload` | `{}` | Reloads the preview iframe |

#### Selection & Interaction

| Type | Payload | Description |
|------|---------|-------------|
| `selection` | `{ nodeId }` | Sets selected node, computes text styles if text node |
| `highlight` | `{ nodeId }` | Sets highlighted node for hover overlay |
| `click` | `{ x, y, metaKey?, altKey? }` | Click event at coordinates |
| `dblclick` | `{ x, y, metaKey? }` | Double-click for component navigation or text selection |
| `mousemove` | `{ x, y, metaKey? }` | Mouse movement for drag and hover |
| `update_inner_text` | `{ innerText }` | Updates text content of selected text node |
| `get_computed_style` | `{ properties }` | Requests computed style values for selected node |
| `report_document_scroll_size` | `{}` | Requests document scroll dimensions |

#### Drag & Drop

| Type | Payload | Description |
|------|---------|-------------|
| `drag-started` | `{ x, y }` | Initiates drag from cursor position |
| `drag-ended` | `{ cancel? }` | Completes or cancels drag operation |
| `keydown` / `keyup` | `{ key, altKey, metaKey }` | Keyboard state for drag modifiers (Alt = copy) |

#### Timeline & Animation

| Type | Payload | Description |
|------|---------|-------------|
| `set_timeline_keyframes` | `{ keyframes }` | Injects `@keyframes preview_timeline` into document |
| `set_timeline_time` | `{ time, timingFunction?, fillMode? }` | Scrubs to specific animation time |

#### Style Previewing

| Type | Payload | Description |
|------|---------|-------------|
| `style_variant_changed` | `{ variant }` | Switches active style variant for selected node |
| `preview_style` | `{ styles, pseudoElement? }` | Live-preview styles with `!important` overrides |
| `preview_resources` | `{ resources }` | Temporarily inject fonts/stylesheets |
| `preview_theme` | `{ theme }` | Apply theme to document body |

#### API & Introspection

| Type | Payload | Description |
|------|---------|-------------|
| `fetch_api` | `{ apiKey }` | Manually triggers API fetch |
| `introspect_qraphql_api` | `{ apiKey }` | Runs GraphQL introspection query |

### Outbound Messages (Preview → Editor)

#### Selection State

| Type | Payload | Description |
|------|---------|-------------|
| `selection` | `{ nodeId }` | Reports selected node ID changes |
| `highlight` | `{ nodeId }` | Reports highlighted node ID changes |
| `selectionRect` | `{ rect }` | Selection rectangle geometry (sent every animation frame) |
| `highlightRect` | `{ rect }` | Highlight rectangle geometry (sent every animation frame) |
| `textComputedStyle` | `{ styles }` | Returns 78 text rendering CSS properties for selected text node |
| `computedStyle` | `{ properties }` | Returns requested computed style values |

#### Navigation & Events

| Type | Payload | Description |
|------|---------|-------------|
| `navigate` | `{ component }` | Requests editor navigate to component (on double-click) |
| `component event` | `{ name, data }` | Custom component events |
| `data` | `{ data }` | Component data updates |
| `documentScrollSize` | `{ width, height }` | Document scroll dimensions |

#### Keyboard Forwarding

| Type | Payload | Description |
|------|---------|-------------|
| `keydown` / `keyup` / `keypress` | `{ key, code, metaKey, ... }` | Keyboard events forwarded to editor (skipped when focus is in input elements) |

#### Drag & Drop

| Type | Payload | Description |
|------|---------|-------------|
| `nodeMoved` | `{ parentNodeId, index }` | Reports completed drag with new parent and index |

#### GraphQL

| Type | Payload | Description |
|------|---------|-------------|
| `introspectionResult` | `{ data }` or `{ error }` | GraphQL schema introspection result |

---

## Drag-and-Drop System

The drag system has two modes with smooth transitions via the View Transitions API.

### DragState

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `'reorder' \| 'insert'` | Current drag mode |
| `elementType` | `'element' \| 'component' \| 'text'` | Type of dragged item |
| `copy` | `HTMLElement?` | Clone when Alt-dragging (copy mode) |
| `element` | `HTMLElement` | The dragged element |
| `repeatedNodes` | `HTMLElement[]` | Repeated items (from list rendering) |
| `offset` | `Point` | Cursor offset from element origin |
| `lastCursorPosition` | `Point` | Current cursor position |
| `initialContainer` | `HTMLElement` | Original parent element |
| `initialNextSibling` | `Element?` | Original position marker |
| `initialRect` | `DOMRect` | Original bounding box |
| `reorderPermutations` | `Array<{ nextSibling, rect }>` | All valid positions in container |
| `isTransitioning` | `boolean` | View transition in progress |
| `selectedInsertAreaIndex` | `number?` | Active insert line index |
| `insertAreas` | `Array<InsertArea>?` | Valid drop locations outside container |
| `destroying` | `boolean` | Cleanup in progress |

### Drag Lifecycle

**1. Drag Started**
- Creates DragState with `mode = 'reorder'`
- If Alt key pressed: clones element (copy mode)
- Styles repeated nodes as stacked cards with random rotation
- Calculates all `reorderPermutations` by testing every sibling position
- Starts animation loop for repeated nodes following the dragged element
- Highlights container and adds `__drag-mode--reorder` class

**2. Reorder Mode (Inside Initial Container)**
- Finds best permutation using overlap detection (element center ± 100px)
- Uses Euclidean distance to select closest overlapping position
- Triggers View Transition to smoothly animate sibling reordering
- Updates drop highlight to show insertion point

**3. Insert Mode (Outside Initial Container)**
- Switches from reorder to insert on first call
- Moves element to `document.body` with `__drag-mode--move` class
- Calculates insert areas (lines between elements)
- Reduces repeated node opacity to 0.2
- Converts areas to lines (horizontal for block layout, vertical for inline)
- Uses `findNearestLine()` for perpendicular distance calculation
- Shows radial gradient at projection point for visual feedback

**4. Drag Ended**
- Sets `view-transition-name` on dragged element and visible siblings
- Wraps DOM update in View Transition:
  - **Canceled:** restores element to initial position
  - **Reorder mode:** element already in position, cleanup only
  - **Insert mode:** moves element to selected insert area
- Cleans up classes, styles, repeated nodes
- Posts `nodeMoved` message to editor with parent and index

### Insert Area Calculation

Valid drop locations are calculated as lines between elements:

1. Query all `[data-id]` elements (excluding components and repeated items)
2. Determine layout direction (block vs inline) by checking if siblings stack vertically
3. **Block layout:** horizontal lines before/after elements
4. **Inline layout:** vertical lines before/after elements
5. Handle wrapped elements with lines at wrap boundaries
6. Offset overlapping lines by 1px per nesting level for disambiguation

### Copy vs Move

- Alt key during drag creates a clone
- Switching Alt state mid-drag restarts the drag operation with/without copy
- Copy mode: original stays in place, clone follows cursor

### Visual Indicators

- **Container highlight:** colored border around current container
  - Blue (`#2563EB`) for elements
  - Purple (`#D946EF`) for components
- **Drop line:** shows insertion point within container
- **External drop highlight:** radial gradient at nearest valid drop location

---

## Selection & Overlay System

### Overlay Rectangle Calculation

For each selected/highlighted node, computes:
- Bounding rect (`left, right, top, bottom, width, height, x, y`)
- `borderRadius` (split into individual corners)
- `rotate` transform value

### Real-Time Synchronization

A continuous `requestAnimationFrame` loop:
1. Calculates selection rect from current DOM position
2. Compares with previous frame via `fastDeepEqual`
3. If changed, posts `selectionRect` message to editor
4. Same for highlight rect
5. Recursively schedules next frame

This ensures overlays track animated, transitioning, or resizing elements.

### Click-to-Select Behavior

- Uses `document.elementsFromPoint(x, y)` to find elements at cursor
- Filters for elements with `data-id` (excludes `data-component` wrappers)
- **Meta+click:** selects text nodes or navigates to first text child
- **Double-click:** navigates to component or selects text node
- **Regular click:** selects nearest element node

### Text Node Selection

When a text node is selected, preview posts `textComputedStyle` with 78 CSS properties needed for accurate text rendering overlay (font properties, text properties, layout properties, special properties like caret-color).

---

## Design Mode vs Test Mode

### Design Mode

- Conditionally hidden nodes are forced to show when selected
- Implementation: clones component, removes `condition` from selected node and all ancestors
- Enables visual editing of nodes that would otherwise be invisible
- `data-mode="design"` set on body

### Test Mode

- Normal rendering — conditions evaluated truthfully
- All conditional overrides reverted
- `data-mode="test"` set on body

---

## Timeline Animation Control

### Keyframe Injection

Editor sends `@keyframes preview_timeline` with all keyframe positions, values, and easing functions. Injected as a `<style data-timeline-keyframes>` tag.

### Time Scrubbing

Uses CSS animation properties to display a specific animation frame:

1. Set CSS custom properties on body:
   - `--editor-timeline-position: {time}s`
   - `--editor-timeline-timing-function: {function}`
   - `--editor-timeline-fill-mode: {mode}`

2. Inject global style:
   - Pause ALL animations: `[data-id] { animation-play-state: paused !important }`
   - Apply timeline to selected element: `animation: preview_timeline 1s paused normal !important`
   - Use negative `animation-delay: calc(0s - var(--editor-timeline-position))` to scrub

The negative delay technique shows the animation at the exact specified time without playing it.

---

## Live Style Preview

### Regular Style Preview

Editor sends CSS property/value pairs for the selected node. Preview injects a `<style>` tag with:
- Selector: `[data-id="${selectedNodeId}"]${pseudoElement}`
- All properties set with `!important`
- `transition: none !important` to prevent animation during editing

### Style Variant Preview

When editor switches variant (e.g., hover, focus, responsive breakpoint):
1. Retrieves variant definition from component node
2. Evaluates custom property formulas with context
3. Injects `<style>` targeting `body[data-mode="design"] [data-id="${nodeId}"]` with variant styles
4. Combines base styles + variant styles + evaluated custom properties

### Theme Preview

Applies theme to document body for global CSS variable scoping. Supports default, defaultDark, defaultLight, and named theme variants.

### Resource Preview

Temporarily injects external resources (fonts, stylesheets) into the document head for live preview of new resource additions.

---

## GraphQL Introspection

### Process

1. Editor sends `introspect_qraphql_api` with API key
2. Preview retrieves API config from component
3. Constructs introspection query request:
   - Uses API's method if it supports body, otherwise POST
   - Overwrites body with standard GraphQL introspection query
   - Preserves headers and credentials from original API config
4. Proxies through `/.toddle/omvej/components/{componentName}/apis/{apiName}` endpoint
5. Returns schema data or error via `introspectionResult` message

### Proxy Headers

- `X-Toddle-Proxy-Url`: actual GraphQL endpoint URL
- Credentials: `same-origin` by default, or API's configured value

---

## Debug Tools

### Panic Screen

Shown for unrecoverable errors:
- **RangeError** (infinite loop / stack overflow)
- **TypeError** (null access, read-only property violations)

Renders a blue screen with white monospace text showing error name, message, and recovery suggestions. Includes a scanline overlay for retro aesthetic. Easter egg: RangeError shows recursively nested error messages.

### Editor Toast

Non-panic errors sent as toast notifications to the editor via PostMessage:
- Type: `neutral`, `warning`, or `critical`
- Contains title and message

### Log State

`window.logState()` global function for console debugging (production runtime only, not preview). Outputs component data signals as a table.

---

## Preview Runtime Initialization

### Differences from Production

| Aspect | Production (`page`) | Preview |
|--------|---------------------|---------|
| `env.runtime` | `'page'` | `'preview'` |
| Conditional override | None | Selected hidden nodes forced visible |
| Link behavior | Normal navigation | All `<a>` tags get `target="_blank"` |
| Event handling | Normal | Forwarded to editor via PostMessage |
| Style injection | None | Live style/variant/theme preview |
| Signal cleanup | On unmount | On component update (re-render) |

### Preview-Specific State

| Signal/Variable | Purpose |
|-----------------|---------|
| `showSignal` | Tracks conditionally overridden nodes for design mode |
| `mode` | `'design'` or `'test'` toggle |
| `styleVariantSelection` | Active variant for style injection |
| `animationState` | Timeline scrubbing state |
| `dragState` | Active drag operation |

### Link Modification

All `<a>` tags in the component have `target="_blank"` added to prevent navigation within the preview iframe.

---

## Injected Style Tags

| Selector/ID | Purpose |
|-------------|---------|
| `[data-timeline-keyframes]` | Animation keyframes for timeline |
| `[data-id="preview-animation-styles"]` | Paused animation styles for scrubbing |
| `[data-id="selected-node-styles"]` | Live style preview overrides |
| `[data-hash="${nodeId}"]` | Style variant overrides |
| `[data-meta-id]` | Page head tags (meta, title, etc.) |
| `#theme-style` | Theme CSS |

---

## Edge Cases

### Input Focus Detection

Keyboard events are NOT forwarded to the editor when focus is in `<input>`, `<textarea>`, `<select>`, `<style-editor>`, or any `contentEditable` element. This prevents shortcut conflicts during text editing.

### Scroll State Restoration

When the component updates, scroll position is saved before re-render and restored after. Uses a key-based sessionStorage approach to handle both vertical and horizontal scroll.

### Repeated Nodes in Drag

List-rendered items (identified by `data-id` starting with `selectedNodeId + '('`) are collected and styled as stacked cards during drag, following the primary element with interpolation.

### View Transition Fallback

If the View Transitions API is not supported, DOM mutations happen immediately without animation via `tryStartViewTransition()`.

---

## Dependencies

- **Signal System** — Reactive state for data, show, selection
- **Rendering Engine** — `renderComponent()` / `createNode()` for DOM generation
- **Formula System** — `applyFormula()` for evaluating dynamic values
- **fast-deep-equal** — Overlay rect change detection
- **View Transitions API** — Smooth drag-drop animations (with fallback)

---

## System Limits

### Editor Communication Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxMessageSize` | 10 MB | Maximum message size |
| `maxMessageRate` | 100/s | Maximum messages per second |
| `maxPendingUpdates` | 50 | Maximum pending updates |

### Enforcement

- **Message size:** Truncate with warning
- **Message rate:** Throttle messages
- **Pending updates:** Drop oldest

---

## Invariants

### Communication Invariants

1. **I-EDIT-MSG-ORIGIN:** Messages MUST come from editor origin.
2. **I-EDIT-MSG-TYPE:** Messages MUST have valid type field.
3. **I-EDIT-MSG-JSON:** Messages MUST be JSON-serializable.

### State Invariants

4. **I-EDIT-STATE-SYNC:** Preview state MUST match editor state.
5. **I-EDIT-UPDATE-ATOMIC:** Updates MUST be atomic.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-EDIT-MSG-ORIGIN | Runtime | Reject message |
| I-EDIT-MSG-TYPE | Runtime | Log error, ignore |
| I-EDIT-STATE-SYNC | Runtime | Request resync |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `EditorMessageError` | Invalid message | Log, ignore |
| `EditorSyncError` | State mismatch | Request resync |
| `EditorTimeoutError` | Response timeout | Retry |

---

## Changelog

### Unreleased
- Added System Limits section with communication limits
- Added Invariants section with 5 communication and state invariants
- Added Error Handling section with error types
