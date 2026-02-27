# Editor

Visual web editor for Layr. React + Zustand application with a 3-panel layout, iframe-isolated preview, Monaco formula editor, and full keyboard shortcut support.

**Package:** `packages/editor/src/`

---

## Phase Summary

| Feature | Status |
|---------|--------|
| 5 Zustand stores | [MVP] |
| 3-panel layout (Header, Sidebar, Canvas, Inspector) | [MVP] |
| Canvas pan/zoom | [MVP] |
| Component tree with dnd-kit drag reorder | [MVP] |
| Inspector (5 tabs) | [MVP] |
| FormulaEditor (Monaco + autocomplete) | [MVP] |
| Preview iframe + PreviewBridge | [MVP] |
| Undo/redo (50-step history) | [MVP] |
| Keyboard shortcuts | [MVP] |
| Clipboard (copy/paste with system clipboard) | [MVP] |
| Device presets + scale | [MVP] |
| Timeline / AnimationTab | [Phase 2] |
| ElementCatalog (107 HTML + 61 SVG) | [Phase 2] |

---

## Component Structure

```
App
├── Header               — toolbar: undo/redo, device selector, save/publish
├── Layout
│   ├── left:  Sidebar → ComponentTree
│   ├── center: Canvas → NodeRenderer + SelectionBox
│   ├── right: Inspector → PropertiesTab | StylesTab | EventsTab | AnimationTab | AdvancedTab
│   └── preview: Preview → iframe + PreviewBridge
```

**App.tsx** entry point:

```tsx
export function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <Layout
        left={<Sidebar />}
        center={<Canvas />}
        right={<Inspector />}
        preview={<Preview />}
      />
    </div>
  );
}
```

---

## State Management

Five Zustand stores. All accessed via `useXxxStore` hooks. Cross-store dependencies are direct `getState()` calls, not subscriptions.

### projectStore [MVP]

```typescript
// packages/editor/src/stores/projectStore.ts
interface ProjectState {
  project: Project | null;
  activeComponent: string | null;

  setProject: (project: Project) => void;
  setActiveComponent: (componentId: string) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  addNode: (componentId: string, parentId: string, node: NodeModel, index?: number) => void;
  removeNode: (componentId: string, nodeId: string) => void;       // recursive: removes all descendants
  moveNode: (componentId: string, nodeId: string, newParentId: string, index: number) => void;
  updateNode: (componentId: string, nodeId: string, updates: Partial<NodeModel>) => void;
  setThemeConfig: (config: ProjectThemeConfig) => void;
}
```

Uses `immer` middleware. `setProject` auto-selects the first component. `removeNode` recursively collects and removes all descendants before deleting from parent's `children` array.

### selectionStore [MVP]

```typescript
// packages/editor/src/stores/selectionStore.ts
interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;

  select: (id: string, additive?: boolean) => void;   // additive toggles membership
  selectMultiple: (ids: string[]) => void;
  deselect: (id: string) => void;
  clearSelection: () => void;
  hover: (id: string | null) => void;
  isSelected: (id: string) => boolean;
}

// Convenience hooks
export const useSelectedIds = () => useSelectionStore(s => s.selectedIds);
export const useHoveredId = () => useSelectionStore(s => s.hoveredId);
export const useIsSelected = (id: string) => useSelectionStore(s => s.selectedIds.includes(id));
export const useIsHovered = (id: string) => useSelectionStore(s => s.hoveredId === id);
```

No middleware. Plain `create`. `select(id, true)` with an already-selected id deselects it (toggle).

### uiStore [MVP]

```typescript
// packages/editor/src/stores/uiStore.ts
type Tab = 'properties' | 'styles' | 'events' | 'advanced' | 'animation';

interface UIState {
  // Canvas
  zoom: number;          // 0.1–4.0, clamped by setZoom
  panX: number;
  panY: number;

  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  previewOpen: boolean;

  // Inspector
  activeTab: Tab;

  // Preview
  previewDevice: DevicePreset;
  previewScale: number;  // 0.25–2.0, clamped by setPreviewScale

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  togglePreview: () => void;
  setActiveTab: (tab: Tab) => void;
  setPreviewDevice: (device: DevicePreset) => void;
  setPreviewScale: (scale: number) => void;
}
```

Uses `persist` middleware (`localStorage` key `layr-editor-ui`). Persisted fields: `leftPanelOpen`, `rightPanelOpen`, `previewOpen`, `activeTab`, `previewDevice`. Canvas zoom/pan are not persisted.

**Device presets:**

| Name | Width | Height |
|------|-------|--------|
| iPhone SE | 375 | 667 |
| iPhone 14 | 390 | 844 |
| iPhone 14 Pro Max | 430 | 932 |
| iPad Mini | 768 | 1024 |
| iPad Pro | 1024 | 1366 |
| Desktop HD (default) | 1440 | 900 |
| Desktop 4K | 2560 | 1440 |

### historyStore [MVP]

```typescript
// packages/editor/src/stores/historyStore.ts
const MAX_HISTORY = 50;

interface HistoryState {
  past: Project[];
  future: Project[];
  isRecording: boolean;

  undo: () => void;           // restores past[-1], pushes current to future
  redo: () => void;           // restores future[0], pushes current to past
  push: (state: Project) => void;  // adds to past, clears future; no-op if !isRecording
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}
```

Cross-store: `undo`/`redo` call `useProjectStore.getState().setProject()` directly. `push` keeps only the last 50 entries (`slice(-MAX_HISTORY)`). Snapshots are deep-cloned with `JSON.parse(JSON.stringify(project))`.

### clipboardStore [MVP]

```typescript
// packages/editor/src/stores/clipboardStore.ts
interface ClipboardState {
  nodes: NodeModel[];
  sourceComponentId: string | null;

  copy: (nodes: NodeModel[], sourceId: string) => void;
  paste: () => NodeModel[] | null;   // returns new nodes with remapped IDs
  clear: () => void;
  hasContent: () => boolean;
}

// Also writes to system clipboard as JSON: { type: 'layr-nodes', nodes, sourceId }
export async function readSystemClipboard(): Promise<{ nodes, sourceId } | null>
```

`paste()` deep-clones nodes and regenerates all IDs via `crypto.randomUUID()`, maintaining internal `children` references via an id-remap `Map`.

---

## Canvas [MVP]

```
packages/editor/src/canvas/
├── Canvas.tsx         — pan/zoom container + event handling
├── NodeRenderer.tsx   — recursive component tree renderer
└── SelectionBox.tsx   — selection overlay
```

### Canvas.tsx

| Interaction | Trigger | Behavior |
|-------------|---------|----------|
| Zoom | `Ctrl/Cmd + wheel` | `setZoom(zoom ± 0.1)` |
| Pan | Middle-click drag | `setPan(x, y)` |
| Pan | `Alt + left-click drag` | Same |
| Deselect | Left-click canvas | `clearSelection()` |

CSS transform applied to inner content div:
```
transform: translate(${panX}px, ${panY}px) scale(${zoom})
transform-origin: top left
```

`SelectionBox` is rendered outside the transform div (fixed to viewport coordinates).

### NodeRenderer.tsx

Recursively renders the active component's node tree to DOM. Applies `data-id` attributes for selection and drag targeting. Component boundaries receive `data-component` attributes. Handles element, text, component, and slot node types.

### SelectionBox.tsx

Fixed overlay that tracks the bounding rect of selected nodes. Updated via `requestAnimationFrame` to follow animated/transitioning elements. Not yet implemented with resize handles (planned for Phase 2).

---

## Component Tree [MVP]

```
packages/editor/src/tree/ComponentTree.tsx
```

- Component selector (`<select>`) at top; calls `setActiveComponent`
- Hierarchical node list rendered as `<ul>` with `SortableTreeNode` per node
- Uses `@dnd-kit/core` + `@dnd-kit/sortable` for drag reorder
- `PointerSensor` with `activationConstraint.distance = 5` (prevents accidental drags)
- `KeyboardSensor` for accessibility
- Reorder currently limited to same-parent moves via `moveNode()`
- Node labels: text content (truncated 20 chars), element tag name, component name, or `'Slot'`
- Expand/collapse per node with local `useState`; defaults to expanded
- Selection highlighting via `useIsSelected(nodeId)`

---

## Inspector [MVP]

```
packages/editor/src/inspector/
├── Inspector.tsx
└── tabs/
    ├── PropertiesTab.tsx
    ├── StylesTab.tsx
    ├── EventsTab.tsx
    ├── AnimationTab.tsx
    └── AdvancedTab.tsx
```

Five tabs, controlled by `uiStore.activeTab`. Tabs render only when a node is selected (`selectedIds[0]`). Shows "Select an element to inspect" when nothing is selected.

| Tab | Content |
|-----|---------|
| `properties` | Node attributes, variables, text content |
| `styles` | CSS properties, color, unit inputs, style variants |
| `events` | Event handlers, action builder, conditions |
| `animation` | Keyframe editor, timeline scrubbing |
| `advanced` | APIs, contexts, component configuration |

All tabs receive `{ node, componentId, nodeId }` as props. `AnimationTab` receives only `{ node }`.

### FormulaField

Inspector tabs use `FormulaEditor` as an inline field for formula-bound values.

---

## Formula Editor [MVP]

```
packages/editor/src/formula-editor/FormulaEditor.tsx
```

```typescript
interface FormulaEditorProps {
  value: Formula | undefined;
  onChange?: (formula: Formula) => void;
  context?: {
    variables?: string[];
    attributes?: string[];
    formulas?: string[];
  };
  placeholder?: string;
  minHeight?: number;   // default: 60
  maxHeight?: number;   // default: 200
}
```

Monaco `@monaco-editor/react` with language `'layr-formula'`. Editor options:

| Option | Value |
|--------|-------|
| `minimap.enabled` | false |
| `lineNumbers` | off |
| `glyphMargin` | false |
| `folding` | false |
| `lineDecorationsWidth` | 0 |
| `scrollBeyondLastLine` | false |
| `wordWrap` | on |
| `fontSize` | 13 |
| `fontFamily` | `ui-monospace, monospace` |

### Autocomplete

`registerCompletionItemProvider` for `'layr-formula'` language. Suggestions from `context` prop:

| Source | Label format | Kind |
|--------|-------------|------|
| `context.variables` | `Variables.{name}` | Variable (4) |
| `context.attributes` | `Attributes.{name}` | Property (10) |
| `context.formulas` | `{name}` | Function (1), snippet `${name}($0)` |
| No context (builtins) | `Variables`, `Attributes`, `Apis`, `ListItem` | Variable (4) |

### Formula serialization

| Formula type | String representation |
|---|---|
| `{ type: 'value', value: x }` | `String(x)` |
| `{ type: 'path', path: [...] }` | `path.join('.')` |
| `{ type: 'function', name, arguments }` | `name(arg1, arg2)` |

Parse back: `@toddle/` prefix → function, `.` present → path, else → value.

---

## Keyboard Shortcuts [MVP]

Implemented in `hooks/useKeyboardShortcuts.ts`. Shortcuts are blocked when focus is in an input element.

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy selected nodes |
| `Ctrl/Cmd + V` | Paste nodes |
| `Ctrl/Cmd + X` | Cut (copy + remove) |
| `Delete` / `Backspace` | Remove selected nodes |
| `Ctrl/Cmd + D` | Duplicate selected |
| `Escape` | Clear selection |
| `Ctrl/Cmd + S` | Save project |

---

## Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.5.0",
  "immer": "^10.0.0",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@monaco-editor/react": "^4.6.0",
  "monaco-editor": "^0.45.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.0"
}
```

---

## Cross-References

- Preview iframe and PostMessage protocol: `specs/25-preview-system.md`
- Drag & drop system (canvas-level, preview-side): `specs/26-drag-drop.md`
- Node and Project types: `specs/10-types.md` (or equivalent)
