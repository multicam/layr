# Parked Specifications

Specs deferred for future development — lower priority features.

## By Category (3 specs remaining)

### API & Services (1 spec)
- api-request-construction.md - **PROMOTED 2026-02-14**
- api-service-management.md - **PROMOTED 2026-02-14**
- custom-elements.md - Web components export

### Infrastructure (2 specs)
- error-handling-debug.md - **PROMOTED 2026-02-14**
- package-management.md - **PROMOTED 2026-02-14**

### Removed (V2 Baseline)
- ~~legacy-compatibility-and-migration.md~~ - **DELETED 2026-02-14** (V2 is baseline, no v1 support)
- ~~plugin-system.md~~ - **PROMOTED 2026-02-14**
- ~~search-and-linting.md~~ - **PROMOTED 2026-02-14**
- ~~search-and-linting-engine.md~~ - **PROMOTED 2026-02-14**
- ~~workflow-system.md~~ - **PROMOTED 2026-02-14**

---

## Previously Implemented (Removed from Parked)

| Spec | Package | Description |
|------|---------|-------------|
| editor-integration | @layr/editor | **Consolidated into editor-preview-system.md (2026-02-14)** |
| api-request-construction | @layr/core | **Promoted (2026-02-14)** |
| api-service-management | @layr/core | **Promoted (2026-02-14)** |
| error-handling-debug | @layr/runtime | **Promoted (2026-02-14)** |
| package-management | @layr/ssr | **Promoted (2026-02-14)** |
| plugin-system | @layr/core | **Promoted (2026-02-14)** |
| search-and-linting | @layr/search | **Promoted (2026-02-14)** |
| search-and-linting-engine | @layr/search | **Promoted (2026-02-14)** |
| workflow-system | @layr/core | **Promoted (2026-02-14)** |
| backend-middleware-system | @layr/backend | Middleware compose, cors, logger, errorHandler |
| api-proxy-system | @layr/backend | Proxy with cookie templates |
| hydration-system | @layr/runtime, @layr/ssr | SSR→CSR data transfer |
| list-rendering-system | @layr/runtime | Keyed reconciliation, repeat directive |
| template-substitution | @layr/ssr | `{{ cookies.name }}` substitution |
| api-integration | @layr/runtime | V2 APIs with streaming |
| client-api-system | @layr/runtime | Reactive API clients |
| editor-preview-system | @layr/editor | Live preview iframe communication |
| navigation-system | @layr/runtime | Client-side routing |
| page-lifecycle | @layr/runtime | onLoad, onUnmount events |
| drag-drop-system | @layr/editor | Visual editor drag-drop |
| custom-code-system | @layr/runtime | User-defined formula/action execution |
| element-definitions | @layr/types | Element metadata/property schemas |
| introspection-and-traversal | @layr/core | Component tree traversal |
| runtime-entry-points | @layr/runtime | Production/preview/dev entry points |
| performance-and-caching | @layr/backend | Caching strategies |
| build-and-deployment | @layr/backend | Build pipeline |
| image-cdn-management | @layr/backend | Image optimization |
| dynamic-asset-generation | @layr/backend | Asset bundling |
| security-and-sanitization | @layr/ssr | XSS prevention |
| cookie-management | @layr/backend | Cookie handling |
| seo-web-standards | @layr/ssr | SEO meta tags |
| responsive-styling-system | @layr/runtime | Responsive breakpoints |
| font-system | @layr/ssr | Font loading/optimization |
