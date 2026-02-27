# Layr Product Reference

Covers the product vision, user personas, MVP scope, user journey, and feature prioritization for Layr — a self-hosted visual web development platform. No specific package implements this; it guides all packages.

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Visual component editor (drag-drop, property panel) | MVP |
| Formula system (path/value/function/switch) | MVP |
| Action system (SetVariable, TriggerEvent, Fetch, Switch) | MVP |
| Signal-based reactive state | MVP |
| JSON file persistence (no database) | MVP |
| Basic routing (static + dynamic path params) | MVP |
| SSR rendering | MVP |
| CSR hydration | MVP |
| Built-in themes (5 presets) | MVP |
| CSS-in-JS styling with variants | MVP |
| Slot system (default + named slots) | MVP |
| Context providers | MVP |
| API integration (v2 requests) | MVP |
| No-auth self-hosted server | MVP |
| Linting / issue detection | MVP |
| Undo/redo | Phase 2 |
| Collaborative editing | Phase 2 |
| Custom elements (Web Components export) | Phase 2 |
| Package marketplace | Phase 2 |
| Auth / multi-user | Deferred |
| Database persistence | Deferred |
| Team workspaces | Deferred |

---

## Vision

Layr is a **self-hosted visual web development platform**. Users build full web applications through a drag-and-drop editor backed by a structured, Turing-complete data model — no hand-written code required for the common case.

Layr is a clean-room reimplementation of [Toddle](https://toddle.dev), built as an open-source, self-hostable alternative. The canonical persistence format is a single JSON file per project.

**MVP constraint:** No authentication. Single user, local-first, self-hosted.

---

## User Personas

### Primary

| Persona | Description | Core Pain |
|---------|-------------|-----------|
| **Solo builder** | Developer or technical designer building apps for themselves or small clients | Wants full control without managing a SaaS subscription; needs to self-host |
| **Low-code developer** | Developer who wants to prototype faster or hand off UI work | Tired of writing boilerplate; wants visual tooling that produces structured output |
| **Technical designer** | Designer comfortable with logic but not code | Wants to add interactivity and data without leaving the visual layer |

### Secondary [Phase 2]

| Persona | Description |
|---------|-------------|
| **Agency** | Small team building client sites with shared components |
| **Educator** | Teaching visual web concepts with a working runtime |

---

## MVP Scope

The MVP delivers a working, self-hosted visual editor capable of producing and serving real web applications from a single JSON project file.

### In Scope (MVP)

| Area | Included |
|------|----------|
| **Editor** | Component tree panel, drag-drop canvas, property panel, formula builder, action builder |
| **Persistence** | Save/load project as JSON file; no database |
| **Auth** | None — single user, open access |
| **Rendering** | SSR for initial page load; CSR hydration; preview iframe |
| **Components** | Create, edit, delete components; slot composition; context providers |
| **Formulas** | All formula types (value, path, function, object, array, switch, or, and, apply) |
| **Actions** | SetVariable, TriggerEvent, Switch, Fetch, AbortFetch, SetURLParameters, TriggerWorkflow |
| **Styling** | CSS-in-JS inline styles; style variants (hover, media query, pseudo-class); 5 built-in themes |
| **Routing** | Static + dynamic path segments; query params; page-level SEO metadata |
| **APIs** | v2 HTTP requests; autoFetch; onCompleted/onFailed/onMessage callbacks |
| **Linting** | Real-time issue detection for broken references and structural violations |
| **Preview** | In-editor live preview with test data fallback |

### Out of Scope (MVP)

| Area | Phase |
|------|-------|
| User authentication | Deferred |
| Multi-user / teams | Deferred |
| Database persistence | Deferred |
| Real-time collaboration | Phase 2 |
| Package marketplace / publishing | Phase 2 |
| Custom elements (Web Component export) | Phase 2 |
| Advanced undo/redo history | Phase 2 |
| Plugin API for custom formula/action packages | Phase 2 |

---

## User Journey (MVP)

```
1. Install & Run
   └─ Clone repo → bun install → bun dev
   └─ Open http://localhost:3000 in browser

2. Create Project
   └─ New project → enter name → creates empty project.json
   └─ Project has one blank page at route "/"

3. Build a Page
   └─ Drag elements onto canvas (div, button, text, img, etc.)
   └─ Set attributes and styles via property panel
   └─ Create component variables for state
   └─ Wire events to actions (click → SetVariable, form submit → Fetch)
   └─ Add formulas to make UI reactive

4. Add Data
   └─ Define an API (URL, method, headers, body)
   └─ Enable autoFetch or trigger via action
   └─ Use Apis.myApi.data in formula path expressions

5. Create Reusable Components
   └─ Extract repeated UI into a named component
   └─ Define attributes (inputs) and events (outputs)
   └─ Use slots to allow content injection

6. Preview & Iterate
   └─ Live preview updates on every change (<100ms target)
   └─ Test data fills in for attributes and context formulas

7. Serve the App
   └─ Backend server reads project.json
   └─ Matches URL → finds page component → SSR renders HTML
   └─ Client hydrates for interactivity
```

---

## Feature Prioritization

### P0 — Required for MVP Launch

| Feature | Rationale |
|---------|-----------|
| Element node rendering (CSR + SSR) | Core output |
| Formula evaluation engine | Powers all dynamic behavior |
| Signal system for reactivity | State management foundation |
| Variable + attribute system | Component inputs/outputs |
| JSON save/load | Persistence |
| Basic routing (path params) | Multi-page apps |
| In-editor preview iframe | Usability requirement |
| Drag-drop element placement | Core editor UX |

### P1 — Required for Useful Apps

| Feature | Rationale |
|---------|-----------|
| API fetch actions | Most apps need data |
| Style variants (hover, media query) | Basic responsive design |
| Slot system | Component composition |
| Context providers | Cross-component state |
| Linting (broken refs) | Data integrity |
| Built-in themes | Faster UI styling |

### P2 — Quality of Life

| Feature | Rationale |
|---------|-----------|
| Undo/redo | Editor usability |
| Component search | Navigation at scale |
| Auto-fix linting | Developer efficiency |
| Web Component export | Distribution outside editor |

---

## Architecture Principles

| Principle | Decision |
|-----------|----------|
| **Monorepo** | Bun monorepo with `@layr/*` packages — see `30-monorepo-and-build.md` |
| **Type safety** | TypeScript throughout; Zod schemas as runtime source of truth — see `01-data-model.md` |
| **Single JSON file** | One `project.json` per project; no database for MVP |
| **No auth (MVP)** | Self-hosted, single-user — auth deferred to a later phase |
| **Clean-room** | Reimplementation of Toddle's data model; no original code |
| **Generator-based traversal** | Memory-efficient formula/action/component walking — see `02-component-system.md` |
| **Signal-based reactivity** | Fine-grained reactive state; deep equality checks prevent unnecessary updates |
| **SSR + CSR** | Pages server-rendered for SEO; client hydrates for interactivity — see `06-rendering.md` |

---

## Package Map

| Package | Role |
|---------|------|
| `@layr/types` | Shared TypeScript types and Zod schemas |
| `@layr/core` | Signal system, formula evaluation, traversal, context |
| `@layr/runtime` | CSR rendering (DOM) and Web Component support |
| `@layr/ssr` | Server-side rendering pipeline |
| `@layr/backend` | Hono HTTP server; project file I/O |
| `@layr/editor` | Visual editor UI (React) |
| `@layr/std-lib` | 78+ built-in formulas and 17+ built-in actions |
| `@layr/search` | Linting engine; project traversal rules |

---

## Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Preview update latency | < 100ms |
| First page SSR | < 200ms TTFB |
| Linting issue accuracy | > 95% actionable |
| Auto-fix reliability | > 99% safe applies |
| Test coverage | > 80% across packages |

---

## Cross-References

| Spec | Relationship |
|------|-------------|
| `01-data-model.md` | Project JSON envelope and all entity types |
| `02-component-system.md` | Core composition abstraction |
| `03-formula-system.md` | Data transformation language |
| `04-action-system.md` | Event-driven side effects |
| `06-rendering.md` | SSR + CSR rendering pipeline |
| `20-styling-engine.md` | CSS output and style variants |
| `21-themes.md` | Design token system |
| `24-editor.md` | Visual editor implementation |
| `30-monorepo-and-build.md` | Package structure and build tooling |
| `32-backend-server.md` | HTTP server and file persistence |

