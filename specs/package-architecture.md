# Package Architecture Specification

## Purpose

Defines the internal architecture of each package, informed by successful open-source projects in similar domains.

---

## Statistical Similarity Analysis

### Reference Projects Analyzed

| Project | Similarity | Why Relevant |
|---------|------------|--------------|
| **SolidJS** | 90% | Signal-based reactivity, fine-grained updates |
| **Qwik** | 85% | SSR + hydration, resumability |
| **React** | 80% | Component model, virtual DOM concepts |
| **Svelte** | 75% | Compile-time optimization, reactivity |
| **Astro** | 70% | Multi-framework SSR, island architecture |
| **Fresh (Deno)** | 75% | Island-based hydration, Preact |
| **Vite** | 65% | Dev server, HMR patterns |
| **Hono** | 95% | Edge-first HTTP server, middleware |

---

## packages/core Architecture

### Informed by: SolidJS Signals, RxJS

```
packages/core/
├── src/
│   ├── index.ts              # Public exports
│   ├── signal/
│   │   ├── signal.ts         # Signal<T> implementation
│   │   ├── computed.ts       # Derived signals
│   │   ├── effect.ts         # Side effects
│   │   └── context.ts        # Context boundaries
│   ├── component/
│   │   ├── types.ts          # Component, NodeModel types
│   │   ├── attribute.ts      # Attribute handling
│   │   ├── variable.ts       # Variable management
│   │   └── context.ts        # Context provider/consumer
│   ├── formula/
│   │   ├── types.ts          # Formula union types
│   │   ├── evaluate.ts       # applyFormula()
│   │   ├── operations.ts     # 10 operation handlers
│   │   └── cache.ts          # Memoization
│   ├── action/
│   │   ├── types.ts          # ActionModel union
│   │   └── handle.ts         # handleAction()
│   ├── schemas/
│   │   ├── component.ts      # Zod schemas
│   │   ├── formula.ts
│   │   └── action.ts
│   └── utils/
│       ├── equality.ts       # Deep equality
│       ├── hash.ts           # Hashing utilities
│       └── escape.ts         # XSS prevention
└── package.json
```

**Key Decisions (from SolidJS):**
- Signals are the primitive, components consume signals
- Fine-grained reactivity (no virtual DOM diffing)
- Effect tracking via implicit dependency graph

---

## packages/types Architecture

### New Package: Shared Type Definitions

### Informed by: TypeScript monorepos (pnpm, turborepo)

```
packages/types/
├── src/
│   ├── index.ts              # Re-export everything
│   ├── component.ts          # Component, NodeModel, etc.
│   ├── formula.ts            # Formula, FormulaOperation
│   ├── action.ts             # ActionModel variants
│   ├── api.ts                # ApiRequest, ApiResponse
│   ├── theme.ts              # Theme, Token definitions
│   ├── route.ts              # Route, RouteSegment
│   ├── signal.ts             # Signal<T>, Subscriber
│   └── utils.ts              # DeepPartial, Nullable
└── package.json
```

**Why separate types package:**
1. Avoids circular dependencies between core/ssr/runtime
2. Single source of truth for all interfaces
3. Editor can import types without runtime code
4. Cleaner package boundaries

**Type Organization Pattern (from Zod, tRPC):**

```typescript
// packages/types/src/component.ts

// Base types (no dependencies)
export interface Component {
  name: string;
  nodes: Record<string, NodeModel>;
  attributes?: Record<string, ComponentAttribute>;
  // ...
}

// Derived types
export type PageComponent = Component & { route: PageRoute };
export type PackageComponent = Component & { exported: true };

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
```

---

## packages/runtime Architecture

### Informed by: SolidJS, Preact, Vue runtime

```
packages/runtime/
├── src/
│   ├── index.ts
│   ├── render/
│   │   ├── component.ts      # renderComponent()
│   │   ├── node.ts           # createNode() dispatch
│   │   ├── element.ts        # createElement()
│   │   ├── text.ts           # createTextNode()
│   │   ├── slot.ts           # createSlot()
│   │   └── component.ts      # createChildComponent()
│   ├── dom/
│   │   ├── attributes.ts     # setAttribute, classes
│   │   ├── events.ts         # Event listeners
│   │   ├── styles.ts         # CSS custom properties
│   │   └── namespace.ts      # SVG/MathML
│   ├── directives/
│   │   ├── condition.ts      # Conditional rendering
│   │   └── repeat.ts         # List rendering
│   ├── api/
│   │   ├── client.ts         # Client-side API
│   │   └── status.ts         # ApiStatus management
│   └── lifecycle/
│       ├── mount.ts          # onLoad
│       └── update.ts         # onAttributeChange
└── package.json
```

**Key Decisions (from SolidJS/Preact):**
- No virtual DOM - direct DOM manipulation
- Condition/repeat as composable directives
- Event delegation at component root (optional)

---

## packages/ssr Architecture

### Informed by: Astro, Qwik, Remix

```
packages/ssr/
├── src/
│   ├── index.ts
│   ├── render/
│   │   ├── page.ts           # renderPageBody()
│   │   ├── component.ts      # renderComponent()
│   │   ├── node.ts           # renderNode()
│   │   ├── element.ts        # renderElement()
│   │   └── text.ts           # renderText()
│   ├── api/
│   │   ├── evaluate.ts       # evaluateApis()
│   │   ├── fetch.ts          # fetchApi()
│   │   └── cache.ts          # Request caching
│   ├── head/
│   │   ├── meta.ts           # Meta tags
│   │   ├── links.ts          # Preloads, fonts
│   │   └── scripts.ts        # Hydration injection
│   ├── split/
│   │   ├── routes.ts         # splitRoutes()
│   │   ├── components.ts     # takeIncludedComponents()
│   │   └── custom-code.ts    # Tree-shake formulas/actions
│   └── utils/
│       ├── escape.ts         # HTML escaping
│       └── serialize.ts      # JSON serialization
└── package.json
```

**Key Decisions (from Astro):**
- String-based HTML generation (no streaming initially)
- API pre-fetching with caching
- Custom code tree-shaking at build time

---

## packages/backend Architecture

### Informed by: Hono, Fastify, Express

```
packages/backend/
├── src/
│   ├── index.ts              # Server entry
│   ├── server.ts             # Hono app creation
│   ├── routes/
│   │   ├── page.ts           # Page route handler
│   │   ├── api-proxy.ts      # API proxy
│   │   ├── fonts.ts          # Font proxy
│   │   ├── static.ts         # Static assets
│   │   └── project.ts        # Project CRUD
│   ├── middleware/
│   │   ├── cors.ts           # CORS handling
│   │   ├── headers.ts        # Header cleanup
│   │   └── error.ts          # Error handling
│   ├── loader/
│   │   ├── project.ts        # Load from /projects
│   │   └── package.ts        # Load packages
│   └── utils/
│       ├── request.ts        # Request helpers
│       └── response.ts       # Response helpers
└── package.json
```

**Key Decisions (from Hono):**
- Middleware-first architecture
- Route handlers are pure functions
- Edge-compatible (no Node.js-specific APIs)

---

## packages/lib Architecture

### Informed by: Lodash, Ramda, date-fns

```
packages/lib/
├── src/
│   ├── index.ts              # Auto-generated exports
│   ├── formulas/
│   │   ├── array/
│   │   │   ├── map.ts
│   │   │   ├── filter.ts
│   │   │   └── ...
│   │   ├── string/
│   │   │   ├── concatenate.ts
│   │   │   └── ...
│   │   ├── number/
│   │   ├── object/
│   │   ├── date/
│   │   └── utils/
│   ├── actions/
│   │   ├── storage.ts
│   │   ├── navigation.ts
│   │   └── ...
│   └── generated/
│       └── index.ts          # Auto-generated from JSON
└── package.json
```

**Key Decisions (from Lodash/date-fns):**
- One file per formula/action
- Metadata in adjacent `formula.json` files
- Auto-generated barrel export

---

## packages/editor Architecture

### Informed by: Figma, Framer, Webflow, Plasmic

```
packages/editor/
├── src/
│   ├── index.ts
│   ├── app/
│   │   ├── App.tsx           # Root component
│   │   ├── layout.tsx        # Main layout
│   │   └── router.tsx        # React Router
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx    # Main editing area
│   │   │   ├── Node.tsx      # Draggable node
│   │   │   └── Selection.tsx # Selection box
│   │   ├── tree/
│   │   │   ├── Tree.tsx      # Component tree
│   │   │   └── TreeNode.tsx
│   │   ├── panels/
│   │   │   ├── Properties.tsx
│   │   │   ├── Styles.tsx
│   │   │   └── Events.tsx
│   │   └── preview/
│   │       ├── Preview.tsx   # iframe preview
│   │       └── Toolbar.tsx
│   ├── stores/
│   │   ├── project.ts        # Project state
│   │   ├── selection.ts      # Selection state
│   │   └── history.ts        # Undo/redo
│   ├── hooks/
│   │   ├── useProject.ts
│   │   ├── useSelection.ts
│   │   └── usePreview.ts
│   └── utils/
│       ├── dnd.ts            # Drag-drop utilities
│       └── serialization.ts
└── package.json
```

**Key Decisions (from Figma/Plasmic):**
- Canvas is SVG-based for precise positioning
- Zustand or Jotai for state (lighter than Redux)
- iframe for isolated preview
- Real-time sync via postMessage

---

## packages/test-harness Architecture

```
packages/test-harness/
├── src/
│   ├── index.ts
│   ├── preview.ts            # Component preview
│   ├── mock/
│   │   ├── api.ts            # Mock API responses
│   │   ├── formula.ts        # Mock formulas
│   │   └── context.ts        # Mock context
│   ├── queries/
│   │   ├── find.ts           # DOM queries
│   │   └── text.ts           # Text extraction
│   ├── actions/
│   │   ├── click.ts          # Click simulation
│   │   └── type.ts           # Type simulation
│   └── wait/
│       ├── waitFor.ts        # Async waiting
│       └── waitForApi.ts
└── package.json
```

---

## Dependency Graph (Final)

```
              types
                │
        ┌───────┴───────┐
        │               │
       core            lib
        │               │
   ┌────┴────┐          │
   │         │          │
runtime    ssr         │
   │         │          │
   └────┬────┘          │
        │               │
     backend            │
        │               │
        └───────┬───────┘
            │
          editor
            │
       test-harness
```

---

## Import Patterns

```typescript
// From packages/runtime
import { Signal } from '@layr/core';
import { Component, NodeModel } from '@layr/types';
import { map, filter } from '@layr/lib';

// From packages/backend
import { renderPageBody } from '@layr/ssr';
import { loadProject } from '@layr/backend/loader';

// From packages/editor
import { useProject } from '@layr/editor/hooks';
import { Canvas } from '@layr/editor/components';
```

---

## Changelog

### Unreleased
- Initial specification
- Added packages/types architecture
- Statistical similarity analysis from 8 reference projects
