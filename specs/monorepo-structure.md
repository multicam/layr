# Monorepo Structure Specification

## Purpose

Defines the workspace layout for the Layr platform. A Bun workspaces monorepo with logical package splits for clean separation of concerns.

---

## Directory Layout

```
/layr
├── packages/
│   ├── types/           # Shared TypeScript type definitions
│   ├── core/            # Signal system, component model, formulas
│   ├── lib/             # Standard library (97 formulas, 19 actions)
│   ├── ssr/             # Server-side rendering pipeline
│   ├── runtime/         # Client-side CSR runtime
│   ├── backend/         # Hono HTTP server
│   ├── editor/          # React visual editor
│   └── test-harness/    # Component testing utilities
├── projects/            # Local project working directories
│   └── {project-id}/    # One folder per project
│       ├── project.json
│       └── .toddle/     # Build artifacts
├── specs/               # Technical specifications
├── package.json         # Root workspace config
├── bun.lock             # Lockfile
└── tsconfig.json        # Base TypeScript config
```

---

## Package Responsibilities

### packages/types
- All TypeScript interfaces (`Component`, `NodeModel`, `Formula`, etc.)
- Discriminated union types
- Utility types (`DeepPartial`, `Nullable`)
- No runtime code, only type definitions

### packages/core
- Signal system (`Signal<T>`)
- Formula evaluation engine
- Action execution
- Context providers
- Validation schemas (Zod)
- **Depends on:** types

### packages/lib
- 97 built-in formulas
- 19 built-in actions
- Formula/action metadata
- Auto-generated from `formula.json` files
- **Depends on:** types, core

### packages/ssr
- `renderPageBody()` - HTML string generation
- `splitRoutes()` - Route tree-shaking
- API pre-fetching
- Custom code tree-shaking
- Head generation
- **Depends on:** types, core

### packages/runtime
- `renderComponent()` - CSR DOM creation
- `createNode()` - Node dispatch
- `handleAction()` - Action execution
- Event handling
- Slot rendering
- Custom element registration
- **Depends on:** types, core

### packages/backend
- Hono HTTP server
- Route matching
- API proxy
- Font proxy
- Static asset serving
- Project loading from `/projects`
- **Depends on:** types, core, ssr

### packages/editor
- React application
- Component tree visualization
- Formula editor (Monaco)
- Drag-drop
- Live preview iframe
- Project file management
- **Depends on:** types, core, runtime

### packages/test-harness
- Component preview utilities
- Mock API/context/formula
- DOM query helpers
- Interaction simulation
- **Depends on:** types, core, runtime

---

## Workspace Configuration

### Root package.json

```json
{
  "name": "layr",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "bun run --filter './packages/*' dev",
    "build": "bun run --filter './packages/*' build",
    "test": "bun test"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "bun-types": "latest"
  }
}
```

### Package package.json Template

```json
{
  "name": "@layr/{package}",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist",
    "dev": "bun --watch ./src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@layr/types": "workspace:*"
  }
}
```

---

## TypeScript Configuration

### tsconfig.json (root)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@layr/types": ["packages/types/src"],
      "@layr/core": ["packages/core/src"],
      "@layr/lib": ["packages/lib/src"],
      "@layr/ssr": ["packages/ssr/src"],
      "@layr/runtime": ["packages/runtime/src"],
      "@layr/backend": ["packages/backend/src"],
      "@layr/editor": ["packages/editor/src"]
    }
  }
}
```

---

## Dependency Graph

```
                 types
                   │
         ┌─────────┼─────────┐
         │         │         │
        core      lib        │
         │         │         │
    ┌────┴────┐    │         │
    │         │    │         │
 runtime    ssr   │         │
    │         │    │         │
    └────┬────┘    │         │
         │         │         │
      backend      │         │
         │         │         │
         └─────────┴─────────┘
                   │
                editor
                   │
             test-harness
```

---

## Import Patterns

```typescript
// From packages/runtime/src/createNode.ts
import type { Component, NodeModel } from '@layr/types';
import { Signal } from '@layr/core';
import type { Signal as SignalType } from '@layr/types';

// From packages/backend/src/index.ts
import { renderPageBody } from '@layr/ssr';
import type { Component } from '@layr/types';
```

---

## Project Working Directories

### /projects/{project-id}/

```
/projects/my-app/
├── project.json          # Full project data model
├── .toddle/
│   ├── routes.json       # Pre-split routes
│   ├── components/       # Tree-shaken component bundles
│   ├── styles/           # Per-page CSS
│   └── custom-code/      # Per-entry custom code bundles
```

**Backend loads from:** `/projects/{project-id}/project.json`

---

## Changelog

### Unreleased
- Added packages/types for shared type definitions
- Updated dependency graph
