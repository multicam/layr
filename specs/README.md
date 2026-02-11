# Layr Technical Specifications

This directory contains comprehensive technical specifications for the Layr platform — a visual application builder with a reactive component system, server-side rendering, and a declarative API integration layer.

## Core Architecture

| Spec | Description |
|------|-------------|
| **[Project Data Model](project-data-model.md)** | The canonical JSON structure representing a complete Layr application or package |
| **[Component System](component-system.md)** | Foundational UI building blocks, composition patterns, and state management |
| **[Element Definitions](element-definitions.md)** | HTML element node types and their structural properties |
| **[Custom Elements](custom-elements.md)** | Web Component export and runtime encapsulation |
| **[Slot System](slot-system.md)** | Content projection and placeholder composition |

## Rendering & Reactivity

| Spec | Description |
|------|-------------|
| **[Rendering Engine](rendering-engine.md)** | Client-side rendering pipeline transforming definitions into live DOM |
| **[SSR Pipeline](ssr-pipeline.md)** | Server-side rendering for initial page load and SEO |
| **[Hydration System](hydration-system.md)** | Reconciling server-rendered markup with client-side reactivity |
| **[Reactive Signal System](reactive-signal-system.md)** | Fine-grained reactivity for state management |
| **[Formula System](formula-system.md)** | Declarative computed value definitions |
| **[Formula Evaluation Engine](formula-evaluation-engine.md)** | Runtime formula parsing and execution |
| **[List Rendering System](list-rendering-system.md)** | Keyed reconciliation for dynamic collections |

## Styling & Theming

| Spec | Description |
|------|-------------|
| **[Styling and Theming](styling-and-theming.md)** | Visual design system and theme configuration |
| **[Responsive Styling System](responsive-styling-system.md)** | Breakpoint-based adaptive layouts |
| **[Font System](font-system.md)** | Typography loading and management |

## Actions, Events & Workflows

| Spec | Description |
|------|-------------|
| **[Action System](action-system.md)** | Declarative action definitions and triggers |
| **[Action Execution Engine](action-execution-engine.md)** | Runtime action dispatch and execution |
| **[Event System](event-system.md)** | User interaction and custom event handling |
| **[Workflow System](workflow-system.md)** | Reusable action sequence definitions |

## API Integration

| Spec | Description |
|------|-------------|
| **[API Integration](api-integration.md)** | Declarative HTTP resource definitions |
| **[API Proxy System](api-proxy-system.md)** | Backend proxying for cookies and CORS |
| **[API Request Construction](api-request-construction.md)** | Building HTTP requests from formulas |
| **[API Service Management](api-service-management.md)** | Service definition and credential handling |
| **[Client API System](client-api-system.md)** | Client-side API consumption patterns |

## Backend & Server

| Spec | Description |
|------|-------------|
| **[Backend Server](backend-server.md)** | Hono-based HTTP server with SSR and proxying |
| **[Backend Middleware System](backend-middleware-system.md)** | Request processing pipeline |
| **[HTML Document Head Generation](html-document-head-generation.md)** | Meta tags, preloads, and document structure |
| **[Cookie Management](cookie-management.md)** | Session and credential cookie handling |

## Routing & Navigation

| Spec | Description |
|------|-------------|
| **[Routing](routing.md)** | Page routing and navigation structure |
| **[Route Matching System](route-matching-system.md)** | URL pattern matching and parameter extraction |
| **[Navigation System](navigation-system.md)** | Programmatic and declarative navigation |
| **[Page Lifecycle](page-lifecycle.md)** | Page initialization and teardown sequences |

## Editor & Preview

| Spec | Description |
|------|-------------|
| **[Editor Integration](editor-integration.md)** | Bidirectional editor-preview communication |
| **[Editor Preview System](editor-preview-system.md)** | Live preview runtime behaviors |
| **[Drag Drop System](drag-drop-system.md)** | Visual element manipulation |

## Package & Plugin System

| Spec | Description |
|------|-------------|
| **[Package Management](package-management.md)** | Installing and composing reusable packages |
| **[Plugin System](plugin-system.md)** | Extending core functionality |
| **[Standard Library](standard-library.md)** | Built-in components and formulas |
| **[Standard Library Architecture](standard-library-architecture.md)** | Library organization and versioning |

## Data & Validation

| Spec | Description |
|------|-------------|
| **[Data Validation Schemas](data-validation-schemas.md)** | Input validation and type checking |
| **[Template Substitution](template-substitution.md)** | String templating with formula interpolation |
| **[Context Providers](context-providers.md)** | Hierarchical dependency injection |

## Search & Introspection

| Spec | Description |
|------|-------------|
| **[Search and Linting](search-and-linting.md)** | Project-wide search capabilities |
| **[Search and Linting Engine](search-and-linting-engine.md)** | Query parsing and result generation |
| **[Introspection and Traversal](introspection-and-traversal.md)** | Reflective access to component structure |

## Performance & Assets

| Spec | Description |
|------|-------------|
| **[Performance and Caching](performance-and-caching.md)** | Optimization strategies and caching layers |
| **[Image CDN Management](image-cdn-management.md)** | Responsive image optimization |
| **[Dynamic Asset Generation](dynamic-asset-generation.md)** | Runtime asset creation |

## Security & Standards

| Spec | Description |
|------|-------------|
| **[Security and Sanitization](security-and-sanitization.md)** | XSS prevention and content security |
| **[SEO Web Standards](seo-web-standards.md)** | Search engine optimization and metadata |

## Error Handling & Debugging

| Spec | Description |
|------|-------------|
| **[Error Handling and Debug](error-handling-debug.md)** | Runtime error capture and diagnostics |

## Build & Deployment

| Spec | Description |
|------|-------------|
| **[Build and Deployment](build-and-deployment.md)** | Compilation and release processes |
| **[Runtime Entry Points](runtime-entry-points.md)** | Application bootstrap sequences |

## Migration

| Spec | Description |
|------|-------------|
| **[Legacy Compatibility and Migration](legacy-compatibility-and-migration.md)** | Version upgrade paths and compatibility |

---

## Reading Guide

Each specification follows a consistent structure:

1. **Purpose** — What the system does and why it exists
2. **Jobs to Be Done** — Key capabilities and responsibilities
3. **Data Models** — Type definitions and schemas
4. **Implementation Details** — Algorithms, patterns, and invariants
5. **Source References** — Links to relevant code locations

Specifications are written to be implementation-agnostic where possible, focusing on the *what* and *why* rather than the *how* of specific code paths.
