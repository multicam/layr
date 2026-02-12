# Layr Technical Specifications

This directory contains comprehensive technical specifications for the Layr platform — a visual application builder with a reactive component system, server-side rendering, and a declarative API integration layer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LAYR PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  EDITOR                                                                      │
│  ├── Element Definitions ──► Drag-Drop ──► Editor Preview                    │
│  └── Search/Linting ◄───── Introspection ◄── Component System                │
├─────────────────────────────────────────────────────────────────────────────┤
│  RUNTIME (CSR)                                                               │
│  ├── Component System ──► Rendering Engine ──► DOM                          │
│  │   ├── Signals ◄─────► Formula Engine ◄─────► Variables/Attributes        │
│  │   └── Slots ──► Context Providers ──► Workflows                          │
│  ├── Action Engine ◄─────► Event System                                      │
│  └── API Client ◄─────► Proxy ◄─────► Backend                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  SERVER (SSR)                                                                │
│  ├── Backend Server (Hono) ──► Middleware Pipeline                          │
│  │   ├── Routing ──► Page Matching ──► SSR Pipeline                         │
│  │   ├── API Proxy ──► Cookie Injection                                      │
│  │   └── Font Proxy ──► Static Assets                                        │
│  └── Hydration Data ──► Client Bootstrap                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                                  │
│  ├── Project Data Model ──► Components, Formulas, Actions, Themes           │
│  ├── Packages ──► Standard Library ──► Custom Code                          │
│  └── Validation Schemas (Zod)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Specification Index

### Tier 1: Core Architecture
*Foundational systems that define the structure and behavior of all Layr applications*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Project Data Model](project-data-model.md)** | Canonical JSON structure for applications/packages | — |
| **[Component System](component-system.md)** | UI building blocks, composition, state management | Project Data Model |
| **[Element Definitions](element-definitions.md)** | HTML/SVG element metadata and catalog | — |
| **[Slot System](slot-system.md)** | Content projection and placeholder composition | Component System |
| **[Custom Elements](custom-elements.md)** | Web Component export with Shadow DOM | Component System, Rendering Engine |

### Tier 2: Rendering & Reactivity
*Systems that transform component definitions into live DOM with reactive updates*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Rendering Engine](rendering-engine.md)** | CSR pipeline: definitions → live DOM | Component System, Signals |
| **[SSR Pipeline](ssr-pipeline.md)** | Server-side HTML generation | Rendering Engine, API Integration |
| **[Hydration System](hydration-system.md)** | SSR-to-CSR state transfer | SSR Pipeline, Rendering Engine |
| **[Reactive Signal System](reactive-signal-system.md)** | Fine-grained reactive state | — |
| **[Formula System](formula-system.md)** | Declarative expression definitions | Signals |
| **[Formula Evaluation Engine](formula-evaluation-engine.md)** | Runtime formula AST evaluation | Formula System |
| **[List Rendering System](list-rendering-system.md)** | Keyed reconciliation for collections | Rendering Engine, Signals |

### Tier 3: Styling & Theming
*Visual presentation systems with design token management*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Styling and Theming](styling-and-theming.md)** | Design tokens, CSS custom properties, class generation | — |
| **[Responsive Styling System](responsive-styling-system.md)** | Breakpoint-based adaptive layouts | Styling |
| **[Font System](font-system.md)** | Typography loading, Google Fonts proxy | Styling |

### Tier 4: Actions, Events & Workflows
*User interaction handling and side effect orchestration*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Action System](action-system.md)** | Declarative action model (10 types) | Formula System |
| **[Action Execution Engine](action-execution-engine.md)** | Runtime action dispatch | Action System, API Integration |
| **[Event System](event-system.md)** | DOM and custom event handling | Action System |
| **[Workflow System](workflow-system.md)** | Reusable action sequences | Action System, Context Providers |

### Tier 5: API Integration
*HTTP resource definitions with proxying and streaming support*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[API Integration](api-integration.md)** | Declarative HTTP APIs with auto-fetch | Formula System |
| **[API Proxy System](api-proxy-system.md)** | Backend proxying for cookies/CORS | Backend Server |
| **[API Request Construction](api-request-construction.md)** | Building requests from formulas | Formula System |
| **[API Service Management](api-service-management.md)** | Service definitions and credentials | API Integration |
| **[Client API System](client-api-system.md)** | Client-side API consumption patterns | API Integration |

### Tier 6: Backend & Server
*Hono-based HTTP server with SSR and proxying*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Backend Server](backend-server.md)** | HTTP server, routes, deployment targets | — |
| **[Backend Middleware System](backend-middleware-system.md)** | Request processing pipeline | Backend Server |
| **[HTML Document Head Generation](html-document-head-generation.md)** | Meta tags, preloads, speculation rules | SSR Pipeline |
| **[Cookie Management](cookie-management.md)** | Session and HttpOnly cookie handling | Backend Server |

### Tier 7: Routing & Navigation
*URL matching and navigation orchestration*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Routing](routing.md)** | Page routes, redirects, rewrites | Backend Server |
| **[Route Matching System](route-matching-system.md)** | URL pattern matching, specificity | Routing |
| **[Navigation System](navigation-system.md)** | Programmatic and declarative navigation | Routing |
| **[Page Lifecycle](page-lifecycle.md)** | Initialization and teardown hooks | Component System |

### Tier 8: Editor & Preview
*Visual editor integration and design-time behaviors*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Editor Integration](editor-integration.md)** | Bidirectional editor-preview communication | Rendering Engine |
| **[Editor Preview System](editor-preview-system.md)** | Live preview runtime | Editor Integration |
| **[Drag Drop System](drag-drop-system.md)** | Visual element manipulation | Editor Integration |

### Tier 9: Package & Plugin System
*Extensibility and reusable component distribution*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Package Management](package-management.md)** | Installing and composing packages | Project Data Model |
| **[Plugin System](plugin-system.md)** | Core functionality extensions | Formula/Action System |
| **[Standard Library](standard-library.md)** | Built-in formulas and actions (97 formulas, 19 actions) | Plugin System |
| **[Standard Library Architecture](standard-library-architecture.md)** | Library organization and versioning | Standard Library |

### Tier 10: Data & Validation
*Data integrity and transformation utilities*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Data Validation Schemas](data-validation-schemas.md)** | Zod schemas for project validation | Project Data Model |
| **[Template Substitution](template-substitution.md)** | String templating with formula interpolation | Formula System |
| **[Context Providers](context-providers.md)** | Hierarchical dependency injection | Component System |

### Tier 11: Search & Introspection
*Code analysis and traversal utilities*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Search and Linting](search-and-linting.md)** | Project-wide search capabilities | Introspection |
| **[Search and Linting Engine](search-and-linting-engine.md)** | Query parsing and result generation | Search/Linting |
| **[Introspection and Traversal](introspection-and-traversal.md)** | Reflective component access | Component System |

### Tier 12: Performance & Assets
*Optimization and asset management*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Performance and Caching](performance-and-caching.md)** | Optimization strategies, caching layers | — |
| **[Image CDN Management](image-cdn-management.md)** | Responsive image optimization | Backend Server |
| **[Dynamic Asset Generation](dynamic-asset-generation.md)** | Runtime asset creation | Build System |

### Tier 13: Security & Standards
*Security measures and web standards compliance*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Security and Sanitization](security-and-sanitization.md)** | XSS prevention, content security | Formula System |
| **[SEO Web Standards](seo-web-standards.md)** | Metadata, structured data | SSR Pipeline |

### Tier 14: Error Handling & Debugging
*Error capture and diagnostics*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Error Handling and Debug](error-handling-debug.md)** | Runtime error capture, diagnostics | All systems |

### Tier 15: Build & Deployment
*Compilation and deployment pipelines*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Build and Deployment](build-and-deployment.md)** | Compilation, bundling, deployment targets | All systems |
| **[Runtime Entry Points](runtime-entry-points.md)** | Application bootstrap sequences | Build, SSR, CSR |

### Tier 16: Migration
*Version compatibility and upgrade paths*

| Spec | Description | Dependencies |
|------|-------------|--------------|
| **[Legacy Compatibility and Migration](legacy-compatibility-and-migration.md)** | Version upgrades, compatibility layers | All systems |

---

## Deep Review Groups

Organized for systematic gap analysis. Each group contains tightly-coupled specs that should be reviewed together.

### Group A: Core Data Model
**Priority: Critical | Complexity: High**

| Spec | Review Focus |
|------|--------------|
| Project Data Model | Schema completeness, versioning strategy, migration paths |
| Component System | Node type coverage, lifecycle completeness, edge cases |
| Data Validation Schemas | Schema coverage, type safety, validation gaps |
| Context Providers | Provider/consumer lifecycle, circular dependency detection |

**Cross-cutting concerns:** Schema evolution, backward compatibility, serialization limits

---

### Group B: Rendering Pipeline
**Priority: Critical | Complexity: Very High**

| Spec | Review Focus |
|------|--------------|
| Rendering Engine | Node dispatch completeness, cleanup guarantees, performance |
| SSR Pipeline | Streaming support, error recovery, partial render handling |
| Hydration System | Cache key stability, state reconciliation, timing issues |
| List Rendering System | Keyed reconciliation correctness, nested repeat handling |
| Reactive Signal System | Memory leak prevention, destruction cascade, edge cases |

**Cross-cutting concerns:** SSR/CSR parity, hydration mismatches, memory management

---

### Group C: Expression Evaluation
**Priority: High | Complexity: High**

| Spec | Review Focus |
|------|--------------|
| Formula System | Operation type coverage, higher-order function support |
| Formula Evaluation Engine | Error handling, cycle detection, memoization correctness |
| Template Substitution | Security (injection), nested template handling |

**Cross-cutting concerns:** Type coercion, null propagation, formula caching

---

### Group D: Action & Event Handling
**Priority: High | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Action System | Action type completeness, cleanup lifecycle |
| Action Execution Engine | Sequential execution guarantees, error isolation |
| Event System | Event propagation, custom event marshalling |
| Workflow System | Parameter passing, callback resolution, context bridging |

**Cross-cutting concerns:** Action sequencing, error recovery, async handling

---

### Group E: API Layer
**Priority: High | Complexity: High**

| Spec | Review Focus |
|------|--------------|
| API Integration | v1/v2 feature parity, streaming correctness |
| API Proxy System | Security headers, cookie handling, timeout behavior |
| API Request Construction | URL encoding, header sanitization, body serialization |
| Client API System | Cache invalidation, retry logic, abort handling |
| Cookie Management | HttpOnly cookie security, expiration handling |

**Cross-cutting concerns:** CORS, authentication, rate limiting, offline handling

---

### Group F: Styling System
**Priority: Medium | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Styling and Theming | v1/v2 theme migration, custom property syntax coverage |
| Responsive Styling System | Breakpoint handling, media query generation |
| Font System | Font loading reliability, fallback handling |

**Cross-cutting concerns:** CSS specificity, SSR style injection, custom property cascading

---

### Group G: Backend Infrastructure
**Priority: High | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Backend Server | Route ordering, middleware chain, deployment targets |
| Backend Middleware System | Error handling, request context propagation |
| HTML Document Head Generation | Meta tag ordering, speculation rule correctness |
| Image CDN Management | Image optimization, format selection, caching |

**Cross-cutting concerns:** Performance, security headers, deployment consistency

---

### Group H: Routing & Navigation
**Priority: Medium | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Routing | Redirect/rewrite correctness, loop prevention |
| Route Matching System | Specificity algorithm, optional segment handling |
| Navigation System | History management, scroll restoration |
| Page Lifecycle | Hook ordering, cleanup guarantees |

**Cross-cutting concerns:** 404 handling, nested routes, hash navigation

---

### Group I: Editor Integration
**Priority: Medium | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Editor Integration | Message protocol stability, bidirectional sync |
| Editor Preview System | Preview isolation, state synchronization |
| Drag Drop System | Drop target validation, undo/redo support |
| Element Definitions | Element coverage, attribute metadata completeness |

**Cross-cutting concerns:** Preview performance, editor crash recovery

---

### Group J: Extensibility
**Priority: Medium | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Package Management | Version resolution, dependency conflicts |
| Plugin System | Plugin isolation, lifecycle management |
| Standard Library | Formula/action coverage, documentation quality |
| Custom Code System | Sandboxing, error handling, bundle size |

**Cross-cutting concerns:** Package versioning, breaking changes, documentation

---

### Group K: Search & Analysis
**Priority: Low | Complexity: Low**

| Spec | Review Focus |
|------|--------------|
| Search and Linting | Query expressiveness, performance on large projects |
| Search and Linting Engine | Index efficiency, result ranking |
| Introspection and Traversal | Traversal completeness, cycle handling |

**Cross-cutting concerns:** Large project performance, incremental updates

---

### Group L: Security & Compliance
**Priority: Critical | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Security and Sanitization | XSS prevention completeness, CSP support |
| SEO Web Standards | Structured data, meta tag generation |

**Cross-cutting concerns:** Input validation, output encoding, security headers

---

### Group M: Build & Operations
**Priority: Medium | Complexity: Medium**

| Spec | Review Focus |
|------|--------------|
| Build and Deployment | Build reproducibility, target consistency |
| Runtime Entry Points | Bootstrap ordering, error recovery |
| Performance and Caching | Caching strategy, cache invalidation |
| Dynamic Asset Generation | Asset deduplication, lazy loading |
| Legacy Compatibility and Migration | Migration path completeness, deprecation handling |
| Error Handling and Debug | Error capture completeness, debugging tooling |

**Cross-cutting concerns:** Build performance, deployment rollback, monitoring

---

## Reading Guide

Each specification follows a consistent structure:

1. **Purpose** — What the system does and why it exists
2. **Jobs to Be Done** — Key capabilities and responsibilities
3. **Data Models** — Type definitions and schemas
4. **Implementation Details** — Algorithms, patterns, and invariants
5. **Source References** — Links to relevant code locations

Specifications are written to be implementation-agnostic where possible, focusing on the *what* and *why* rather than the *how* of specific code paths.

---

## Quick Reference

### Key Numbers

| Metric | Value |
|--------|-------|
| Total specifications | 57 |
| Formula types | 10 |
| Built-in formulas | 97 |
| Built-in actions | 19 |
| Action types | 10 |
| HTML elements | 107 |
| SVG elements | 61+ |
| Supported HTTP methods | 7 |

### Critical Paths

1. **Page Load:** Project Data Model → Routing → SSR Pipeline → Hydration → Rendering Engine
2. **User Interaction:** Event System → Action Engine → Formula Engine → Signals → DOM Update
3. **API Call:** Action Engine → API Integration → Proxy → Backend → Response → State Update
4. **Hot Reload:** Editor Integration → Component System → Rendering Engine → DOM Patch
