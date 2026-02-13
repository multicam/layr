# Fix Deferred Review Items: W1/W4, W3, W11

## Context

The last code review identified 3 deferred items left as TODOs:
- **W3**: `visitedFormulas` dead scaffolding in traversal (~60 locations)
- **W11**: `createComponentLifecycle` calls global `triggerUnmount()` instead of instance-scoped
- **W1/W4**: Schema field names diverge from TypeScript types (schemas = JSON truth, types = wrong names)

Decision: Use `z.infer` to make Zod schemas the single source of truth for types.

---

## Phase 1: Quick Wins (W3 + W11)

### 1A. Remove `visitedFormulas` dead code (W3)

**File**: `packages/core/src/traversal/index.ts`

Remove `visitedFormulas?: Set<string>` from 5 function signatures, 5 destructuring defaults, and ~60 recursive call sites. Remove TODO comment at line 59-60.

Functions affected:
- `getFormulasInFormula` (line 55)
- `getFormulasInAction` (line 153)
- `getFormulasInNode` (line 390)
- `getFormulasInComponent` (line 547)
- `getFormulasInApi` (line 683)

**Risk**: None. Parameter is optional, never populated, never checked, no external callers pass it.

### 1B. Instance-scoped lifecycle callbacks (W11)

**Files**:
- `packages/runtime/src/lifecycle/index.ts` — refactor `createComponentLifecycle`
- `packages/runtime/src/lifecycle/index.test.ts` — add isolation tests, unskip existing tests
- `packages/runtime/src/index.ts` — export new `ComponentLifecycleAPI` type

**Design**:
- Keep global `onMount`/`onUnmount`/`triggerMount`/`triggerUnmount` for page-level lifecycle (unchanged)
- Make `createComponentLifecycle` store callbacks in closure (instance-scoped arrays)
- Return instance methods: `onMount`, `onUnmount`, `onAttributesChange` alongside existing `initialize`/`destroy`/`handleAttributeChange`
- `destroy()` triggers only instance unmount callbacks, not global ones
- Remove TODO at line ~181

**New return type**:
```typescript
interface ComponentLifecycleAPI {
  onMount(cb: LifecycleCallback): () => void;
  onUnmount(cb: LifecycleCallback): () => void;
  onAttributesChange(cb: (attrs: Record<string, unknown>) => void): () => void;
  initialize(): Promise<void>;
  destroy(): void;
  handleAttributeChange(newAttrs: Record<string, unknown>): void;
}
```

**New tests**: Instance isolation (2 instances don't cross-contaminate), global vs instance independence, can't register on destroyed lifecycle.

**Risk**: Low. `createComponentLifecycle` is exported but never called in production code.

---

## Phase 2: Schema-Type Unification (W1/W4)

### 2A. Complete schemas with missing fields

**File**: `packages/core/src/schemas/index.ts`

Add to `StyleVariantSchema`:
- `checked`, `oddChild`, `autofill` (boolean optionals)
- `breakpoint` (`z.enum(['small','medium','large']).optional()`)
- `pseudoElement` (`z.string().optional()`)

These exist in the runtime `StyleVariant` but are missing from the schema.

### 2B. Move schemas to `@layr/types` and export leaf schemas

**Rationale**: Schemas define data shapes. Types is the leaf package (no deps). Putting schemas there avoids circular deps (`@layr/core` imports from `@layr/types`, not the reverse).

**Steps**:
1. `bun add zod` in `packages/types`
2. Move `packages/core/src/schemas/index.ts` to `packages/types/src/schemas.ts`
3. Export leaf schemas that were previously `const` (e.g., `ValueOperationSchema`)
4. Add `./schemas` export in `packages/types/package.json`
5. Update `packages/core/src/index.ts` to re-export schemas from `@layr/types/schemas`

### 2C. Generate types with `z.infer`

**File**: `packages/types/src/schemas.ts` (bottom section, or separate `packages/types/src/inferred-types.ts`)

For **non-recursive** schemas — direct `z.infer`:
```typescript
export type MediaQuery = z.infer<typeof MediaQuerySchema>;
export type StyleVariant = z.infer<typeof StyleVariantSchema>;
export type FunctionArgument = z.infer<typeof FunctionArgumentSchema>;
// ... etc
```

For **recursive** schemas (Formula, ActionModel, NodeModel) — `z.infer` returns `any` because they use `z.ZodType`. Fix: define manual types matching schema shape, annotate schema with type:
```typescript
// Manual type matching JSON/schema fields
export type SetVariableAction = { type: 'SetVariable'; name: string; data?: Formula; };
export type ActionModel = SetVariableAction | TriggerEventAction | ...;

// Annotate schema for compile-time sync
export const ActionModelSchema: z.ZodType<ActionModel> = z.union([...]);
```

This ensures TypeScript errors if schema and type drift apart.

### 2D. Update type files to re-export from schemas

**Files**:
- `packages/types/src/formula.ts` — re-export inferred Formula types, keep type guards
- `packages/types/src/action.ts` — re-export inferred Action types, update type guards
- `packages/types/src/node.ts` — re-export inferred Node/StyleVariant types
- `packages/types/src/component.ts` — re-export inferred Component types
- `packages/types/src/index.ts` — update barrel exports

**Key field name changes in action types**:

| Type | Old field | New field (matches JSON) |
|------|-----------|-------------------------|
| SetVariableAction | `variable` | `name` |
| SetVariableAction | `value` | `data` |
| TriggerEventAction | `event` | `name` |
| FetchAction | `api` | `name` |
| AbortFetchAction | `api` | `name` |
| SetURLParameterAction | `parameter` | `name` |
| SetURLParameterAction | `value` | `data` |
| SetMultiUrlParameterAction | type `'SetMultiUrlParameter'` | type `'SetURLParameters'` |
| SetMultiUrlParameterAction | `parameters` (Record) | `parameters` (Array) |
| TriggerWorkflowAction | `workflow` | `name` |
| TriggerWorkflowAction | `parameters` (Record) | `parameters` (Array) |
| WorkflowCallbackAction | `event` | `name` |

### 2E. Update consumers

Only **1 production file** uses old field names:
- `packages/core/src/action/handle.ts` — placeholder implementation, update field accesses

Also update:
- `packages/core/src/action/handle.test.ts` — test data
- `packages/types/src/index.test.ts` — type guard tests
- `packages/runtime/src/styles/index.ts` — remove duplicate `StyleVariant` and `CustomProperty` types, re-export from `@layr/types`

### 2F. Remove TODOs

- Line 151 in schemas: "Schema field names diverge from @layr/types"
- Line 278 in schemas: "Schema shape diverges from StyleVariant type"

---

## Verification

After each phase:
1. `bun test` — full suite (baseline: 745 pass, 11 skip, 0 fail)
2. Type check all packages with `bunx tsc --noEmit`

Phase 2 additionally:
3. Validate demo project: load `projects/demo/project.json` through schema validation
4. Verify no `@layr/types` → `@layr/core` circular dependency exists

---

## Execution Order

1. **Phase 1A** (W3) — pure removal, zero risk
2. **Phase 1B** (W11) — instance scoping, low risk
3. **Phase 2A-F** (W1/W4) — schema-type unification, medium risk
