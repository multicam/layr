# Layr Implementation Plan

**Generated:** 2026-02-27
**Status:** 52 specs complete, 6 partial, 1 parked
**Last Gap Analysis:** 2026-02-27
**Last Updated:** 2026-02-27

---

## Project Overview

Layr is a visual development platform with the following architecture:

```
@layr/types     ← All type definitions
     │
@layr/core     ← Signal, formula, action engines
     │
├── @layr/lib  ← 78 built-in formulas + 17 actions
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
└── @layr/search  ← Linting rules (26/58), issue detection
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
| Missing specs | 0 | All specs now created |

### Skipped Tests

| File | Line | Test | Action |
|------|------|------|--------|
| `packages/runtime/src/api/client.test.ts` | 121 | `test.skip('merges headers')` | Implement or remove |
| `packages/runtime/src/custom-code/index.test.ts` | 282 | `test.skip('returns false for empty package')` | Implement or remove |

### Code Inventory (Verified 2026-02-27)

**Formulas (78 implemented):**
- Array: concat, every, filter, find, flat, includes, index-of, join, length, map, reduce, reverse, slice, some, sort (15)
- Comparison: between, greater-than, greater-than-or-equal, less-than, less-than-or-equal (5)
- Logic: equals, if, is-empty, is-not-null, is-null, not, not-equals, switch (8)
- Number: abs, add, ceil, clamp, divide, floor, max, min, mod, multiply, power, random, round, sqrt, subtract (15)
- Object: entries, from-entries, get, has-key, keys, merge, omit, pick, values (9)
- String: char-at, concatenate, ends-with, lowercase, pad-end, pad-start, repeat, replace, replace-all, split, starts-with, string-includes, string-index-of, string-length, substring, trim, uppercase (17)
- Utility: default, first, last, nth, to-array, to-boolean, to-number, to-string, type-of (9)

**Actions (17 implemented):**
- Storage: saveToLocalStorage, deleteFromLocalStorage, clearLocalStorage, saveToSessionStorage, deleteFromSessionStorage, clearSessionStorage (6)
- Cookies: setCookie (1)
- Navigation: goToURL (1)
- Events: focus, preventDefault, stopPropagation (3)
- Timers: sleep, interval (2)
- Debug: logToConsole (1)
- Sharing: copyToClipboard, share (2)
- Theme: setTheme (1)

**Linting Rules (26 implemented):**
- unknownActionRule, unknownComponentRule, unknownEventRule, unknownFormulaRule, unknownVariableRule (5 unknown* rules)
- noReferenceAttributeRule, noReferenceVariableRule (2 noReference* rules)
- noStaticNodeConditionRule, noUnnecessaryConditionTruthyRule, noUnnecessaryConditionFalsyRule (3 logic rules)
- unknownAttributeRule, unknownVariableSetterRule, unknownTriggerWorkflowRule, unknownWorkflowParameterRule, unknownApiRule, unknownApiInputRule (6 error-level - 2026-02-27)
- nonEmptyVoidElementRule, missingAltAttributeRule (2 DOM rules - 2026-02-27)
- duplicateRouteRule, duplicateUrlParameterRule (2 routing rules - 2026-02-27)
- unknownContextProviderRule, unknownContextProviderFormulaRule, unknownContextProviderWorkflowRule, noContextConsumersRule, unknownContextFormulaRule, unknownContextWorkflowRule (6 context rules - 2026-02-27)

---

## Priority 1: Complete Partial Specs

### 1.1 Search & Linting Rules (HIGH PRIORITY)

**Spec:** `specs/search-and-linting.md`
**Status:** 26/58 rules implemented (45%)
**Package:** `@layr/search`

**Implemented Rules (26):**
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
- `unknownAttributeRule` - Attributes (2026-02-27)
- `unknownVariableSetterRule` - Variables (2026-02-27)
- `unknownTriggerWorkflowRule` - Workflows (2026-02-27)
- `unknownWorkflowParameterRule` - Workflows (2026-02-27)
- `unknownApiRule` - APIs (2026-02-27)
- `unknownApiInputRule` - APIs (2026-02-27)
- `nonEmptyVoidElementRule` - DOM (2026-02-27)
- `missingAltAttributeRule` - DOM/accessibility (2026-02-27)
- `duplicateRouteRule` - Routing (2026-02-27)
- `duplicateUrlParameterRule` - Routing (2026-02-27)
- `unknownContextProviderRule` - Contexts (2026-02-27)
- `unknownContextProviderFormulaRule` - Contexts (2026-02-27)
- `unknownContextProviderWorkflowRule` - Contexts (2026-02-27)
- `noContextConsumersRule` - Contexts (2026-02-27)
- `unknownContextFormulaRule` - Contexts (2026-02-27)
- `unknownContextWorkflowRule` - Contexts (2026-02-27)

**Missing Rules by Category (32 remaining rules):**

#### Action Rules (2 remaining)
- [ ] `unknownTriggerEventRule` - Unknown event triggers
- [ ] `noReferenceComponentWorkflowRule` - Unused workflows

#### API Rules (1 remaining)
- [ ] `noReferenceApiRule` - Unused APIs
- [x] `unknownApiRule` - References to non-existent APIs (IMPLEMENTED 2026-02-27)
- [x] `unknownApiInputRule` - Unknown API input references (IMPLEMENTED 2026-02-27)

#### Attribute Rules (1 remaining)
- [x] `unknownAttributeRule` - References to non-existent attributes (IMPLEMENTED 2026-02-27)
- [ ] `unknownComponentAttributeRule` - Unknown attributes on component instances

#### Component Rules (1 remaining)
- [ ] `noReferenceComponentRule` - Components not used anywhere

#### Context Rules (6 implemented, 0 remaining)
- [x] `noContextConsumersRule` - Context providers without consumers (IMPLEMENTED 2026-02-27)
- [x] `unknownContextFormulaRule` - Unknown context formula references (IMPLEMENTED 2026-02-27)
- [x] `unknownContextProviderFormulaRule` - Unknown provider formula references (IMPLEMENTED 2026-02-27)
- [x] `unknownContextProviderRule` - References to non-existent providers (IMPLEMENTED 2026-02-27)
- [x] `unknownContextProviderWorkflowRule` - Unknown provider workflow references (IMPLEMENTED 2026-02-27)
- [x] `unknownContextWorkflowRule` - Unknown context workflow references (IMPLEMENTED 2026-02-27)

#### DOM Rules (2 implemented, 4 remaining)
- [x] `nonEmptyVoidElementRule` - Void elements with children (IMPLEMENTED 2026-02-27)
- [x] `missingAltAttributeRule` - Missing alt on images (IMPLEMENTED 2026-02-27)
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

#### Routing Rules (2 implemented, 2 remaining)
- [x] `duplicateUrlParameterRule` - Duplicate URL parameter names (IMPLEMENTED 2026-02-27)
- [x] `duplicateRouteRule` - Multiple pages with same route pattern (IMPLEMENTED 2026-02-27)
- [ ] `unknownSetUrlParameterRule` - Setting unknown URL parameters
- [ ] `unknownUrlParameterRule` - References to unknown URL parameters

#### Slot Rules (1 rule)
- [ ] `unknownComponentSlotRule` - References to non-existent slots

#### Style Rules (4 rules)
- [ ] `invalidStyleSyntaxRule` - CSS that fails PostCSS parsing (with auto-fix)
- [ ] `unknownClassnameRule` - References to non-existent class names
- [ ] `unknownCSSVariableRule` - CSS `var()` referencing undefined variables
- [ ] `noReferenceGlobalCSSVariableRule` - Unused global CSS variables

#### Variable Rules (0 remaining)
- [x] `unknownVariableSetterRule` - Setting non-existent variables (IMPLEMENTED 2026-02-27)

#### Workflow Rules (3 remaining)
- [ ] `duplicateWorkflowParameterRule` - Duplicate parameter names
- [ ] `noPostNavigateAction` - Actions after navigation (unreachable code, with auto-fix)
- [ ] `noReferenceComponentWorkflowRule` - Unused workflows (duplicate from Action)
- [ ] `unknownTriggerWorkflowParameterRule` - Unknown workflow parameter references
- [x] `unknownTriggerWorkflowRule` - References to non-existent workflows (IMPLEMENTED 2026-02-27)
- [x] `unknownWorkflowParameterRule` - Unknown parameter references (IMPLEMENTED 2026-02-27)

---

### 1.2 Standard Library Formulas (MEDIUM PRIORITY)

**Spec:** `specs/standard-library.md`
**Status:** 78/97 formulas implemented (80%)
**Package:** `@layr/lib`

**Missing Formula Categories (19 formulas):**

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

### 1.3 Standard Library Actions (NEARLY COMPLETE)

**Spec:** `specs/standard-library.md`
**Status:** 17/19 actions implemented (89%)
**Package:** `@layr/lib`

**Implemented Actions (17):**
- Local Storage: `saveToLocalStorage`, `deleteFromLocalStorage`, `clearLocalStorage`
- Session Storage: `saveToSessionStorage`, `deleteFromSessionStorage`, `clearSessionStorage`
- Cookies: `setCookie`
- Navigation: `goToURL`
- Events: `focus`, `preventDefault`, `stopPropagation`
- Timers: `sleep`, `interval`
- Debug: `logToConsole`
- Sharing: `copyToClipboard`, `share`
- Theme: `setTheme`

**Missing Actions (2):**
- [ ] `setHttpOnlyCookie` - Server-only HttpOnly cookie setting
- [ ] `setSessionCookies` - (deprecated in spec, may not need implementation)

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

## Priority 3: Missing Specifications

### 3.1 Product Reference Spec (COMPLETE)

**Location:** `specs/00-product-reference.md`
**Status:** Created 2026-02-27
**Description:** High-level product goals and vision document

This spec defines:
- [x] Project vision and mission
- [x] Target users and use cases
- [x] Core product features
- [x] Success metrics
- [x] Architecture principles
- [x] Roadmap priorities

---

## Priority 4: Parked Specifications

### 3.1 Custom Elements (PARKED)

**Location:** `specs/parked/`
**Status:** Lower priority
**Description:** Web components export feature

This spec is parked and not currently being implemented.

---

## Implementation Order

### Phase 0: Missing Specifications (COMPLETE)
1. [x] Create `specs/00-product-reference.md` with product goals

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

### 2026-02-27 (Context Linting Rules - 6 New Rules)
- **Implemented 6 new context linting rules:**
  - `unknownContextProviderRule` (error) - Detects context subscriptions referencing non-existent providers
  - `unknownContextProviderFormulaRule` (error) - Detects context subscriptions referencing formulas not exposed by provider
  - `unknownContextProviderWorkflowRule` (error) - Detects context subscriptions referencing workflows not exposed by provider
  - `noContextConsumersRule` (warning) - Detects context providers with no consumers
  - `unknownContextFormulaRule` (error) - Detects formula references to undeclared context formulas
  - `unknownContextWorkflowRule` (error) - Detects TriggerWorkflow with undeclared context workflows
- **Linting rules status:** 26/58 implemented (45%, up from 34%)
- **All 1357 tests pass**
- New rule files created in `packages/search/src/rules/contexts/`:
  - `unknownContextProviderRule.ts`
  - `unknownContextProviderFormulaRule.ts`
  - `unknownContextProviderWorkflowRule.ts`
  - `noContextConsumersRule.ts`
  - `unknownContextFormulaRule.ts`
  - `unknownContextWorkflowRule.ts`
- New test file: `contexts/contexts.test.ts` - 15 tests for context rules
- Updated `packages/search/src/rules/index.ts` to export new rules
- Updated `packages/search/src/problems.ts` to include new rules in getAllRules()

### 2026-02-27 (Phase 1 Linting Rules - DOM and Routing)
- **Implemented 4 new linting rules:**
  - `nonEmptyVoidElementRule` (error) - Detects void HTML elements (img, br, etc.) with children
  - `missingAltAttributeRule` (warning) - Detects img elements without alt attribute
  - `duplicateRouteRule` (error) - Detects multiple pages with the same route pattern
  - `duplicateUrlParameterRule` (error) - Detects duplicate URL parameter names in routes
- **Linting rules status:** 20/58 implemented (34%, up from 28%)
- **All 1327 tests pass**
- Updated `packages/search/src/problems.ts` to import and use actual rule implementations
- New rule files created in `packages/search/src/rules/`:
  - `dom/nonEmptyVoidElementRule.ts`
  - `dom/missingAltAttributeRule.ts`
  - `routing/duplicateRouteRule.ts`
  - `routing/duplicateUrlParameterRule.ts`
- New test files:
  - `dom/dom.test.ts` - 5 tests for DOM rules
  - `routing/routing.test.ts` - 12 tests for routing rules

### 2026-02-27 (Linting Rules Implementation - 6 New Rules)
- **Implemented 6 new error-level linting rules:**
  - `unknownAttributeRule` - Detects Attributes.X references to non-existent attributes
  - `unknownVariableSetterRule` - Detects SetVariable actions targeting non-existent variables
  - `unknownTriggerWorkflowRule` - Detects TriggerWorkflow actions targeting non-existent workflows
  - `unknownWorkflowParameterRule` - Detects Parameters.X formulas referencing non-existent workflow parameters
  - `unknownApiRule` - Detects Fetch actions targeting non-existent APIs
  - `unknownApiInputRule` - Detects Fetch actions with invalid input keys
- **Linting rules status:** 16/58 implemented (28%, up from 17%)
- **All 1325 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `attributes/unknownAttributeRule.ts`
  - `variables/unknownVariableSetterRule.ts`
  - `workflows/unknownTriggerWorkflowRule.ts`
  - `workflows/unknownWorkflowParameterRule.ts`
  - `apis/unknownApiRule.ts`
  - `apis/unknownApiInputRule.ts`

### 2026-02-27 (Product Reference Spec Created)
- Created `specs/00-product-reference.md` with vision, users, features, metrics
- All 52 specs now complete (was 51)
- Updated status: 52 complete, 6 partial, 1 parked
- Phase 0 (Missing Specifications) marked complete

### 2026-02-27 (Phase 0 Gap Analysis Complete)
- **Verified via code search:** All counts confirmed accurate
- **Formulas:** 78 implemented via `registerFormula()` calls
- **Actions:** 17 implemented via `registerAction()` calls
- **Linting Rules:** 10 implemented (verified in `packages/search/src/rules/index.ts`)
- **Skipped Tests:** 2 confirmed (both with comments explaining why)
- **TODOs/FIXMEs:** None found in codebase
- **Placeholder implementations:** None found
- **Missing specs:** Added `00-product-reference.md` to gap analysis
- Added Priority 3 for missing spec creation

### 2026-02-27 (Verified Gap Analysis Update)
- **Corrected formula count:** 78 implemented (not 84 as previously stated)
- **Corrected action count:** 17 implemented (not 19 as previously stated)
- **Corrected linting rules:** 10 implemented (verified)
- Updated architecture diagram with accurate counts
- Added detailed Code Inventory section with verified counts
- No TODO/FIXME comments found in codebase
- No placeholder implementations found
- 2 skipped tests confirmed in runtime package
- Spec gap analysis complete: 19 formulas missing, 48 linting rules missing, 2 actions missing

### 2026-02-26
- Initial IMPLEMENTATION_PLAN.md created
- Analyzed 57 specs (51 complete, 6 partial, 1 parked)
- Identified 50+ missing linting rules
- Identified ~19 missing formulas
- Found 2 skipped tests
- Actions confirmed complete (19/19)
