# Editor Implementation Specification

## Overview

Full visual editor implementation following specs/editor-architecture.md and related parked specs. React 18+ with Zustand state management, Monaco formula editor, iframe-isolated preview with PostMessage communication.

---

## Phase 1: Core Architecture

### 1.1 Package Setup

```
packages/editor/
├── package.json         # React 18, Zustand, Monaco, dnd-kit
├── tsconfig.json
├── vite.config.ts       # Dev server, HMR
└── src/
    ├── index.ts         # Exports
    ├── App.tsx          # Root component
    └── main.tsx         # Entry point
```

**Dependencies:**
- `react`, `react-dom` (18+)
- `zustand` (state)
- `immer` (immutable updates)
- `@dnd-kit/core` (drag-drop)
- `@monaco-editor/react` (formula editing)
- `hono` (backend API)
- `clsx`, `tailwind-merge` (styling)

### 1.2 Zustand Stores

**projectStore.ts** - Project state:

```typescript
interface ProjectState {
  project: Project | null;
  setProject: (p: Project) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  addNode: (componentId: string, parentId: string, node: NodeModel) => void;
  removeNode: (componentId: string, nodeId: string) => void;
  moveNode: (componentId: string, nodeId: string, newParentId: string, index: number) => void;
}
```

**selectionStore.ts** - Selection state:

```typescript
interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  hover: (id: string | null) => void;
}
```

**historyStore.ts** - Undo/redo:

```typescript
interface HistoryState {
  past: Project[];
  future: Project[];
  undo: () => void;
  redo: () => void;
  push: (state: Project) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
```

**uiStore.ts** - UI state:

```typescript
interface UIState {
  zoom: number;          // 0.1 to 4.0
  panX: number;
  panY: number;
  activeTab: 'properties' | 'styles' | 'events' | 'advanced';
  panels: { left: boolean; right: boolean; preview: boolean };
}
```

### 1.3 Layout Components

**Layout.tsx** - 3-panel layout:
- Left: Component tree
- Center: Canvas
- Right: Inspector

**Header.tsx** - Top toolbar:
- Undo/redo buttons
- Device selector
- Save/publish actions

---

## Phase 2: Canvas System

### 2.1 Canvas Components

**Canvas.tsx** - Main editing surface:

```typescript
// Features:
// - Zoom/pan with CSS transforms
// - Screen-to-canvas coordinate conversion
// - Selection overlay rendering
// - Drop zone visualization
```

**NodeRenderer.tsx** - Render component nodes:

```typescript
// Recursively render component tree to DOM
// Apply data attributes for selection
// Handle component boundaries
```

**SelectionBox.tsx** - Selection overlay:
- Bounding box with resize handles
- Real-time position tracking (requestAnimationFrame)
- Border radius replication

### 2.2 Coordinate System

```typescript
interface CanvasTransform {
  zoom: number;
  panX: number;
  panY: number;
  
  screenToCanvas(x: number, y: number): { x: number; y: number };
  canvasToScreen(x: number, y: number): { x: number; y: number };
}
```

---

## Phase 3: Component Tree

### 3.1 Tree Components

**ComponentTree.tsx** - Hierarchical view:
- Collapsible nodes
- Drag source for reordering
- Drop target for insertion
- Selection highlighting

**TreeNode.tsx** - Individual node:
- Expand/collapse
- Icon based on node type
- Context menu (delete, duplicate, etc.)

---

## Phase 4: Inspector Panel

### 4.1 Inspector Tabs

**PropertiesTab.tsx** - Attributes and variables:
- Text inputs for strings
- Number inputs with sliders
- Toggle switches for booleans
- Formula fields with Monaco

**StylesTab.tsx** - CSS editing:
- Property groups (layout, typography, etc.)
- Color picker
- Unit inputs (px, %, em, rem)
- Style variants

**EventsTab.tsx** - Event handlers:
- Event type selector
- Action builder UI
- Formula conditions

### 4.2 Field Components

**FormulaField.tsx** - Monaco-based formula editor:

```typescript
// Features:
// - Custom 'layr-formula' language
// - Autocomplete for variables/attributes
// - Live preview of evaluated value
// - Error highlighting
```

---

## Phase 5: Preview Integration

### 5.1 Preview iframe

**Preview.tsx** - iframe container:

```typescript
// Features:
// - Isolated preview context
// - Device size presets
// - Hot reload on component changes
// - Error boundary with panic screen
```

**PreviewMessage.ts** - PostMessage bridge:

```typescript
// Inbound (Editor → Preview):
// - component, components, packages
// - selection, highlight
// - drag-started, drag-ended, mousemove
// - set_timeline_keyframes, set_timeline_time
// - style_variant_changed, preview_style

// Outbound (Preview → Editor):
// - selection, highlight, selectionRect, highlightRect
// - nodeMoved, introspectionResult
// - keydown, keyup (when not in input)
```

### 5.2 Preview Runtime

Differences from production runtime:
- `env.runtime = 'preview'`
- Conditional override for design mode
- All links get `target="_blank"`
- Events forwarded to editor
- Style injection for live preview

---

## Phase 6: Drag & Drop

### 6.1 Drag System (from drag-drop-system.md)

**dragStarted.ts** - Initialize drag:
- Collect repeated nodes
- Calculate reorder permutations
- Position stacked card effect

**dragReorder.ts** - Reorder mode:
- Overlap detection
- View Transition animations
- Permutation selection

**dragMove.ts** - Insert mode:
- Calculate insert areas
- Find nearest drop line
- External container insertion

**dragEnded.ts** - Finalize:
- DOM update with View Transition
- PostMessage to editor
- Cleanup

### 6.2 Insert Area Calculation

```typescript
// From drag-drop-system.md spec:
// 1. Query all [data-id] elements
// 2. Detect block vs inline layout
// 3. Calculate drop lines
// 4. Offset overlapping lines by nesting depth
```

---

## Phase 7: Formula Editor

### 7.1 Monaco Integration

**FormulaEditor.tsx**:

```typescript
// Register 'layr-formula' language
// Autocomplete providers:
// - Variables (Variables.*)
// - Attributes (Attributes.*)
// - Built-in formulas (@toddle/*)
// - Component references
```

**Autocomplete.tsx** - Context-aware suggestions:
- Parse current token
- Resolve context (in loop, in component)
- Show documentation

**FormulaPreview.tsx** - Live evaluation:
- Evaluate formula in current context
- Display result with type indicator
- Show errors inline

---

## Phase 8: Element Definitions

### 8.1 Element Catalog

**ElementCatalog.tsx** - Searchable palette:
- 107 HTML elements
- 61+ SVG elements
- Categories (form, typography, media, semantic, svg)
- Popular elements first
- Drag-to-add support

### 8.2 Element Metadata

```typescript
interface ElementDefinition {
  name: string;
  categories: string[];
  description: string;
  isVoid?: boolean;
  isPopular?: boolean;
  permittedChildren?: string[];
  permittedParents?: string[];
  defaultNode: NodeModel;
}
```

---

## Phase 9: Timeline & Animation

### 9.1 Timeline Controls

**Timeline.tsx** - Animation scrubber:
- Keyframe markers
- Playhead position
- Time display
- Easing function selector

**AnimationPreview.tsx** - CSS animation control:
- Inject @keyframes
- Pause all animations
- Scrub via negative animation-delay

---

## File Structure

```
packages/editor/src/
├── App.tsx
├── main.tsx
│
├── layout/
│   ├── Layout.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Inspector.tsx
│
├── canvas/
│   ├── Canvas.tsx
│   ├── CanvasContainer.tsx
│   ├── NodeRenderer.tsx
│   ├── SelectionBox.tsx
│   ├── DropZone.tsx
│   └── Guides.tsx
│
├── tree/
│   ├── ComponentTree.tsx
│   ├── TreeNode.tsx
│   └── TreeDragSource.tsx
│
├── inspector/
│   ├── Inspector.tsx
│   ├── tabs/
│   │   ├── PropertiesTab.tsx
│   │   ├── StylesTab.tsx
│   │   ├── EventsTab.tsx
│   │   └── AdvancedTab.tsx
│   └── fields/
│       ├── TextField.tsx
│       ├── NumberField.tsx
│       ├── FormulaField.tsx
│       ├── ColorPicker.tsx
│       └── Select.tsx
│
├── preview/
│   ├── Preview.tsx
│   ├── PreviewToolbar.tsx
│   └── PreviewMessage.ts
│
├── formula-editor/
│   ├── FormulaEditor.tsx
│   ├── Autocomplete.tsx
│   ├── FormulaPreview.tsx
│   └── tokenizer.ts
│
├── dnd/
│   ├── dragStarted.ts
│   ├── dragReorder.ts
│   ├── dragMove.ts
│   ├── dragEnded.ts
│   ├── getInsertAreas.ts
│   └── dropHighlight.ts
│
├── elements/
│   ├── ElementCatalog.tsx
│   ├── html/*.json
│   ├── svg/*.json
│   └── buildElements.ts
│
├── stores/
│   ├── projectStore.ts
│   ├── selectionStore.ts
│   ├── historyStore.ts
│   ├── clipboardStore.ts
│   └── uiStore.ts
│
├── hooks/
│   ├── useProject.ts
│   ├── useSelection.ts
│   ├── useHistory.ts
│   ├── usePreview.ts
│   └── useKeyboardShortcuts.ts
│
└── utils/
    ├── dnd.ts
    ├── dom.ts
    ├── serialization.ts
    └── clipboard.ts
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "immer": "^10.0.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0",
    "hono": "^4.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

---

## Timeline

| Phase | Duration | Components |
|-------|----------|------------|
| 1. Core Architecture | 1 week | 8 |
| 2. Canvas System | 1 week | 6 |
| 3. Component Tree | 0.5 week | 4 |
| 4. Inspector Panel | 1 week | 12 |
| 5. Preview Integration | 1 week | 5 |
| 6. Drag & Drop | 1 week | 6 |
| 7. Formula Editor | 1 week | 4 |
| 8. Element Definitions | 0.5 week | 2 |
| 9. Timeline & Animation | 0.5 week | 2 |
| Testing & Polish | 1 week | - |
| **Total** | **8.5 weeks** | **~50 components** |

---

## MVP Milestone (End of Week 2)

- Canvas with node rendering
- Selection and highlighting
- Component tree navigation
- Basic property editing
- Preview iframe connection

This provides a working visual editor that can:
1. Display a component tree
2. Select and highlight nodes
3. Edit basic properties
4. See changes in preview

---

## Testing Strategy

### Unit Tests
- Store operations (add/remove/move nodes)
- Coordinate transforms
- Insert area calculation
- Autocomplete suggestions

### Integration Tests
- Drag-drop operations
- PostMessage protocol
- Undo/redo consistency

### E2E Tests
- Canvas interactions
- Inspector updates
- Preview synchronization

---

## Changelog

### Unreleased
- Initial implementation specification
- Based on approved implementation plan
- Covers all 9 phases of development
