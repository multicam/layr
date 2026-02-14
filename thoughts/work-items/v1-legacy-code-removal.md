# Work Item: V1 Legacy Code Removal

## Status: COMPLETED
## Priority: HIGH
## Created: 2026-02-14
## Completed: 2026-02-14
## Decision: V2 is the baseline - all v1/legacy code removed

---

## Summary

Removed all v1/legacy compatibility code from the codebase. V2 is now the only supported format.

---

## What Was Removed

### Types
- `OldTheme` interface and `theme?: OldTheme` field from `ProjectConfig` (`packages/types/src/project.ts`)
- `V1Theme` interface (`packages/types/src/theme.ts`)
- `LegacyPluginAction` interface and `isLegacyPluginAction()` type guard (`packages/runtime/src/custom-code/index.ts`)

### Runtime
- Legacy methods from `ToddleGlobal` interface: `registerFormula`, `registerAction`, `getFormula`, `getAction` (`packages/runtime/src/lifecycle/index.ts`)
- No-op stub implementations of above methods in `initToddleGlobal()`
- `LegacyPluginAction` and `isLegacyPluginAction` exports from runtime barrel (`packages/runtime/src/index.ts`)

### Core
- Legacy formula evaluation fallback via `ctx.toddle.getFormula()` (`packages/core/src/formula/evaluate.ts`)
- `getFormula` method from `FormulaContext.toddle` interface (`packages/core/src/formula/context.ts`)

### Tests
- Legacy handler test (`packages/core/src/formula/evaluate.test.ts`)
- `isLegacyPluginAction` tests (`packages/runtime/src/custom-code/index.test.ts`)
- `getFormula` mock references from all test contexts (evaluate.test.ts, advanced.test.ts, lib/index.test.ts, template/index.test.ts, FormulaPreview.tsx)

### Specs (Updated)
- All remaining spec files cleaned of v1 references

---

## What Was Already Gone (Pre-Existing)
- Legacy API files (`createAPI.ts`, `LegacyToddleApi.ts`, `isLegacyApi()`)
- `packages/search/` directory (linting rules never implemented)
- `clearLegacyFormulas()`, `clearLegacyActions()` functions
- `toddle.legacyFormulas`, `toddle.legacyActions` maps

---

## What Was Kept (Not Legacy)
- `RecordOperation` type — deprecated alias for `object`, but needed for project data backwards compatibility
- `registerFormula`/`getFormula` in `packages/lib/` — V2 standard library registry
- `registerFormula`/`getFormula`/`registerAction`/`getAction` in `packages/runtime/src/custom-code/` — V2 package-namespaced registry
- `getCustomFormula`/`getCustomAction` on `ToddleGlobal` — V2 lookup methods

---

## Verification

- ✅ All 751 tests passing (0 failures)
- ✅ Build succeeds
- ✅ No `isLegacy*` functions remain in code
- ✅ No `OldTheme` or `V1Theme` types
- ✅ No legacy ToddleGlobal stubs
- ✅ Specs updated to reflect V2-only baseline
