# Layr Specifications

## Overview

This directory contains technical specifications for the Layr visual development platform.

---

## Quick Status

| Category | Implemented | In Progress | Not Started | Total |
|----------|-------------|-------------|-------------|-------|
| Core | 14 | 1 | 0 | 15 |
| Backend | 5 | 0 | 3 | 8 |
| SSR | 2 | 1 | 2 | 5 |
| Runtime | 5 | 1 | 3 | 9 |
| Editor | 0 | 2 | 4 | 6 |
| Infrastructure | 9 | 0 | 0 | 9 |
| **Total** | **35** | **4** | **12** | **52** |

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
| [api-request-construction.md](api-request-construction.md) | 📝 | URL building, query params, hashing |
| [api-service-management.md](api-service-management.md) | 📝 | Reusable API services |
| [plugin-system.md](plugin-system.md) | 📝 | Custom formulas/actions |
| [error-handling-debug.md](error-handling-debug.md) | 📝 | Panic screen, toasts, logging |

### Core Types (5 specs)
| Spec | Status | Package |
|------|--------|---------|
| [project-data-model.md](project-data-model.md) | ✅ | @layr/types |
| [component-system.md](component-system.md) | ✅ | @layr/types |
| [formula-system.md](formula-system.md) | ✅ | @layr/types |
| [action-system.md](action-system.md) | ✅ | @layr/types |
| [element-definitions.md](element-definitions.md) | 📝 | @layr/types |

### Core Logic (6 specs)
| Spec | Status | Package |
|------|--------|---------|
| [reactive-signal-system.md](reactive-signal-system.md) | ✅ | @layr/core |
| [formula-evaluation-engine.md](formula-evaluation-engine.md) | ✅ | @layr/core |
| [action-execution-engine.md](action-execution-engine.md) | ✅ | @layr/core |
| [context-providers.md](context-providers.md) | ⚠️ | @layr/core |
| [introspection-and-traversal.md](introspection-and-traversal.md) | 📝 | @layr/core |
| [data-validation-schemas.md](data-validation-schemas.md) | 📝 | @layr/core |
| [workflow-system.md](workflow-system.md) | 📝 | @layr/core |
| [package-management.md](package-management.md) | 📝 | @layr/core |

### Standard Library (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [standard-library.md](standard-library.md) | ✅ | @layr/lib |
| [standard-library-architecture.md](standard-library-architecture.md) | ✅ | @layr/lib |

### Backend (3 specs)
| Spec | Status | Package |
|------|--------|---------|
| [backend-server.md](backend-server.md) | ✅ | @layr/backend |
| [routing.md](routing.md) | ✅ | @layr/backend |
| [route-matching-system.md](route-matching-system.md) | ✅ | @layr/backend |
| [cookie-management.md](cookie-management.md) | 📝 | @layr/backend |

### SSR (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [ssr-pipeline.md](ssr-pipeline.md) | ✅ | @layr/ssr |
| [html-document-head-generation.md](html-document-head-generation.md) | ⚠️ | @layr/ssr |

### Runtime (5 specs)
| Spec | Status | Package |
|------|--------|---------|
| [rendering-engine.md](rendering-engine.md) | ✅ | @layr/runtime |
| [slot-system.md](slot-system.md) | ✅ | @layr/runtime |
| [event-system.md](event-system.md) | ⚠️ | @layr/runtime |
| [custom-code-system.md](custom-code-system.md) | 📝 | @layr/runtime |
| [styling-and-theming.md](styling-and-theming.md) | ✅ | @layr/runtime |

### Editor (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [editor-architecture.md](editor-architecture.md) | ⚠️ | @layr/editor |
| [editor-implementation.md](editor-implementation.md) | ⚠️ | @layr/editor |
| [editor-preview-system.md](editor-preview-system.md) | 📝 | @layr/editor |
| [drag-drop-system.md](drag-drop-system.md) | 📝 | @layr/editor |

### Search & Linting (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [search-and-linting.md](search-and-linting.md) | 📝 | @layr/search |
| [search-and-linting-engine.md](search-and-linting-engine.md) | 📝 | @layr/search |

---

## Parked Specifications

1 spec in `parked/` directory — lower priority:

- **Custom Elements**: Web components export

See [parked/README.md](parked/README.md) for details.

---

## Work Items

See [thoughts/work-items/](../thoughts/work-items/) for pending implementation tasks:

- **[v1-legacy-code-removal.md](../thoughts/work-items/v1-legacy-code-removal.md)** - Remove all v1/legacy code (V2 is baseline)

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Fully implemented |
| ⚠️ | Partially implemented |
| 📝 | Spec complete, implementation not started |
| ❌ | Not implemented |

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
├── @layr/lib  ← 78 built-in formulas
│
├── @layr/ssr  ← Server-side rendering
│
├── @layr/runtime ← Client-side rendering
│
└── @layr/backend ← Hono HTTP server
```

---

## Demo Project

`projects/demo/` contains a minimal test project:

- Home page: `/demo/`
- About page: `/demo/about`

Start server: `bun run dev`
