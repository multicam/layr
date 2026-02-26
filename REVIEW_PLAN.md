# Code Review Plan

**Last updated**: 2026-02-26
**Iteration**: 1
**Coverage**: ~70% statements (target: 80%)
**Tests**: 862 passing, 0 failing, 7 skipped

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
| H5 | packages/runtime/src/navigation/index.ts | 60-99 | Large function parseUrl missing error handling | pending |
| H6 | packages/runtime/src/navigation/index.ts | 165-180 | navigate() lacks URL validation before history.pushState | pending |

### Medium (refactoring, test gaps)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| M1 | packages/backend/src/proxy/index.ts | 1-57 | Missing tests for proxy functions (8.57% coverage) | pending |
| M2 | packages/backend/src/middleware/index.ts | 1-78 | Missing tests for middleware (10.34% coverage) | pending |
| M3 | packages/backend/src/routes/page.ts | 1-139 | Missing tests for page routes (18.03% coverage) | pending |
| M4 | packages/backend/src/cache/index.ts | 1-291 | Missing tests for cache (33.33% coverage) | pending |
| M5 | packages/runtime/src/navigation/index.ts | 1-419 | Missing tests for navigation (26.49% coverage) | pending |
| M6 | packages/runtime/src/styles/index.ts | 1-236 | Missing tests for styles (51.98% coverage) | pending |
| M7 | packages/runtime/src/lifecycle/index.ts | 1-401 | Missing tests for lifecycle (69.01% coverage) | pending |
| M8 | packages/runtime/src/hydration/index.ts | 72-126 | Missing error path tests (61.61% coverage) | pending |
| M9 | packages/ssr/src/render/head.ts | 1-141 | Missing tests for head rendering (52.85% coverage) | pending |
| M10 | packages/ssr/src/render/page.ts | 1-282 | Missing tests for page rendering (65.75% coverage) | pending |
| M11 | packages/core/src/context/index.ts | 1-110 | Missing tests for context (31.82% coverage) | pending |
| M12 | packages/core/src/traversal/index.ts | 1-100 | Missing tests for traversal (53.33% coverage) | pending |
| M13 | packages/lib/src/actions/index.ts | 1-200 | Missing tests for actions (10.00% coverage) | pending |

### Low (style, naming, minor cleanup)
| # | File | Line | Issue | Status |
|---|------|------|-------|--------|
| L1 | packages/editor/src/stores/uiStore.ts | 93-98,106-107 | Unused code branches in uiStore | pending |
| L2 | packages/core/src/formula/evaluate.ts | - | Console warnings for missing formulas (expected behavior) | pending |

## Coverage Gaps (files below 80%)
| File | Statements | Branches | Functions | Priority |
|------|-----------|----------|-----------|----------|
| packages/backend/src/proxy/index.ts | 8.57% | - | 0% | CRITICAL |
| packages/backend/src/middleware/index.ts | 10.34% | - | 0% | CRITICAL |
| packages/lib/src/actions/index.ts | 10.00% | 25.66% | - | HIGH |
| packages/backend/src/routes/page.ts | 18.03% | - | - | HIGH |
| packages/backend/src/static/index.ts | 28.00% | - | - | MEDIUM |
| packages/runtime/src/navigation/index.ts | 26.49% | - | - | MEDIUM |
| packages/core/src/context/index.ts | 31.82% | - | - | MEDIUM |
| packages/backend/src/cache/index.ts | 33.33% | - | - | MEDIUM |
| packages/backend/src/loader/project.ts | 42.86% | - | - | MEDIUM |
| packages/core/src/traversal/index.ts | 53.33% | - | - | MEDIUM |
| packages/runtime/src/styles/index.ts | 51.98% | - | - | MEDIUM |
| packages/ssr/src/render/head.ts | 52.85% | - | - | MEDIUM |
| packages/ssr/src/render/page.ts | 65.75% | - | - | MEDIUM |
| packages/runtime/src/hydration/index.ts | 61.61% | - | - | MEDIUM |
| packages/runtime/src/lifecycle/index.ts | 69.01% | - | - | MEDIUM |
| packages/backend/src/cookies/index.ts | 65.31% | - | - | LOW |
| packages/editor/src/stores/uiStore.ts | 66.67% | 84.31% | - | LOW |
| packages/core/src/schemas/index.ts | 62.96% | - | - | LOW |
| packages/search/src/contextless.ts | 80.82% | - | - | LOW |
| packages/runtime/src/events/index.ts | 80.34% | - | - | LOW |
| packages/runtime/src/custom-code/index.ts | 87.41% | - | - | LOW |
| packages/runtime/src/api/client.ts | 82.84% | - | - | LOW |
| packages/runtime/src/render/condition.ts | 92.59% | - | - | LOW |

## Iteration Log
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
