# Layr Specifications

Technical specifications for the Layr visual web development platform — a clean-room reimplementation of Toddle's component model, self-hosted first.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict) |
| Runtime | Bun |
| Monorepo | Bun workspaces (10 packages) |
| Backend | Hono.js |
| Editor | React + Zustand + Vite |
| Styling | Tailwind (editor), CSS custom properties (runtime) |
| Validation | Zod |
| Reactivity | SolidJS-inspired signals |
| Testing | Bun test + happy-dom |
| Persistence | JSON files on disk |

## Implementation Status

| Phase | Count | Description |
|-------|-------|-------------|
| **MVP** | 22 specs | Fully implemented, tests passing |
| **Partial** | 6 specs | Core features built, Phase 2 items remaining |
| **Phase 2** | 0 specs | All core specs implemented |
| **Deferred** | 1 spec (parked) | Custom elements |

---

## Spec Index

### 00–14: Product & Core Technical

| # | Spec | Packages | Status |
|---|------|----------|--------|
| 00 | [00-product-reference.md](00-product-reference.md) | — | Product vision, personas, MVP scope, user journey |
| 01 | [01-data-model.md](01-data-model.md) | `@layr/types` | Project, Component, Node, Formula, Action types with Zod schemas |
| 02 | [02-component-system.md](02-component-system.md) | `@layr/core`, `@layr/runtime` | Components, slots, context providers, traversal |
| 03 | [03-formula-system.md](03-formula-system.md) | `@layr/types`, `@layr/core` | Formula types + evaluation engine |
| 04 | [04-action-system.md](04-action-system.md) | `@layr/types`, `@layr/core` | Action types + execution engine + workflows |
| 05 | [05-signal-system.md](05-signal-system.md) | `@layr/core` | Reactive signal system |
| 06 | [06-rendering.md](06-rendering.md) | `@layr/ssr`, `@layr/runtime` | SSR + runtime DOM rendering |
| 07 | [07-event-system.md](07-event-system.md) | `@layr/runtime` | Event delegation, handlers, custom events |
| 08 | [08-navigation.md](08-navigation.md) | `@layr/runtime` | Client navigation, URL parsing, History API, View Transitions |
| 09 | [09-route-matching.md](09-route-matching.md) | `@layr/backend` | Backend route matching, dynamic params, catch-all |
| 10 | [10-api-system.md](10-api-system.md) | `@layr/runtime`, `@layr/backend` | API definitions, fetch, request construction. Proxy routes [Phase 2] |
| 11 | [11-page-lifecycle.md](11-page-lifecycle.md) | `@layr/runtime` | Mount/unmount, hydration, entry points. Custom element entry [Deferred] |
| 12 | [12-standard-library.md](12-standard-library.md) | `@layr/lib` | 125 formulas + 18 actions — COMPLETE! |
| 13 | [13-search-and-linting.md](13-search-and-linting.md) | `@layr/search` | Project walker, 57 rules — COMPLETE! |
| 14 | [14-error-handling.md](14-error-handling.md) | `@layr/core`, `@layr/runtime` | Error collection, boundaries, debug. Editor overlays [Phase 2] |

### 20–26: Design & Presentation

| # | Spec | Packages | Status |
|---|------|----------|--------|
| 20 | [20-styling-engine.md](20-styling-engine.md) | `@layr/runtime`, `@layr/ssr` | CSS, responsive, media queries, fonts, custom properties |
| 21 | [21-themes.md](21-themes.md) | `@layr/themes` | 5 built-in themes with light/dark variants |
| 22 | [22-design-system.md](22-design-system.md) | — | Design tokens, component catalog, motion. **Next build target** [Phase 2] |
| 23 | [23-seo-and-head.md](23-seo-and-head.md) | `@layr/ssr` | Meta tags, OG, head generation, sitemap, robots. Routes [Phase 2] |
| 24 | [24-editor.md](24-editor.md) | `@layr/editor` | Editor architecture: Zustand stores, canvas, inspector, formula editor |
| 25 | [25-preview-system.md](25-preview-system.md) | `@layr/editor` | Editor↔preview PostMessage protocol (28+15 message types) |
| 26 | [26-drag-drop.md](26-drag-drop.md) | `@layr/editor` | Drag lifecycle, insert areas, visual feedback |

### 30–33: Infrastructure & Config

| # | Spec | Packages | Status |
|---|------|----------|--------|
| 30 | [30-monorepo-and-build.md](30-monorepo-and-build.md) | all | Monorepo structure, 10 packages, build, dependency graph. Deploy [Phase 2] |
| 31 | [31-dev-workflow.md](31-dev-workflow.md) | all | Dev server, hot reload, Bun test, test harness. 1325+ tests |
| 32 | [32-backend-server.md](32-backend-server.md) | `@layr/backend` | Hono server, middleware, cookies, caching, image CDN |
| 33 | [33-packages-and-plugins.md](33-packages-and-plugins.md) | `@layr/runtime`, `@layr/core` | Custom code (MVP), package registry + plugins [Phase 2] |

### Parked

| Spec | Reason |
|------|--------|
| [parked/custom-elements.md](parked/custom-elements.md) | Web components export — deferred until core platform stabilizes |

---

## Architecture

```
@layr/types        ← Zod schemas, TypeScript interfaces
     │
@layr/core         ← Signals, formula eval, action exec, context, traversal
     │
  ┌──┼──────────────────────────┐
  │  │                          │
@layr/lib    @layr/themes    @layr/search
(125 formulas (5 themes)     (57 lint rules)
 18 actions)                 COMPLETE!
  │
  ├── @layr/ssr      ← Server-side rendering, head, fonts, SEO
  │
  ├── @layr/runtime  ← Client-side rendering, events, navigation, hydration
  │
  ├── @layr/backend  ← Hono HTTP server, routing, cookies, caching
  │
  └── @layr/editor   ← React + Zustand visual editor
```

## Phase Tags

Specs use inline tags to mark implementation status:

| Tag | Meaning |
|-----|---------|
| `[MVP]` | Implemented and tested |
| `[Phase 2]` | Designed but not yet built |
| `[Deferred]` | Deprioritized, may not be built |

Each spec includes a phase summary table at the top.

---

## Quick Start

```bash
bun install
bun run dev          # Backend (3000) + Editor (5173)
bun test             # 1537+ tests, ~95% coverage
```

Demo project: `http://localhost:3000/demo/`
