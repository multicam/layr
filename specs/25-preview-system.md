# Preview System

Bidirectional PostMessage protocol between the editor and the preview iframe. The preview runs the Layr runtime in a sandboxed iframe; the editor sends commands and receives DOM events.

**Packages:** `packages/editor/src/preview/`

---

## Phase Summary

| Feature | Status |
|---------|--------|
| PreviewBridge class | [MVP] |
| Component/components/packages messages | [MVP] |
| Selection + highlight sync (rAF loop) | [MVP] |
| Live style preview (`preview_style`) | [MVP] |
| Design / test mode toggle | [MVP] |
| Drag & drop coordination | [MVP] |
| Timeline scrubbing | [MVP] |
| GraphQL introspection | [Phase 2] |
| Keyboard event forwarding | [MVP] |
| Panic screen / error reporting | [MVP] |
| Conditional element force-display | [MVP] |
| Scroll state persistence per component | [MVP] |

---

## Architecture

```
Editor (parent window)
    │
    │  postMessage({ type, payload })
    ▼
Preview iframe (/preview.html)
    │  window.runtime = 'preview'
    │  window.toddle initialized
    │
    │  window.parent.postMessage({ type, payload })
    ▼
Editor (message event listener)
```

- **Origin:** `sendToPreview` uses `window.location.origin` (same-origin). Listener filters by `event.source === iframe.contentWindow`.
- **Security:** Incoming messages checked for `isTrusted`.
- **Format:** `{ type: string, payload: any }`

---

## PreviewBridge [MVP]

```typescript
// packages/editor/src/preview/PreviewMessage.ts

export class PreviewBridge {
  constructor(handlers: Partial<Record<PreviewMessageType, (payload: any) => void>>)

  attach(iframe: HTMLIFrameElement): void   // registers message listener
  detach(): void                            // removes listener, clears iframe ref

  // Typed send methods:
  sendComponent(component: Component, scrollKey?: string): void
  sendComponents(components: Record<string, Component>): void
  sendSelection(nodeId: string | null): void
  sendHighlight(nodeId: string | null): void
  sendDragStarted(x: number, y: number): void
  sendDragEnded(canceled?: boolean): void
  sendMouseMove(x: number, y: number, metaKey?: boolean): void
  sendMode(mode: 'design' | 'test'): void
  sendReload(): void
  sendPreviewStyle(styles: Record<string, string>, pseudoElement?: string): void
  sendTimelineTime(time: number, timingFunction?: string, fillMode?: string): void
  sendFetchApi(apiKey: string): void
}
```

**Low-level helpers** (also exported):

```typescript
function sendToPreview(iframe: HTMLIFrameElement | null, type: EditorMessageType, payload?: any): void
function createPreviewListener(
  iframe: HTMLIFrameElement | null,
  handlers: Partial<Record<PreviewMessageType, (payload: any) => void>>
): () => void   // returns cleanup function
```

---

## Editor → Preview Messages (28 types)

### Component & Content

| Type | Payload | Behavior |
|------|---------|----------|
| `component` | `{ component: Component, scrollKey?: string }` | Replace current component; restore scroll state |
| `components` | `{ components: Record<string, Component> }` | Update all available components; force re-render |
| `packages` | `{ packages: Record<string, PackageComponent> }` | Register package components + formulas/actions |
| `global_formulas` | `{ formulas: Record<string, Formula> }` | Re-register global formulas |
| `global_actions` | `{ actions: Record<string, Action> }` | Re-register global actions |
| `theme` | `{ css: string }` | Inject CSS into `<style id="theme-style">` |
| `attrs` | `{ attrs: Record<string, any> }` | Update component attribute values |
| `mode` | `{ mode: 'design' \| 'test' }` | Set `data-mode` on `document.body` |
| `reload` | `{}` | Call `window.location.reload()` |

### Selection & Interaction

| Type | Payload | Behavior |
|------|---------|----------|
| `selection` | `{ nodeId: string \| null }` | Update selected node; send 39 text CSS props if text node; update conditional display |
| `highlight` | `{ nodeId: string \| null }` | Update highlighted node ID |
| `click` | `{ x, y, metaKey? }` | `elementsFromPoint` → select node; ignored in test mode |
| `dblclick` | `{ x, y }` | Navigate to component or select text node |
| `mousemove` | `{ x, y, metaKey? }` | Update drag cursor; decide reorder vs insert mode |
| `update_inner_text` | `{ text: string }` | Set `innerText` on selected text node |
| `get_computed_style` | `{ properties: string[] }` | Read `getComputedStyle`, send back `computedStyle` |
| `report_document_scroll_size` | `{}` | Send `documentScrollSize` with `scrollHeight`/`scrollWidth` |

### Drag & Drop

| Type | Payload | Behavior |
|------|---------|----------|
| `drag-started` | `{ x, y }` | Initialize drag state; see `specs/26-drag-drop.md` |
| `drag-ended` | `{ canceled?: boolean }` | Finalize or cancel drop |
| `keydown` | `{ key, altKey, metaKey }` | Alt toggles copy mode; meta forces insert mode |
| `keyup` | `{ key, altKey, metaKey }` | Same key state tracking |

### Style Preview

| Type | Payload | Behavior |
|------|---------|----------|
| `preview_style` | `{ styles: Record<string,string>, pseudoElement?: string }` | Inject `<style data-id="selected-node-styles">` with `!important` overrides + `transition: none` |
| `style_variant_changed` | `{ variantIndex: number }` | Switch active style variant |
| `preview_resources` | `{ resources: string[] }` | Inject/remove `<link data-id="preview-resource">` tags |
| `preview_theme` | `{ theme: string \| null }` | Set/remove `data-theme` on `document.body` |

### Timeline & Animation

| Type | Payload | Behavior |
|------|---------|----------|
| `set_timeline_keyframes` | `{ keyframes: Keyframe[] }` | Inject `<style data-timeline-keyframes>` with `@keyframes preview_timeline` |
| `set_timeline_time` | `{ time: number, timingFunction?, fillMode? }` | Scrub animation via negative `animation-delay` trick |

### API

| Type | Payload | Behavior |
|------|---------|----------|
| `fetch_api` | `{ apiKey: string }` | Manually trigger API fetch |
| `introspect_graphql_api` | `{ apiKey: string }` | Run GraphQL introspection; sends back `introspectionResult` |

---

## Preview → Editor Messages (15 types)

| Type | Trigger | Payload |
|------|---------|---------|
| `selection` | Click / dblclick | `{ selectedNodeId: string }` |
| `highlight` | Mousemove | `{ highlightedNodeId: string \| null }` |
| `selectionRect` | Every rAF frame | `{ left, right, top, bottom, width, height, borderRadius, rotate }` |
| `highlightRect` | Every rAF frame | Same structure as selectionRect |
| `textComputedStyle` | Text node selected | 39 CSS properties (font, text, layout) |
| `computedStyle` | `get_computed_style` request | Requested property values |
| `navigate` | Double-click component | `{ component: string }` (component name) |
| `nodeMoved` | Drag end | `{ copy: boolean, parent: string \| null, index: number }` |
| `data` | Component data signal change | Full `ComponentData` (JSON-serialized) |
| `documentScrollSize` | `report_document_scroll_size` | `{ scrollHeight, scrollWidth }` |
| `introspectionResult` | GraphQL introspection | Introspection data + `apiKey` |
| `component event` | Runtime component event | Event data + formatted time |
| `keydown` | Document keydown (non-input) | `{ key, metaKey, shiftKey, altKey }` |
| `keyup` | Document keyup | Same |
| `keypress` | Document keypress | Same |

---

## Key Behaviors

### Overlay Synchronization

`selectionRect` and `highlightRect` are sent every animation frame via `requestAnimationFrame` loop. Changed from previous frame (via `fastDeepEqual`) before sending to minimize traffic. Captures `borderRadius` (per-corner) and `rotate` transform.

### Click-to-Select

```
elementsFromPoint(x, y)
  → filter: has [data-id], no [data-component]
  → metaKey: select text node or first text child
  → normal: select first matched element
  → ignored in test mode
```

### Design vs Test Mode

| Mode | Conditional elements | Click events | Link behavior |
|------|---------------------|--------------|---------------|
| `design` | Hidden nodes forced visible when selected | Normal | `target="_blank"` |
| `test` | Normal rendering | Ignored | `target="_blank"` |

Conditional override: `structuredClone(component)` → remove `condition` from selected node + all ancestors → render overridden clone.

### Keyboard Event Forwarding

All `keydown`/`keyup`/`keypress` forwarded to parent **except** when active element is: `<input>`, `<textarea>`, `<select>`, `<style-editor>`, or `contentEditable`. Special case: `Cmd+K` calls `preventDefault()` before forwarding.

### Live Style Preview

`preview_style` injects:
```css
[data-id="${selectedNodeId}"]${pseudoElement} {
  ${property}: ${value} !important;
  transition: none !important;
}
```

Also targets repeated siblings (loop iterations) via attribute selectors. Debounced with `requestAnimationFrame`.

### Timeline Scrubbing

```css
/* Pause all animations */
[data-id] { animation-play-state: paused !important; }

/* Apply timeline to selected element */
[data-id="${nodeId}"] {
  animation: preview_timeline 1s paused normal !important;
  animation-delay: calc(0s - var(--editor-timeline-position)) !important;
}
```

Negative `animation-delay` shows a specific frame without playing.

### Scroll State Persistence

Scroll positions stored per component name. Saved before component switch, restored after render via `requestAnimationFrame` delay.

### Error Handling

| Error type | Behavior |
|-----------|----------|
| `RangeError` / `TypeError` | Panic screen (blue screen, monospace text) |
| Other runtime errors | Toast to editor (`neutral` / `warning` / `critical`) |

---

## Injected Style Tags

| Selector | Purpose |
|----------|---------|
| `[data-timeline-keyframes]` | Animation keyframes |
| `[data-id="preview-animation-styles"]` | Paused animation for scrubbing |
| `[data-id="selected-node-styles"]` | Live style preview overrides |
| `[data-hash="${nodeId}"]` | Style variant overrides |
| `[data-meta-id]` | Page head tags |
| `#theme-style` | Theme CSS |
| `[data-id="preview-resource"]` | Temporary font/stylesheet resources |

---

## Runtime Differences from Production

| Property | Preview | Production (`page`) |
|----------|---------|---------------------|
| `env.runtime` | `'preview'` | `'page'` |
| Component source | PostMessage | `window.__toddle.component` |
| Data init | `EMPTY_COMPONENT_DATA` | Hydrated from SSR |
| Location signal | Empty | From current URL |
| API triggering | Manual via `fetch_api` message | Auto-trigger on mount |
| Links `<a>` | Always `target="_blank"` | Normal navigation |
| Keyboard events | Forwarded to parent | Not forwarded |
| Conditional nodes | Force-visible when selected | Normal |

---

## Message Type References

```typescript
// packages/editor/src/preview/PreviewMessage.ts

export type EditorMessageType =
  | 'component' | 'components' | 'packages'
  | 'global_formulas' | 'global_actions' | 'theme'
  | 'attrs' | 'mode' | 'reload'
  | 'selection' | 'highlight' | 'click' | 'dblclick'
  | 'mousemove' | 'update_inner_text'
  | 'get_computed_style' | 'report_document_scroll_size'
  | 'drag-started' | 'drag-ended' | 'keydown' | 'keyup'
  | 'set_timeline_keyframes' | 'set_timeline_time'
  | 'style_variant_changed' | 'preview_style'
  | 'preview_resources' | 'preview_theme'
  | 'fetch_api' | 'introspect_graphql_api';   // 28 total

export type PreviewMessageType =
  | 'selection' | 'highlight' | 'selectionRect' | 'highlightRect'
  | 'textComputedStyle' | 'computedStyle'
  | 'navigate' | 'component event' | 'data' | 'documentScrollSize'
  | 'error' | 'keydown' | 'keyup' | 'keypress'
  | 'nodeMoved' | 'introspectionResult';       // 16 total
```

---

## Cross-References

- Editor stores and component structure: `specs/24-editor.md`
- Drag & drop PostMessage coordination: `specs/26-drag-drop.md`
