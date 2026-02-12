# Layr Technical Specifications

This directory contains comprehensive technical specifications for the Layr platform — a visual application builder with a reactive component system, server-side rendering, and a declarative API integration layer.

---

## Quick Navigation

| Category | Specs | Priority |
|----------|-------|----------|
| **Infrastructure** | [Monorepo Structure](monorepo-structure.md), [Development Workflow](development-workflow.md), [Test Harness](test-harness.md) | **Start Here** |
| **Core** | [Project Data Model](project-data-model.md), [Component System](component-system.md), [Formula System](formula-system.md) | Critical |
| **Runtime** | [Rendering Engine](rendering-engine.md), [Signal System](reactive-signal-system.md), [Action System](action-system.md) | Critical |
| **Server** | [SSR Pipeline](ssr-pipeline.md), [Backend Server](backend-server.md), [Hydration](hydration-system.md) | Critical |
| **Styling** | [Styling and Theming](styling-and-theming.md), [Font System](font-system.md) | High |
| **Editor** | [Editor Integration](editor-integration.md), [Custom Elements](custom-elements.md) | High |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LAYR PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  EDITOR (packages/editor)                                                   │
│  ├── React App ──► Component Tree ──► Live Preview                          │
│  └── Project Management ◄── File Watcher ◄── JSON                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  RUNTIME (packages/runtime)                                                  │
│  ├── Component System ──► Rendering Engine ──► DOM                          │
│  │   ├── Signals ◄─────► Formula Engine ◄─────► Variables/Attributes        │
│  │   └── Slots ──► Context Providers ──► Workflows                          │
│  ├── Action Engine ◄─────► Event System                                      │
│  └── API Client ◄─────► Proxy ◄─────► Backend                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  SERVER (packages/backend)                                                   │
│  ├── Hono HTTP Server ──► Route Matching                                     │
│  │   ├── SSR Pipeline ──► HTML Generation                                    │
│  │   ├── API Proxy ──► Cookie Injection                                       │
│  │   └── Static Assets ──► Font Proxy                                        │
│  └── Project Loader ◄── /projects/{id}/project.json                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER (packages/core)                                                  │
│  ├── Signal<T> ──► Reactive State                                            │
│  ├── Component Model ──► Nodes, Formulas, Actions                           │
│  ├── Validation Schemas ──► Zod                                              │
│  └── Standard Library (packages/lib) ──► 97 Formulas, 19 Actions            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Specification Index

### Infrastructure (Start Here)

| Spec | Description | Status |
|------|-------------|--------|
| **[Monorepo Structure](monorepo-structure.md)** | Workspace layout, package responsibilities, imports | ✅ Complete |
| **[Development Workflow](development-workflow.md)** | Dev server, hot reload, testing, debugging | ✅ Complete |
| **[Test Harness](test-harness.md)** | Component testing, mocking, assertions | ✅ Complete |
| **[Build and Deployment](build-and-deployment.md)** | Build pipeline, deployment targets | ✅ Complete |

### Tier 1: Core Architecture

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Project Data Model](project-data-model.md)** | Canonical JSON structure | — |
| **[Component System](component-system.md)** | UI building blocks, state | Project Data Model |
| **[Data Validation Schemas](data-validation-schemas.md)** | Zod schemas | Project Data Model |
| **[Context Providers](context-providers.md)** | Hierarchical DI | Component System |
| **[Slot System](slot-system.md)** | Content projection | Component System |

### Tier 2: Rendering & Reactivity

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Reactive Signal System](reactive-signal-system.md)** | Fine-grained state | — |
| **[Formula System](formula-system.md)** | Declarative expressions | Signals |
| **[Formula Evaluation Engine](formula-evaluation-engine.md)** | AST evaluation | Formula System |
| **[Rendering Engine](rendering-engine.md)** | CSR pipeline | All above |
| **[List Rendering System](list-rendering-system.md)** | Keyed reconciliation | Rendering Engine |

### Tier 3: Styling

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Styling and Theming](styling-and-theming.md)** | Design tokens, CSS vars | — |
| **[Font System](font-system.md)** | Typography, Google Fonts proxy | Styling |
| **[Responsive Styling System](responsive-styling-system.md)** | Breakpoints | Styling |

### Tier 4: Actions & Events

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Action System](action-system.md)** | 10 action types | Formula System |
| **[Action Execution Engine](action-execution-engine.md)** | Action dispatch | Action System |
| **[Event System](event-system.md)** | DOM & custom events | Action System |
| **[Workflow System](workflow-system.md)** | Reusable sequences | Action System |

### Tier 5: API Integration

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[API Integration](api-integration.md)** | Declarative HTTP APIs | Formula System |
| **[API Proxy System](api-proxy-system.md)** | Backend proxying | Backend Server |
| **[API Request Construction](api-request-construction.md)** | Request building | Formula System |
| **[API Service Management](api-service-management.md)** | Service definitions | API Integration |
| **[Client API System](client-api-system.md)** | Client consumption | API Integration |
| **[Cookie Management](cookie-management.md)** | Session cookies | Backend Server |

### Tier 6: Backend & Server

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Backend Server](backend-server.md)** | Hono HTTP server | — |
| **[Backend Middleware System](backend-middleware-system.md)** | Request pipeline | Backend Server |
| **[HTML Document Head Generation](html-document-head-generation.md)** | Meta tags, preload | SSR Pipeline |
| **[Template Substitution](template-substitution.md)** | String templating | Formula System |

### Tier 7: Routing & Navigation

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Routing](routing.md)** | Routes, redirects, rewrites | Backend Server |
| **[Route Matching System](route-matching-system.md)** | URL pattern matching | Routing |
| **[Navigation System](navigation-system.md)** | Client navigation | Routing |
| **[Page Lifecycle](page-lifecycle.md)** | Init/teardown hooks | Component System |

### Tier 8: SSR & Hydration

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[SSR Pipeline](ssr-pipeline.md)** | Server-side HTML | All core systems |
| **[Hydration System](hydration-system.md)** | State transfer | SSR Pipeline |
| **[Custom Elements](custom-elements.md)** | Web Components | Component System |

### Tier 9: Editor

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Editor Integration](editor-integration.md)** | Editor↔Preview comm | Rendering Engine |
| **[Editor Preview System](editor-preview-system.md)** | Live preview | Editor Integration |
| **[Element Definitions](element-definitions.md)** | HTML/SVG catalog | — |
| **[Drag Drop System](drag-drop-system.md)** | Visual manipulation | Editor Integration |

### Tier 10: Extensibility

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Package Management](package-management.md)** | Installing packages | Project Data Model |
| **[Plugin System](plugin-system.md)** | Core extensions | Formula/Action System |
| **[Standard Library](standard-library.md)** | 97 formulas, 19 actions | Plugin System |
| **[Standard Library Architecture](standard-library-architecture.md)** | Organization | Standard Library |
| **[Custom Code System](custom-code-system.md)** | Code formulas/actions | Plugin System |

### Tier 11: Security & Quality

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Security and Sanitization](security-and-sanitization.md)** | XSS prevention | — |
| **[Error Handling Debug](error-handling-debug.md)** | Error system | — |
| **[Performance and Caching](performance-and-caching.md)** | Optimization | — |

### Deferred (Future Versions)

| Spec | Description | Status |
|------|-------------|--------|
| [Legacy Compatibility](legacy-compatibility-and-migration.md) | V1→V2 migration | Deferred |
| [Search and Linting](search-and-linting.md) | Editor features | Deferred |
| [Image CDN Management](image-cdn-management.md) | Cloud features | Deferred |
| [SEO Web Standards](seo-web-standards.md) | Advanced SEO | Deferred |

---

## Getting Started

### 1. Read Infrastructure Specs

```
1. monorepo-structure.md    → Understand the workspace
2. development-workflow.md  → Set up dev environment
3. test-harness.md          → Understand testing approach
```

### 2. Understand Core Data Models

```
1. project-data-model.md    → The JSON structure
2. component-system.md      → Components, nodes, variables
3. formula-system.md        → Expression language
4. reactive-signal-system.md → Reactivity model
```

### 3. Follow the Data Flow

```
Project JSON
    ↓
Backend loads project
    ↓
SSR renders HTML
    ↓
Client hydrates
    ↓
Runtime takes over
    ↓
User interactions → Actions → State changes → Re-render
```

---

## Specification Format

Each spec follows this structure:

```markdown
# Title

## Purpose          - Why this exists
## Jobs to Be Done  - What it enables
## Data Models      - TypeScript interfaces
## Algorithms       - How it works
## System Limits    - Safety constraints
## Invariants       - Rules that must hold
## Error Handling   - Failure modes
## Dependencies     - Related specs
## Changelog        - Evolution
```

---

## Contributing

When adding a new spec:

1. Copy the template structure
2. Define data models with TypeScript interfaces
3. Document algorithms with pseudocode
4. Add system limits and invariants
5. Link dependencies
6. Update this README

---

## Stats

- **Total Specs:** 60
- **Critical Priority:** 15
- **High Priority:** 20
- **Lines of Documentation:** ~4,500
