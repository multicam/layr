# Layr Specifications

## Overview

This directory contains technical specifications for the Layr visual development platform.

---

## Quick Status

| Category | Implemented | Parked | Total |
|----------|-------------|--------|-------|
| Core | 12 | 0 | 12 |
| Backend | 3 | 5 | 8 |
| Runtime | 3 | 3 | 6 |
| Editor | 1 | 2 | 3 |
| Infrastructure | 4 | 0 | 4 |
| Advanced | 1 | 26 | 27 |
| **Total** | **24** | **36** | **60** |

---

## Active Specifications

### Infrastructure (4 specs)
| Spec | Status | Description |
|------|--------|-------------|
| [monorepo-structure.md](monorepo-structure.md) | ✅ | Bun workspaces, package layout |
| [development-workflow.md](development-workflow.md) | ✅ | Dev commands, testing |
| [test-harness.md](test-harness.md) | ✅ | Testing utilities |
| [package-architecture.md](package-architecture.md) | ✅ | Package internals |
| [development-state.md](development-state.md) | ✅ | **Current status summary** |

### Core Types (4 specs)
| Spec | Status | Package |
|------|--------|---------|
| [project-data-model.md](project-data-model.md) | ✅ | @layr/types |
| [component-system.md](component-system.md) | ✅ | @layr/types |
| [formula-system.md](formula-system.md) | ✅ | @layr/types |
| [action-system.md](action-system.md) | ✅ | @layr/types |

### Core Logic (4 specs)
| Spec | Status | Package |
|------|--------|---------|
| [reactive-signal-system.md](reactive-signal-system.md) | ✅ | @layr/core |
| [formula-evaluation-engine.md](formula-evaluation-engine.md) | ✅ | @layr/core |
| [action-execution-engine.md](action-execution-engine.md) | ✅ | @layr/core |
| [context-providers.md](context-providers.md) | ⚠️ | @layr/core |

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

### SSR (2 specs)
| Spec | Status | Package |
|------|--------|---------|
| [ssr-pipeline.md](ssr-pipeline.md) | ✅ | @layr/ssr |
| [html-document-head-generation.md](html-document-head-generation.md) | ⚠️ | @layr/ssr |

### Runtime (3 specs)
| Spec | Status | Package |
|------|--------|---------|
| [rendering-engine.md](rendering-engine.md) | ✅ | @layr/runtime |
| [slot-system.md](slot-system.md) | ✅ | @layr/runtime |
| [event-system.md](event-system.md) | ⚠️ | @layr/runtime |

### Editor (1 spec)
| Spec | Status | Package |
|------|--------|---------|
| [editor-architecture.md](editor-architecture.md) | 📝 | @layr/editor |

---

## Parked Specifications

36 specs in `parked/` directory for future work:

- **API**: integration, proxy, request, service
- **Editor**: integration, preview
- **Performance**: caching, build, images
- **Security**: sanitization, cookies
- **Advanced**: plugins, custom code, workflows

See [parked/README.md](parked/README.md) for details.

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
