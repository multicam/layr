# Monorepo Structure Specification

## Purpose

Defines the workspace layout for the Layr platform. A Bun workspaces monorepo with logical package splits for clean separation of concerns.

---

## Directory Layout

```
/layr
├── packages/
│   ├── core/           # Signal system, component model, formulas, types
│   ├── lib/            # Standard library (97 formulas, 19 actions)
│   ├── ssr/            # Server-side rendering pipeline
│   ├── runtime/        # Client-side CSR runtime
│   ├── backend/        # Hono HTTP server
│   └── editor/         # React visual editor
├── projects/           # Local project working directories
│   └── {project-id}/   # One folder per project
│       ├── project.json
│       └── .toddle/    # Build artifacts
├── specs/              # Technical specifications (this directory)
├── package.json        # Root workspace config
├── bun.lock            # Lockfile
└── tsconfig.json       # Base TypeScript config
```

---

## Package Responsibilities

### packages/core
- Signal system (`Signal<T>`)
- Component data model (`Component`, `NodeModel`, etc.)
- Formula types and evaluation
- Action types
- Context providers
- Validation schemas (Zod)
- **No runtime dependencies** (pure logic)

### packages/lib
- 97 built-in formulas
- 19 built-in actions
- Formula/action metadata
- Auto-generated from `formula.json` files

### packages/ssr
- `renderPageBody()` - HTML string generation
- `splitRoutes()` - Route tree-shaking
- API pre-fetching
- Custom code tree-shaking
- Head generation

### packages/runtime
- `renderComponent()` - CSR DOM creation
- `createNode()` - Node dispatch
- `handleAction()` - Action execution
- Event handling
- Slot rendering
- Custom element registration

### packages/backend
- Hono HTTP server
- Route matching
- API proxy
- Font proxy
- Static asset serving
- Project loading from `/projects`

### packages/editor
- React application
- Component tree visualization
- Formula editor
- Drag-drop
- Live preview iframe
- Project file management

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
    "@layr/core": "workspace:*"
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

## Development Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Start all packages in dev mode |
| `bun run build` | Build all packages |
| `bun test` | Run all tests |
| `bun run --filter @layr/core test` | Test specific package |

---

## Import Patterns

```typescript
// From packages/runtime/src/createNode.ts
import { Signal } from '@layr/core';
import { Component, NodeModel } from '@layr/core';
import { applyFormula } from '@layr/core';
import { handleAction } from '@layr/runtime';

// From packages/backend/src/index.ts
import { renderPageBody } from '@layr/ssr';
import { splitRoutes } from '@layr/ssr';
```

---

## Dependency Graph

```
                    core
                      │
        ┌─────────────┼─────────────┐
        │             │             │
       lib          ssr         runtime
        │             │             │
        └──────┬──────┴──────┬──────┘
               │             │
            backend       editor
```

**Rules:**
- `core` has no workspace dependencies
- `lib` depends only on `core`
- `ssr` and `runtime` depend on `core`
- `backend` depends on `ssr` and `core`
- `editor` depends on `runtime` and `core`

---

## Build Artifacts

Each package builds to `./dist/`:
- `.js` files (ESM)
- `.d.ts` files (types)
- Source maps

**Development mode:** Run directly from `src/` with `bun --watch`

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

**SSR writes to:** `/projects/{project-id}/.toddle/`

---

## Changelog

### Unreleased
- Initial specification
