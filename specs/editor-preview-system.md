# Editor Preview System Specification

## Purpose

The Editor Preview System provides a live, interactive preview of Layr components within the visual editor. It runs inside an iframe and communicates bidirectionally with the parent editor via PostMessage. The system handles component rendering with live updates, selection/highlight tracking, style previews, animation timeline scrubbing, drag-and-drop reordering, and GraphQL API introspection.

### Jobs to Be Done

- Render components in a sandboxed iframe with real-time updates as the user edits
- Track selected and highlighted nodes with frame-perfect overlay synchronization
- Provide live style previews without committing changes to component state
- Support drag-and-drop node reordering and cross-container insertion
- Enable GraphQL schema discovery for API configuration in the editor
- Forward keyboard events and user interactions to the parent editor
- Scrub animation timelines for keyframe editing
- Force-display conditionally hidden elements when selected in design mode

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

## Overlay Synchronization

Selection and highlight overlays are synchronized every animation frame to track animated elements:

```
function syncOverlayRects() {
  1. Get rect data for selected node
  2. If changed from previous → send selectionRect
  3. Get rect data for highlighted node
  4. If changed from previous → send highlightRect
  5. requestAnimationFrame(syncOverlayRects)
}
```

Rect data includes: `left`, `right`, `top`, `bottom`, `width`, `height`, `borderRadius` (array), `rotate` (CSS transform).

Changes are detected via `fastDeepEqual` comparison to minimize PostMessage traffic.

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
6. Proxy URL set in `x-nordcraft-url` header (decoded, `+` replaced with spaces)
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

## Edge Cases

- **Untrusted messages:** Logged as error but not rejected (allows debugging)
- **JSON serialization failure on data sync:** Falls back to `JSON.parse(JSON.stringify(data))` (strips non-serializable values)
- **Drag during view transition:** `isTransitioning` flag prevents concurrent reorder operations
- **Missing component on switch:** Previous component cleaned up regardless; new component renders as empty
- **Preview in test mode:** Click events are ignored; component behaves like production
- **Theme preview with dark mode:** Generates scoped `@media (prefers-color-scheme: dark)` overrides
