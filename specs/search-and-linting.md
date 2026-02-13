# Search & Linting Specification

## Purpose

The Search & Linting system provides project-wide issue detection, auto-fixing, and search capabilities. It uses a visitor pattern to walk component trees, evaluating 100+ rules across 15 categories, with streaming results, memoization, and web worker support.

### Jobs to Be Done

- Detect quality issues, errors, and deprecation warnings across entire projects
- Provide auto-fix patches for fixable issues
- Run in web workers to avoid blocking the editor UI
- Support contextless formula evaluation for static analysis
- Stream results for progressive rendering
- Batch fix application across multiple issues

---

## Architecture

### Core Components

| Component | Purpose |
|-----------|---------|
| `searchProject()` | Generator-based project walker with visitor pattern |
| `findProblems()` | Runs issue rules against project, streams results |
| `fixProblems()` | Applies a fix rule across all matching issues |
| `fixProject()` | Iteratively applies fixes until no more found |
| `problems.worker.ts` | Web worker for both find and fix operations |

### Data Flow

1. Editor sends `ProjectFiles` to web worker
2. Worker calls `findProblems()` or `fixProblems()`
3. Results streamed back via `postMessage()` callbacks
4. Editor applies JSON patches from fix operations

---

## Project Walker

### `searchProject(files, visitors, options?)`

Generator that yields results by walking the entire project structure.

**Walk Order:**

1. Components (each component → nodes → formulas → styles → actions)
2. Routes (custom routes → formulas)
3. Themes
4. Project-level formulas and actions

### Node Types (23 types visited)

| Category | Node Types |
|----------|-----------|
| Component | `component` |
| Node | `component-node` |
| Formula | `formula` |
| Style | `style-declaration` |
| Action | `action-model` |
| Route | `route`, `route-formula` |
| API | `api` |
| Variable | `variable` |
| Workflow | `workflow` |
| Event | `event` |
| Attribute | `attribute` |
| Context | `context` |
| Theme | `theme` |

### Visitor Pattern

Each rule implements the `Rule` interface:

```
Rule<Data, NodeType, Value> = {
  code: string              // Unique issue identifier
  level: 'error' | 'warning' | 'info'
  category: string          // Issue category
  visit: (report, data, state?) => void
  fixes?: Record<string, FixFunction>
}
```

The `report()` callback is called when an issue is found, with:
- `path`: Location path within project files
- `data`: Issue-specific metadata
- `fixTypes`: Array of applicable fix names

### Memoization

A shared `memo(key, factory)` function caches expensive computations across rules. Used for:
- Building reference sets (which components are used)
- Collecting all CSS variable declarations
- Computing route keys for duplicate detection

---

## Problem Detection

### `findProblems(args, respond)`

1. Filter rules by options (levels, specific rules)
2. Run `searchProject()` with filtered rules as visitors
3. Stream results via `respond()` callback
4. Batch results by `options.batchSize` (default: per-file)

### Issue Result Structure

| Field | Type | Description |
|-------|------|-------------|
| `rule` | `string` | Rule code (e.g., `'unknown variable'`) |
| `level` | `'error' \| 'warning' \| 'info'` | Severity |
| `category` | `string` | Category name |
| `path` | `(string \| number)[]` | Location within project files |
| `data` | `unknown` | Rule-specific metadata |
| `fixes` | `string[]?` | Available fix types |

---

## Auto-Fix System

### `fixProblems(args, respond)`

1. Run `searchProject()` with the single fix rule
2. For each match, apply the corresponding fix function
3. Compute JSON diff patch between original and fixed files
4. Return patch via `respond()` callback

### Fix Function Signature

```
FixFunction = (args: { data: { path, files, value, ... } }) =>
  ProjectFiles | undefined
```

Returns modified `ProjectFiles` or `undefined` if no fix applicable.

### Common Fix Patterns

| Fix | Behavior |
|-----|----------|
| `removeFromPathFix` | Delete the item at the reported path |
| `removeNodeFromPathFix` | Delete the node at the path |
| `replaceLegacyFormula` | Convert legacy formula to modern equivalent |
| `delete-following-actions` | Remove actions after navigation |
| `delete-component` | Remove unreferenced component |
| `delete-style-property` | Remove invalid CSS property |

### `fixProject()` — Iterative Fix

Runs `fixProblems()` repeatedly for a given rule until no more issues found (handles cascading fixes).

---

## Rule Categories (15)

### 1. Action Rules (3 rules)

- `unknownActionRule` — References to non-existent actions
- `unknownTriggerEventRule` — Unknown event triggers
- `noReferenceComponentWorkflowRule` — Unused workflows

### 2. API Rules (3 rules)

- `noReferenceApiRule` — Unused APIs
- `unknownApiRule` — References to non-existent APIs
- `unknownApiInputRule` — Unknown API input references

### 3. Attribute Rules (3 rules)

- `noReferenceAttributeRule` — Unused attributes
- `unknownAttributeRule` — References to non-existent attributes
- `unknownComponentAttributeRule` — Unknown attributes on component instances

### 4. Component Rules (2 rules)

- `unknownComponentRule` — References to non-existent components
- `noReferenceComponentRule` — Components not used anywhere (skips pages, exported, custom elements)

### 5. Context Rules (6 rules)

- `noContextConsumersRule` — Context providers without consumers
- `unknownContextFormulaRule` — Unknown context formula references
- `unknownContextProviderFormulaRule` — Unknown provider formula references
- `unknownContextProviderRule` — References to non-existent providers
- `unknownContextProviderWorkflowRule` — Unknown provider workflow references
- `unknownContextWorkflowRule` — Unknown context workflow references

### 6. DOM Rules (9 rules)

- `nonEmptyVoidElementRule` — Void elements with children
- `createRequiredElementAttributeRule('img', 'alt')` — Missing alt on images
- `createRequiredMetaTagRule('description')` — Missing meta description
- `createRequiredDirectChildRule(['ul','ol'], ['li','script','template'])` — Invalid list children
- `elementWithoutInteractiveContentRule` — Non-interactive content issues
- `imageWithoutDimensionRule` — Images without explicit dimensions (CLS)

### 7. Event Rules (4 rules)

- `duplicateEventTriggerRule` — Multiple handlers for same trigger
- `noReferenceEventRule` — Unused event definitions
- `unknownEventRule` — References to non-existent events
- `unknownTriggerEventRule` — Unknown event trigger references

### 8. Formula Rules (3 rules)

- `duplicateFormulaArgumentNameRule` — Duplicate argument names
- `noReferenceComponentFormulaRule` — Unused component formulas
- `noReferenceProjectFormulaRule` — Unused project formulas

### 9. Logic Rules (7 rules)

- `noStaticNodeCondition` — Conditions that always evaluate to true/false (with auto-fix)
- `noUnnecessaryConditionFalsy` — Always-false conditions
- `noUnnecessaryConditionTruthy` — Always-true conditions
- `unknownFormulaRule` — Unknown formula references
- `unknownProjectFormulaRule` — Unknown project formula references
- `unknownRepeatIndexFormulaRule` — Unknown repeat index references
- `unknownRepeatItemFormulaRule` — Unknown repeat item references

### 10. Miscellaneous Rules (3 rules)

- `noReferenceNodeRule` — Orphaned nodes
- `requireExtensionRule` — Missing required extensions
- `unknownCookieRule` — Unknown cookie references

### 11. Routing Rules (4 rules)

- `duplicateUrlParameterRule` — Duplicate URL parameter names
- `duplicateRouteRule` — Multiple pages with same route pattern
- `unknownSetUrlParameterRule` — Setting unknown URL parameters
- `unknownUrlParameterRule` — References to unknown URL parameters

### 12. Slot Rules (1 rule)

- `unknownComponentSlotRule` — References to non-existent slots

### 13. Style Rules (4 rules)

- `invalidStyleSyntaxRule` — CSS that fails PostCSS parsing (with auto-fix)
- `unknownClassnameRule` — References to non-existent class names
- `unknownCSSVariableRule` — CSS `var()` referencing undefined variables
- `noReferenceGlobalCSSVariableRule` — Unused global CSS variables

### 14. Variable Rules (3 rules)

- `noReferenceVariableRule` — Unused variables
- `unknownVariableRule` — References to non-existent variables
- `unknownVariableSetterRule` — Setting non-existent variables

### 15. Workflow Rules (6 rules)

- `duplicateWorkflowParameterRule` — Duplicate parameter names
- `noPostNavigateAction` — Actions after navigation (unreachable code, with auto-fix)
- `noReferenceComponentWorkflowRule` — Unused workflows
- `unknownTriggerWorkflowParameterRule` — Unknown workflow parameter references
- `unknownTriggerWorkflowRule` — References to non-existent workflows
- `unknownWorkflowParameterRule` — Unknown parameter references

---

## Severity Levels

| Level | Meaning | Examples |
|-------|---------|---------|
| `error` | Must fix — broken references | Unknown component, variable, formula; invalid CSS syntax |
| `warning` | Should fix — quality issues | Unused items, performance issues |
| `info` | Informational | (Reserved, not currently used) |

---

## Contextless Formula Evaluation

### `contextlessEvaluateFormula(formula)`

Static evaluation of formulas without runtime context. Returns `{ isStatic, result }`.

**Supported formula types:**

| Type | Static? | Result |
|------|---------|--------|
| `value` | Always | The literal value |
| `array` | If all elements static | Array of results |
| `record` | If all values static | Object of results |
| `and` | If all true OR any false | `true` or `false` |
| `or` | If any true OR all false | `true` or `false` |
| `path` | Never | `undefined` |
| `function` | Never | `undefined` |
| `switch` | Never | `undefined` |

**Used by rules for:**
- Custom element detection (checking `enabled` formula)
- Image dimension validation (checking width/height attributes)
- Static condition detection (always true/false conditions)

---

## Web Workers

### Problems Worker

Single worker handling both find and fix operations:

**Messages:**

| Direction | Type | Fields |
|-----------|------|--------|
| In | Find | `id`, `files`, `options?` |
| In | Fix | `id`, `files`, `options?`, `fixRule`, `fixType` |
| Out | Find Result | `id`, `results[]` |
| Out | Fix Result | `id`, `patch` (JSON diff), `fixRule`, `fixType` |

**Discrimination:** Presence of `fixRule` field determines operation type.

### Search Worker

**Not yet implemented.** Planned query types:

- `freeform` — Full-text search
- `component` — Component name search with reference tracking
- `formula` — Formula name search with reference tracking
- `action` — Action name search with reference tracking

---

## Filtering Options

```
Options = {
  levels?: Level[]          // Filter by severity
  rules?: string[]          // Filter by specific rule codes
  pathsToVisit?: string[][] // Limit to specific paths
  batchSize?: number | 'all' | 'per-file'
}
```

---

## Edge Cases

- **Duplicate route detection:** Normalizes routes (static preserved, dynamic → `*`) for comparison
- **Legacy formula detection:** Identifies by uppercase name + no version + legacy formula set membership
- **CSS variable collection:** Scans theme properties, custom properties, legacy style variables, and inline `--` declarations
- **Image dimension check:** Requires 2 of 3 (width, height, aspect-ratio) from attributes and styles including variants
- **Navigation action detection:** Flags actions after `@toddle/gotToURL` as unreachable
- **Context provider validation:** Components exposing context without slots or child components get flagged
- **Memoization sharing:** All rules share the same memo cache per search run for efficient repeated queries
- **PostCSS validation:** CSS property declarations validated via PostCSS parser for syntax correctness

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
