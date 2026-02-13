# Search & Linting Rule Engine Specification

## Purpose

The Search and Linting Rule Engine implements a comprehensive AST-based linting and auto-fixing system for the Layr visual development platform. It uses a generator-based traversal pattern to walk project files (components, formulas, actions, routes, themes, services), applies 97+ rules organized into 15 categories, and can automatically fix detected issues. The system runs in a Web Worker for non-blocking execution and uses streaming batch processing to handle large projects efficiently.

### Jobs to Be Done

- Traverse entire project AST to detect problems across all entity types
- Apply 97+ rules organized into 15 categories with configurable severity
- Execute linting off the main thread via Web Worker
- Stream results in configurable batches for responsive UI
- Auto-fix detected issues iteratively with single-fix-per-pass safety
- Return fixes as JSON patches for efficient file updates
- Support path-filtered linting for single-file or single-component scoping
- Provide memoization across rules for expensive cross-entity lookups

---

## Architecture Overview

```
Main Thread                    Worker Thread
    │                              │
    ├── FindProblemsArgs ──────────► findProblems()
    │                              │  → filters rules
    │                              │  → calls searchProject()
    │                              │  → batches results
    ◄── FindProblemsResponse ──────┤
    │   (potentially multiple)     │
    │                              │
    ├── FixProblemsArgs ───────────► fixProblems()
    │                              │  → finds rule
    │                              │  → calls fixProject()
    │                              │  → iterative searchProject()
    │                              │  → calculates JSON patch
    ◄── FixProblemsResponse ───────┤
```

---

## Worker Protocol

### Message Discrimination

```typescript
onmessage = (event) => {
  if ('fixRule' in event.data) {
    fixProblems(event.data, respond)
  } else {
    findProblems(event.data, respond)
  }
}
```

Presence of `fixRule` property distinguishes fix operations from find operations. Each message includes a correlation `id` for response matching.

### Message Types

| Direction | Type | Key Fields |
|-----------|------|------------|
| In | `FindProblemsArgs` | `files`, `options` (categories, levels, batchSize, pathsToVisit) |
| In | `FixProblemsArgs` | `files`, `fixRule`, `fixType`, `options` |
| Out | `FindProblemsResponse` | `id`, `results: Result[]` |
| Out | `FixProblemsResponse` | `id`, `patch`, `fixRule`, `fixType` |

---

## Core Traversal: searchProject()

### Generator Function

```
function* searchProject({ files, rules, pathsToVisit?, useExactPaths?, state, fixOptions? })
  → Generator<Result | ProjectFiles | void>
```

### Traversal Flow

1. Iterate top-level file collections: components, formulas, actions, themes, services, routes, config
2. For each item, call `visitNode()` with node metadata
3. `visitNode()` checks path filters, applies all rules to the node
4. Recursively descend into child nodes based on `nodeType` switch (37 node types)
5. In FIND mode: yields `Result` objects
6. In FIX mode: yields modified `ProjectFiles` after first fix applied

### Path Filtering

- `shouldVisitTree()` — prefix matching for subtree pruning
- `shouldSearchExactPath()` — exact path matching when `useExactPaths` enabled

Enables single-file or single-component linting without traversing entire project.

### Memoization

Shared `Map<string, any>` across all rules per search invocation:

```typescript
const memo = (key: string, fn: () => any) => {
  if (memos.has(key)) return memos.get(key)
  const result = fn()
  memos.set(key, result)
  return result
}
```

Reduces O(n^2) to O(n) for lookup-heavy rules (e.g., building set of all used components once, reused by multiple rules).

---

## Node Type System

37 distinct node types represent every searchable element:

| Category | Node Types |
|----------|-----------|
| Component structure | `component`, `component-node`, `component-variable`, `component-attribute`, `component-event` |
| API | `component-api`, `component-api-input`, `api-service` |
| Formulas | `formula`, `component-formula` |
| Actions | `action-model`, `component-action` |
| Routing | `route`, `route-path-segment`, `route-query-parameter` |
| Styling | `style-declaration`, `style-variant`, `style-custom-property` |
| Context | `component-context`, `component-context-formula` |
| Slots | `component-slot` |
| Workflows | `component-workflow`, `workflow-parameter`, `workflow-callback` |
| Config | `project-config`, `theme` |

---

## Rule Architecture

### Rule Interface

```
Rule<T, V, N> = {
  category: Category      // 'Unknown Reference' | 'No References' | 'SEO' | 'Accessibility' | 'Deprecation' | 'Performance' | 'Security' | 'Quality' | 'Other'
  code: Code              // 139 distinct codes
  level: Level            // 'error' | 'warning' | 'info'
  visit: (report, data, state?) → void
  fixes?: Record<FixType, FixFunction>
}
```

- `report(path, details?, fixes?)` — callback to emit problems; decouples detection from result handling
- Generic `T` for rule-specific details passed to fix functions
- Generic `V` for visited node type filtering
- Optional `fixes` map for auto-fix implementations

### Rule Registration

All rules aggregate into `ISSUE_RULES` flat array from 15 category indexes:

```
ISSUE_RULES = [
  ...actionRules,      ...apiRules,        ...attributeRules,
  ...componentRules,   ...contextRules,    ...domRules,
  ...eventRules,       ...formulaRules,    ...logicRules,
  ...miscRules,        ...routingRules,    ...slotRules,
  ...styleRules,       ...variableRules,   ...workflowRules
]
```

### 15 Rule Categories

| Category | Count | Example Rules |
|----------|-------|---------------|
| actions | ~7 | no-console, legacy actions, unknown arguments |
| apis | ~8 | unknown services, legacy APIs, fetch inputs |
| attributes | ~3 | attribute validation |
| components | ~2 | unused components, component structure |
| context | ~6 | provider/consumer validation |
| dom | ~8 | accessibility (alt text, href), SEO, image dimensions |
| events | ~2 | event trigger validation |
| formulas | ~5 | legacy formulas, unknown references |
| logic | ~3 | static conditions, always-true/false |
| miscellaneous | ~2 | unknown cookies, unreferenced nodes |
| routing | ~4 | duplicate routes, URL parameters |
| slots | ~2 | slot usage validation |
| style | ~6 | invalid CSS syntax, unused variables, themes |
| variables | ~3 | unused variables, reference tracking |
| workflows | ~3 | post-navigate actions |

### Severity Categories

| Category | Purpose |
|----------|---------|
| Unknown Reference | References to non-existent entities |
| No References | Unused entities that can be removed |
| Deprecation | Legacy APIs that should be updated |
| Accessibility | Missing alt text, invalid structure |
| SEO | Meta tags, page structure |
| Performance | Images without dimensions |
| Security | Security concerns |
| Quality | Code quality (static conditions, invalid syntax) |
| Other | Miscellaneous |

---

## Rule Implementation Patterns

### Pattern 1: Reference Validation

Checks if an entity is referenced anywhere in its scope:

```
visit: (report, args) → {
  if (args.nodeType !== 'component-variable') return
  const variableInComponent = memo(`variableInComponent/${name}`, () =>
    new Set(component.formulasInComponent()
      .filter(f => f.type === 'path' && f.path[0] === 'Variables')
      .map(f => f.path[1]))
  )
  if (!variableInComponent.has(variableKey)) {
    report(path, undefined, ['delete-variable'])
  }
}
```

### Pattern 2: Deprecation Detection

Detects legacy constructs and offers migration:

```
visit: (report, data) → {
  if (data.value.type !== 'function' || !isLegacyFormula(data.value)) return
  report(path, { name: data.value.name }, ['replace-legacy-formula'])
}
```

### Pattern 3: DOM Validation

Performance/accessibility checks on HTML elements:

```
visit: (report, { path, value }) → {
  if (value.type !== 'element' || !['img', 'source'].includes(value.tag)) return
  // Check width, height, aspect-ratio across base + variant styles
  // Uses contextlessEvaluateFormula for static analysis
  if (insufficientDimensions) report(path)
}
```

### Pattern 4: Rule Factories

Parameterized rule creation for related checks:

```
createRequiredElementAttributeRule({ tag: 'a', attribute: 'href' })
createRequiredElementAttributeRule({ tag: 'img', attribute: ['alt', 'aria-hidden'] })
createRequiredElementAttributeRule({ tag: 'img', attribute: 'src' })
```

### Pattern 5: Syntax Validation

External parser integration with memoization:

```
visit: (report, { value, memo }) → {
  const valid = memo(`valid-style-${property}:${value}`, () => {
    try { parse(`${property}: ${value}`); return true }
    catch { return false }
  })
  if (!valid) report(path, details, ['delete-style-property'])
}
```

---

## Problem Detection Flow

### Entry: findProblems()

1. **Filter rules** by category, level, and exclusion list
2. **Call searchProject()** with filtered rules
3. **Batch results** using configured strategy:
   - `'all'` — accumulate all, send once at end
   - `'per-file'` — send batch when moving to next file
   - `number` — send every N results
4. **Send remaining** batch at end

### Rule Execution (per node)

```
for each rule in rules:
  rule.visit(
    (path, details, fixes) → {
      results.push({ code, category, level, path, details, fixes })
    },
    nodeData,
    state,
  )
```

---

## Fix Application Flow

### Entry: fixProblems()

1. Find matching rule by `code`
2. Call `fixProject()` with rule and fix type
3. Calculate JSON patch via `jsondiffpatch` (with `omitRemovedValues: true`)
4. Return patch, fixRule, fixType

### Iterative Fix: fixProject()

```
while (iterations < 100):
  result = searchProject({ files, rules: [rule], fixOptions: { mode: 'FIX', fixType } }).next()
  if (result.value):
    updatedFiles = result.value
  else:
    break  // No more fixes
```

**Why single-fix iterations:**
- Prevents conflicting concurrent fixes
- Each fix may expose new issues or invalidate others
- Files update after each fix, ensuring consistent state
- Generator `.next()` applies only the first matching fix

### Fix Mode in searchProject

When in FIX mode, the report callback applies the fix instead of accumulating:

```
rule.visit(
  (path, details, fixes) → {
    if (!fixedFiles && fixes.includes(fixType) && rule.fixes[fixType]) {
      fixedFiles = rule.fixes[fixType]({ data, details, state })
    }
  },
  data, state
)
```

Only first fix applies per pass (`!fixedFiles` guard).

### Common Fix Functions

| Fix | Description |
|-----|-------------|
| `removeFromPathFix` | Simple deletion: `omit(files, path)` |
| `removeNodeFromPathFix` | DOM node deletion: removes node, cleans parent references, recursively removes children |
| Legacy formula migration | 660-line transformation: maps 50+ legacy formulas to modern equivalents (AND→and, IF→switch, etc.) |

---

## Contextless Formula Evaluation

Static analysis utility for evaluating formulas without runtime context:

```
contextlessEvaluateFormula(formula) → { isStatic: boolean, result: unknown }
```

| Formula Type | Static? | Result |
|-------------|---------|--------|
| `value` | Always | The literal value |
| `array` | If all elements static | Evaluated array |
| `and` | If always-true or always-false determinable | `true` or `false` |
| `or` | If always-true or always-false determinable | `true` or `false` |
| `record`/`object` | If all entries static | Evaluated object |
| `path`, `function`, `apply`, `switch` | Never | `undefined` |

Used by rules to detect static conditions, validate attribute values, and identify unnecessary logic.

---

## Configuration

### Options

```
Options = {
  pathsToVisit?: string[][]     // Filter to specific subtrees
  useExactPaths?: boolean        // Exact vs prefix matching
  categories?: Category[]        // Filter by category
  levels?: Level[]               // Filter by severity
  batchSize?: number | 'all' | 'per-file'
  state?: ApplicationState       // Runtime context
  rulesToExclude?: Code[]        // Explicit exclusions
}
```

### Application State

Optional runtime context for rules that need it:

```
ApplicationState = {
  cookiesAvailable?: Array<Cookie>         // For cookie validation rules
  isBrowserExtensionAvailable?: boolean    // For extension-dependent rules
  projectDetails?: ToddleProject           // For package-aware rules
}
```

---

## Performance Optimizations

1. **Path filtering:** Prune entire subtrees not matching `pathsToVisit`
2. **Memoization:** Shared cache across rules reduces redundant lookups
3. **Generator pattern:** Streaming results avoids memory spikes on large projects
4. **Batch streaming:** Configurable batching reduces IPC overhead
5. **JSON patches:** `jsondiffpatch` with `omitRemovedValues: true` reduces payload size vs. full files
6. **Worker isolation:** All computation off main thread for UI responsiveness

---

## Edge Cases

- **Rule filter produces empty set:** searchProject runs with no rules, yields nothing
- **Fix iteration limit:** Maximum 100 iterations prevents infinite loops from rules that can't converge
- **Fix type not implemented:** If rule reports a fix type but doesn't implement it, no fix applied (silent skip)
- **Dynamic formula in static check:** `contextlessEvaluateFormula` returns `isStatic: false` for paths, functions, and apply operations — rules conservatively assume validity
- **Concurrent worker messages:** Worker processes one message at a time (synchronous); messages queue naturally
- **Memoization scope:** Cache cleared between `searchProject()` invocations — no stale data across fix iterations
- **Fix cascading:** Single-fix-per-iteration ensures each fix operates on clean, consistent project state
- **Rule factory instances:** Factory-generated rules are separate instances — each can have different severity levels

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
