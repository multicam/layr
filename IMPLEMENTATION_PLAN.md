# Layr Implementation Plan

**Generated:** 2026-02-27
**Status:** 52 specs complete, 6 partial, 1 parked
**Last Gap Analysis:** 2026-02-27
**Last Updated:** 2026-02-27
**Total Tests:** 1701

---

## Recent Progress

### 2026-02-27 (Additional Linting Rule Test Coverage Improvements)
- **Improved linting rule test coverage with 86 new tests:**
  - **unknownProjectFormulaRule.ts** - Coverage improved from 50% to 100%
    - Added 16 tests covering: array formulas, object formulas, function formulas, variables
    - Tests cover: node conditions, repeats, element attributes, component attributes, text values
    - Tests cover: APIs (url, body, method, headers, queryParams), route formulas (title, description, icon)
    - Tests cover: project formulas referencing other project formulas
  - **unknownRepeatFormulaRule.ts** - Coverage improved from 50.6% to 92.77%
    - Added 12 tests for index and item formula rules
    - Tests cover: RepeatIndex, nested paths, function args, styles, attributes, conditions
    - Tests cover: valid repeat config scenarios
  - **unknownTriggerWorkflowParameterRule.ts** - Coverage improved from 54.78% to 95.54%
    - Added 10 tests covering: Switch cases/default, Fetch callbacks, TriggerWorkflow callbacks
    - Tests cover: Custom action events, onLoad, onAttributeChange, node events
    - Tests cover: cross-component workflow triggers
  - **unknownUrlParameterRule.ts** - Coverage improved from 58.68% to 97.52%
    - Added 16 tests covering: nested formulas, variables, node repeat, attributes
    - Tests cover: component node attributes, route formulas (title, description, icon)
    - Tests cover: APIs (url, body, headers, queryParams with enabled formulas)
  - **noReferenceComponentFormulaRule.ts** - Coverage improved from 59.38% to 97.92%
    - Added 14 tests covering: apply formulas, variable initial values, node conditions/repeats
    - Tests cover: element attributes, component attributes, text values, APIs
    - Tests cover: headers and queryParams with enabled formulas, nested array formulas
  - **noReferenceProjectFormulaRule.ts** - Coverage improved from 60.71% to 98.21%
    - Added 18 tests covering: apply formulas, variable initial values, node conditions/repeats
    - Tests cover: element attributes, component attributes, text values, APIs
    - Tests cover: headers and queryParams with enabled formulas, route formulas
    - Tests cover: project formulas referencing each other
- **All 1701 tests pass** (up from 1615)

### 2026-02-27 (Linting Rule Test Coverage Improvements)
- **Improved linting rule test coverage with 35 new tests:**
  - **requireExtensionRule.ts** - Coverage improved from 31.58% to 97.26%
    - Added 11 new tests covering: extension references in formulas, customCode, project formulas
    - Tests cover: missing extension detection, available extension checks via name/packageName
    - Tests cover: extension requirements, plugin checks, null handling
  - **unknownCookieRule.ts** - Coverage improved from 42.68% to 99.34%
    - Added 13 new tests covering: condition formulas, attribute formulas, style formulas
    - Tests cover: event handler actions, workflow actions, nested actions (then/else/cases)
    - Tests cover: alternative cookie naming, function formula arguments, component-level cookies
  - **unknownClassnameRule.ts** - Coverage improved from 41.75% to 100%
    - Added 14 new tests covering: undefined classes, utility classes, global styles, themes
    - Tests cover: component styles, node styles, class attribute alternative, array class names
    - Tests cover: concatenate function, dynamic class names, multiple classes, null handling
- **All 1615 tests pass** (up from 1580)

### 2026-02-27 (Storage Formula Test Coverage)
- **Improved storage formula test coverage from 57.14% to 100%:**
  - Added 4 new tests for client-side localStorage/sessionStorage paths
  - Tests now cover: successful value retrieval, JSON parsing, null returns for missing keys, JSON parse errors
  - Mock storage implementations for testing client-side behavior
- **All 1580 tests pass** (up from 1541)

### 2026-02-27 (Action Test Coverage)
- **Improved action test coverage from 9.52% to 100% (functions), 98.68% (lines):**
  - Added 39 new tests for all 18 actions
  - Tests cover: local storage actions, session storage actions, cookie actions, navigation actions
  - Tests cover: event actions (focus, preventDefault, stopPropagation)
  - Tests cover: timer actions (sleep, interval with cleanup), debug actions
  - Tests cover: sharing actions (copyToClipboard, share), theme actions
  - All tests mock browser APIs appropriately for test environment
- **All 1580 tests pass** (up from 1541)
- **Created git tag 0.0.17** for test coverage improvements

### 2026-02-27 (Test Coverage Improvements - Phase 2 Formulas)
- **Added 45 new tests for Phase 2 formulas:**
  - **Datetime formulas (21 tests):** dateFromString, dateFromTimestamp, formatDate, now, timestamp
    - Coverage improved from 7.14% to 93.83% (branch)
  - **Environment formulas (17 tests):** branchName, canShare, currentURL, getElementById, getCookie, getHttpOnlyCookie, isServer, languages, userAgent
    - Coverage improved from 10.89% to 73.75% (branch)
  - **Storage formulas (6 tests):** getFromLocalStorage, getFromSessionStorage
    - Coverage improved from 11.11% to 57.14% (branch)
- **All 1537 tests pass** (up from 1492)
- Tests cover SSR behavior, edge cases, and error handling

### 2026-02-27 (window.logState Implementation)
- **Implemented `window.logState()` exposure in new runtime:**
  - `initToddleGlobal()` now exposes `logState` on `window` for debugging
  - Added test for window.logState availability
  - Updated `specs/14-error-handling.md` to reflect implementation
- **All 1492 tests pass** (up from 1491)
- This completes the `window.logState()` debug tool per the error handling spec

### 2026-02-27 (Documentation Sync)
- **Updated specs to reflect actual implementation state:**
  - `specs/13-search-and-linting.md` - Marked all 57 linting rules as [MVP] (was showing 9/58)
  - `specs/README.md` - Updated counts: 125 formulas, 57 lint rules, 1491+ tests
  - `specs/31-dev-workflow.md` - Updated test count to 1491+
- **Linting rules corrected:** 57 unique rules (spec had duplicate "no reference component workflow")
- **All 1491 tests pass**

### 2026-02-27 (Phase 2 Standard Library - 31 New Formulas)
- **Implemented 31 new standard library formulas (ALL PHASE 2 FORMULAS COMPLETE!):**
  - **String (9 new):** `capitalize`, `encodeJSON`, `parseJSON`, `encodeURIComponent`, `decodeURIComponent`, `encodeBase64`, `decodeBase64`, `parseURL`, `matches`
  - **Array (11 new):** `unique`, `append`, `prepend`, `findIndex`, `findLast`, `drop`, `dropLast`, `take`, `takeLast`, `shuffle`, `sortBy`
  - **Object (5 new):** `deleteKey`, `set`, `size`, `groupBy`, `keyBy`
  - **Number (2 new):** `logarithm`, `randomNumber`
  - **Utility (4 new):** `lastIndexOf`, `range`, `json`, `formatNumber`
- **Standard Library status:** 125/125 formulas (100% COMPLETE!)
- **All 1491 tests pass** (up from 1460)
- New formulas added to existing files in `packages/lib/src/formulas/`:
  - `string.ts` - Added 9 new string formulas
  - `array.ts` - Added 11 new array formulas
  - `object.ts` - Added 5 new object formulas
  - `number.ts` - Added 2 new number formulas
  - `utility.ts` - Added 4 new utility formulas
- 31 new tests added in `packages/lib/src/index.test.ts`

### 2026-02-27 (Skipped Tests Fixed)
- **Fixed 2 skipped tests in runtime package:**
  - `packages/runtime/src/api/client.test.ts` - "merges headers" test now uses mocked fetch instead of network-dependent httpbin.org
  - `packages/runtime/src/custom-code/index.test.ts` - "returns false for empty package" test was incorrectly skipped
- **All 1460 tests pass** (up from 1458)
- **No skipped tests remain in the codebase**

### 2026-02-27 (Standard Library Phase 2 - 16 New Formulas, 1 New Action)
- **Implemented 16 new standard library formulas:**
  - **Date/Time (5 new):** `dateFromString`, `dateFromTimestamp`, `formatDate`, `now`, `timestamp`
  - **Environment/DOM (9 new):** `branchName`, `canShare`, `currentURL`, `getElementById`, `getCookie`, `getHttpOnlyCookie`, `isServer`, `languages`, `userAgent`
  - **Storage (2 new):** `getFromLocalStorage`, `getFromSessionStorage`
- **Implemented 1 new action:**
  - `setHttpOnlyCookie` - Sets HttpOnly cookies via backend endpoint
- **Standard Library status:** 94/97 formulas (97%, up from 80%), 18/19 actions (95%, up from 89%)
- **All 1458 tests pass**
- New formula files created in `packages/lib/src/formulas/`:
  - `datetime.ts` - Date/Time formulas
  - `environment.ts` - Environment/DOM formulas (SSR-safe)
  - `storage.ts` - Storage read formulas
- Updated `packages/lib/src/index.ts` to register new formulas
- Updated `packages/lib/src/actions/index.ts` to add setHttpOnlyCookie action

---

## Recent Progress

### 2026-02-27 (15 New Linting Rules - 57 Total - COMPLETE!)
- **Implemented 15 new linting rules (ALL LINTING RULES NOW COMPLETE!):**
  - **DOM Rules (4 new):**
    - `missingMetaDescriptionRule` (warning) - Page components missing `<meta name="description">`
    - `invalidListChildrenRule` (error) - `<ul>`/`<ol>` with non-`<li>` children
    - `elementWithoutInteractiveContentRule` (warning) - Click handlers on non-interactive elements
    - `imageWithoutDimensionRule` (warning) - `<img>` missing width/height (CLS prevention)
  - **Logic Rules (3 new):**
    - `unknownRepeatIndexFormulaRule` (error) - Repeat index formula without repeat config
    - `unknownRepeatItemFormulaRule` (error) - Repeat item formula without repeat config
    - `switchUnreachableCaseRule` (warning) - Unreachable switch cases
  - **Miscellaneous Rules (3 new):**
    - `noReferenceNodeRule` (warning) - Orphaned nodes not reachable from root
    - `requireExtensionRule` (info) - Required extensions not installed
    - `unknownCookieRule` (error) - Cookie references not declared
  - **Style Rules (4 new):**
    - `invalidStyleSyntaxRule` (error, auto-fix) - CSS that fails basic parsing
    - `unknownClassnameRule` (error) - Classname references not defined in project
    - `unknownCSSVariableRule` (error) - CSS `var()` referencing undefined variables
    - `noReferenceGlobalCSSVariableRule` (warning) - Global CSS variables never used
- **Linting rules status:** 57/57 implemented (100% COMPLETE!)
- **All 1458 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `dom/missingMetaDescriptionRule.ts`
  - `dom/invalidListChildrenRule.ts`
  - `dom/elementWithoutInteractiveContentRule.ts`
  - `dom/imageWithoutDimensionRule.ts`
  - `logic/unknownRepeatFormulaRule.ts` (contains both index and item rules)
  - `logic/switchUnreachableCaseRule.ts`
  - `misc/noReferenceNodeRule.ts`
  - `misc/requireExtensionRule.ts`
  - `misc/unknownCookieRule.ts`
  - `styles/invalidStyleSyntaxRule.ts`
  - `styles/unknownClassnameRule.ts`
  - `styles/unknownCSSVariableRule.ts`
  - `styles/noReferenceGlobalCSSVariableRule.ts`
- New/updated test files:
  - `dom/dom.test.ts` - Added 24 tests for new DOM rules
  - `logic/logic.test.ts` - Added 9 tests for new logic rules
  - `misc/misc.test.ts` - 10 tests for misc rules
  - `styles/styles.test.ts` - 16 tests for style rules

### 2026-02-27 (7 New Linting Rules - 43 Total)
- **Implemented 7 new linting rules:**
  - `unknownTriggerEventRule` (error) - TriggerEvent actions referencing events not defined on component
  - `unknownProjectFormulaRule` (error) - References to non-existent project formulas
  - `unknownComponentSlotRule` (error) - Slot node references slot not declared by target component
  - `unknownComponentAttributeRule` (error) - Component instance passes attribute not declared by target
  - `unknownTriggerWorkflowParameterRule` (error) - TriggerWorkflow passes parameter not declared
  - `noReferenceComponentWorkflowRule` (warning) - Workflows defined but never triggered from entry points
  - `noReferenceApiRule` (warning) - APIs defined but never fetched
- **Linting rules status:** 43/58 implemented (74%, up from 62%)
- **All 1421 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `events/unknownTriggerEventRule.ts`
  - `logic/unknownProjectFormulaRule.ts`
  - `slots/unknownComponentSlotRule.ts`
  - `attributes/unknownComponentAttributeRule.ts`
  - `workflows/unknownTriggerWorkflowParameterRule.ts`
  - `workflows/noReferenceComponentWorkflowRule.ts`
  - `apis/noReferenceApiRule.ts`
- New/updated test files:
  - `events/events.test.ts` - Added 4 tests for unknownTriggerEventRule
  - `logic/logic.test.ts` - 4 tests for unknownProjectFormulaRule
  - `slots/slots.test.ts` - 4 tests for unknownComponentSlotRule
  - `attributes/attributes.test.ts` - 5 tests for unknownComponentAttributeRule
  - `workflows/workflows.test.ts` - Added 5 tests for new workflow rules
  - `apis/apis.test.ts` - 5 tests for noReferenceApiRule

### 2026-02-27 (10 New Linting Rules - 36 Total)
- **Implemented 10 new linting rules:**
  - `unknownUrlParameterRule` (error) - References to URL parameters not defined in route
  - `unknownSetUrlParameterRule` (error) - SetURLParameter/SetURLParameters targeting non-route params
  - `duplicateWorkflowParameterRule` (error) - Workflows with duplicate parameter names
  - `noPostNavigateAction` (warning, auto-fix) - Unreachable actions after goToURL
  - `duplicateEventTriggerRule` (warning) - Multiple handlers for same event trigger
  - `noReferenceEventRule` (warning) - Events defined but never triggered
  - `noReferenceComponentRule` (warning) - Components not used anywhere
  - `duplicateFormulaArgumentNameRule` (error) - Formulas with duplicate argument names
  - `noReferenceComponentFormulaRule` (warning) - Unused component formulas
  - `noReferenceProjectFormulaRule` (warning) - Unused project formulas
- **Linting rules status:** 36/58 implemented (62%, up from 45%)
- **All 1393 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `routing/unknownUrlParameterRule.ts`
  - `routing/unknownSetUrlParameterRule.ts`
  - `workflows/duplicateWorkflowParameterRule.ts`
  - `workflows/noPostNavigateAction.ts`
  - `events/duplicateEventTriggerRule.ts`
  - `events/noReferenceEventRule.ts`
  - `components/noReferenceComponentRule.ts`
  - `formulas/duplicateFormulaArgumentNameRule.ts`
  - `formulas/noReferenceComponentFormulaRule.ts`
  - `formulas/noReferenceProjectFormulaRule.ts`
- New test files:
  - `routing/urlParams.test.ts` - 10 tests
  - `workflows/workflows.test.ts` - 8 tests
  - `events/events.test.ts` - 6 tests
  - `formulas/formulas.test.ts` - 10 tests
  - `components/components.test.ts` - 7 tests

---

## Project Overview

Layr is a visual development platform with the following architecture:

```
@layr/types     ← All type definitions
     │
@layr/core     ← Signal, formula, action engines
     │
├── @layr/lib  ← 125 built-in formulas + 18 actions (100% COMPLETE!)
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
└── @layr/search  ← Linting rules (57/57 COMPLETE!), issue detection
```

---

## Spec Gaps & Analysis (Phase 0)

### Gap Summary

| Category | Found | Details |
|----------|-------|---------|
| Skipped Tests | 0 | All fixed |
| TODO/FIXME | 0 | None found in codebase |
| Placeholder implementations | 0 | None found |
| Partial specs | 5 | Search/linting nearly complete |
| Stale references | 0 | None detected |
| Missing specs | 0 | All specs now created |

### Code Inventory (Verified 2026-02-27)

**Formulas (125 implemented - 100% COMPLETE!):**
- Array: concat, every, filter, find, flat, includes, index-of, join, length, map, reduce, reverse, slice, some, sort, unique, append, prepend, findIndex, findLast, drop, dropLast, take, takeLast, shuffle, sortBy (26)
- Comparison: between, greater-than, greater-than-or-equal, less-than, less-than-or-equal (5)
- Date/Time: dateFromString, dateFromTimestamp, formatDate, now, timestamp (5)
- Environment: branchName, canShare, currentURL, getElementById, getCookie, getHttpOnlyCookie, isServer, languages, userAgent (9)
- Logic: equals, if, is-empty, is-not-null, is-null, not, not-equals, switch (8)
- Number: abs, add, ceil, clamp, divide, floor, max, min, mod, multiply, power, random, round, sqrt, subtract, logarithm, randomNumber (17)
- Object: entries, from-entries, get, has-key, keys, merge, omit, pick, values, deleteKey, set, size, groupBy, keyBy (14)
- Storage: getFromLocalStorage, getFromSessionStorage (2)
- String: char-at, concatenate, ends-with, lowercase, pad-end, pad-start, repeat, replace, replace-all, split, starts-with, string-includes, string-index-of, string-length, substring, trim, uppercase, capitalize, encodeJSON, parseJSON, encodeURIComponent, decodeURIComponent, encodeBase64, decodeBase64, parseURL, matches (26)
- Utility: default, first, last, nth, to-array, to-boolean, to-number, to-string, type-of, lastIndexOf, range, json, formatNumber (13)

**Actions (18 implemented):**
- Storage: saveToLocalStorage, deleteFromLocalStorage, clearLocalStorage, saveToSessionStorage, deleteFromSessionStorage, clearSessionStorage (6)
- Cookies: setCookie, setHttpOnlyCookie (2)
- Navigation: goToURL (1)
- Events: focus, preventDefault, stopPropagation (3)
- Timers: sleep, interval (2)
- Debug: logToConsole (1)
- Sharing: copyToClipboard, share (2)
- Theme: setTheme (1)

**Linting Rules (57 implemented - COMPLETE!):**
- unknownActionRule, unknownComponentRule, unknownEventRule, unknownFormulaRule, unknownVariableRule (5 unknown* rules)
- noReferenceAttributeRule, noReferenceVariableRule, noReferenceEventRule, noReferenceComponentRule, noReferenceComponentWorkflowRule, noReferenceApiRule, noReferenceNodeRule, noReferenceGlobalCSSVariableRule (8 noReference* rules)
- noStaticNodeConditionRule, noUnnecessaryConditionTruthyRule, noUnnecessaryConditionFalsyRule, unknownRepeatIndexFormulaRule, unknownRepeatItemFormulaRule, switchUnreachableCaseRule (6 logic rules)
- unknownAttributeRule, unknownVariableSetterRule, unknownTriggerWorkflowRule, unknownWorkflowParameterRule, unknownApiRule, unknownApiInputRule (6 error-level)
- nonEmptyVoidElementRule, missingAltAttributeRule, missingMetaDescriptionRule, invalidListChildrenRule, elementWithoutInteractiveContentRule, imageWithoutDimensionRule (6 DOM rules)
- duplicateRouteRule, duplicateUrlParameterRule, unknownUrlParameterRule, unknownSetUrlParameterRule (4 routing rules)
- unknownContextProviderRule, unknownContextProviderFormulaRule, unknownContextProviderWorkflowRule, noContextConsumersRule, unknownContextFormulaRule, unknownContextWorkflowRule (6 context rules)
- duplicateWorkflowParameterRule, noPostNavigateAction, unknownTriggerWorkflowParameterRule (3 workflow rules)
- duplicateEventTriggerRule, unknownTriggerEventRule (2 event rules)
- duplicateFormulaArgumentNameRule, noReferenceComponentFormulaRule, noReferenceProjectFormulaRule (3 formula rules)
- unknownComponentAttributeRule (1 attribute rule)
- unknownComponentSlotRule (1 slot rule)
- unknownProjectFormulaRule (1 project formula rule)
- requireExtensionRule (1 extension rule)
- unknownCookieRule (1 cookie rule)
- invalidStyleSyntaxRule, unknownClassnameRule, unknownCSSVariableRule (3 style rules)

---

## Priority 1: Complete Partial Specs

### 1.1 Search & Linting Rules (HIGH PRIORITY) - COMPLETE!

**Spec:** `specs/search-and-linting.md`
**Status:** 57/57 rules implemented (100% COMPLETE!)
**Package:** `@layr/search`

**Implemented Rules (57 - ALL COMPLETE!):**
- `unknownActionRule` - Actions
- `unknownComponentRule` - Components
- `noReferenceComponentRule` - Components (2026-02-27)
- `unknownEventRule` - Events
- `duplicateEventTriggerRule` - Events (2026-02-27)
- `noReferenceEventRule` - Events (2026-02-27)
- `unknownTriggerEventRule` - Events (2026-02-27)
- `unknownFormulaRule` - Formulas
- `duplicateFormulaArgumentNameRule` - Formulas (2026-02-27)
- `noReferenceComponentFormulaRule` - Formulas (2026-02-27)
- `noReferenceProjectFormulaRule` - Formulas (2026-02-27)
- `unknownVariableRule` - Variables
- `noReferenceAttributeRule` - Attributes
- `noReferenceVariableRule` - Variables
- `unknownComponentAttributeRule` - Attributes (2026-02-27)
- `noStaticNodeConditionRule` - Logic (auto-fix)
- `noUnnecessaryConditionTruthyRule` - Logic
- `noUnnecessaryConditionFalsyRule` - Logic
- `unknownProjectFormulaRule` - Logic (2026-02-27)
- `unknownRepeatIndexFormulaRule` - Logic (2026-02-27)
- `unknownRepeatItemFormulaRule` - Logic (2026-02-27)
- `switchUnreachableCaseRule` - Logic (2026-02-27)
- `unknownAttributeRule` - Attributes (2026-02-27)
- `unknownVariableSetterRule` - Variables (2026-02-27)
- `unknownTriggerWorkflowRule` - Workflows (2026-02-27)
- `unknownWorkflowParameterRule` - Workflows (2026-02-27)
- `duplicateWorkflowParameterRule` - Workflows (2026-02-27)
- `noPostNavigateAction` - Workflows (auto-fix) (2026-02-27)
- `unknownTriggerWorkflowParameterRule` - Workflows (2026-02-27)
- `noReferenceComponentWorkflowRule` - Workflows (2026-02-27)
- `unknownApiRule` - APIs (2026-02-27)
- `unknownApiInputRule` - APIs (2026-02-27)
- `noReferenceApiRule` - APIs (2026-02-27)
- `nonEmptyVoidElementRule` - DOM (2026-02-27)
- `missingAltAttributeRule` - DOM/accessibility (2026-02-27)
- `missingMetaDescriptionRule` - DOM/SEO (2026-02-27)
- `invalidListChildrenRule` - DOM (2026-02-27)
- `elementWithoutInteractiveContentRule` - DOM/accessibility (2026-02-27)
- `imageWithoutDimensionRule` - DOM/CLS (2026-02-27)
- `duplicateRouteRule` - Routing (2026-02-27)
- `duplicateUrlParameterRule` - Routing (2026-02-27)
- `unknownUrlParameterRule` - Routing (2026-02-27)
- `unknownSetUrlParameterRule` - Routing (2026-02-27)
- `unknownContextProviderRule` - Contexts (2026-02-27)
- `unknownContextProviderFormulaRule` - Contexts (2026-02-27)
- `unknownContextProviderWorkflowRule` - Contexts (2026-02-27)
- `noContextConsumersRule` - Contexts (2026-02-27)
- `unknownContextFormulaRule` - Contexts (2026-02-27)
- `unknownContextWorkflowRule` - Contexts (2026-02-27)
- `unknownComponentSlotRule` - Slots (2026-02-27)
- `noReferenceNodeRule` - Misc (2026-02-27)
- `requireExtensionRule` - Misc (2026-02-27)
- `unknownCookieRule` - Misc (2026-02-27)
- `invalidStyleSyntaxRule` - Styles (2026-02-27)
- `unknownClassnameRule` - Styles (2026-02-27)
- `unknownCSSVariableRule` - Styles (2026-02-27)
- `noReferenceGlobalCSSVariableRule` - Styles (2026-02-27)

**All Rules Complete! (57/57)**

No remaining rules to implement.

---

### 1.2 Standard Library Formulas (COMPLETE!)

**Spec:** `specs/standard-library.md`
**Status:** 125/125 formulas implemented (100% COMPLETE!)
**Package:** `@layr/lib`

**All formula categories implemented:**

#### MVP Formulas (94) - COMPLETE
- Array (15): map, filter, reduce, find, length, join, includes, index-of, slice, concat, reverse, sort, flat, every, some
- String (17): concatenate, split, uppercase, lowercase, trim, substring, replace, replace-all, starts-with, ends-with, string-includes, string-length, char-at, string-index-of, pad-start, pad-end, repeat
- Number (15): add, subtract, multiply, divide, mod, power, sqrt, abs, round, floor, ceil, min, max, random, clamp
- Object (9): keys, values, entries, from-entries, merge, pick, omit, has-key, get
- Logic (8): equals, not-equals, not, if, switch, is-null, is-not-null, is-empty
- Comparison (5): greater-than, greater-than-or-equal, less-than, less-than-or-equal, between
- Utility (9): to-string, to-number, to-boolean, to-array, type-of, default, first, last, nth
- Datetime (5): dateFromString, dateFromTimestamp, formatDate, now, timestamp
- Environment (9): branchName, canShare, currentURL, getElementById, getCookie, getHttpOnlyCookie, isServer, languages, userAgent
- Storage (2): getFromLocalStorage, getFromSessionStorage

#### Phase 2 Formulas (31) - COMPLETE (2026-02-27)
- String (9): capitalize, encodeJSON, parseJSON, encodeURIComponent, decodeURIComponent, encodeBase64, decodeBase64, parseURL, matches
- Array (11): unique, append, prepend, findIndex, findLast, drop, dropLast, take, takeLast, shuffle, sortBy
- Object (5): deleteKey, set, size, groupBy, keyBy
- Number (2): logarithm, randomNumber
- Utility (4): lastIndexOf, range, json, formatNumber

---

### 1.3 Standard Library Actions (NEARLY COMPLETE)

**Spec:** `specs/standard-library.md`
**Status:** 18/19 actions implemented (95%)
**Package:** `@layr/lib`

**Implemented Actions (18):**
- Local Storage: `saveToLocalStorage`, `deleteFromLocalStorage`, `clearLocalStorage`
- Session Storage: `saveToSessionStorage`, `deleteFromSessionStorage`, `clearSessionStorage`
- Cookies: `setCookie`, `setHttpOnlyCookie` (new 2026-02-27)
- Navigation: `goToURL`
- Events: `focus`, `preventDefault`, `stopPropagation`
- Timers: `sleep`, `interval`
- Debug: `logToConsole`
- Sharing: `copyToClipboard`, `share`
- Theme: `setTheme`

**Missing Actions (1):**
- [ ] `setSessionCookies` - (deprecated in spec, may not need implementation)

---

## Priority 2: Test Coverage Improvements

### 2.1 Fix Skipped Tests (COMPLETE)

All skipped tests have been fixed:
- `packages/runtime/src/api/client.test.ts:121` - Fixed with mocked fetch
- `packages/runtime/src/custom-code/index.test.ts:282` - Fixed (was incorrectly skipped)

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

### 2026-02-27 (7 New Linting Rules - 43 Total)
- **Implemented 7 new linting rules:**
  - `unknownTriggerEventRule` (error) - TriggerEvent actions referencing events not defined on component
  - `unknownProjectFormulaRule` (error) - References to non-existent project formulas
  - `unknownComponentSlotRule` (error) - Slot node references slot not declared by target component
  - `unknownComponentAttributeRule` (error) - Component instance passes attribute not declared by target
  - `unknownTriggerWorkflowParameterRule` (error) - TriggerWorkflow passes parameter not declared
  - `noReferenceComponentWorkflowRule` (warning) - Workflows defined but never triggered from entry points
  - `noReferenceApiRule` (warning) - APIs defined but never fetched
- **Linting rules status:** 43/58 implemented (74%, up from 62%)
- **All 1421 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `events/unknownTriggerEventRule.ts`
  - `logic/unknownProjectFormulaRule.ts`
  - `slots/unknownComponentSlotRule.ts`
  - `attributes/unknownComponentAttributeRule.ts`
  - `workflows/unknownTriggerWorkflowParameterRule.ts`
  - `workflows/noReferenceComponentWorkflowRule.ts`
  - `apis/noReferenceApiRule.ts`
- New/updated test files:
  - `events/events.test.ts` - Added 4 tests for unknownTriggerEventRule
  - `logic/logic.test.ts` - 4 tests for unknownProjectFormulaRule
  - `slots/slots.test.ts` - 4 tests for unknownComponentSlotRule
  - `attributes/attributes.test.ts` - 5 tests for unknownComponentAttributeRule
  - `workflows/workflows.test.ts` - Added 5 tests for new workflow rules
  - `apis/apis.test.ts` - 5 tests for noReferenceApiRule
- Updated `packages/search/src/rules/index.ts` to export new rules
- Updated `packages/search/src/problems.ts` to include new rules in getAllRules()

### 2026-02-27 (10 New Linting Rules - 36 Total)
- **Implemented 10 new linting rules:**
  - `unknownUrlParameterRule` (error) - References to URL parameters not defined in route
  - `unknownSetUrlParameterRule` (error) - SetURLParameter/SetURLParameters targeting non-route params
  - `duplicateWorkflowParameterRule` (error) - Workflows with duplicate parameter names
  - `noPostNavigateAction` (warning, auto-fix) - Unreachable actions after goToURL
  - `duplicateEventTriggerRule` (warning) - Multiple handlers for same event trigger
  - `noReferenceEventRule` (warning) - Events defined but never triggered
  - `noReferenceComponentRule` (warning) - Components not used anywhere
  - `duplicateFormulaArgumentNameRule` (error) - Formulas with duplicate argument names
  - `noReferenceComponentFormulaRule` (warning) - Unused component formulas
  - `noReferenceProjectFormulaRule` (warning) - Unused project formulas
- **Linting rules status:** 36/58 implemented (62%, up from 45%)
- **All 1393 tests pass**
- New rule files created in `packages/search/src/rules/`:
  - `routing/unknownUrlParameterRule.ts`
  - `routing/unknownSetUrlParameterRule.ts`
  - `workflows/duplicateWorkflowParameterRule.ts`
  - `workflows/noPostNavigateAction.ts`
  - `events/duplicateEventTriggerRule.ts`
  - `events/noReferenceEventRule.ts`
  - `components/noReferenceComponentRule.ts`
  - `formulas/duplicateFormulaArgumentNameRule.ts`
  - `formulas/noReferenceComponentFormulaRule.ts`
  - `formulas/noReferenceProjectFormulaRule.ts`
- New test files:
  - `routing/urlParams.test.ts` - 10 tests
  - `workflows/workflows.test.ts` - 8 tests
  - `events/events.test.ts` - 6 tests
  - `formulas/formulas.test.ts` - 10 tests
  - `components/components.test.ts` - 7 tests
- Updated `packages/search/src/rules/index.ts` to export new rules
- Updated `packages/search/src/problems.ts` to include new rules in getAllRules()

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
