# Deep Review: Group A - Core Data Model

**Review Date:** 2026-02-12
**Priority:** Critical
**Complexity:** High
**Specs Reviewed:** Project Data Model, Component System, Data Validation Schemas, Context Providers

---

## Executive Summary

The Core Data Model specs are comprehensive and well-structured. The system demonstrates strong architectural decisions including:
- Clear separation between v1 (legacy) and v2 (modern) schemas with migration paths
- Discriminated union types for formulas, nodes, and actions enabling exhaustive pattern matching
- Centralized schema descriptions supporting AI-assisted tooling
- Signal-based reactivity with proper cleanup cascade semantics

**Overall Assessment:** 8.5/10 - Solid foundation with identified gaps for improvement.

---

## Gap Analysis

### 1. Project Data Model

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No size limits** | High | No documented limits on component count, node count, formula depth, or package dependencies. Could lead to OOM or stack overflow. |
| **Circular package dependencies** | High | No detection or prevention of circular package references. Package A depends on B, B depends on A. |
| **Component name collisions** | Medium | Local component names can collide with package component names. Resolution order undefined in spec. |
| **Commit hash immutability** | Medium | No validation that commit hash actually matches content. Could serve mismatched data. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Theme fallback chain | Low | Spec describes chain but not exhaustive. What happens if V2 theme has partial `propertyDefinitions`? |
| Route conflict detection | Low | Multiple pages with same route - spec says "first match wins" but ordering is undefined. |
| API service credential rotation | Low | No mechanism for rotating `apiKey` formulas without code changes. |

#### Recommendations

```markdown
1. Add explicit size constraints:
   - Max components: 1,000
   - Max nodes per component: 10,000
   - Max formula depth: 256
   - Max package depth: 10

2. Add package dependency cycle detection in build pipeline

3. Document component resolution order explicitly:
   - Local components > Package components > Standard library
```

---

### 2. Component System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Node ID stability** | High | Node IDs are string keys in a record. Renaming a node in editor breaks all references. No UUID-based IDs. |
| **Root node enforcement** | High | Spec says "must contain 'root' key" but schema doesn't enforce it. Could have orphaned node graphs. |
| **Recursive component reference** | High | Component A referencing itself as child. Spec mentions `replaceTagInNodes` for custom elements but not for regular rendering. |
| **Signal destruction ordering** | Medium | When parent signal destroys, child signal cleanup order is undefined. Could cause use-after-destroy. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Attribute type coercion | Low | `testValue` is `unknown` - no type hints for validation. |
| Event payload schema | Low | No schema for `ComponentEvent` payload structure. |
| onLoad timing | Low | "After initial render" is vague - before or after first paint? |

#### Recommendations

```markdown
1. Consider UUID-based node IDs with separate `name` field for editor display

2. Add runtime guard for recursive component instantiation:
   ```typescript
   const MAX_COMPONENT_DEPTH = 50;
   if (ctx.depth > MAX_COMPONENT_DEPTH) {
     console.error('Maximum component depth exceeded');
     return [];
   }
   ```

3. Document signal destruction order: depth-first, children before parents

4. Add schema for event declarations:
   ```typescript
   interface ComponentEvent {
     name: string;
     payloadSchema?: Formula; // Formula returning type description
   }
   ```
```

---

### 3. Data Validation Schemas

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Schema-type drift** | High | Zod schemas and TypeScript types are separate. No compile-time enforcement of alignment. |
| **Switch case limit** | Medium | Formula switch enforces `.length(1)` but action switch has no limit. Inconsistent. |
| **Strict mode disabled** | Medium | Schemas strip unknown fields silently. Forward-compatible but hides typos. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| No async validation | Low | Zod supports async refinements but not used. Could validate API references. |
| Description coverage | Low | Some fields missing from `SCHEMA_DESCRIPTIONS`. |
| Shallow schema consistency | Low | Not clear which operations use shallow vs deep validation. |

#### Recommendations

```markdown
1. Generate TypeScript types FROM Zod schemas:
   ```typescript
   type Component = z.infer<typeof ComponentSchema>;
   ```
   This ensures single source of truth.

2. Align switch case limits:
   - Either remove formula limit (1 case seems arbitrary)
   - Or add limit to action switch with same value

3. Add strict mode option for development:
   ```typescript
   const StrictComponentSchema = ComponentSchema.strict();
   ```

4. Add cross-reference validation for:
   - Component references in ComponentNodeModel
   - Formula references in ApplyOperation
   - Workflow references in TriggerWorkflow
```

---

### 4. Context Providers

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Provider lifecycle gaps** | High | If provider unmounts, consumers have stale signals. No explicit "provider gone" notification. |
| **Context key collision** | Medium | Multiple providers with same component name - "last wins" is implicit, not documented. |
| **Workflow bidirectional execution** | Medium | Complex mental model: workflow runs in provider context, callbacks in consumer context. Easy to confuse. |
| **No context versioning** | Low | Adding new exposed formula breaks existing consumers expecting old shape. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Preview mode reactivity | Low | "Not reactive" is a limitation but not documented as such in main spec. |
| Package prefix in contexts | Low | `componentName` vs `package/componentName` format not clearly specified. |

#### Recommendations

```markdown
1. Add provider lifecycle events:
   ```typescript
   interface ProviderLifecycle {
     onProviderMount(providerName: string): void;
     onProviderUnmount(providerName: string): void;
   }
   ```
   Consumers can subscribe to know when provider disappears.

2. Document bidirectional execution clearly with example:
   ```markdown
   ## Workflow Execution Contexts

   | Phase | Context | Can Access |
   |-------|---------|------------|
   | Workflow actions | Provider | Provider.Variables, Provider.APIs |
   | Callback actions | Consumer | Consumer.Variables, Parameters, Event |
   ```

3. Consider context versioning:
   ```typescript
   interface ComponentContext {
     formulas: string[];
     workflows: string[];
     version?: number; // Bump when adding/removing exposed items
   }
   ```
```

---

## Cross-Cutting Concerns

### 1. Versioning & Migration

**Issue:** Specs describe v1/v2 differences but not migration triggers.

**Recommendation:** Add explicit migration guide:
- When does v1 → v2 migration happen?
- Can projects stay on v1 indefinitely?
- What triggers migration (manual, automatic)?

### 2. Error Handling Philosophy

**Issue:** System uses "return null on error" pattern consistently but doesn't document this as a principle.

**Recommendation:** Add explicit error handling philosophy section:
```markdown
## Error Handling Philosophy

Layr follows a "never crash" principle:
- Invalid data paths return `null`
- Missing components render nothing (with warning)
- Formula errors log and return `null`
- The application continues running despite individual failures
```

### 3. Performance Characteristics

**Issue:** No performance complexity documented (Big-O for key operations).

**Recommendation:** Add performance characteristics:
| Operation | Complexity |
|-----------|------------|
| Formula evaluation | O(depth × arg_count) |
| Route matching | O(routes × segments) |
| Component lookup | O(1) - Map lookup |
| Signal propagation | O(subscribers) |

---

## Consistency Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Naming: `record` vs `object` | Formula System | Both exist, `record` deprecated but still in schema |
| Naming: `SetURLParameter` vs `SetURLParameters` | Action System | Singular deprecated, plural is current |
| Theme: v1 vs v2 detection | Styling | Presence of `breakpoints` field - fragile detection |
| API: v1 vs v2 detection | API Integration | `version: 2` field vs implicit legacy detection |

---

## Documentation Quality

| Spec | Clarity | Completeness | Examples |
|------|---------|--------------|----------|
| Project Data Model | 9/10 | 8/10 | Good JSON examples |
| Component System | 8/10 | 9/10 | Good data flow diagrams |
| Data Validation Schemas | 7/10 | 8/10 | Missing usage examples |
| Context Providers | 8/10 | 7/10 | Missing workflow bidirectional example |

---

## Action Items

### Must Fix (Before 1.0)

1. [ ] Add component depth limiting to prevent infinite recursion
2. [ ] Add package dependency cycle detection
3. [ ] Document provider unmount behavior for consumers
4. [ ] Align switch case limits between formula and action schemas

### Should Fix

5. [ ] Generate TypeScript types from Zod schemas
6. [ ] Add strict validation mode for development
7. [ ] Document signal destruction ordering
8. [ ] Add explicit size constraints to project data model

### Nice to Have

9. [ ] Add performance complexity documentation
10. [ ] Add context versioning mechanism
11. [ ] Add error handling philosophy section
12. [ ] Improve cross-reference validation in schemas

---

## Conclusion

The Core Data Model provides a solid foundation for Layr. The main areas requiring attention are:

1. **Safety limits** - depth limits, size limits, cycle detection
2. **Lifecycle clarity** - provider unmount, signal destruction ordering
3. **Type safety** - schema-type alignment, strict mode option

The specs are well-written with consistent structure. The v1/v2 migration path is reasonable but could benefit from more explicit triggers and tooling.
