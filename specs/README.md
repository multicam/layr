# Layr Specifications

## Overview

This directory contains technical specifications for the Layr visual development platform.

---

## Quick Status

| Category | Implemented | In Progress | Not Started | Total |
|----------|-------------|-------------|-------------|-------|
| Core | 18 | 0 | 0 | 18 |
| Backend | 6 | 0 | 0 | 6 |
| Build & Deployment | 2 | 0 | 0 | 2 |
| SSR | 5 | 0 | 0 | 5 |
| Runtime | 9 | 0 | 0 | 9 |
| Editor | 6 | 0 | 0 | 6 |
| Infrastructure | 9 | 0 | 0 | 9 |
| Styleguide | 1 | 0 | 0 | 1 |
| Standard Library | 0 | 2 | 0 | 2 |
| Search | 0 | 2 | 0 | 2 |
| **Total** | **51** | **6** | **0** | **57** |

### Partially Implemented

| Spec | Missing Components |
|------|-------------------|
| standard-library.md | 19 actions (infrastructure complete) |
| standard-library-architecture.md | Actions architecture |
| search-and-linting.md | 50+ linting rules (8 implemented) |

---

## Active Specifications

### Infrastructure (9 specs)
| Spec | Status | Description |
|------|--------|-------------|
| [monorepo-structure.md](monorepo-structure.md) | ✅ | Bun workspaces, package layout |
| [development-workflow.md](development-workflow.md) | ✅ | Dev commands, testing |
| [test-harness.md](test-harness.md) | ✅ | Testing utilities |
| [package-architecture.md](package-architecture.md) | ✅ | Package internals |
| [development-state.md](development-state.md) | ✅ | **Current status summary** |
| [api-request-construction.md](api-request-construction.md) | ✅ | URL building, query params, hashing |
| [api-service-management.md](api-service-management.md) | ✅ | Reusable API services |
| [plugin-system.md](plugin-system.md) | ✅ | Custom formulas/actions |
| [error-handling-debug.md](error-handling-debug.md) | ✅ | Panic screen, toasts, logging |

### Styleguide (1 spec)
| Spec | Status | Description |
|------|--------|-------------|
| [default-styleguide.md](default-styleguide.md) | ✅ | Default themes inspired by Writizzy |

### Standard Library (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [standard-library.md](standard-library.md) | ⚠️ | @layr/lib (formulas ✅, actions pending) |
| [standard-library-architecture.md](standard-library-architecture.md) | ⚠️ | @layr/lib |

### Search (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [search-and-linting.md](search-and-linting.md) | ⚠️ | @layr/search (8/58 rules) |
| [search-and-linting-engine.md](search-and-linting-engine.md) | ✅ | @layr/search |

### Core Types (5 specs)
| Spec | Status | Package |
|------|--------|---------|
| [project-data-model.md](project-data-model.md) | ✅ | @layr/types |
| [component-system.md](component-system.md) | ✅ | @layr/types |
| [formula-system.md](formula-system.md) | ✅ | @layr/types |
| [action-system.md](action-system.md) | ✅ | @layr/types |
| [element-definitions.md](element-definitions.md) | ✅ | @layr/editor |

### Core Logic (8 specs)
| Spec | Status | Package |
|------|--------|---------|
| [reactive-signal-system.md](reactive-signal-system.md) | ✅ | @layr/core |
| [formula-evaluation-engine.md](formula-evaluation-engine.md) | ✅ | @layr/core |
| [action-execution-engine.md](action-execution-engine.md) | ✅ | @layr/core |
| [context-providers.md](context-providers.md) | ✅ | @layr/core |
| [introspection-and-traversal.md](introspection-and-traversal.md) | ✅ | @layr/core |
| [data-validation-schemas.md](data-validation-schemas.md) | ✅ | @layr/core |
| [workflow-system.md](workflow-system.md) | ✅ | @layr/core |
| [package-management.md](package-management.md) | ✅ | @layr/core |

### Standard Library (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [standard-library.md](standard-library.md) | ✅ | @layr/lib |
| [standard-library-architecture.md](standard-library-architecture.md) | ✅ | @layr/lib |

### Backend (6 specs)
| Spec | Status | Package |
|------|--------|---------|
| [backend-server.md](backend-server.md) | ✅ | @layr/backend |
| [routing.md](routing.md) | ✅ | @layr/backend |
| [route-matching-system.md](route-matching-system.md) | ✅ | @layr/backend |
| [cookie-management.md](cookie-management.md) | ✅ | @layr/backend |
| [image-cdn-management.md](image-cdn-management.md) | ✅ | @layr/backend |
| [performance-and-caching.md](performance-and-caching.md) | ✅ | @layr/backend |

### Build & Deployment (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [build-and-deployment.md](build-and-deployment.md) | ✅ | Build system |
| [dynamic-asset-generation.md](dynamic-asset-generation.md) | ✅ | Asset bundling |

### SSR (5 specs)
| Spec | Status | Package |
|------|--------|---------|
| [ssr-pipeline.md](ssr-pipeline.md) | ✅ | @layr/ssr |
| [html-document-head-generation.md](html-document-head-generation.md) | ✅ | @layr/ssr |
| [font-system.md](font-system.md) | ✅ | @layr/ssr |
| [security-and-sanitization.md](security-and-sanitization.md) | ✅ | @layr/ssr |
| [seo-web-standards.md](seo-web-standards.md) | ✅ | @layr/ssr |

### Runtime (9 specs)
| Spec | Status | Package |
|------|--------|---------|
| [rendering-engine.md](rendering-engine.md) | ✅ | @layr/runtime |
| [slot-system.md](slot-system.md) | ✅ | @layr/runtime |
| [event-system.md](event-system.md) | ✅ | @layr/runtime |
| [custom-code-system.md](custom-code-system.md) | ✅ | @layr/runtime |
| [styling-and-theming.md](styling-and-theming.md) | ✅ | @layr/runtime |
| [navigation-system.md](navigation-system.md) | ✅ | @layr/runtime |
| [page-lifecycle.md](page-lifecycle.md) | ✅ | @layr/runtime |
| [responsive-styling-system.md](responsive-styling-system.md) | ✅ | @layr/runtime |
| [runtime-entry-points.md](runtime-entry-points.md) | ✅ | @layr/runtime |

### Editor (6 specs)
| Spec | Status | Package |
|------|--------|---------|
| [editor-architecture.md](editor-architecture.md) | ✅ | @layr/editor |
| [editor-implementation.md](editor-implementation.md) | ✅ | @layr/editor |
| [editor-preview-system.md](editor-preview-system.md) | ✅ | @layr/editor |
| [drag-drop-system.md](drag-drop-system.md) | ✅ | @layr/editor |

---

## Parked Specifications

1 spec in `parked/` directory — lower priority:

- **Custom Elements**: Web components export

See [parked/README.md](parked/README.md) for details.

---

## Work Items

See [thoughts/work-items/](../thoughts/work-items/) for pending implementation tasks:

- **[v1-legacy-code-removal.md](../thoughts/work-items/v1-legacy-code-removal.md)** - ✅ COMPLETED: All v1/legacy code removed (V2 is now baseline)

## Implementation Notes

### Status Legend Clarification

| Icon | Meaning |
|------|---------|
| ✅ | Fully implemented - all spec features in code, tests passing |
| ⚠️ | Partially implemented - core features exist, may need additional work |
| 📝 | Spec complete, implementation not started |
| ❌ | Not implemented |

### Recently Completed (2026-02-15)

- `default-styleguide.md` - @layr/themes package with 5 themes (minimal, brutalism, neobrutalism, terminal, notion)
- Theme selector in editor sidebar
- Standard library actions (19 actions: storage, cookies, navigation, events, timers, sharing, theme)
- Additional linting rules (unknownComponent, unknownFormula, unknownEvent, noReferenceAttribute, noReferenceVariable)

### Previously Completed (2026-02-14)

The following specs were fully implemented:
- `introspection-and-traversal.md` - Core traversal system with generators
- `data-validation-schemas.md` - Zod schemas in @layr/types
- `cookie-management.md` - Backend cookie handling
- `custom-code-system.md` - Runtime code bundling
- `plugin-system.md` - Formula/action registration
- `api-request-construction.md` - URL building utilities
- `api-service-management.md` - Service configuration
- `context-providers.md` - Preview mode context resolution
- `workflow-system.md` - Full callback support
- `package-management.md` - Version conflict handling
- `element-definitions.md` - Generated HTML/SVG JSON files (102 HTML + 61 SVG)
- `drag-drop-system.md` - View Transition animations
- `search-and-linting-engine.md` - Project walker, contextless evaluation

---

## Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific package
bun test packages/core/
```

---

## Architecture

```
@layr/types     ← All type definitions
     │
@layr/core     ← Signal, formula, action engines
     │
├── @layr/lib  ← 78 built-in formulas + 19 actions
│
├── @layr/themes ← Default theme definitions
│
├── @layr/ssr  ← Server-side rendering
│
├── @layr/runtime ← Client-side rendering
│
├── @layr/backend ← Hono HTTP server
│
├── @layr/editor  ← Visual editor UI + theme selector
│
└── @layr/search  ← Linting rules (8), issue detection
```

---

## Demo Project

`projects/demo/` contains a minimal test project:

- Home page: `/demo/`
- About page: `/demo/about`

Start server: `bun run dev`

---

## Changelog

### 2026-02-15
- Added @layr/themes package with 5 theme variants
- Added theme selector to editor sidebar
- Implemented 19 standard library actions
- Added 5 more linting rules (8 total)
- Updated spec statuses for accuracy
- Accurate reporting: 51 complete, 6 partial specs

### 2026-02-14 (Final Update)
- All 55 active specs fully implemented
- Updated README with complete spec list
- Updated development-state.md to reflect completion

### 2026-02-14 (Evening)
- Completed editor implementation: AdvancedTab with condition/repeat/slot editing
- Enhanced EventsTab with full action editing UI (add/remove/configure actions)
- Implemented clipboard functionality with copy/paste/duplicate keyboard shortcuts
- All editor specs now fully implemented (6/6)

### 2026-02-14
- Created @layr/search package with search/linting system
- Built element definitions generator (102 HTML + 61 SVG elements)
- Completed drag-drop system with View Transitions API
- Added context provider preview mode resolution
- Enhanced workflow callback support with proper scoping
- Updated all spec statuses to reflect current implementation
