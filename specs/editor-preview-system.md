# Editor Preview System Specification

## Purpose

The Editor Preview System provides a live, interactive preview of Layr components within the visual editor. It runs inside an iframe and communicates bidirectionally with the parent editor via PostMessage. The system handles component rendering with live updates, selection/highlight tracking, style previews, animation timeline scrubbing, drag-and-drop reordering, and GraphQL API introspection.

> **Consolidated from:** `parked/editor-integration.md` (2026-02-14)
> The parked spec was merged as it contained comprehensive PostMessage protocol details and additional edge case handling.

### Jobs to Be Done

- Render components in a sandboxed iframe with real-time updates as the user edits
- Track selected and highlighted nodes with frame-perfect overlay synchronization
- Provide live style previews without committing changes to component state
- Support drag-and-drop node reordering and cross-container insertion with View Transitions API
- Enable GraphQL schema discovery for API configuration in the editor
- Forward keyboard events and user interactions to the parent editor
- Scrub animation timelines for keyframe editing
- Force-display conditionally hidden elements when selected in design mode
- Report keyboard, mouse, and component events back to the editor
- Support design mode (conditional overrides) and test mode (normal rendering)

---

## Architecture

### Communication Model

The preview runs in an iframe. All communication uses `window.postMessage()`:

- **Incoming (editor → preview):** 28 command types via `message` event listener
- **Outgoing (preview → editor):** 16 message types via `window.parent.postMessage()`
- **Security:** Incoming messages checked for `isTrusted` property
- **Origin:** Wildcard (`'*'`) used for flexibility

### Runtime Environment

The preview sets `runtime: 'preview'` in its environment, distinguishing it from the production `'page'` runtime. Key differences:

| Property | Preview | Page |
|----------|---------|------|
| `runtime` | `'preview'` | `'page'` |
| Location signal | Empty (no URL parsing) | From current URL |
| Component source | PostMessage from editor | `window.__toddle.component` |
| Data initialization | Empty `EMPTY_COMPONENT_DATA` | Hydrated from SSR |
| API triggering | Manual via message | Auto-trigger on mount |
| Meta tag updates | Static | Dynamic subscriptions |
| Body attributes | `data-mode="design\|test"` | None |
| Keyboard events | Forwarded to parent | Not forwarded |

### Global Object

`window.toddle` is initialized with:

- `isEqual`: `fastDeepEqual` function
- `formulas`, `actions`: Empty objects, populated by std-lib plugins
- `locationSignal`: Signal with empty query/params
- `env.runtime`: `'preview'`
- `_preview.showSignal`: Signal for forcing conditional elements visible

---

## Incoming PostMessage Commands

### Component & Content Updates

#### `component`
Updates the currently displayed component.

1. Store scroll state for previous component
2. Clean up previous component's signals and subscribers
3. Update component links (add `target="_blank"` to all `<a>` tags)
4. Update component context with APIs
5. Render component via `update()`
6. Restore scroll position for new component

#### `components`
Updates the list of all available project components. Each component's links are updated with `target="_blank"`. Triggers force re-render since dependencies may have changed.

#### `packages`
Updates package components and registers their formulas/actions. Components are namespaced as `{packageName}/{componentName}`.

#### `global_formulas`
Clears and re-registers global custom formulas.

#### `global_actions`
Clears and re-registers global custom actions.

#### `theme`
Injects theme CSS into `document.head` via `insertTheme()`.

### Selection & Interaction

#### `selection`
Updates the selected node. For text nodes, computes and sends 39 text-related CSS properties (font-family, font-size, caret-color, etc.) back to the editor. Clears style variant selection and updates conditional element display.

#### `highlight`
Updates the highlighted (hovered) node ID.

#### `click`
Handles click events forwarded from the parent editor.
- Uses `document.elementsFromPoint(x, y)` to find candidates
- Filters to elements with `data-id` and no `data-component` attribute
- With metaKey: selects text nodes or first text child
- Without metaKey: selects the clicked element
- Ignored in test mode

#### `dblclick`
Handles double-click.
- On component node: sends `navigate` message to open component in editor
- On text node: sends `selection` message for text editing mode

#### `mousemove`
Updates drag cursor position during drag operations. Decides between reorder/insert mode based on cursor position relative to initial container.

### Mode & Attributes

#### `mode`
Switches between `design` and `test` modes. Sets `data-mode` attribute on `document.body`. Updates conditional element display rules.

#### `attrs`
Updates component attributes (props). For page components, also updates `Location.query` parameters.

### Style Previews

#### `preview_style`
Live previews style changes without committing. Uses `requestAnimationFrame` for debouncing.

**Direct element styles:** Creates/updates `<style data-id="selected-node-styles">` with `!important` overrides and `transition: none` for instant feedback. Targets both the selected element and repeated siblings via attribute selectors.

**Theme property previews:** Generates CSS blocks scoped to theme contexts:
- Default theme: `:host, :root` selector
- Dark/light theme: `@media (prefers-color-scheme: ...)` wrapper
- Named theme: `[data-theme~="themeName"]` selector

**Pseudo-element support:** Detects pseudo-element targets from style variant selection and appends `::before`/`::after` to selectors.

#### `style_variant_changed`
Switches to a different style variant by index.

#### `preview_resources`
Temporarily injects font or other stylesheet resources as `<link data-id="preview-resource">` tags. Removes resources no longer needed before adding new ones.

#### `preview_theme`
Sets or removes the `data-theme` attribute on `document.body` for theme switching.

### Timeline & Animation

#### `set_timeline_keyframes`
Creates `<style data-timeline-keyframes>` with `@keyframes preview_timeline` definition. Each keyframe includes position percentage and optional easing function.

#### `set_timeline_time`
Scrubs the animation timeline to a specific time using CSS animation properties:

1. Sets CSS custom properties: `--editor-timeline-position`, `--editor-timeline-timing-function`, `--editor-timeline-fill-mode`
2. Creates `<style data-id="preview-animation-styles">` that:
   - Pauses all animations globally (`animation-play-state: paused`)
   - Applies `preview_timeline` animation to selected node
   - Uses negative `animation-delay` trick to scrub to specific time: `animation-delay: calc(0s - var(--editor-timeline-position))`

### Drag & Drop

#### `drag-started`
Initiates drag. Finds repeated nodes (siblings matching pattern `selectedNodeId(n)`). Delegates to `dragStarted()` which:
- Stacks repeated nodes below dragged element with random rotation
- Creates clone when `altKey` pressed (copy mode)
- Pre-calculates reorder permutations by trial-inserting element at each position
- Starts `requestAnimationFrame` loop for repeated node follow animation (interpolation factor: 0.4)

#### `drag-ended`
Completes drag. For reorder mode, sends `nodeMoved` message with parent `data-id` and insertion index. For insert mode, sends `nodeMoved` with selected insert area's parent/index. Uses View Transitions API for smooth cleanup animation.

#### `keydown` / `keyup` (during drag)
Handles keyboard modifier changes. When `altKey` changes, restarts drag in new mode (toggle copy). Updates `altKey` and `metaKey` state.

### API Operations

#### `fetch_api`
Manually triggers an API fetch. Sets API state to loading, then calls `ctx.apis[apiKey].fetch()`.

#### `introspect_qraphql_api`
Runs GraphQL introspection query against an API. Validates API is V2 (not legacy), calls `introspectApiRequest()`, and sends `introspectionResult` message back.

### Utility Commands

#### `update_inner_text`
Sets `innerText` on the selected text node.

#### `report_document_scroll_size`
Sends document `scrollHeight` and `scrollWidth` to editor.

#### `reload`
Calls `window.location.reload()`.

#### `get_computed_style`
Reads `window.getComputedStyle()` for requested properties and sends result back.

---

## Outgoing PostMessage Messages

| Message | Trigger | Data |
|---------|---------|------|
| `data` | Component data signal change | Full `ComponentData` (JSON fallback) |
| `selection` | Click/dblclick/text selection | `selectedNodeId` |
| `highlight` | Mousemove | `highlightedNodeId` |
| `selectionRect` | Every animation frame | `{ left, right, top, bottom, width, height, borderRadius, rotate }` |
| `highlightRect` | Every animation frame | Same structure as selectionRect |
| `navigate` | Double-click on component | Component `name` |
| `nodeMoved` | Drag end | `{ copy, parent, index }` |
| `textComputedStyle` | Text node selection | 39 CSS properties |
| `computedStyle` | `get_computed_style` request | Requested CSS property values |
| `documentScrollSize` | `report_document_scroll_size` request | `{ scrollHeight, scrollWidth }` |
| `introspectionResult` | GraphQL introspection complete | Introspection data + `apiKey` |
| `style` | Style update | Timestamp |
| `component event` | Runtime component event | Event data + formatted time |
| `keydown` | Document keydown | `{ key, metaKey, shiftKey, altKey }` |
| `keyup` | Document keyup | Same as keydown |
| `keypress` | Document keypress | Same as keydown |

---

## Drag-and-Drop System

The drag system has two modes with smooth transitions via the View Transitions API.

### Drag Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Reorder** | Drag within initial container | Overlap-based permutation selection |
| **Insert** | Drag outside initial container | Cross-container insertion via drop lines |

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

**1. Drag Started** (`drag-started` message)
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

**4. Drag Ended** (`drag-ended` message)
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

## Overlay Synchronization

Selection and highlight overlays are synchronized every animation frame to track animated elements. For each selected/highlighted node, computes:
- Bounding rect (`left, right, top, bottom, width, height, x, y`)
- `borderRadius` (split into individual corners)
- `rotate` transform value

### Real-Time Synchronization

```
function syncOverlayRects() {
  1. Get rect data for selected node
  2. If changed from previous (fastDeepEqual) → send selectionRect
  3. Get rect data for highlighted node
  4. If changed from previous → send highlightRect
  5. requestAnimationFrame(syncOverlayRects)
}
```

This ensures overlays track animated, transitioning, or resizing elements frame-by-frame. Changes are detected via `fastDeepEqual` comparison to minimize PostMessage traffic.

### Click-to-Select Behavior

- Uses `document.elementsFromPoint(x, y)` to find elements at cursor
- Filters for elements with `data-id` (excludes `data-component` wrappers)
- **Meta+click:** selects text nodes or navigates to first text child
- **Double-click:** navigates to component or selects text node
- **Regular click:** selects nearest element node

### Text Node Selection

When a text node is selected, preview posts `textComputedStyle` with 78 CSS properties needed for accurate text rendering overlay:
- Font: `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, etc.
- Text: `text-align`, `text-decoration`, `text-transform`, `white-space`, `word-spacing`, etc.
- Layout: `display`, `vertical-align`, `padding-*`, `border-*-width`, etc.
- Special: `caret-color`, `cursor`, `user-select`, etc.

---

## Conditional Element Display

In design mode, when a user selects a conditionally hidden element, the preview forces it visible:

1. Find selected node and all ancestors via `getNodeAndAncestors()`
2. Check if node or any ancestor has a `condition` property via `isNodeOrAncestorConditional()`
3. Collect all conditional node IDs
4. Update `showSignal` with `displayedNodes` array
5. During render: clone component with `structuredClone()`, remove `condition` from selected node and ancestors

This allows editing conditionally rendered elements without toggling the condition.

---

## GraphQL Introspection

### Purpose

Enables the editor to discover GraphQL API schemas for autocomplete, validation, and type information.

### Introspection Query

Standard GraphQL introspection query (97 lines) with:
- Schema entry points: `queryType`, `mutationType`, `subscriptionType`
- All types with full details via `FullType` fragment
- Directives with locations and arguments
- 7-level deep type nesting via recursive `TypeRef` fragment (handles `[[String!]!]!`)

### Flow

1. Editor sends `introspect_qraphql_api` message with API key
2. Preview validates API is V2 (not legacy)
3. Constructs request using existing API's method, URL, and headers
4. Overrides body with introspection query (switches to POST if method doesn't support body)
5. Routes through API proxy: `/.toddle/omvej/components/{componentName}/apis/{componentName}:{apiName}`
6. Proxy URL set in `x-layr-url` header (decoded, `+` replaced with spaces)
7. Respects API's `credentials` setting for cookie forwarding
8. Parses JSON response
9. Sends `introspectionResult` message back to editor

### Error Handling

- Non-V2 API: Silently returns (no error message)
- Failed fetch: Returns `{ error: true, message: string }`
- JSON parse error: Returns `{ error: true, message: 'Something went wrong...' }`

---

## Keyboard Event Forwarding

All keyboard events (`keydown`, `keyup`, `keypress`) on the document are forwarded to the parent editor, except when the active element is an input target:

**Input targets (filtered out):**
- `<input>`, `<textarea>`, `<select>` elements
- `<style-editor>` custom element
- Any element with `contentEditable="true"`

**Special handling:**
- `Cmd+K` (metaKey + 'k'): `preventDefault()` called before forwarding

---

## Scroll State Persistence

Scroll positions are stored per-component and restored when switching between components:

1. Before component switch: `storeScrollState(component.name)` captures scroll positions
2. After render: `getScrollStateRestorer(newComponent.name)` returns restore function
3. Restoration deferred via `requestAnimationFrame` to ensure DOM is ready
4. Uses `data-id` attribute to locate scroll targets

---

## Update Cycle

The `update()` function is the core render loop:

1. Get current component with conditional overrides (`structuredClone` + condition removal)
2. Update attributes/variables/contexts if changed
3. Update head tags if meta changed
4. Create/update APIs
5. If nodes or formulas changed:
   - Update CSS styles
   - Clear DOM (except `<script>` and `<style>` tags)
   - Create new root element via `createNode()`
   - Append to DOM
   - Trigger `onLoad` actions

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
- Click events are ignored; component behaves like production
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

## Debug Tools

### Panic Screen

Shown for unrecoverable errors:
- **RangeError** (infinite loop / stack overflow)
- **TypeError** (null access, read-only property violations)

Renders a blue screen with white monospace text showing error name, message, and recovery suggestions. Includes a scanline overlay for retro aesthetic.

### Editor Toast

Non-panic errors sent as toast notifications to the editor via PostMessage:
- Type: `neutral`, `warning`, or `critical`
- Contains title and message

### Log State

`window.logState()` global function for console debugging (production runtime only, not preview). Outputs component data signals as a table.

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

## Edge Cases

- **Untrusted messages:** Logged as error but not rejected (allows debugging)
- **JSON serialization failure on data sync:** Falls back to `JSON.parse(JSON.stringify(data))` (strips non-serializable values)
- **Drag during view transition:** `isTransitioning` flag prevents concurrent reorder operations
- **Missing component on switch:** Previous component cleaned up regardless; new component renders as empty
- **Preview in test mode:** Click events are ignored; component behaves like production
- **Theme preview with dark mode:** Generates scoped `@media (prefers-color-scheme: dark)` overrides
- **Input focus detection:** Keyboard events NOT forwarded when focus is in `<input>`, `<textarea>`, `<select>`, `<style-editor>`, or any `contentEditable` element
- **Repeated nodes in drag:** List-rendered items (identified by `data-id` starting with `selectedNodeId + '('`) are collected and styled as stacked cards
- **View Transition fallback:** If View Transitions API not supported, DOM mutations happen immediately via `tryStartViewTransition()`

---

## System Limits

### Preview Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxPreviewSize` | 5 MB | Maximum preview payload |
| `maxPreviewTime` | 5,000ms | Maximum preview render time |
| `maxPreviewUpdates` | 100/s | Maximum preview updates |

### Enforcement

- **Preview size:** Truncate component tree
- **Preview time:** Show error placeholder
- **Updates:** Throttle preview refresh

---

## Invariants

### Preview Invariants

1. **I-PREVIEW-ISOLATED:** Preview MUST run in isolated context.
2. **I-PREVIEW-RESPONSIVE:** Preview MUST respond to parent messages.
3. **I-PREVIEW-CLEAN:** Preview MUST clean up on unmount.

### Update Invariants

4. **I-PREVIEW-UPDATE-ORDERED:** Updates MUST apply in order.
5. **I-PREVIEW-STATE-CONSISTENT:** State MUST be consistent after update.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-PREVIEW-ISOLATED | Runtime | Sandbox |
| I-PREVIEW-RESPONSIVE | Runtime | Show error |
| I-PREVIEW-STATE-CONSISTENT | Runtime | Reset preview |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `PreviewRenderError` | Render fails | Show error screen |
| `PreviewTimeoutError` | Render timeout | Show timeout screen |
| `PreviewSyncError` | State mismatch | Request resync |

---

## Changelog

### Unreleased
- Added System Limits section with preview limits
- Added Invariants section with 5 preview invariants
- Added Error Handling section with error types
