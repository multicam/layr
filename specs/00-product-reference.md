# Layr Product Reference

## Status: Active

---

## Vision

Layr is a **visual development platform** that enables users to build web applications without writing code. It provides a drag-and-drop interface for creating UI components, defining data flows, and managing application state through a visual formula system.

---

## Target Users

### Primary Users
- **No-code developers** - Users who want to build web apps without programming knowledge
- **Low-code developers** - Developers who want to accelerate prototyping with visual tools
- **Designers** - UI/UX professionals who want to bring designs to life interactively

### Secondary Users
- **Development teams** - Teams collaborating on web application projects
- **Agencies** - Digital agencies building client websites rapidly
- **Educators** - Teachers introducing web development concepts visually

---

## Core Product Features

### 1. Visual Component Editor
- Drag-and-drop component creation
- Real-time preview with hot reloading
- Component hierarchy visualization
- Property panels for configuration

### 2. Formula System
- Visual formula builder for data transformations
- 78+ built-in formulas (array, string, number, object, logic, comparison)
- Higher-order formulas with closure support (map, filter, reduce)
- Static analysis for compile-time optimization

### 3. Action System
- Event-driven workflows with visual action chains
- 17+ built-in actions (storage, navigation, events, timers, sharing)
- Callback support with proper scoping
- Side effect management

### 4. Styling & Theming
- CSS-in-JS style declarations
- 5 built-in themes (minimal, brutalism, neobrutalism, terminal, notion)
- Responsive breakpoints
- CSS variable system

### 5. Routing & Navigation
- File-based routing
- Dynamic route parameters
- Client-side navigation with history management

### 6. API Integration
- Visual API service configuration
- Request construction with query params
- Response handling and error management

### 7. Search & Linting
- Real-time issue detection (58 rules planned)
- Auto-fix capabilities
- Project-wide search

### 8. SSR/CSR Rendering
- Server-side rendering for SEO
- Client-side hydration
- Environment-aware execution

---

## Success Metrics

### User Engagement
- **Time to first publish** - Users should be able to publish a page within 5 minutes of signup
- **Feature adoption** - >70% of users should use formulas within their first project
- **Retention** - >60% monthly active user retention

### Technical Quality
- **Preview latency** - <100ms preview updates
- **Build time** - <5 seconds for typical projects
- **Lighthouse score** - All demo projects score >90 on performance
- **Test coverage** - >80% coverage across all packages

### Platform Health
- **Issue detection accuracy** - >95% of linting issues are actionable
- **Auto-fix reliability** - >99% of auto-fixes apply correctly without breaking changes
- **SSR performance** - TTFP <200ms for typical pages

---

## Architecture Principles

### 1. Monorepo Structure
- Clear package boundaries with `@layr/*` namespacing
- Shared types in `@layr/types`
- Core engines in `@layr/core`
- Platform-specific implementations separated

### 2. Type Safety
- TypeScript throughout
- Zod schemas for runtime validation
- Comprehensive type exports

### 3. Performance First
- Generator-based traversal for memory efficiency
- Web workers for CPU-intensive operations
- Streaming results for responsive UI
- Memoization for expensive computations

### 4. Developer Experience
- Bun for fast package management
- Hot reloading in development
- Comprehensive test utilities
- Clear spec-to-implementation mapping

---

## Key Differentiators

1. **Visual Formula System** - Unlike other no-code tools, Layr provides a Turing-complete formula system that can express any data transformation
2. **Hybrid Rendering** - Seamless SSR/CSR with environment-aware execution
3. **Extensibility** - Plugin system for custom formulas and actions
4. **Open Architecture** - Clear package boundaries enable community contributions

---

## Roadmap Priorities

### Phase 1: Core Completion (Current)
- Complete remaining linting rules (48 rules)
- Implement missing formulas (19 formulas)
- Add missing actions (2 actions)

### Phase 2: Enhanced Editor
- Improved component library
- Better undo/redo support
- Collaborative editing

### Phase 3: Platform Features
- Custom elements (Web Components export)
- Package marketplace
- Team collaboration features

---

## Changelog

### 2026-02-27
- Initial product reference document created
- Defined vision, users, features, and success metrics
- Documented architecture principles and roadmap
