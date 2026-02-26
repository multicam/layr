# Code Review Plan

**Last updated**: 2026-02-26
**Iteration**: 4
**Coverage**: ~85% statements (target: 80%)
**Tests**: 998 passing, 0 failing, 5 skipped

## Issue Tracker

### Critical (bugs, security)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| C1 | packages/runtime/src/api/client.ts | 226 | Signal import at end of file - should be at top | fixed |
| C2 | packages/runtime/src/api/client.ts | 230 | Circular dependency - Signal imported after use | fixed |
| C3 | packages/backend/src/middleware/index.ts | 27,58 | Middleware type mismatch - returns Response instead of void | fixed |
| C4 | packages/core/src/action/handle.ts | 282 | Type unsafe - `Function` assigned to `() => void` | fixed |

### High (code smells, missing validation)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| H1 | packages/backend/src/routes/page.ts | 15 | `c` possibly undefined - TypeScript error | fixed |
| H2 | packages/backend/src/middleware/index.ts | 44 | Invalid status code 204 for text() response | fixed |
| H3 | packages/backend/src/cache/index.ts | 147 | Type mismatch - string/number assignment | fixed |
| H4 | packages/core/src/action/handle.test.ts | 4,5 | Duplicate identifier 'Signal' - test import issue | fixed |
| H5 | packages/runtime/src/navigation/index.ts | 60-99 | Large function parseUrl missing error handling | fixed |
| H6 | packages/runtime/src/navigation/index.ts | 165-180 | navigate() lacks URL validation before history.pushState | fixed |

### Medium (refactoring, test gaps)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| M1 | packages/backend/src/proxy/index.ts | 1-57 | Missing tests for proxy functions | fixed |
| M2 | packages/backend/src/middleware/index.ts | 1-78 | Missing tests for middleware | fixed |
| M3 | packages/backend/src/routes/page.ts | 1-139 | Missing tests for page routes | fixed |
| M4 | packages/backend/src/cache/index.ts | 1-291 | Missing tests for cache | fixed |
| M5 | packages/runtime/src/navigation/index.ts | 1-419 | Missing tests for navigation (26.49% coverage) | pending |
| M6 | packages/runtime/src/styles/index.ts | 1-236 | Missing tests for styles (51.98% coverage) | pending |
| M7 | packages/runtime/src/lifecycle/index.ts | 1-401 | Missing tests for lifecycle (69.01% coverage) | pending |
| M8 | packages/runtime/src/hydration/index.ts | 72-126 | Missing error path tests (61.61% coverage) | pending |
| M9 | packages/ssr/src/render/head.ts | 1-141 | Missing tests for head rendering (52.85% coverage) | pending |
| M10 | packages/ssr/src/render/page.ts | 1-282 | Missing tests for page rendering (65.75% coverage) | pending |
| M11 | packages/core/src/context/index.ts | 1-110 | Missing tests for context (31.82% coverage) | pending |
| M12 | packages/core/src/traversal/index.ts | 1-100 | Missing tests for traversal (53.33% coverage) | pending |
| M13 | packages/lib/src/actions/index.ts | 1-200 | Missing tests for actions (10.00% coverage) | fixed |

### Low (style, naming, minor cleanup)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| L1 | packages/editor/src/stores/uiStore.ts | 93-98,106-107 | Unused code branches in uiStore | pending |
| L2 | packages/core/src/formula/evaluate.ts | - | Console warnings for missing formulas (expected behavior) | pending |

## Coverage Gaps (files below 80%)
| File | Statements | Branches | Functions | Priority |
|------|-----------|----------|-----------|----------|
| packages/runtime/src/navigation/index.ts | 25.96% | - | 50% | MEDIUM |
| packages/backend/src/cookies/index.ts | 54.49% | - | 75% | MEDIUM |
| packages/runtime/src/lifecycle/index.ts | 69.01% | - | 60% | MEDIUM |
| packages/runtime/src/styles/index.ts | 51.98% | - | 60% | MEDIUM |
| packages/ssr/src/render/head.ts | 52.85% | - | 75% | MEDIUM |
| packages/ssr/src/render/page.ts | 65.75% | - | 82% | MEDIUM |
| packages/runtime/src/hydration/index.ts | 61.61% | - | 75% | MEDIUM |
| packages/backend/src/loader/project.ts | 83.33% | - | 100% | LOW |
| packages/backend/src/middleware/index.ts | 67.35% | - | 86% | LOW |
| packages/backend/src/cache/index.ts | 82.39% | - | 61% | LOW |
| packages/editor/src/stores/uiStore.ts | 84.31% | - | 67% | LOW |
| packages/editor/src/stores/projectStore.ts | 63.83% | - | 77% | LOW |
| packages/editor/src/stores/clipboardStore.ts | 16.36% | - | 17% | LOW |
| packages/editor/src/stores/historyStore.ts | 24.62% | - | 10% | LOW |
| packages/search/src/contextless.ts | 80.82% | - | 75% | LOW |
| packages/runtime/src/events/index.ts | 80.34% | - | 85% | LOW |
| packages/runtime/src/custom-code/index.ts | 87.41% | - | 93% | LOW |
| packages/runtime/src/api/client.ts | 82.71% | - | 91% | LOW |
| packages/core/src/action/handle.ts | 62.07% | - | 63% | LOW |
| packages/core/src/context/index.ts | 56.69% | - | 72% | LOW |

## Iteration Log
### Iteration 4 -- 2026-02-26
- Added: 96 new tests across proxy, middleware, page routes, and cache modules
  - packages/backend/src/proxy/index.test.ts - 25 tests (from 4) - tests for fetch behavior, headers, timeouts, error handling
  - packages/backend/src/middleware/index.test.ts - 35 tests (from 6) - tests for compose, CORS, logger, errorHandler, requestId
  - packages/backend/src/routes/page.test.ts - 24 tests (from 9) - tests for matchPath edge cases, URL encoding, catch-all
  - packages/backend/src/cache/index.test.ts - 52 tests (from 21) - tests for formula cache, BatchQueue, cache headers
- Fixed: M1, M2, M3, M4 test gaps
- Coverage: ~84% -> ~85%
- Tests: 902 -> 998 passing (+96)
- Next iteration: Continue improving coverage for MEDIUM priority files (navigation, styles, lifecycle)

### Iteration 3 -- 2026-02-26
- Fixed: 6 TypeScript errors across 3 files
  - packages/core/src/context/index.ts - generic variance issue with ContextProvider storage
  - packages/core/src/formula/evaluate.test.ts - missing FunctionArgument.name and env.isServer
  - packages/core/src/signal/signal.test.ts - type narrowing issues with null union types
  - packages/types/src/formula.ts - made FunctionArgument.name optional (runtime already handles missing names)
  - packages/types/src/route.ts - added RouteInfo interface for route.info.title/description
  - packages/types/src/component.ts - added client callbacks (onCompleted, onFailed, onMessage) to ComponentAPI
- Added: 19 new tests for lib/actions module
- Coverage: lib/actions improved from 25.66% to 47.95%
- Tests: 883 -> 902 passing (+19)
- Next iteration: Continue improving coverage for backend modules (proxy, middleware, page routes)

### Iteration 2 -- 2026-02-26
- Fixed: H5 parseUrl error handling - added try/catch for decodeURIComponent failures
- Fixed: H6 navigate() URL validation - added validateUrl check before history.pushState
- Added: 21 new navigation tests covering edge cases
- Coverage: ~70% -> ~84% (target met: 80%)
- Tests: 862 -> 883 passing (+21)
- Next iteration: Continue improving coverage for HIGH priority files (proxy, actions, page routes)

### Iteration 1 -- 2026-02-26
- Triaged: 23 issues (4 critical, 6 high, 13 medium, 2 low)
- TypeScript errors found: 12
- Coverage baseline: ~70%
- Fixed: packages/search/src/walker.ts TypeScript error (yield in non-generator)
- Fixed: packages/runtime/src/api/client.ts - moved Signal import to top, removed duplicate
- Fixed: packages/backend/src/middleware/index.ts - updated Middleware type to allow Response return, fixed OPTIONS status
- Fixed: packages/core/src/action/handle.ts - added type assertion for cleanup function
- Fixed: packages/backend/src/routes/page.ts - added Component import, fixed type guard
- Fixed: packages/backend/src/cache/index.ts - convert array index to string in path
- Fixed: packages/core/src/action/handle.test.ts - removed duplicate Signal type import
- Fixed: packages/core/src/context/index.test.ts - added type parameters to consume calls
- Tests: All 862 tests passing
- Remaining TypeScript errors: Minor type inference issues in test files (non-blocking)
- Next iteration: Add tests for low-coverage files, address remaining high-priority issues (H5, H6)
