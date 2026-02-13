# Error Handling & Debug System

## 1. Overview

### Purpose
The error handling and debug system provides multi-layered error detection, classification, reporting, and developer tooling across the Layr runtime. It distinguishes between **unrecoverable errors** (panic screen) and **recoverable errors** (console logs, editor toasts), and exposes runtime state inspection via `window.logState()`.

### Jobs to Be Done
- **Detect and classify runtime errors** — distinguish infinite loops (RangeError), type errors (TypeError), and general failures
- **Display actionable error UI** — blue-screen panic for fatal errors, toast notifications for non-fatal
- **Enable runtime debugging** — inspect all component states from the browser console
- **Surface API errors to components** — structured error state in reactive signals with declarative `onFailed` handlers
- **Communicate errors to the editor** — PostMessage-based toast system for non-blocking notifications
- **Prevent silent failures** — console warnings for missing components, APIs, workflows, and actions

### Scope
- Runtime error handling in both page and editor-preview modes
- API error propagation and structured error state
- Action system error handling and recovery
- Debug state inspection (`window.logState()`)
- Panic screen rendering
- Editor toast notifications

---

## 2. Error Classification

### Error Severity Matrix

| Error Type | Severity | Visual Output | Recovery Strategy | Context |
|------------|----------|---------------|-------------------|---------|
| **RangeError** (infinite loop) | Fatal | Panic screen (blue) | Requires code fix | Editor preview only |
| **TypeError** | Fatal | Panic screen (blue) | Requires code fix | Editor preview only |
| **Unknown render error** | Critical | Toast notification | Preview remains visible | Editor preview only |
| **API network error** | Recoverable | Component-level handling | `onFailed` actions triggered | All runtimes |
| **API timeout** | Recoverable | Component-level handling | `onFailed` actions triggered | All runtimes |
| **API abort** | Recoverable | Component-level handling | `onFailed` actions triggered | All runtimes |
| **API JSON parse error** | Recoverable | Caught by execute handler | Falls back to raw text | All runtimes |
| **Missing component** | Warning | Console warning, empty render | Returns empty array | All runtimes |
| **Missing API reference** | Warning | Console error, early return | Action aborted | All runtimes |
| **Missing workflow** | Warning | Console warning, early return | Action aborted | All runtimes |
| **Missing custom action** | Warning | Console error, early return | Action aborted | All runtimes |
| **Custom action error** | Warning | Console error | Action aborted | All runtimes |
| **Duplicate registration** | Warning | Console warning | Registration skipped | All runtimes |

### Error Propagation Rules

1. **Fatal errors** (RangeError, TypeError) — replace entire preview with panic screen; no further rendering attempted
2. **Critical errors** — send toast to editor, log to console; preview DOM remains intact (potentially broken)
3. **Recoverable errors** — update reactive state (API errors), trigger declarative handlers (`onFailed`), components decide UI
4. **Warnings** — log to console only, execution continues with safe fallback (empty array, early return)

---

## 3. Panic Screen

### Purpose
Full-viewport error display for unrecoverable rendering failures in the editor preview. Styled as a retro blue-screen-of-death with actionable guidance.

### Data Model

```typescript
interface PanicScreenOptions {
  name: string        // Error title (e.g., "Infinite loop detected")
  message: string     // Detailed error description with guidance
  isPage?: boolean    // true = page error, false = component error
  cause?: unknown     // Original error object for type-specific behavior
}
```

### Trigger Conditions

The panic screen is created **only in editor preview mode** (`editor-preview.main.ts`) when the root `createNode()` call throws:

- **RangeError** — infinite loop / maximum call stack exceeded
- **TypeError** — null/undefined property access, read-only property mutation

### Visual Output

| Element | Content |
|---------|---------|
| Background | Solid blue (`background-color: blue`) |
| Text | White, Courier New monospace, 22px |
| Padding | 80px on all sides |
| Error label | White text on blue background with error name |
| Help text | "The {page\|component} could not be rendered. Fix the issue and try again." |
| Discord link | "Join our Discord for help" (external link) |
| Error message | Monospace rendering of the error message |
| CRT effect | Scanline overlay (repeating gradient, animated) |
| Vignette | Radial gradient for depth effect |

### RangeError Easter Egg

When `cause instanceof RangeError`, the panic screen renders **10 nested, progressively smaller copies** of the error content to visually represent infinite recursion:

```
Scale factor per copy: 1 / (i * 0.225 + 1.225)
Font size per copy: 22 / ((i * 0.6)² + 1)
Transform origin: 15% 15%
```

This creates a recursive visual zoom effect that communicates the nature of the error.

### Error Messages

**RangeError:**
```
Infinite loop detected

RangeError (Maximum call stack size exceeded): Remove any circular
dependencies or recursive calls (Try undoing your last change). This is
most likely caused by a component, formula or action using itself.
```

**TypeError:**
```
TypeError

Type errors are often caused by:
• Trying to set a read-only property (like "type" on a select element).
• Trying to set a property on an undefined or null value.
• Trying to access a property on an undefined or null value.
• Trying to call a method on an undefined or null value.
```

### Rendering Behavior

1. `domNode.innerHTML = ''` — clears all existing preview content
2. Appends `DocumentFragment` returned by `createPanicScreen()`
3. No further rendering attempted until next editor update cycle

---

## 4. Editor Toast Notifications

### Purpose
Non-blocking notifications sent from the preview iframe to the parent editor via PostMessage. Used for errors that don't warrant a full panic screen.

### Data Model

```typescript
interface ToastMessage {
  type: 'emitToast'
  toastType: 'neutral' | 'warning' | 'critical'
  title: string
  message: string
}
```

### Severity Levels

| Level | Use Case |
|-------|----------|
| `neutral` | Informational messages (default) |
| `warning` | Non-critical issues that may affect behavior |
| `critical` | Serious errors (e.g., unknown render failures) |

### Communication Protocol

- **Transport:** `window.parent?.postMessage(message, '*')`
- **Origin:** Wildcard `'*'` (cross-origin iframe communication)
- **Direction:** Preview iframe → Parent editor
- **Blocking:** No — fire-and-forget

### Trigger Conditions

A `critical` toast is sent when the editor preview catches a rendering error that is **not** a RangeError or TypeError (i.e., not a panic-worthy error).

---

## 5. Debug State Inspection

### Purpose
Enables developers to inspect all component states at runtime via `window.logState()` in the browser console.

### Initialization

Called once during page bootstrap (`page.main.ts`):
```
initLogState() → attaches window.logState() function
```

### Global State Registry

```typescript
// Attached to window
window.__components: Record<string, Signal<ComponentData>>
```

Each component registers itself during creation:

```typescript
registerComponentToLogState(component: Component, dataSignal: Signal<ComponentData>): void
```

**Registration points:**
- Root page component (during page initialization)
- Nested components (during `createComponent()`)

### Usage

```javascript
// In browser console:
window.logState()
// Outputs: console.table() with component names and their current signal data
```

### Output Format

Iterates `window.__components`, calls `.get()` on each signal, and passes the result to `console.table()` — producing a tabular view of all component names and their current reactive data.

---

## 6. API Error Handling

### Error Flow

```
fetch() throws OR response.ok === false
  │
  ├─ Network/timeout/abort error → catch block
  │   └─ Classify error type (TimeoutError, AbortError, general)
  │
  └─ HTTP error (non-OK status) → throw response body
      └─ Caught by same catch block
  │
  ▼
apiError() function
  │
  ├─ Update reactive signal with error state
  │   {
  │     data: null,
  │     isLoading: false,
  │     error: <error object>
  │   }
  │
  ├─ Trigger onFailed action pipeline
  │
  └─ Return Promise.reject(error) for chaining
```

### API Error State Model

```typescript
// Set on ctx.dataSignal.Apis[apiName]
interface ApiErrorState {
  data: null
  isLoading: false
  error: unknown   // The error object — network error, parsed response body, or string
}
```

### Error Types

| Error Name | Cause | Error Value |
|------------|-------|-------------|
| `TimeoutError` | Request exceeded configured timeout | `"signal timed out"` |
| `AbortError` | Request cancelled via AbortFetch action | `"Request was aborted"` |
| Network error | Connection failure, CORS, DNS | Error object with `.message` and optional `.cause` |
| HTTP error | Non-OK status code (4xx, 5xx) | Parsed response body (JSON or text) |
| JSON parse error | Malformed response body | `Error("Error occurred while parsing the json chunk.", { cause: rawData })` |
| Unknown | Catch-all | `"Unknown error"` |

### Body Parsing Fallback

API responses are parsed with a try-catch fallback:
1. Read response as text (`res.text()`)
2. Try `parseJSONWithDate(textBody)` — JSON with date revival
3. On parse failure, return raw text string

This ensures non-JSON responses (HTML error pages, plain text) don't cause secondary errors.

### V2 API Enhancements

The V2 API system adds:
- **Response headers tracking** — stored alongside data/error in signal state
- **Performance metrics** — `responseEnd` timestamp recorded on error
- **Redirect rule handling** — checked even on error responses
- **Structured event triggers** — fires `'failed'` event name for declarative handling

### Component-Level Error Handling

Components access API errors via formulas:
```
Apis.{apiName}.error   → error object or null
Apis.{apiName}.isLoading → false when error occurs
Apis.{apiName}.data    → null when error occurs
```

Components can use `onFailed` action pipelines to:
- Show error UI
- Retry the request
- Navigate to an error page
- Log the error

---

## 7. Action System Error Handling

### Top-Level Protection

The entire `handleAction()` function is wrapped in a try-catch that:
1. Logs the error to `console.error()`
2. Returns `null` (action result is discarded)

This prevents any single action failure from crashing the action pipeline.

### Per-Action-Type Error Handling

| Action Type | Error Condition | Behavior |
|-------------|----------------|----------|
| **Fetch / FetchV2** | API reference not found | `console.error('The api [name] does not exist')`, early return |
| **AbortFetch** | Legacy (non-v2) API | `console.warn('AbortFetch action is not supported for API "[name]" as it is not a v2 API.')` |
| **TriggerWorkflow** | Workflow not found | `console.warn('Workflow [name] does not exist on component [componentName]')`, early return |
| **TriggerComponentEvent** | Context workflow not found | `console.warn('Cannot find workflow "[name]" on component "[name]". It has likely been removed or modified.')` |
| **Custom action (default)** | Action handler not found | `console.error('Missing custom action', actionName)`, early return |
| **Custom action (default)** | Handler throws | `console.error('Error in Custom Action', err)` |

### Recovery Strategy

All action errors follow the same pattern:
1. Log descriptive message to console (includes entity names for debugging)
2. Early return — action is silently skipped
3. Subsequent actions in the pipeline continue executing
4. No error propagation to parent components

---

## 8. Component Creation Errors

### Missing Component

When a component reference cannot be resolved during rendering:

```
console.warn(
  'Could not find component "[PackageName/ComponentName]" for component
   "[ParentComponent]". Available components are: ["Component1", "Component2", ...]'
)
```

**Recovery:** Returns empty array (`[]`) — the component renders as nothing.

**Debug value:** The warning lists all available component names to help identify typos or missing imports.

### Missing Root DOM Node

Fatal error during page bootstrap:
```
console.error('Cant find root domNode')
```
Occurs when `document.getElementById('App')` returns null.

### Missing Components Array

Fatal error during page bootstrap:
```
console.error('Missing components')
```
Occurs when the component registry is not available.

---

## 9. Registration Warnings

### Duplicate Formula Registration

```
console.warn('There already exists a formula with the name [formulaName]')
```

Occurs when a custom formula is registered with a name that already exists. The duplicate is silently ignored.

### Duplicate Action Registration

```
console.warn('There already exists an action with the name [actionName]')
```

Same behavior as formula registration — duplicate ignored with warning.

### Duplicate Custom Element

```
console.warn('Component [tag] already defined')
```

Occurs when `defineComponents()` encounters a tag name already in the custom elements registry.

---

## 10. Editor Preview Security

### Untrusted Message Detection

```
console.error('UNTRUSTED MESSAGE')
```

Occurs when a PostMessage event has `isTrusted === false`. The message is ignored entirely, preventing potential injection of editor commands from untrusted sources.

---

## 11. Error Data Flow

### Rendering Error Flow (Editor Preview)

```
createNode() throws
  └─ update() catch block
      ├─ Classify: RangeError → panic = true, name = "Infinite loop detected"
      ├─ Classify: TypeError  → panic = true, name = "TypeError"
      ├─ Classify: Other      → panic = false
      ├─ console.error(name, message, error)
      └─ if panic:
      │     createPanicScreen({name, message, isPage, cause})
      │     domNode.innerHTML = ''
      │     domNode.appendChild(panicScreen)
      └─ else:
            sendEditorToast(name, message, {type: 'critical'})
```

### API Error Flow

```
fetch() fails OR response not OK
  └─ execute() catch block
      ├─ Classify: TimeoutError, AbortError, general
      ├─ apiError({api, data, componentData, performance})
      │   ├─ ctx.dataSignal.set({...Apis: {[name]: {data: null, isLoading: false, error}}})
      │   └─ triggerActions(eventName: 'failed', ...)
      │       └─ api.client.onFailed.actions.forEach(handleAction)
      └─ return Promise.reject(error)
```

### Action Error Flow

```
handleAction() encounters error
  └─ Per-type switch case
      ├─ Missing reference → console.error/warn with descriptive message
      ├─ Early return (action aborted)
      └─ Next action in pipeline continues
  └─ Top-level catch
      ├─ console.error(e)
      └─ return null
```

---

## 12. Environment Configuration

### Error Logging Control

```typescript
interface ToddleEnv {
  logErrors: true    // Controls whether errors are logged
  runtime: 'page' | 'preview' | 'custom-element'
}
```

### Runtime Modes and Error Behavior

| Runtime | Panic Screen | Editor Toasts | Console Logs | API Error State |
|---------|-------------|---------------|-------------|-----------------|
| `page` | No | No | Yes | Yes |
| `preview` | Yes | Yes | Yes | Yes |
| `custom-element` | No | No | Yes | Yes |

The panic screen and editor toast system are **exclusive to editor preview mode**. Production pages and custom elements rely solely on console logging and reactive API error state.

### Global Error State

```typescript
interface Window {
  __components: Record<string, Signal<ComponentData>>  // State registry
  __toddle: ToddleInternals                            // Runtime internals
  toddle: {
    errors: unknown[]   // Non-verbose error collection
    // ... other properties
  }
}
```

---

## 13. Design Patterns

### Pattern 1: Defensive Reference Checking

All action handlers validate entity references before use:
```
1. Look up reference (API, workflow, component, action)
2. If not found → log descriptive warning with context
3. Early return with safe default
```

This prevents cascading null-reference errors from a single missing entity.

### Pattern 2: Error Classification via instanceof

Rendering errors are classified using JavaScript's `instanceof` operator:
```
error instanceof RangeError → infinite loop (panic)
error instanceof TypeError  → type error (panic)
anything else               → general error (toast)
```

### Pattern 3: State-Based Error Exposure

API errors are stored in the reactive signal system rather than thrown:
```
Apis[name] = { data: null, isLoading: false, error: errorObject }
```

This allows components to declaratively react to errors via formulas and conditional rendering, rather than requiring imperative try-catch blocks.

### Pattern 4: Graceful Degradation

Non-critical errors produce safe fallback values:
- Missing component → empty array (renders nothing)
- JSON parse failure → raw text string
- Missing action → early return (pipeline continues)
- Duplicate registration → skip (existing registration preserved)

---

## 14. External Dependencies

| Dependency | Usage |
|------------|-------|
| Browser `console` API | `console.error()`, `console.warn()`, `console.table()` |
| PostMessage API | `window.parent?.postMessage()` for editor communication |
| View Transition API | Used indirectly (panic screen replaces DOM) |
| `Signal<T>` (runtime) | Reactive state for API error exposure |
| `handleAction()` (runtime) | Executes `onFailed` action pipelines |

---

## 15. Edge Cases

### Circular Component References
A component referencing itself causes a RangeError (maximum call stack). The panic screen detects this and displays the "Infinite loop detected" message with recursive visual effect.

### Non-Serializable Error Data
When PostMessage encounters non-serializable data in component state updates, a fallback serialization is applied:
```typescript
try {
  postMessageToEditor({ type: 'data', data })
} catch {
  postMessageToEditor({ type: 'data', data: JSON.parse(JSON.stringify(data)) })
}
```

### Multiple Errors in Single Render
Only the first thrown error is caught and displayed. Subsequent errors from the same render cycle are not captured since the panic screen replaces all content.

### API Error During SSR
API errors during server-side rendering follow the same `apiError()` flow but without editor toast notifications (no `window.parent` available). Error state is serialized into hydration data for client-side access.

### Custom Element Errors
Custom elements collect errors in `toddle.errors[]` array rather than displaying panic screens, since they may be embedded in third-party pages where a full-viewport error display would be inappropriate.

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxDepth` | 100 | Maximum nesting depth |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Depth limit:** Throw `LimitExceededError`

---

## Invariants

### Operation Invariants

1. **I-OP-ATOMIC:** Operations MUST be atomic.
2. **I-OP-ISOLATED:** Operations MUST be isolated.
3. **I-OP-CLEANUP:** Cleanup MUST be guaranteed.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-ATOMIC | Runtime | Rollback |
| I-OP-ISOLATED | Runtime | Sandbox |
| I-OP-CLEANUP | Runtime | Force cleanup |

---

## Error Handling

### Error Types

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section with operation limits
- Added Invariants section with 3 operation invariants
- Added Error Handling section with error types
