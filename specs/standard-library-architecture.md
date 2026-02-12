# Standard Library Implementation Architecture Specification

## Purpose

The Standard Library (`@layr/std-lib`) implements ~95 formulas and ~20 actions using a plugin-based architecture. Each unit is self-contained with JSON metadata and TypeScript handlers. The build system generates barrel exports, JSON Schema validates all definitions at compile time, and the runtime registers handlers with `@toddle/` namespace prefix for formula/action invocation.

### Jobs to Be Done

- Provide a directory-per-unit plugin architecture for formulas and actions
- Define handler signatures with type-safe interfaces for both formulas and actions
- Support editor integration via `getArgumentInputData` for argument autocomplete
- Validate all metadata definitions against JSON Schemas at build time
- Generate barrel exports and metadata manifests via build pipeline
- Register all handlers in the runtime's global `window.toddle` registry
- Support action cleanup lifecycle for timers, subscriptions, and event listeners

---

## Directory Structure

### Convention

```
packages/lib/
  formulas/
    {name}/
      formula.json      # Metadata (libFormula.schema.json)
      handler.ts         # Implementation (default export + optional getArgumentInputData)
      handler.test.ts    # Tests (optional, Bun test runner)
  actions/
    {name}/
      action.json        # Metadata (libAction.schema.json)
      handler.ts         # Implementation (default export)
      handler.test.ts    # Tests (optional)
  schemas/
    libFormula.schema.json
    libAction.schema.json
    formula.schema.json
    valueFormula.schema.json
    pathFormula.schema.json
    arrayFormula.schema.json
  bin/
    generate.js          # Barrel export generator
    validate.ts          # JSON Schema validator
```

Directory names use camelCase (e.g., `formulas/getElementById/`). JSON names use title case (e.g., `"name": "Get element by id"`).

---

## Handler Signatures

### Formula Handler

```
FormulaHandler<T> = (
  args: unknown[],
  ctx: {
    component: Component
    data: ComponentData
    root: Document | ShadowRoot
    env: ToddleEnv
  },
) => T | null
```

**Key constraints:**
- Arguments arrive as an array matching `formula.json` `arguments` order
- Must return `null` for invalid inputs — formulas never throw
- Context provides component definition, data scope, DOM root, and environment flags
- Always synchronous

### Action Handler

```
ActionHandler<Args = unknown[]> = (
  args: Args,
  ctx: {
    triggerActionEvent: (trigger: string, data: any, event?: Event) => void
    env: ToddleEnv
    abortSignal: AbortSignal
  },
  event?: Event,
) => void | Promise<void> | (() => void) | Promise<() => void>
```

**Key constraints:**
- Can throw errors (unlike formulas) — thrown errors trigger Error events
- `triggerActionEvent` fires named events defined in `action.json` `events` field
- `abortSignal` fires when component unmounts, enabling cleanup
- Return value: `void`, cleanup function, or Promise thereof
- Async actions supported

### ArgumentInputDataFunction

```
ArgumentInputDataFunction = (
  args: unknown[],
  argIndex: number,
  input: any,
) => any
```

Simulates argument context for editor autocomplete. When the user edits argument at `argIndex`, this function injects sample `Args` scope so the editor can suggest `Args.item`, `Args.index`, etc.

---

## Implementation Patterns

### Pattern 1: Simple Pure Formula

```typescript
const handler: FormulaHandler<number> = (numbers) => {
  if (!Array.isArray(numbers) || numbers.some(n => typeof n !== 'number')) {
    return null
  }
  return numbers.reduce((result, n) => result + Number(n), 0)
}
```

- Validates all arguments before processing
- Returns `null` for invalid input
- `variableArguments: true` in JSON means args arrive as single array

### Pattern 2: Higher-Order Formula with Editor Support

```typescript
export const handler: FormulaHandler<Array<unknown>> = ([items, fx]) => {
  if (typeof fx !== 'function') return null
  if (Array.isArray(items)) {
    return items.map((item, index) => fx({ item, index }))
  }
  return null
}

export const getArgumentInputData = ([items], argIndex, input) => {
  if (argIndex === 0) return input
  if (Array.isArray(items)) {
    return { ...input, Args: { item: items[0], index: 0 } }
  }
  return input
}
```

- Function arguments (marked `"isFunction": true` in JSON) receive compiled closures from runtime
- `getArgumentInputData` injects `Args` scope with first item for editor suggestions
- Supports both arrays and objects (dual iteration)

### Pattern 3: Context-Aware Formula

```typescript
const handler: FormulaHandler<string> = (_, { env }) => {
  if (env.isServer) {
    return env.request.url
  }
  return window?.location.href ?? null
}
```

- Uses context for environment detection (SSR vs client)
- `"cache": false` in JSON prevents memoization of non-pure results

### Pattern 4: DOM-Accessing Formula

```typescript
const handler: FormulaHandler<HTMLElement> = ([id], { root }) => {
  if (typeof id !== 'string') return null
  return root.getElementById(id)
}
```

- Uses `root` (Document or ShadowRoot) from context
- Respects shadow DOM boundaries
- `"cache": false` prevents stale DOM references

### Pattern 5: Action with Event Triggers

```typescript
const handler: ActionHandler = async ([name, value, ttl], ctx) => {
  const error = (msg: string) =>
    ctx.triggerActionEvent('Error', new Error(msg))

  if (typeof name !== 'string') {
    error('The "Name" argument must be a string')
    return
  }
  // ... logic
  ctx.triggerActionEvent('Success', undefined)
}
```

- Validates inputs, triggers Error event for invalid data
- Uses `triggerActionEvent` instead of throwing for user-facing errors
- Events defined in `action.json`: `"events": { "Success": {}, "Error": {} }`
- Triggers enable visual workflow branching in the editor

### Pattern 6: Action with Cleanup

```typescript
const handler: ActionHandler = ([delay], ctx) => {
  const interval = setInterval(
    () => ctx.triggerActionEvent('tick', null),
    Number(delay),
  )
  ctx.abortSignal.addEventListener('abort', () => {
    clearInterval(interval)
  })
}
```

- Registers cleanup with `abortSignal` to prevent memory leaks
- Signal fires when component unmounts
- Used by `interval`, `sleep`, and event listener actions

### Pattern 7: Server-Side Action

```typescript
const handler: ActionHandler = async ([name, value], ctx) => {
  const res = await fetch(`/.nordcraft/cookies/set-cookie?${params}`)
  if (res.ok) {
    ctx.triggerActionEvent('Success', undefined)
  } else {
    ctx.triggerActionEvent('Error', new Error(await res.text()))
  }
}
```

- Calls Layr internal API endpoints for server-side operations
- Async handler returns Promise
- Validates inputs client-side before network call

---

## Formulas vs Actions

| Aspect | Formulas | Actions |
|--------|----------|---------|
| **Purpose** | Pure computation, return values | Side effects, no return value |
| **Error handling** | Return `null`, never throw | Can throw or trigger Error events |
| **Signature** | `(args, ctx) => T \| null` | `(args, ctx, event?) => void \| cleanup` |
| **Context** | `component`, `data`, `root`, `env` | `triggerActionEvent`, `env`, `abortSignal` |
| **Schema** | `libFormula.schema.json` | `libAction.schema.json` |
| **Caching** | Supported via `"cache": false` flag | N/A |
| **Events** | None | Can define Success/Error/custom events |
| **Editor support** | `getArgumentInputData` for autocomplete | None |
| **Async** | Always synchronous | Can return `Promise<void>` |
| **Cleanup** | N/A | Can return cleanup function or use `abortSignal` |
| **Grouping** | None | Required `group` field |

---

## Validation System

### Schema Definitions

**Formula schema (`libFormula.schema.json`):**
```json
{
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "cache": { "type": "boolean" },
    "arguments": {
      "type": "array",
      "items": {
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "type": { "type": "object" },
          "formula": { "$ref": "/Formula" }
        },
        "required": ["name", "type"]
      }
    },
    "variableArguments": { "type": "boolean" }
  },
  "required": ["name", "description"]
}
```

**Action schema (`libAction.schema.json`):**
```json
{
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "group": {
      "enum": ["cookies", "debugging", "events", "local_storage",
               "navigation", "session_storage", "theming", "sharing", "timers"]
    },
    "arguments": { "type": "array" },
    "deprecated": { "type": "boolean" },
    "supercededBy": { "type": "string" }
  },
  "required": ["name", "description", "group"]
}
```

**Sub-schemas** (referenced via `$ref`): `formula.schema.json`, `valueFormula.schema.json`, `pathFormula.schema.json`, `arrayFormula.schema.json`

### Validation Flow

1. Load sub-schemas and register with validator
2. Iterate all `formula.json` and `action.json` files
3. Validate each against its `$schema` reference
4. Exit with code 1 on any failure

Runs during `bun run typecheck` and before publish.

---

## Build Pipeline

### Generation (`bin/generate.js`)

1. Scan `formulas/` and `actions/` directories for subdirectories
2. Generate barrel files (`formulas.ts`, `actions.ts`) with imports and exports:
   ```typescript
   import * as map from "./formulas/map/handler"
   import * as filter from "./formulas/filter/handler"
   export { map, filter }
   ```
3. Generate metadata manifest (`dist/lib.ts`) with all formula/action JSON metadata
4. Compile via `tsgo --project tsconfig.build.json`

### Build Scripts

```json
{
  "build": "bun ./bin/generate.js && tsgo --project tsconfig.build.json",
  "typecheck": "tsgo --noEmit && bun bin/validate.ts",
  "npm-publish": "bun run build && bun publish --access public"
}
```

Test files (`**/*.test.ts`) are excluded from compilation.

---

## Registration Flow

### Runtime Registration

```typescript
// page.main.ts
import * as libFormulas from '@layr/std-lib/dist/formulas'
import * as libActions from '@layr/std-lib/dist/actions'

Object.entries(libFormulas).forEach(([name, module]) =>
  window.toddle.registerFormula(
    '@toddle/' + name,
    module.default,
    'getArgumentInputData' in module ? module.getArgumentInputData : undefined,
  ),
)

Object.entries(libActions).forEach(([name, module]) =>
  window.toddle.registerAction('@toddle/' + name, module.default),
)
```

### Registry Structure

```typescript
window.toddle = {
  registerFormula(name, handler, getArgumentInputData?) → void
  registerAction(name, handler) → void
  getFormula(name) → FormulaHandler | undefined
  getAction(name) → ActionHandler | undefined
}
```

- Names prefixed with `@toddle/` namespace
- Duplicate names logged as errors but don't throw
- `getArgumentInputData` registered separately in a parallel map

### Lookup During Evaluation

Formula engine calls `ctx.toddle.getFormula('@toddle/map')` → retrieves handler from registry.
Action engine calls `ctx.toddle.getAction('@toddle/goToURL')` → retrieves handler from registry.

---

## Testing Infrastructure

- **Framework:** Bun's built-in test runner
- **Pattern:** Co-located `handler.test.ts` next to `handler.ts`
- **Context mocking:** `undefined as any` for context when not needed
- **DOM mocking:** `happy-dom` for browser APIs (document, window, cookies)
- **Action event assertions:** Mock `triggerActionEvent` to verify event triggers

Example:
```typescript
import { describe, expect, test } from 'bun:test'
import handler from './handler'

describe('Formula: Map', () => {
  test('Should map array values', () => {
    expect(
      handler([[1, 2, 3], (Arg: any) => Arg.item + 1], undefined as any),
    ).toEqual([2, 3, 4])
  })
})
```

---

## Edge Cases

- **Variable arguments:** When `"variableArguments": true`, all positional arguments arrive as a single array (first element of args)
- **Deprecated actions:** Marked with `"deprecated": true` and `"supercededBy": "newActionName"` in JSON, but still registered for backwards compatibility
- **Formula cache opt-out:** Formulas accessing non-deterministic state (DOM, URL, time) must set `"cache": false` to prevent stale results
- **Action error escalation:** Thrown errors in action handlers are caught by the action execution engine and result in error state; `triggerActionEvent('Error')` is preferred for user-facing errors
- **SSR formula context:** Server-side formulas receive `env.isServer = true` and `env.request` with headers/cookies/URL; client-side receives `env.isServer = false`
- **Shadow DOM root:** DOM-accessing formulas use `ctx.root` which may be a `ShadowRoot`, ensuring queries stay within component boundaries
- **Action cleanup ordering:** `abortSignal` fires during component unmount; cleanup functions returned from handlers are called when the data signal is destroyed

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxItems` | 10,000 | Maximum items |

### Enforcement

- Size: Truncate with warning
- Time: Cancel with error
- Items: Stop processing

---

## Invariants

1. Operations MUST be valid
2. Operations MUST be safe
3. Results MUST be deterministic

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Operation fails | Log, continue |
| Timeout | Cancel |
| Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
