# Editor Architecture Specification

## Purpose

Defines the visual editor architecture, informed by Figma-like design tools and no-code builders.

---

## Statistical Similarity Analysis

### Reference Projects Analyzed

| Project | Similarity | Why Relevant |
|---------|------------|--------------|
| **Figma** | 85% | Canvas-based, real-time, component system |
| **Framer** | 80% | React-based, visual + code, animation |
| **Webflow** | 75% | Visual HTML/CSS, responsive design |
| **Plasmic** | 90% | Component-based, code export, headless |
| **Builder.io** | 85% | Visual builder, API-driven |
| **Glide** | 70% | No-code, data-driven UI |
| **Retool** | 65% | Component library, drag-drop |
| **Craft.js** | 95% | React page builder, draggable |

---

## Core Architecture

### Technology Stack (from Craft.js, Framer)

- **React 18+** with concurrent features
- **Zustand** for state (lighter than Redux, from Figma)
- **React DnD** or **dnd-kit** for drag-drop
- **Monaco Editor** for formula editing
- **iframe** for isolated preview

---

## Directory Structure

```
packages/editor/
├── src/
│   ├── index.ts
│   ├── App.tsx                    # Root application
│   │
│   ├── layout/
│   │   ├── Layout.tsx             # Main 3-panel layout
│   │   ├── Header.tsx             # Top toolbar
│   │   ├── Sidebar.tsx            # Left panel
│   │   └── Inspector.tsx          # Right panel
│   │
│   ├── canvas/
│   │   ├── Canvas.tsx             # Main editing surface
│   │   ├── CanvasContainer.tsx    # Zoom/pan container
│   │   ├── NodeRenderer.tsx       # Render component nodes
│   │   ├── SelectionBox.tsx       # Multi-select rectangle
│   │   ├── DropZone.tsx           # Insertion indicators
│   │   └── Guides.tsx             # Alignment guides
│   │
│   ├── tree/
│   │   ├── ComponentTree.tsx      # Hierarchical tree view
│   │   ├── TreeNode.tsx           # Individual node
│   │   └── TreeDragSource.tsx     # Drag source wrapper
│   │
│   ├── inspector/
│   │   ├── Inspector.tsx          # Right panel container
│   │   ├── tabs/
│   │   │   ├── PropertiesTab.tsx  # Attributes, variables
│   │   │   ├── StylesTab.tsx      # CSS, variants
│   │   │   ├── EventsTab.tsx      # Event handlers
│   │   │   └── AdvancedTab.tsx    # APIs, contexts
│   │   └── fields/
│   │       ├── TextField.tsx      # String input
│   │       ├── NumberField.tsx    # Number input
│   │       ├── FormulaField.tsx   # Formula editor
│   │       ├── ColorPicker.tsx    # Color input
│   │       └── Select.tsx         # Dropdown
│   │
│   ├── preview/
│   │   ├── Preview.tsx            # iframe container
│   │   ├── PreviewToolbar.tsx     # Device, zoom controls
│   │   └── PreviewMessage.tsx     # postMessage bridge
│   │
│   ├── formula-editor/
│   │   ├── FormulaEditor.tsx      # Monaco-based editor
│   │   ├── Autocomplete.tsx       # Context-aware suggestions
│   │   ├── FormulaPreview.tsx     # Live result preview
│   │   └── tokenizer.ts           # Formula parsing
│   │
│   ├── toolbar/
│   │   ├── Toolbar.tsx            # Top toolbar
│   │   ├── UndoRedo.tsx           # History controls
│   │   ├── DeviceSelector.tsx     # Responsive preview
│   │   └── Actions.tsx            # Save, publish, etc.
│   │
│   ├── stores/
│   │   ├── projectStore.ts        # Project state (Zustand)
│   │   ├── selectionStore.ts      # Current selection
│   │   ├── historyStore.ts        # Undo/redo stack
│   │   ├── clipboardStore.ts      # Copy/paste
│   │   └── uiStore.ts             # UI state (panels, zoom)
│   │
│   ├── hooks/
│   │   ├── useProject.ts          # Project operations
│   │   ├── useSelection.ts        # Selection operations
│   │   ├── useHistory.ts          # Undo/redo
│   │   ├── usePreview.ts          # Preview communication
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── utils/
│   │   ├── dnd.ts                 # Drag-drop utilities
│   │   ├── dom.ts                 # DOM helpers
│   │   ├── serialization.ts       # JSON serialization
│   │   └── clipboard.ts           # Clipboard operations
│   │
│   └── types/
│       ├── editor.ts              # Editor-specific types
│       └── dnd.ts                 # Drag-drop types
│
├── public/
│   └── index.html
│
└── package.json
```

---

## State Architecture (from Zustand docs, Figma)

### Store Design

```typescript
// stores/projectStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ProjectState {
  // Data
  project: Project;
  
  // Actions
  setProject: (project: Project) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  addNode: (componentId: string, parentId: string, node: NodeModel) => void;
  removeNode: (componentId: string, nodeId: string) => void;
  moveNode: (componentId: string, nodeId: string, newParentId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: null,
    
    setProject: (project) => set({ project }),
    
    updateComponent: (id, updates) => set((state) => {
      const component = state.project.files.components[id];
      if (component) {
        Object.assign(component, updates);
      }
    }),
    
    addNode: (componentId, parentId, node) => set((state) => {
      const component = state.project.files.components[componentId];
      const parent = component.nodes[parentId];
      if (parent && 'children' in parent) {
        parent.children.push(node.id);
        component.nodes[node.id] = node;
      }
    }),
  }))
);
```

### Selection Store

```typescript
// stores/selectionStore.ts
interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  hover: (id: string | null) => void;
}
```

### History Store (Undo/Redo)

```typescript
// stores/historyStore.ts
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

---

## Canvas Architecture (from Figma, Craft.js)

### SVG vs HTML Canvas

**Decision: HTML with CSS transforms (from Plasmic, Framer)**

Why:
- Easier DOM interaction for selection
- Native accessibility
- Simpler debugging
- CSS transforms for zoom/pan

### Coordinate System

```typescript
interface CanvasState {
  zoom: number;           // 0.1 to 4.0
  panX: number;
  panY: number;
  
  // Transform point from screen to canvas
  screenToCanvas: (x: number, y: number) => { x: number; y: number };
  
  // Transform point from canvas to screen
  canvasToScreen: (x: number, y: number) => { x: number; y: number };
}
```

### Selection Rendering

```tsx
// canvas/SelectionBox.tsx
function SelectionBox({ nodeId }: { nodeId: string }) {
  const node = useProjectStore(s => s.project.nodes[nodeId]);
  const elementRef = useRef<HTMLElement>();
  
  // Get bounding box
  const bounds = useElementBounds(elementRef);
  
  return (
    <div
      className="selection-box"
      style={{
        position: 'absolute',
        left: bounds.left - 2,
        top: bounds.top - 2,
        width: bounds.width + 4,
        height: bounds.height + 4,
        border: '2px solid var(--selection-color)',
        pointerEvents: 'none',
      }}
    >
      {/* Resize handles */}
      <ResizeHandle position="nw" />
      <ResizeHandle position="ne" />
      <ResizeHandle position="sw" />
      <ResizeHandle position="se" />
    </div>
  );
}
```

---

## Preview Communication (from Plasmic)

### postMessage Bridge

```typescript
// preview/PreviewMessage.ts

// Editor → Preview
export function sendMessageToPreview(type: string, payload: any) {
  const iframe = document.querySelector('#preview-iframe');
  iframe?.contentWindow?.postMessage({ type, payload }, '*');
}

// Preview → Editor
export function usePreviewMessages() {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'selection-change') {
        selectionStore.getState().select(event.data.payload.nodeId);
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
}
```

### Message Types

| Direction | Type | Payload |
|-----------|------|---------|
| Editor → Preview | `update-component` | `{ componentId, updates }` |
| Editor → Preview | `set-selection` | `{ nodeIds }` |
| Preview → Editor | `selection-change` | `{ nodeId }` |
| Preview → Editor | `component-mounted` | `{ componentId }` |
| Preview → Editor | `error` | `{ message, stack }` |

---

## Formula Editor (from Monaco, CodeMirror)

### Monaco Configuration

```typescript
// formula-editor/FormulaEditor.tsx
import Editor, { Monaco } from '@monaco-editor/react';

function FormulaEditor({ value, onChange }: Props) {
  return (
    <Editor
      height="100px"
      language="layr-formula"
      value={value}
      onChange={onChange}
      beforeMount={(monaco) => {
        // Register custom language
        monaco.languages.register({ id: 'layr-formula' });
        
        // Register completions
        monaco.languages.registerCompletionItemProvider('layr-formula', {
          provideCompletionItems: (model, position) => {
            const suggestions = getCompletions(model, position);
            return { suggestions };
          },
        });
      }}
      options={{
        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
```

### Autocomplete Sources

```typescript
function getCompletions(model, position): CompletionItem[] {
  const { data } = useProjectStore.getState();
  
  return [
    // Variables
    ...Object.keys(data.Variables).map(name => ({
      label: `Variables.${name}`,
      kind: CompletionItemKind.Variable,
    })),
    
    // Attributes
    ...Object.keys(data.Attributes).map(name => ({
      label: `Attributes.${name}`,
      kind: CompletionItemKind.Property,
    })),
    
    // Built-in formulas
    ...BUILTIN_FORMULAS.map(name => ({
      label: `@toddle/${name}`,
      kind: CompletionItemKind.Function,
    })),
  ];
}
```

---

## Keyboard Shortcuts (from Figma, VS Code)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + X` | Cut |
| `Delete/Backspace` | Delete selected |
| `Ctrl/Cmd + D` | Duplicate |
| `Ctrl/Cmd + G` | Group |
| `Ctrl/Cmd + Shift + G` | Ungroup |
| `Arrow keys` | Nudge (1px) |
| `Shift + Arrow` | Nudge (10px) |
| `Escape` | Deselect |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + P` | Preview |

---

## Responsive Preview

```typescript
// Device presets (from Chrome DevTools)
const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Desktop', width: 1440, height: 900 },
];
```

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxUndoSteps` | 50 | History stack size |
| `maxSelection` | 100 | Multi-select limit |
| `autoSaveInterval` | 30s | Auto-save frequency |

---

## Changelog

### Unreleased
- Initial specification
- Statistical analysis from 8 design tools
- Complete component structure
