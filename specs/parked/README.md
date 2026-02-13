# Parked Specifications

Specs deferred for future development — lower priority features.

## By Category (12 specs remaining)

### API & Services (2 specs)
- api-request-construction.md - Request building utilities
- api-service-management.md - API lifecycle management

### Editor (1 spec)
- editor-integration.md - Editor-component integration

### Advanced (6 specs)
- plugin-system.md - Extension points
- custom-elements.md - Web components support
- workflow-system.md - Reusable workflows
- search-and-linting.md - Search functionality
- search-and-linting-engine.md - Search implementation
- legacy-compatibility-and-migration.md - Toddle compatibility

### Infrastructure (2 specs)
- error-handling-debug.md - Error handling and debugging
- package-management.md - Package versioning/dependencies

### Future Consideration (1 spec)
- workflow-system.md - Complex workflow orchestration

---

## Previously Implemented (Removed from Parked)

| Spec | Package | Description |
|------|---------|-------------|
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
