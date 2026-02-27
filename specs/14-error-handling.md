# Error Handling

Multi-layered error detection, classification, and reporting across the Layr runtime. Covers formula evaluation errors, action execution errors, API errors, editor overlays, and the debug state inspector.

**Implementing packages:** `packages/core/src/formula/evaluate.ts`, `packages/core/src/action/handle.ts`, `packages/runtime/src/`

---

## Phase Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Formula error collection (`ctx.toddle.errors[]`) | [MVP] Implemented | In `evaluate.ts` |
| Formula depth limit (256) | [MVP] Implemented | Returns `null` on exceed |
| Prototype-pollution guard in path eval | [MVP] Implemented | Blocks `__proto__`, `constructor`, `prototype` |
| Action top-level try/catch | [MVP] Implemented | Logs, returns without crash |
| Action depth limit (100) | [MVP] Implemented | Logs error, returns |
| Per-action-type error logging | [MVP] Implemented | `console.warn`/`error` with names |
| API error state (`{ data: null, isLoading: false, error }`) | [MVP] Implemented | In `api/client.ts` |
| Panic screen (editor preview) | [MVP] Implemented in old runtime | Referenced in spec, not in new runtime yet |
| Editor toast notifications | [MVP] Implemented in old runtime | Referenced in spec, not in new runtime yet |
| `window.logState()` debug tool | [MVP] Implemented | Exposed on window during initToddleGlobal |
| SSR API error serialization | [Phase 2] | Not yet built |
| Error boundary components | [Phase 2] | Not yet built |
| Debug panel UI | [Phase 2] | Not yet built |

---

## Error Classification

| Error Type | Severity | Visual Output | Recovery | Context |
|------------|----------|---------------|----------|---------|
| `RangeError` (infinite loop) | Fatal | Panic screen | Requires code fix | Editor preview only |
| `TypeError` | Fatal | Panic screen | Requires code fix | Editor preview only |
| Unknown render error | Critical | Editor toast (`critical`) | Preview remains | Editor preview only |
| Formula depth exceeded | Recoverable | `console.error` + `errors[]` | Returns `null` | All runtimes |
| Formula handler throws | Recoverable | `console.error` + `errors[]` | Returns `null` | All runtimes |
| Formula not found | Warning | `console.warn` | Returns `null` | All runtimes |
| API network/timeout/abort error | Recoverable | API error state | `onFailed` actions triggered | All runtimes |
| API HTTP error (4xx/5xx) | Recoverable | API error state | `onFailed` actions triggered | All runtimes |
| API JSON parse error | Recoverable | Raw text fallback | No state update | All runtimes |
| Missing component reference | Warning | `console.warn`, renders nothing | Returns `[]` | All runtimes |
| Missing API reference in action | Warning | `console.warn`, early return | Pipeline continues | All runtimes |
| Missing workflow reference | Warning | `console.warn`, early return | Pipeline continues | All runtimes |
| Missing custom action | Warning | `console.warn`, early return | Pipeline continues | All runtimes |
| Custom action handler throws | Warning | `console.error` | Pipeline continues | All runtimes |
| Action depth exceeded | Warning | `console.error` | Execution stops | All runtimes |
| Duplicate formula registration | Warning | `console.warn` | Duplicate ignored | All runtimes |
| Duplicate action registration | Warning | `console.warn` | Duplicate ignored | All runtimes |
| Untrusted PostMessage | Warning | `console.error` | Message ignored | Editor preview only |

### Error Propagation Rules

1. **Fatal (RangeError, TypeError in preview):** Replace entire preview with panic screen; no further rendering
2. **Critical (other render errors in preview):** Send toast to parent editor; preview DOM stays (possibly broken)
3. **Recoverable (formula/action/API):** Update reactive state or return safe fallback; components decide UI
4. **Warnings:** Log to console; execution continues with safe default

---

## Formula Error Handling

### Error Collection

```typescript
// packages/core/src/formula/evaluate.ts

export function applyFormula(formula: Formula, ctx: FormulaContext, depth = 0): unknown {
  if (depth > MAX_FORMULA_DEPTH) {          // MAX_FORMULA_DEPTH = 256
    const error = new Error(`Formula depth limit exceeded (${MAX_FORMULA_DEPTH})`);
    ctx.toddle.errors.push(error);
    if (ctx.env?.logErrors) console.error(error);
    return null;
  }

  try {
    switch (formula.type) {
      // ... all formula types evaluated here
    }
  } catch (e) {
    ctx.toddle.errors.push(e instanceof Error ? e : new Error(String(e)));
    if (ctx.env?.logErrors) console.error('Formula evaluation error:', e);
    return null;
  }
}
```

All exceptions during formula evaluation are:
1. Caught by the try/catch in `applyFormula`
2. Pushed to `ctx.toddle.errors[]` (the global error array)
3. Optionally logged via `console.error` (controlled by `ctx.env.logErrors`)
4. Replaced with a `null` return value

### Depth Limit Behavior

- **Limit:** `MAX_FORMULA_DEPTH = 256`
- **Trigger:** Every recursive `applyFormula` call increments `depth`
- **On exceed:** Push error to `ctx.toddle.errors[]`, return `null`
- **Purpose:** Prevents infinite loops from circular formula references (distinct from the panic screen which handles JS stack overflow)

### Path Evaluation Safety

```typescript
// Prototype pollution guard in evaluatePath()
if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
  return null;
}
```

Path formulas that attempt to access prototype properties return `null` rather than leaking internals.

### Formula Not Found

```typescript
// evaluateFunction() — when formula handler is not in registry
if (ctx.env?.logErrors) {
  console.warn(`Formula not found: ${formula.name}`);
}
return null;
```

### Global Error State

```typescript
interface Window {
  toddle: {
    errors: unknown[];    // Accumulated formula/action errors
    // ... other properties
  }
}
```

Custom elements collect errors in `toddle.errors[]` rather than showing panic screens, since they may be embedded in third-party pages.

---

## Action Error Handling

### Top-Level Protection

```typescript
// packages/core/src/action/handle.ts

export function handleAction(action, ctx, event, workflowCallback, depth = 0): void {
  if (depth > MAX_ACTION_DEPTH) {          // MAX_ACTION_DEPTH = 100
    console.error(`Action depth limit exceeded (${MAX_ACTION_DEPTH})`);
    return;
  }

  try {
    switch (action.type) { /* ... */ }
  } catch (e) {
    console.error('Action execution error:', e);
  }
}
```

Any exception escaping a per-type handler is caught here, logged, and dropped. Subsequent actions in the pipeline are not affected.

### Per-Type Error Behavior

| Action Type | Error Condition | Log | Recovery |
|-------------|----------------|-----|----------|
| `Fetch` | `ctx.apis[action.name]` is falsy | `console.warn('API not found: X')` | Early return |
| `AbortFetch` | API has no `.cancel()` | Silent (no-op) | — |
| `Switch` | Condition formula throws | Caught by top-level try/catch | Pipeline continues |
| `TriggerWorkflow` (local) | Workflow not on component | `console.warn('Workflow X does not exist on component Y')` | Early return |
| `TriggerWorkflow` (context provider) | Provider not found | `console.warn('Context provider not found: X')` | Early return |
| `TriggerWorkflow` (context provider) | Workflow not on provider | `console.warn('Workflow X not found on provider Y')` | Early return |
| `TriggerWorkflowCallback` | Used outside workflow context | `console.warn('TriggerWorkflowCallback used outside of workflow context')` | Early return |
| `Custom` | Handler not found | `console.warn('Custom action not found: X')` | Early return |
| `Custom` | Handler throws | Caught by top-level try/catch | Pipeline continues |
| Unknown type | — | `console.warn('Unknown action type: X')` | Falls through |

### Recovery Pattern

All action errors follow the same three-step pattern:

1. Log descriptive message to console (includes entity names for debugging)
2. Early return — this action is skipped
3. Subsequent actions in the pipeline continue executing

No errors propagate upward to parent components from action pipelines.

---

## API Error Handling

### API Error State

```typescript
// Set on dataSignal.Apis[apiName] when a request fails
interface ApiErrorState {
  data: null;
  isLoading: false;
  error: unknown;  // Error object, parsed response body, or string
}
```

### Error Types

| Error Name | Cause | `error` Value |
|------------|-------|---------------|
| Network error | Connection failure, CORS, DNS | `Error` object with `.message` |
| HTTP error | Non-OK status code (4xx, 5xx) | `Error('HTTP 404: Not Found')` |
| `AbortError` | Request cancelled | `'Request was aborted'` |
| `TimeoutError` | Request exceeded timeout | `'signal timed out'` |
| JSON parse error | Malformed response body | `Error('Error occurred while parsing...')` |
| Unknown | Catch-all | `'Unknown error'` |

### Error Flow

```
fetch() rejects OR response.ok === false
  └─ catch block in createApiClient
      ├─ Classify error type
      ├─ Update dataSignal: { data: null, isLoading: false, error }
      └─ (onFailed callback invoked if configured)
```

### Response Parsing Fallback

```typescript
// api/client.ts — body is always parsed with fallback
try {
  const text = await response.text();
  return parseJSON(text);     // JSON with date revival
} catch {
  return text;                // Raw text on parse failure
}
```

Non-JSON responses (HTML error pages, plain text) never cause secondary failures.

### Accessing Error in Components

Components access API errors as reactive data:

```
Apis.{apiName}.error      → error object or null
Apis.{apiName}.isLoading  → false when error occurred
Apis.{apiName}.data       → null when error occurred
```

---

## Panic Screen [MVP — old runtime; Phase 2 — new runtime]

Full-viewport error overlay for unrecoverable rendering failures in editor preview.

```typescript
interface PanicScreenOptions {
  name: string;        // Error title
  message: string;     // Detailed description with guidance
  isPage?: boolean;    // true = page error, false = component error
  cause?: unknown;     // Original Error object
}
```

### Trigger Conditions

Only in editor preview mode, when `createNode()` throws:

| Error Class | Title | Message |
|-------------|-------|---------|
| `RangeError` | `"Infinite loop detected"` | Explains circular dependencies and recursive calls |
| `TypeError` | `"TypeError"` | Lists common causes: read-only props, null access |

Any other error class triggers an editor toast (not a panic screen).

### Visual Design

| Element | Style |
|---------|-------|
| Background | Solid blue |
| Text | White, Courier New, 22px |
| Padding | 80px all sides |
| Error label | White text on blue |
| Help text | "The {page/component} could not be rendered. Fix the issue and try again." |
| Discord link | External link for help |
| CRT effect | Scanline overlay (animated gradient) |
| Vignette | Radial gradient |

### RangeError Easter Egg

When `cause instanceof RangeError`, the panic screen renders 10 nested copies of its content, each progressively smaller:

```
Scale per copy: 1 / (i * 0.225 + 1.225)
Font size per copy: 22 / ((i * 0.6)^2 + 1)
Transform origin: 15% 15%
```

This visually represents the infinite recursion that caused the error.

### Rendering Behavior

```
createNode() throws
  └─ Classify: RangeError or TypeError → create panic screen
     domNode.innerHTML = ''
     domNode.appendChild(panicScreen)
     No further rendering until next editor update
```

---

## Editor Toast Notifications [MVP — old runtime; Phase 2 — new runtime]

Non-blocking notifications sent from preview iframe to parent editor via PostMessage.

```typescript
interface ToastMessage {
  type: 'emitToast';
  toastType: 'neutral' | 'warning' | 'critical';
  title: string;
  message: string;
}
```

### Communication Protocol

- **Transport:** `window.parent?.postMessage(message, '*')`
- **Direction:** Preview iframe → Parent editor frame
- **Blocking:** No — fire-and-forget

### Trigger

A `critical` toast fires when a render error is caught that is **not** a `RangeError` or `TypeError`. The preview DOM remains intact (possibly broken).

### Runtime Comparison

| Runtime | Panic Screen | Editor Toasts | Console Logs | API Error State |
|---------|-------------|---------------|-------------|-----------------|
| `page` | No | No | Yes | Yes |
| `preview` | Yes | Yes | Yes | Yes |
| `custom-element` | No | No | Yes | Yes |

---

## Debug State Inspection [MVP — Implemented]

### `window.logState()`

Initialized once during page bootstrap. Produces a `console.table()` view of all component states.

```typescript
// Global registry
window.__components: Record<string, Signal<ComponentData>>

// Called during component creation
registerComponentToLogState(component: Component, dataSignal: Signal<ComponentData>): void
```

Usage in browser console:

```javascript
window.logState()
// Outputs: console.table() with component names and their current signal data
```

---

## Registration Warnings

All duplicate registrations produce a `console.warn` and the duplicate is silently ignored:

```
console.warn('There already exists a formula with the name [formulaName]')
console.warn('There already exists an action with the name [actionName]')
console.warn('Component [tag] already defined')
```

---

## Security: Untrusted PostMessage

```typescript
// Editor preview message handler
if (!event.isTrusted) {
  console.error('UNTRUSTED MESSAGE');
  return;
}
```

Messages with `isTrusted === false` are ignored entirely, preventing injection of editor commands from third-party sources.

---

## Error Data Flow Diagrams

### Formula Evaluation

```
applyFormula(formula, ctx, depth)
  ├─ depth > 256 → push to ctx.toddle.errors[], return null
  ├─ try { evaluate }
  │   └─ evaluateFunction
  │       └─ formula not found → console.warn, return null
  └─ catch(e) → push to ctx.toddle.errors[], console.error, return null
```

### Action Execution

```
handleAction(action, ctx, ..., depth)
  ├─ depth > 100 → console.error, return
  ├─ try { switch(action.type) }
  │   ├─ Fetch → API not found? console.warn, return
  │   ├─ TriggerWorkflow → not found? console.warn, return
  │   ├─ Custom → not found? console.warn, return
  │   └─ Unknown type → console.warn
  └─ catch(e) → console.error, return
```

### API Request

```
createApiClient.fetch(name, config)
  ├─ response.ok === false
  │   └─ errorStatus = { data: null, isLoading: false, error: Error('HTTP ...') }
  │       updateApisInSignal(dataSignal, name, errorStatus)
  └─ catch(e) [network/abort/timeout]
      ├─ classify error
      ├─ errorStatus = { data: null, isLoading: false, error }
      └─ updateApisInSignal(dataSignal, name, errorStatus)
```

### Render Error (Editor Preview)

```
createNode() throws
  └─ catch in editor-preview bootstrap
      ├─ instanceof RangeError → panic, name = "Infinite loop detected"
      ├─ instanceof TypeError  → panic, name = "TypeError"
      └─ other                 → toast (critical), preview DOM intact

      if panic:
        createPanicScreen({ name, message, isPage, cause })
        domNode.innerHTML = ''
        domNode.appendChild(panicScreen)
      else:
        window.parent?.postMessage({ type: 'emitToast', toastType: 'critical', ... }, '*')
```

---

## Cross-references

- Formula evaluation engine: `07-formula-system.md`
- Standard library null-safe contract: `12-standard-library.md`
- Linting rules for static error detection: `13-search-and-linting.md`
