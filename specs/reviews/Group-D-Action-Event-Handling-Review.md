# Deep Review: Group D - Action & Event Handling

**Review Date:** 2026-02-12
**Priority:** High
**Complexity:** Medium
**Specs Reviewed:** Action System, Action Execution Engine, Event System, Workflow System

---

## Executive Summary

The Action & Event Handling system orchestrates all user interactions and side effects in Layr. Key strengths:

- **Unified dispatcher** - Single `handleAction()` entry point for all action types
- **Bidirectional workflows** - Parameters flow in, callbacks flow back, with proper scope management
- **Context provider integration** - Workflows can modify provider state while callbacks modify caller state
- **Cleanup lifecycle** - Custom actions can return cleanup functions triggered on unmount

The system is well-designed but reveals gaps in error recovery, recursion prevention, and action debugging.

**Overall Assessment:** 8/10 - Solid architecture with gaps in safety limits and debugging.

---

## Gap Analysis

### 1. Action System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No action timeout** | High | Long-running actions block the thread. No way to abort or timeout. |
| **Action queue overflow** | Medium | Recursive action chains could exhaust stack. No depth limit. |
| **Undo/rollback** | Medium | No transaction semantics. If action 3 of 5 fails, actions 1-2 already applied. |
| **Parallel execution** | Low | All actions sequential. No way to execute independent actions in parallel. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Action count limit | Low | No limit on action list length. Very long lists could be slow. |
| Built-in action discovery | Low | 19 built-in actions but no registry listing or categorization. |
| URL parameter naming | Low | `SetURLParameter` vs `SetURLParameters` - singular deprecated but still in schema. |

#### Recommendations

```markdown
1. Add action timeout/depth limits:
   ```typescript
   const MAX_ACTION_DEPTH = 100;
   const ACTION_TIMEOUT_MS = 5000;
   
   function handleAction(action, data, ctx, event, workflowCallback, depth = 0) {
     if (depth > MAX_ACTION_DEPTH) {
       console.error('Maximum action depth exceeded');
       return;
     }
     // ... with depth + 1 for recursive calls
   }
   ```

2. Add optional transaction semantics:
   ```typescript
   interface ActionGroup {
     actions: ActionModel[];
     transaction?: boolean;  // Rollback on failure
   }
   ```

3. Add parallel execution option:
   ```typescript
   interface ParallelAction {
     type: 'Parallel';
     actions: ActionModel[];
     waitFor?: 'all' | 'first' | 'race';
   }
   ```

4. Document built-in actions with registry:
   ```typescript
   const BUILTIN_ACTIONS = {
     '@toddle/save-to-local-storage': { category: 'storage', async: false },
     '@toddle/go-to-url': { category: 'navigation', async: false },
     // ...
   };
   ```
```

---

### 2. Action Execution Engine

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Error isolation** | High | Error in one action stops the action chain. No per-action error handling. |
| **Missing resource handling** | Medium | Missing API/workflow/action logs different severity levels. Inconsistent. |
| **SetURLParameter vs SetURLParameters** | Medium | Inconsistent path validation (name matching vs strict type checking). |
| **History mode semantics** | Low | Path = push, query = replace documented but edge cases unclear (mixed updates). |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Data freshness pattern | Low | `{ ...data, ...ctx.dataSignal.get() }` pattern used but not documented as pattern. |
| Provider resolution fallback | Low | Fallback logic for provider lookup not clearly documented. |

#### Recommendations

```markdown
1. Add per-action error handling:
   ```typescript
   interface ActionModel {
     // ... existing fields
     onError?: { actions: ActionModel[] };  // Recovery actions
     continueOnError?: boolean;  // Continue chain even if this action fails
   }
   ```

2. Standardize missing resource handling:
   ```typescript
   // All missing resources should:
   // 1. Log at same severity (warn for expected, error for unexpected)
   // 2. Return early without throwing
   // 3. Include resource name and context in message
   console.warn(`${resourceType} "${name}" not found in ${context}`);
   ```

3. Document URL parameter path validation:
   ```markdown
   ## URL Parameter Validation
   | Action | Path Validation | Reason |
   |--------|-----------------|--------|
   | SetURLParameter | Name matches route segment | Legacy compatibility |
   | SetURLParameters | Segment has `type === 'param'` | Stricter, prevents typos |
   ```

4. Document mixed path/query history mode:
   ```markdown
   ## History Mode for Mixed Updates
   When SetURLParameters updates both path and query parameters:
   - History mode defaults to `push` (path change takes precedence)
   - Can override with explicit `historyMode: 'replace'`
   ```
```

---

### 3. Event System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Event delegation** | High | No event delegation support. Each element gets its own listener. Performance issue for large lists. |
| **Custom event schema** | Medium | No schema for custom event payloads. Type safety lost at component boundary. |
| **Event propagation control** | Medium | No explicit `stopPropagation` or `preventDefault` for custom events. |
| **Drag/clipboard data size** | Low | Large clipboard/drag data could cause performance issues. No size limit. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Lifecycle timing precision | Low | "After render" is vague. Before paint? After paint? |
| Event replay | Low | No mechanism to replay events for testing/debugging. |
| onLoad deduplication | Low | Spec says fires once but what if component remounts? |

#### Recommendations

```markdown
1. Add event delegation support:
   ```typescript
   interface DelegatedEvent {
     selector: string;  // CSS selector for delegation target
     event: string;
     actions: ActionModel[];
   }
   
   // Single listener on root, dispatches to matching elements
   ```

2. Add custom event schema:
   ```typescript
   interface ComponentEvent {
     name: string;
     payloadSchema?: { formula: Formula };  // Type description formula
     description?: string;
   }
   ```

3. Add event propagation control for custom events:
   ```typescript
   interface TriggerEventAction {
     type: 'TriggerEvent';
     event: string;
     data: Formula;
     bubbles?: boolean;  // Default true for backward compat
   }
   ```

4. Document lifecycle timing precisely:
   ```markdown
   ## Lifecycle Timing
   - `onLoad`: Queued via BatchQueue, executes after `requestAnimationFrame`
   - Executes AFTER first paint (browser has rendered DOM)
   - Safe to measure DOM elements in onLoad
   ```
```

---

### 4. Workflow System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Recursive workflow detection** | High | Workflow can trigger itself. No recursion guard. Will cause stack overflow. |
| **Callback scope confusion** | High | Workflow actions run in provider context, callbacks in caller. Complex mental model. |
| **No workflow timeout** | Medium | Long-running workflow blocks UI. No abort mechanism. |
| **Parameter validation** | Low | No validation that caller provides all required parameters. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Missing callback handling | Low | Silently ignored. Could be unexpected if caller expects callback. |
| Test value usage | Low | `testValue` on workflow itself not clearly used. |
| ExposeInContext discovery | Low | No way to discover which workflows a provider exposes. |

#### Recommendations

```markdown
1. Add recursion detection:
   ```typescript
   const activeWorkflows = new Set<string>();
   
   function triggerWorkflow(action, ctx) {
     const key = `${ctx.component.name}/${action.workflow}`;
     if (activeWorkflows.has(key)) {
       console.error(`Recursive workflow detected: ${key}`);
       return;
     }
     activeWorkflows.add(key);
     try {
       executeWorkflow(...);
     } finally {
       activeWorkflows.delete(key);
     }
   }
   ```

2. Document callback scope clearly with visual:
   ```markdown
   ## Workflow Scope Diagram
   
   ```
   Caller Component          Provider Component
   ┌─────────────────┐      ┌─────────────────┐
   │ TriggerWorkflow │──────▶ Workflow Actions │
   │                 │      │  (provider ctx) │
   │                 │      │   - Variables ✓  │
   │                 │      │   - APIs ✓       │
   │ Callbacks       │◀─────│ TriggerCallback │
   │  (caller ctx)   │      │                  │
   │   - Variables ✓ │      │                  │
   └─────────────────┘      └─────────────────┘
   ```
   ```

3. Add workflow timeout:
   ```typescript
   const WORKFLOW_TIMEOUT_MS = 10000;
   
   // Wrap workflow execution in timeout
   const timeoutId = setTimeout(() => {
     console.error(`Workflow "${name}" timed out`);
   }, WORKFLOW_TIMEOUT_MS);
   ```

4. Add parameter validation:
   ```typescript
   const missingParams = workflow.parameters
     .filter(p => !action.parameters?.[p.name])
     .map(p => p.name);
   if (missingParams.length > 0) {
     console.warn(`Missing workflow parameters: ${missingParams.join(', ')}`);
   }
   ```
```

---

## Cross-Cutting Concerns

### 1. Action Debugging

**Issue:** No way to trace action execution for debugging. Errors logged but no action history.

**Recommendation:** Add action debugging:
```typescript
interface ActionTrace {
  action: ActionModel;
  timestamp: number;
  context: string;  // Component name
  duration: number;
  result?: 'success' | 'error';
  error?: Error;
}

// Dev mode only
window.__layrActionTrace = {
  history: ActionTrace[];
  enable(): void;
  disable(): void;
  getForComponent(name: string): ActionTrace[];
};
```

### 2. Error Recovery Strategy

**Issue:** Errors in actions have no recovery path. Action chain stops.

**Recommendation:** Add error recovery tiers:
```markdown
| Error Type | Strategy |
|------------|----------|
| Missing resource | Warn, skip action, continue chain |
| Formula evaluation error | Return null, continue chain |
| Action timeout | Abort, execute onError if defined |
| Recursive action | Error, stop chain |
| Handler exception | Catch, log, execute onError if defined |
```

### 3. Action Performance

**Issue:** No visibility into which actions are slow or frequently called.

**Recommendation:** Add action profiling:
```typescript
interface ActionProfile {
  type: string;
  callCount: number;
  totalDuration: number;
  maxDuration: number;
}

// Dev mode
window.__layrActionProfile = {
  getTopActions(by: 'calls' | 'duration'): ActionProfile[];
  reset(): void;
};
```

---

## Consistency Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Error logging levels | Various | Some `console.warn`, others `console.error`. Inconsistent. |
| Missing resource messages | Various | Different formats for "not found" messages across systems. |
| URL param validation | SetURLParameter vs SetURLParameters | Different validation strictness. Should be consistent. |
| Cleanup registration | Custom actions vs events | Custom actions return cleanup function, events use AbortSignal. Different patterns. |

---

## Documentation Quality

| Spec | Clarity | Completeness | Examples |
|------|---------|--------------|----------|
| Action System | 8/10 | 8/10 | Good action type coverage |
| Action Execution Engine | 9/10 | 8/10 | Excellent dispatch detail |
| Event System | 8/10 | 8/10 | Good lifecycle coverage |
| Workflow System | 9/10 | 9/10 | Excellent scope explanation |

---

## Action Items

### Must Fix (Before 1.0)

1. [ ] Add recursion detection for workflows
2. [ ] Add action depth limiting
3. [ ] Standardize missing resource error handling
4. [ ] Document workflow scope clearly with diagram

### Should Fix

5. [ ] Add per-action error handling (onError, continueOnError)
6. [ ] Add event delegation support for performance
7. [ ] Add action timeout mechanism
8. [ ] Add custom event schema support

### Nice to Have

9. [ ] Add action debugging/tracing
10. [ ] Add action profiling
11. [ ] Add parallel action execution
12. [ ] Add transaction semantics for action groups

---

## Conclusion

The Action & Event Handling system is well-architected with a unified dispatcher and sophisticated workflow scope management. The main areas requiring attention are:

1. **Safety limits** - Recursion detection, depth limits, timeouts
2. **Error handling** - Per-action error recovery, consistent logging
3. **Performance** - Event delegation, action profiling
4. **Documentation** - Workflow scope mental model

The bidirectional workflow callback system is particularly elegant but would benefit from clearer documentation and diagrams.
