# Monorepo and Build

Bun workspace monorepo with 10 packages sharing a single lockfile. TypeScript source is resolved directly via path aliases in development; packages export from `./src/index.ts` during local use.

**Implementing packages:** all packages (root workspace)

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Bun workspace structure | MVP |
| 10 packages with dependency graph | MVP |
| Path aliases via tsconfig | MVP |
| `bun run dev` / `bun test` / `bun run build` | MVP |
| Package exports from `./src` (no pre-build step) | MVP |
| `bun.lockfile`, isolated linker | MVP |
| CI/CD, npm publish, Docker, Cloudflare Workers deploy | Phase 2 |
| Release asset pipeline | Phase 2 |

---

## Directory Layout

```
/layr
├── packages/
│   ├── types/           # Shared TypeScript interfaces — no runtime code
│   ├── core/            # Signal system, formula engine, action execution
│   ├── lib/             # 97 built-in formulas, 19 built-in actions
│   ├── ssr/             # Server-side rendering pipeline
│   ├── runtime/         # Client-side CSR DOM engine
│   ├── backend/         # Hono HTTP server
│   ├── editor/          # React visual editor (Vite)
│   ├── themes/          # Theme definitions
│   ├── search/          # Linting and search rules
│   └── test-harness/    # Component testing utilities (no package.json yet)
├── projects/            # Local project working directories
│   └── {project-id}/
│       └── project.json
├── specs/               # Technical specifications
├── package.json         # Root workspace config
├── bun.lock             # Lockfile
└── tsconfig.json        # Base TypeScript config with path aliases
```

---

## Root package.json

```json
{
  "name": "layr",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "bun run --filter './packages/backend' dev & bun run --filter './packages/editor' dev",
    "dev:backend": "bun run --filter './packages/backend' dev",
    "dev:editor": "bun run --filter './packages/editor' dev",
    "build": "bun run --filter './packages/*' build",
    "test": "bun test"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.3.0",
    "happy-dom": "^20.6.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  }
}
```

---

## Package Inventory

| Package | Name | Key Dependencies | Build Tool |
|---------|------|-----------------|------------|
| `types` | `@layr/types` | `zod` | — (types only) |
| `core` | `@layr/core` | `@layr/types`, `fast-deep-equal`, `zod` | — |
| `lib` | `@layr/lib` | `@layr/core`, `@layr/types`, `fast-deep-equal` | — |
| `ssr` | `@layr/ssr` | `@layr/types`, `@layr/core` | — |
| `runtime` | `@layr/runtime` | `@layr/types`, `@layr/core` | — |
| `backend` | `@layr/backend` | `@layr/types`, `@layr/core`, `@layr/lib`, `hono` | `bun --watch` |
| `editor` | `@layr/editor` | `@layr/types`, `@layr/core`, `@layr/runtime`, `@layr/themes`, `react`, `zustand`, `immer`, `monaco-editor` | Vite |
| `themes` | `@layr/themes` | `@layr/types` | — |
| `search` | `@layr/search` | `@layr/types`, `@layr/core` | — |
| `test-harness` | `@layr/test-harness` | `@layr/types`, `@layr/core`, `@layr/runtime` | — |

---

## Dependency Graph

```
types
  │
  ├── core (+ zod, fast-deep-equal)
  │     │
  │     ├── lib (+ fast-deep-equal)
  │     │
  │     ├── ssr
  │     │     └── backend (+ lib, hono)
  │     │
  │     ├── runtime
  │     │     └── editor (+ themes, react, zustand, immer, monaco)
  │     │
  │     └── search
  │
  ├── themes
  │
  └── test-harness (+ core, runtime)
```

Build order (dependency-first): `types` → `core` → `lib`, `themes` → `ssr`, `runtime`, `search` → `backend`, `editor`, `test-harness`

---

## Package Responsibilities

### `@layr/types`
- All TypeScript interfaces: `Component`, `NodeModel`, `Formula`, `ActionModel`, `Project`, etc.
- Discriminated union types, utility types (`DeepPartial`, `Nullable`)
- Zod schemas exported from `./schemas`
- Zero runtime code — import/type only

### `@layr/core`
- Signal system (`Signal<T>`, computed, effects)
- `applyFormula()` — formula evaluation engine
- `handleAction()` — action execution
- Context providers and consumers
- Validation schemas
- `ToddleComponent` traversal utilities

### `@layr/lib`
- 97 built-in formulas (array, string, number, object, date, utility)
- 19 built-in actions (storage, navigation, clipboard, etc.)
- Each formula/action in its own file with adjacent metadata JSON

### `@layr/ssr`
- `renderPageBody()` — HTML string generation
- `splitRoutes()` — per-page component tree-shaking
- API pre-fetching with caching
- Custom code reference collection and code generation (`generateCustomCodeFile`)
- Head tag generation

### `@layr/runtime`
- `renderComponent()` — CSR DOM creation (no virtual DOM)
- Direct DOM manipulation, event delegation
- Condition/repeat directives
- Custom element registration
- Custom code registry (`CustomCodeRegistry`)

### `@layr/backend`
- Hono HTTP server (`server.ts`)
- Route matching and SSR page handler
- API and font proxying
- Project loader from `/projects/{id}/project.json`
- Cookie management, image CDN utilities
- Formula cache and `BatchQueue`

### `@layr/editor`
- React + Vite application
- Component tree, canvas, formula editor (Monaco)
- Drag-drop via `@dnd-kit`
- State via Zustand + Immer
- Live preview iframe

### `@layr/themes`
- Theme definitions consumed by editor and runtime

### `@layr/search`
- Linting rules for component validation
- Unknown component/formula/action detection
- Package-aware validation

### `@layr/test-harness`
- `preview()` — isolated component rendering
- Mock API, context, formula utilities
- DOM query helpers, interaction simulation

---

## Package exports pattern

All packages use direct source exports (no pre-build in development):

```json
{
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

`@layr/types` also exports `"./schemas"` → `./src/schemas.ts`.

---

## Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@layr/types":        ["packages/types/src"],
      "@layr/core":         ["packages/core/src"],
      "@layr/lib":          ["packages/lib/src"],
      "@layr/ssr":          ["packages/ssr/src"],
      "@layr/runtime":      ["packages/runtime/src"],
      "@layr/backend":      ["packages/backend/src"],
      "@layr/editor":       ["packages/editor/src"],
      "@layr/test-harness": ["packages/test-harness/src"]
    }
  }
}
```

Path aliases resolve to `src/` directories, enabling zero-build development: changing a source file is immediately visible to all consumers.

---

## Build Commands

| Command | What It Does |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Start backend (bun --watch) + editor (Vite dev) in parallel |
| `bun run dev:backend` | Backend only |
| `bun run dev:editor` | Editor only |
| `bun test` | Run all tests across all packages |
| `bun run build` | Run `build` script in every package |

**Backend `dev` script:** `bun --watch src/server.ts` — restarts on any source change.

**Editor `dev` script:** `vite` — HMR for React components.

**Editor `build` script:** `vite build` — production bundle.

---

## Projects Directory

```
/projects/{project-id}/
└── project.json    # Full Project data model (JSON)
```

- Backend resolves `PROJECTS_DIR` relative to `packages/backend/src/loader/` (4 levels up to monorepo root)
- Path traversal is rejected before any filesystem access (see `specs/32-backend-server.md`)
- `listProjects()` enumerates directories containing `project.json`

---

## Key External Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `bun` | latest | root | Runtime, package manager, test runner |
| `hono` | ^4.0.0 | backend | HTTP framework |
| `zod` | ^3 | types, core | Schema validation |
| `fast-deep-equal` | ^3.1.3 | core, lib | Deep equality |
| `react` + `react-dom` | ^18.2.0 | editor | UI framework |
| `zustand` | ^4.5.0 | editor | State management |
| `immer` | ^10.0.0 | editor | Immutable state updates |
| `monaco-editor` | ^0.45.0 | editor | Formula code editor |
| `@dnd-kit/*` | various | root + editor | Drag-and-drop |
| `happy-dom` | ^20.6.1 | root | DOM environment for tests |
| `typescript` | ^5.3.0 | root | Type checking |
| `vite` + `vitest` | ^5 / ^1 | editor | Build and test for editor |

---

## Deployment [Phase 2]

The following are not yet implemented:

- Docker multi-stage build (`oven/bun:1.3.3-debian` + distroless)
- Cloudflare Workers deployment via `wrangler`
- Node.js deployment target
- npm publish pipeline for `@layr/*` packages
- CI/CD workflows (GitHub Actions)
- Release asset preparation (`syncStaticAssets.ts`)
- Runtime bundle size enforcement (≤ 120KB for `page.main.esm.js`)
