# Layr Implementation Plan

**Generated:** 2026-02-27
**Status:** 51 specs complete, 6 partial, 1 parked
**Last Gap Analysis:** 2026-02-27

---

## Project Overview

Layr is a visual development platform with the following architecture:

```
@layr/types     ← All type definitions
     │
@layr/core     ← Signal, formula, action engines
     │
├── @layr/lib  ← 84 built-in formulas + 19 actions
│
├── @layr/themes ← Default theme definitions
│
├── @layr/ssr  ← Server-side rendering
│
├── @layr/runtime ← Client-side rendering
│
├── @layr/backend ← Hono HTTP server
│
├── @layr/editor  ← Visual editor UI
│
└── @layr/search  ← Linting rules (10/58), issue detection
```

---

## Spec Gaps & Analysis (Phase 0)

### Gap Summary

| Category | Found | Details |
|----------|-------|---------|
| Skipped Tests | 2 | In runtime package |
| TODO/FIXME | 0 | None found in codebase |
| Placeholder implementations | 0 | None found |
| Partial specs | 6 | Standard library, search/linting |
| Stale references | 0 | None detected |

### Skipped Tests

| File | Line | Test | Action |
|------|------|------|--------|
| `packages/runtime/src/api/client.test.ts` | 121 | `test.skip('merges headers')` | Implement or remove |
| `packages/runtime/src/custom-code/index.test.ts` | 282 | `test.skip('returns false for empty package')` | Implement or remove |

### Code Inventory (Verified 2026-02-27)

**Formulas (84 implemented):**
- Array: concat, every, filter, find, first, flat, includes, index-of, join, last, length, map, nth, reduce, reverse, slice, some, sort (18)
- Comparison: between, greater-than, greater-than-or-equal, less-than, less-than-or-equal (5)
- Logic: equals, if, is-empty, is-not-null, is-null, not, not-equals, switch (8)
- Number: abs, add, ceil, clamp, divide, floor, max, min, mod, multiply, power, random, round, sqrt, subtract (15)
- Object: entries, from-entries, get, has-key, keys, merge, omit, pick, values (9)
- String: char-at, concatenate, ends-with, lowercase, pad-end, pad-start, repeat, replace, replace-all, split, starts-with, string-includes, string-index-of, string-length, substring, to-string, trim, uppercase (18)
- Utility: default, to-array, to-boolean, to-number, to-string, type-of (6)

**Actions (19 implemented - COMPLETE):**
- Storage: saveToLocalStorage, deleteFromLocalStorage, clearLocalStorage, saveToSessionStorage, deleteFromSessionStorage, clearSessionStorage (6)
- Cookies: setCookie (1)
- Navigation: goToURL (1)
- Events: focus, preventDefault, stopPropagation (3)
- Timers: sleep, interval (2)
- Debug: logToConsole (1)
- Sharing: copyToClipboard, share (2)
- Theme: setTheme (1)

**Linting Rules (10 implemented):**
- unknownActionRule, unknownComponentRule, unknownEventRule, unknownFormulaRule, unknownVariableRule (5 unknown* rules)
- noReferenceAttributeRule, noReferenceVariableRule (2 noReference* rules)
- noStaticNodeConditionRule, noUnnecessaryConditionTruthyRule, noUnnecessaryConditionFalsyRule (3 logic rules)

---

## Priority 1: Complete Partial Specs

### 1.1 Search & Linting Rules (HIGH PRIORITY)

**Spec:** `specs/search-and-linting.md`
**Status:** 10/58 rules implemented (17%)
**Package:** `@layr/search`

**Implemented Rules (10):**
- `unknownActionRule` - Actions
- `unknownComponentRule` - Components
- `unknownEventRule` - Events
- `unknownFormulaRule` - Formulas
- `unknownVariableRule` - Variables
- `noReferenceAttributeRule` - Attributes
- `noReferenceVariableRule` - Variables
- `noStaticNodeConditionRule` - Logic (auto-fix)
- `noUnnecessaryConditionTruthyRule` - Logic
- `noUnnecessaryConditionFalsyRule` - Logic

**Missing Rules by Category (50+ rules):**

#### Action Rules (2 remaining)
- [ ] `unknownTriggerEventRule` - Unknown event triggers
- [ ] `noReferenceComponentWorkflowRule` - Unused workflows

#### API Rules (3 rules)
- [ ] `noReferenceApiRule` - Unused APIs
- [ ] `unknownApiRule` - References to non-existent APIs
- [ ] `unknownApiInputRule` - Unknown API input references

#### Attribute Rules (2 remaining)
- [ ] `unknownAttributeRule` - References to non-existent attributes
- [ ] `unknownComponentAttributeRule` - Unknown attributes on component instances

#### Component Rules (1 remaining)
- [ ] `noReferenceComponentRule` - Components not used anywhere

#### Context Rules (6 rules)
- [ ] `noContextConsumersRule` - Context providers without consumers
- [ ] `unknownContextFormulaRule` - Unknown context formula references
- [ ] `unknownContextProviderFormulaRule` - Unknown provider formula references
- [ ] `unknownContextProviderRule` - References to non-existent providers
- [ ] `unknownContextProviderWorkflowRule` - Unknown provider workflow references
- [ ] `unknownContextWorkflowRule` - Unknown context workflow references

#### DOM Rules (9 rules)
- [ ] `nonEmptyVoidElementRule` - Void elements with children
- [ ] `createRequiredElementAttributeRule('img', 'alt')` - Missing alt on images
- [ ] `createRequiredMetaTagRule('description')` - Missing meta description
- [ ] `createRequiredDirectChildRule` - Invalid list children
- [ ] `elementWithoutInteractiveContentRule` - Non-interactive content issues
- [ ] `imageWithoutDimensionRule` - Images without explicit dimensions

#### Event Rules (4 rules)
- [ ] `duplicateEventTriggerRule` - Multiple handlers for same trigger
- [ ] `noReferenceEventRule` - Unused event definitions
- [ ] `unknownTriggerEventRule` - Unknown event trigger references (duplicate from Action)

#### Formula Rules (3 rules)
- [ ] `duplicateFormulaArgumentNameRule` - Duplicate argument names
- [ ] `noReferenceComponentFormulaRule` - Unused component formulas
- [ ] `noReferenceProjectFormulaRule` - Unused project formulas

#### Logic Rules (4 remaining)
- [ ] `unknownFormulaRule` - Unknown formula references
- [ ] `unknownProjectFormulaRule` - Unknown project formula references
- [ ] `unknownRepeatIndexFormulaRule` - Unknown repeat index references
- [ ] `unknownRepeatItemFormulaRule` - Unknown repeat item references

#### Miscellaneous Rules (3 rules)
- [ ] `noReferenceNodeRule` - Orphaned nodes
- [ ] `requireExtensionRule` - Missing required extensions
- [ ] `unknownCookieRule` - Unknown cookie references

#### Routing Rules (4 rules)
- [ ] `duplicateUrlParameterRule` - Duplicate URL parameter names
- [ ] `duplicateRouteRule` - Multiple pages with same route pattern
- [ ] `unknownSetUrlParameterRule` - Setting unknown URL parameters
- [ ] `unknownUrlParameterRule` - References to unknown URL parameters

#### Slot Rules (1 rule)
- [ ] `unknownComponentSlotRule` - References to non-existent slots

#### Style Rules (4 rules)
- [ ] `invalidStyleSyntaxRule` - CSS that fails PostCSS parsing (with auto-fix)
- [ ] `unknownClassnameRule` - References to non-existent class names
- [ ] `unknownCSSVariableRule` - CSS `var()` referencing undefined variables
- [ ] `noReferenceGlobalCSSVariableRule` - Unused global CSS variables

#### Variable Rules (1 remaining)
- [ ] `unknownVariableSetterRule` - Setting non-existent variables

#### Workflow Rules (5 remaining)
- [ ] `duplicateWorkflowParameterRule` - Duplicate parameter names
- [ ] `noPostNavigateAction` - Actions after navigation (unreachable code, with auto-fix)
- [ ] `noReferenceComponentWorkflowRule` - Unused workflows (duplicate from Action)
- [ ] `unknownTriggerWorkflowParameterRule` - Unknown workflow parameter references
- [ ] `unknownTriggerWorkflowRule` - References to non-existent workflows
- [ ] `unknownWorkflowParameterRule` - Unknown parameter references

---

### 1.2 Standard Library Formulas (MEDIUM PRIORITY)

**Spec:** `specs/standard-library.md`
**Status:** 84/97 formulas implemented (87%)
**Package:** `@layr/lib`

**Missing Formula Categories (13 formulas):**

#### Date/Time Formulas (5 formulas) - NOT IMPLEMENTED
- [ ] `dateFromString` - Parse date string
- [ ] `dateFromTimestamp` - Create date from timestamp
- [ ] `formatDate` - Format date to string
- [ ] `now` - Current date/time
- [ ] `timestamp` - Date to Unix timestamp

#### Environment & DOM Formulas (9 formulas) - NOT IMPLEMENTED
- [ ] `branchName` - Returns `env.branchName`
- [ ] `canShare` - Returns `navigator.canShare()` result
- [ ] `currentURL` - Returns current URL (server/client aware)
- [ ] `getElementById` - Returns `document.getElementById()`
- [ ] `getCookie` - Reads cookie (server/client aware)
- [ ] `getHttpOnlyCookie` - Reads HttpOnly cookie (server only)
- [ ] `isServer` - Returns true on server, false on client
- [ ] `languages` - Returns `navigator.languages`
- [ ] `userAgent` - Returns user agent string

#### Storage Formulas (2 formulas) - NOT IMPLEMENTED
- [ ] `getFromLocalStorage` - Read and JSON parse from `localStorage`
- [ ] `getFromSessionStorage` - Read and JSON parse from `sessionStorage`

#### Array Formulas (7 missing from spec)
- [ ] `append` - Add element to end
- [ ] `drop` - Remove first N elements
- [ ] `dropLast` - Remove last N elements
- [ ] `findIndex` - Index of first match
- [ ] `findLast` - Last matching element
- [ ] `prepend` - Add element to start
- [ ] `shuffle` - Random order
- [ ] `sort_by` - Sort by derived value (different from sort)
- [ ] `take` - Keep first N elements
- [ ] `takeLast` - Keep last N elements
- [ ] `unique` - Remove duplicates

#### Object Formulas (5 missing from spec)
- [ ] `deleteKey` - Remove key from object
- [ ] `groupBy` - Group array elements by key
- [ ] `keyBy` - Index array by key
- [ ] `set` - Set key in object (immutable)
- [ ] `size` - Count of keys

#### String Formulas (9 missing from spec)
- [ ] `capitalize` - Capitalize first letter
- [ ] `decodeBase64` - Decode Base64
- [ ] `decodeURIComponent` - Decode URI component
- [ ] `encodeBase64` - Encode to Base64
- [ ] `encodeJSON` - `JSON.stringify()`
- [ ] `encodeURIComponent` - Encode URI component
- [ ] `parseJSON` - `JSON.parse()`
- [ ] `parseURL` - Parse URL string
- [ ] `matches` - Regex match test

#### Number Formulas (2 missing from spec)
- [ ] `logarithm` - Natural logarithm
- [ ] `randomNumber` - Random integer in range (different from random?)

#### Data Utility Formulas (3 missing from spec)
- [ ] `lastIndexOf` - Last index of value
- [ ] `range` - Generate number sequence
- [ ] `json` - Deep clone via JSON round-trip

#### Formatting Formulas (1 missing from spec)
- [ ] `formatNumber` - Format number with Intl.NumberFormat

---

### 1.3 Standard Library Actions (COMPLETE ✅)

**Spec:** `specs/standard-library.md`
**Status:** 19/19 actions implemented (100%)
**Package:** `@layr/lib`

All actions are implemented:
- Local Storage: `saveToLocalStorage`, `deleteFromLocalStorage`, `clearLocalStorage`
- Session Storage: `saveToSessionStorage`, `deleteFromSessionStorage`, `clearSessionStorage`
- Cookies: `setCookie`
- Navigation: `goToURL`
- Events: `focus`, `preventDefault`, `stopPropagation`
- Timers: `sleep`, `interval`
- Debug: `logToConsole`
- Sharing: `copyToClipboard`, `share`
- Theme: `setTheme`

---

## Priority 2: Test Coverage Improvements

### 2.1 Fix Skipped Tests

| Test | File | Action |
|------|------|--------|
| `merges headers` | `packages/runtime/src/api/client.test.ts:121` | Implement test |
| `returns false for empty package` | `packages/runtime/src/custom-code/index.test.ts:282` | Implement test |

### 2.2 Coverage Gaps by Package

| Package | Current Coverage | Target |
|---------|------------------|--------|
| @layr/backend | 60% | 80% |
| @layr/runtime | 69% | 85% |
| @layr/editor | 70% | 80% (E2E needed) |

---

## Priority 3: Parked Specifications

### 3.1 Custom Elements (PARKED)

**Location:** `specs/parked/`
**Status:** Lower priority
**Description:** Web components export feature

This spec is parked and not currently being implemented.

---

## Implementation Order

### Phase 1: Critical Linting Rules (Week 1-2)
1. Implement core reference rules (unknown* rules)
2. Implement DOM accessibility rules (alt tags, meta tags)
3. Implement routing rules (duplicate routes, URL parameters)

### Phase 2: Standard Library Completion (Week 3-4)
1. Implement Date/Time formulas
2. Implement Environment/DOM formulas
3. Implement remaining Array/String formulas

### Phase 3: Remaining Linting Rules (Week 5-6)
1. Implement Context rules
2. Implement Style rules
3. Implement Workflow rules

### Phase 4: Test Coverage (Ongoing)
1. Fix skipped tests
2. Add missing tests for new features
3. Improve E2E coverage for editor

---

## Architecture Notes

### Key Patterns

1. **Formula Registration:** All formulas are registered with `@toddle/` prefix via `registerFormula()`
2. **Action Registration:** All actions are registered with `@toddle/` prefix via `registerAction()`
3. **Rule Pattern:** Linting rules implement `Rule<Data, NodeType, Value>` interface with `visit()` function
4. **Higher-Order Formulas:** Formulas accepting function arguments use closure pattern with `{ item, index }` context

### Test Command

```bash
bun test                    # Run all tests
bun test --coverage         # Run with coverage
bun test packages/core/     # Run specific package
```

### Development Commands

```bash
bun run dev                 # Start backend + editor
bun run dev:backend         # Start backend only
bun run dev:editor          # Start editor only
bun run build               # Build all packages
```

---

## Changelog

### 2026-02-27 (Gap Analysis Update)
- Verified formula count: 84 implemented (not 78 as previously stated)
- Verified linting rules: 10 implemented (not 8 as previously stated)
- Updated architecture diagram with accurate counts
- Added detailed Code Inventory section with verified counts
- No TODO/FIXME comments found in codebase
- No placeholder implementations found
- 2 skipped tests confirmed in runtime package
- Spec gap analysis complete: 13 formula categories missing items

### 2026-02-26
- Initial IMPLEMENTATION_PLAN.md created
- Analyzed 57 specs (51 complete, 6 partial, 1 parked)
- Identified 50+ missing linting rules
- Identified ~19 missing formulas
- Found 2 skipped tests
- Actions confirmed complete (19/19)
