# Search & Linting

Project-wide issue detection and auto-fix system. Walks all components, formulas, actions, routes, and themes using a visitor pattern, then streams results and computes JSON-patch fixes.

**Implementing packages:** `packages/search/src/`

---

## Phase Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Project walker (`walkProject`) | [MVP] Implemented | Generator, 14 node types |
| Memoization (`createMemo`) | [MVP] Implemented | Shared cache per run |
| Problem streaming (`findProblems`) | [MVP] Implemented | Callback-based batching |
| Fix application (`fixProblems`, `fixProject`) | [MVP] Implemented | JSON patch diffs |
| Contextless evaluation | [MVP] Implemented | Static formula analysis |
| Linting rules — 57 implemented | [MVP] Implemented | All rules complete! |
| Search worker | [Phase 2] | Not yet implemented |

---

## Core Types

```typescript
// packages/search/src/types.ts

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  rule: string;                    // Rule code, e.g. 'unknown variable'
  level: IssueLevel;
  category: RuleCategory;
  path: (string | number)[];       // JSON path within ProjectFiles
  data?: unknown;                  // Rule-specific metadata
  fixes?: string[];                // Available fix type names
}

export interface Rule<Data = unknown, Value = unknown> {
  code: string;
  level: IssueLevel;
  category: RuleCategory;
  visit: (
    report: (data: Data, path: (string | number)[], fixes?: string[]) => void,
    ctx: RuleContext,
    state?: unknown
  ) => void;
  fixes?: Record<string, FixFunction>;
}

export interface RuleContext {
  files: ProjectFiles;
  memo: <T>(key: string, factory: () => T) => T;
}

export interface FixFunction {
  (args: { files: ProjectFiles; path: (string | number)[]; data: unknown }):
    ProjectFiles | undefined;
}

export interface FixPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
}

export type RuleCategory =
  | 'actions' | 'apis' | 'attributes' | 'components' | 'contexts'
  | 'dom' | 'events' | 'formulas' | 'logic' | 'misc'
  | 'routing' | 'slots' | 'styles' | 'variables' | 'workflows';

export type NodeType =
  | 'component' | 'component-node' | 'formula' | 'style-declaration'
  | 'action-model' | 'route' | 'route-formula' | 'api' | 'variable'
  | 'workflow' | 'event' | 'attribute' | 'context' | 'theme';
```

---

## Project Walker

### `walkProject(files, visitors, options?)`

Generator that yields `{ visitor, value, path, ctx }` tuples by walking the entire project.

**Walk order:**

1. Components — for each component:
   - Component root node
   - All nodes (depth-first, recursive)
   - Component formulas
   - Component variables
   - Component workflows (and nested actions)
   - Component events (and nested actions)
   - Component attributes
   - Component contexts
   - `onLoad` actions
   - `onAttributeChange` actions
   - Component APIs
2. Routes — route objects and their title/description/icon formulas
3. Themes
4. Project-level formulas
5. Project-level actions

**Path filtering:** `options.pathsToVisit` limits traversal to subtrees matching provided path prefixes.

### Node Walker

For element nodes: visits attrs (as formulas), style declarations, event action trees, and children recursively.
For component nodes: visits attrs (as formulas), event action trees.
For text nodes: visits value formula.
All nodes: visits `condition` formula and `repeat` formula.

### Action Walker

Recursively descends into:
- `Switch` action: all case actions, default actions
- `Fetch` action: `onSuccess`, `onError`, `onMessage` action lists
- `TriggerWorkflow` action: all named callback action lists

### Memoization

```typescript
export function createMemo() {
  const cache = new Map<string, unknown>();
  return <T>(key: string, factory: () => T): T => {
    if (cache.has(key)) return cache.get(key) as T;
    const value = factory();
    cache.set(key, value);
    return value;
  };
}
```

All rules share one `memo` instance per `findProblems` run. Used for:
- Building sets of all referenced components, variables, attributes
- Collecting all CSS variable declarations
- Computing route keys for duplicate detection

---

## Problem Detection

### `findProblems(args, respond)`

```typescript
interface FindProblemsArgs {
  files: ProjectFiles;
  options?: SearchOptions;
}

interface SearchOptions {
  levels?: IssueLevel[];
  rules?: string[];
  pathsToVisit?: (string | number)[][];
  batchSize?: number | 'all' | 'per-file';
}
```

**Steps:**
1. Load all rules via `getAllRules()`
2. Filter by `options.levels` and `options.rules`
3. Call each rule's `visit()` with a `report()` callback
4. Batch results by `batchSize` (default: `'per-file'` — group by component name)
5. Stream each batch via `respond(issues[])`

---

## Auto-Fix System

### `fixProblems(args, respond)`

```typescript
interface FixProblemsArgs {
  files: ProjectFiles;
  options?: SearchOptions;
  fixRule: string;   // Rule code to fix
  fixType: string;   // Fix type name within that rule
}
```

**Steps:**
1. Find rule by `fixRule` code
2. Call `rule.visit()` to locate all matching issues
3. For each issue, call `rule.fixes[fixType]({ files, path, data })`
4. Compute JSON-patch diff between original and fixed `ProjectFiles`
5. Return patches via `respond(patches[])`

### `fixProject(files, fixRule, fixType, options?)` → `ProjectFiles`

Iteratively calls `fixProblems` until no more patches are produced. Handles cascading fixes (e.g., removing a component that causes other components to become unreferenced).

### Fix function contract

```typescript
// Returns modified ProjectFiles, or undefined if no fix was applicable
type FixFunction = (args: {
  files: ProjectFiles;
  path: (string | number)[];
  data: unknown;
}) => ProjectFiles | undefined;
```

Common fix patterns seen in implemented rules:

| Fix Name | Behavior |
|----------|----------|
| `remove-condition` | `delete node.condition` |
| `remove-node` | `delete component.nodes[nodeId]` |
| `delete-component` | `delete files.components[name]` |

---

## Contextless Formula Evaluation

### `contextlessEvaluateFormula(formula)` → `{ isStatic: boolean, result: unknown }`

Evaluates a formula without runtime context, for static analysis in linting rules.

| Formula Type | `isStatic` | `result` |
|-------------|-----------|---------|
| `value` | Always `true` | The literal value |
| `array` | `true` if all elements static | Array of results |
| `record` / `object` | `true` if all values static | Object |
| `and` | `true` if all operands static | `true` / `false` |
| `or` | `true` if any operand static | `true` / `false` |
| `path` | Always `false` | `undefined` |
| `function` | Always `false` | `undefined` |
| `switch` | Always `false` | `undefined` |

Used by: static condition rules (detect always-true/always-false node conditions).

---

## All Linting Rules (57 total)

### Severity Guide

| Level | Meaning |
|-------|---------|
| `error` | Broken reference — runtime will fail |
| `warning` | Quality issue — works but should be fixed |
| `info` | Reserved, not currently used |

---

### Complete Rule Table

| Rule Code | Category | Severity | Auto-fix | Phase | Description |
|-----------|----------|----------|----------|-------|-------------|
| `unknown action` | actions | error | No | [MVP] | Custom action name not found in registry or project |
| `no reference api` | apis | warning | No | [MVP] | API is defined but never fetched |
| `unknown api` | apis | error | No | [MVP] | Fetch action targets non-existent API |
| `unknown api input` | apis | error | No | [MVP] | API input key does not match API definition |
| `no reference attribute` | attributes | warning | No | [MVP] | Attribute defined on component but never read in formulas |
| `unknown attribute` | attributes | error | No | [MVP] | Path formula reads `Attributes.X` but X is not defined |
| `unknown component attribute` | attributes | error | No | [MVP] | Component instance passes attribute not declared by target component |
| `unknown component` | components | error | No | [MVP] | Component node references component name not in project |
| `no reference component` | components | warning | Yes | [MVP] | Component exists but is not used anywhere (excludes pages, exports) |
| `no context consumers` | contexts | warning | No | [MVP] | Context provider has no consumers |
| `unknown context formula` | contexts | error | No | [MVP] | Formula references context that is not available |
| `unknown context provider formula` | contexts | error | No | [MVP] | Context provider formula reference is invalid |
| `unknown context provider` | contexts | error | No | [MVP] | Context consumer has no matching provider |
| `unknown context provider workflow` | contexts | error | No | [MVP] | Provider workflow reference is invalid |
| `unknown context workflow` | contexts | error | No | [MVP] | Context workflow reference is invalid |
| `non empty void element` | dom | error | No | [MVP] | Void element (e.g. `<img>`, `<br>`) has child nodes |
| `missing alt attribute` | dom | warning | No | [MVP] | `<img>` element missing `alt` attribute |
| `missing meta description` | dom | warning | No | [MVP] | Page is missing `<meta name="description">` |
| `invalid list children` | dom | error | No | [MVP] | `<ul>`/`<ol>` direct children are not `<li>` |
| `element without interactive content` | dom | warning | No | [MVP] | Non-interactive content issues (click handler on non-interactive element) |
| `image without dimension` | dom | warning | No | [MVP] | `<img>` missing width/height/aspect-ratio (causes CLS) |
| `duplicate event trigger` | events | warning | No | [MVP] | Multiple handlers registered for same event trigger |
| `no reference event` | events | warning | No | [MVP] | Event is defined but never triggered |
| `unknown event` | events | error | No | [MVP] | `TriggerEvent` action references event not defined on component |
| `unknown trigger event` | events | error | No | [MVP] | Event trigger references non-existent event |
| `duplicate formula argument name` | formulas | error | No | [MVP] | Formula has two arguments with the same name |
| `no reference component formula` | formulas | warning | No | [MVP] | Component formula is defined but never called |
| `no reference project formula` | formulas | warning | No | [MVP] | Project-level formula is defined but never called |
| `unknown formula` | formulas | error | No | [MVP] | Path formula references `Formulas.X` but X is not defined |
| `no static node condition` | logic | warning | Yes | [MVP] | Node condition formula is statically always truthy or falsy |
| `no unnecessary condition truthy` | logic | warning | Yes | [MVP] | Node condition formula statically evaluates to `true` — remove it |
| `no unnecessary condition falsy` | logic | warning | Yes | [MVP] | Node condition formula statically evaluates to `false` — remove node |
| `unknown project formula` | logic | error | No | [MVP] | Formula references project formula that does not exist |
| `unknown repeat index formula` | logic | error | No | [MVP] | Repeat index formula references invalid path |
| `unknown repeat item formula` | logic | error | No | [MVP] | Repeat item formula references invalid path |
| `switch unreachable case` | logic | warning | No | [MVP] | Switch case is unreachable (prior case always matches) |
| `no reference node` | misc | warning | No | [MVP] | Node exists in nodes map but is not reachable from root |
| `require extension` | misc | info | No | [MVP] | Required extension is not installed |
| `unknown cookie` | misc | error | No | [MVP] | Formula reads cookie that is not declared |
| `duplicate url parameter` | routing | error | No | [MVP] | Same URL parameter name appears twice in a route |
| `duplicate route` | routing | error | No | [MVP] | Two pages resolve to the same route pattern |
| `unknown set url parameter` | routing | error | No | [MVP] | `SetURLParameter` targets parameter not defined in route |
| `unknown url parameter` | routing | error | No | [MVP] | Formula reads URL parameter that is not defined |
| `unknown component slot` | slots | error | No | [MVP] | Slot node references slot not declared by target component |
| `invalid style syntax` | styles | error | Yes | [MVP] | CSS value fails PostCSS parsing |
| `unknown classname` | styles | error | No | [MVP] | `className` references a class name not defined in project |
| `unknown css variable` | styles | error | No | [MVP] | CSS `var(--x)` references undefined CSS custom property |
| `no reference global css variable` | styles | warning | No | [MVP] | Global CSS variable defined but never referenced |
| `no reference variable` | variables | warning | No | [MVP] | Component variable is defined but never read in any formula |
| `unknown variable` | variables | error | No | [MVP] | Path formula reads `Variables.X` but X is not defined on component |
| `unknown variable setter` | variables | error | No | [MVP] | `SetVariable` action targets variable that does not exist |
| `duplicate workflow parameter` | workflows | error | No | [MVP] | Workflow has two parameters with the same name |
| `no post navigate action` | workflows | warning | Yes | [MVP] | Actions placed after `goToURL` are unreachable |
| `no reference component workflow` | workflows | warning | No | [MVP] | Workflow is defined but never called |
| `unknown trigger workflow parameter` | workflows | error | No | [MVP] | Workflow trigger passes parameter not declared |
| `unknown trigger workflow` | workflows | error | No | [MVP] | `TriggerWorkflow` action targets workflow that does not exist |
| `unknown workflow parameter` | workflows | error | No | [MVP] | Formula reads `Parameters.X` but X is not a workflow parameter |

**Totals:** 57 rules implemented [MVP] — ALL COMPLETE!

---

## Implemented Rules — Detail

### `unknown action` [MVP]

- **File:** `rules/actions/unknownActionRule.ts`
- **Category:** actions | **Level:** error
- **What it checks:** Every `Custom` action node has its `name` in the known action set (project actions + package actions + `@toddle/` stdlib). Skips names starting with `@toddle/`.
- **Walk scope:** Component workflows, component events, node events

### `no reference attribute` [MVP]

- **File:** `rules/attributes/noReferenceAttributeRule.ts`
- **Category:** attributes | **Level:** warning
- **What it checks:** Every attribute declared on a component appears at least once as `Attributes.X` in a path formula somewhere in the component (formulas, variables, nodes, APIs)
- **Walk scope:** All path formulas inside the component

### `unknown component` [MVP]

- **File:** `rules/components/unknownComponentRule.ts`
- **Category:** components | **Level:** error
- **What it checks:** Every component node's `name` field resolves to a component in `files.components` or has a `package` field set
- **Walk scope:** All nodes in all components

### `unknown event` [MVP]

- **File:** `rules/events/unknownEventRule.ts`
- **Category:** events | **Level:** error
- **What it checks:** `TriggerEvent` action `name` matches an event declared on the component

### `unknown formula` [MVP]

- **File:** `rules/formulas/unknownFormulaRule.ts`
- **Category:** formulas | **Level:** error
- **What it checks:** Every `path` formula with `path[0] === 'Formulas'` — verifies `path[1]` exists as either a local component formula or a global project formula
- **Walk scope:** Formulas, variable initial values, node attrs, node conditions, node repeats

### `no static node condition` [MVP]

- **File:** `rules/logic/staticConditionRule.ts`
- **Category:** logic | **Level:** warning | **Auto-fix:** yes
- **What it checks:** Node `condition` formulas that `contextlessEvaluateFormula` can resolve statically
- **Fix (`remove-condition`):** Deletes `node.condition` from the node (always-truthy — node always shows)

### `no unnecessary condition truthy` [MVP]

- **File:** `rules/logic/staticConditionRule.ts`
- **Category:** logic | **Level:** warning | **Auto-fix:** yes (`remove-condition`)
- **What it checks:** Node condition that statically evaluates to `true`

### `no unnecessary condition falsy` [MVP]

- **File:** `rules/logic/staticConditionRule.ts`
- **Category:** logic | **Level:** warning | **Auto-fix:** yes (`remove-node`)
- **What it checks:** Node condition that statically evaluates to `false`
- **Fix (`remove-node`):** Deletes the node from `component.nodes`

### `unknown variable` [MVP]

- **File:** `rules/variables/unknownVariableRule.ts`
- **Category:** variables | **Level:** error
- **What it checks:** Every `path` formula with `path[0] === 'Variables'` — verifies `path[1]` is a declared variable on the current component

### `no reference variable` [MVP]

- **File:** `rules/variables/noReferenceVariableRule.ts`
- **Category:** variables | **Level:** warning
- **What it checks:** Every variable declared on a component appears at least once as `Variables.X` in a path formula somewhere in the component (formulas, variables, nodes, APIs)

---

## Filtering Options

```typescript
interface SearchOptions {
  levels?: IssueLevel[];              // Restrict to error/warning/info
  rules?: string[];                   // Restrict to specific rule codes
  pathsToVisit?: (string | number)[]; // Limit walk to path subtrees
  batchSize?: number | 'all' | 'per-file';  // How to chunk respond() calls
}
```

---

## Search Worker [Phase 2]

A web worker that offloads both find and fix operations off the main thread.

**Planned message protocol:**

| Direction | Type | Key Fields |
|-----------|------|------------|
| In | Find | `id`, `files`, `options?` |
| In | Fix | `id`, `files`, `options?`, `fixRule`, `fixType` |
| Out | Find result | `id`, `results: Issue[]` |
| Out | Fix result | `id`, `patch: FixPatch[]`, `fixRule`, `fixType` |

Presence of `fixRule` field in the inbound message discriminates fix vs find operations.

**Planned search query types** (not yet implemented):
- `freeform` — full-text search across all names and values
- `component` — component name search with usage tracking
- `formula` — formula name search with reference tracking
- `action` — action name search with reference tracking

---

## Cross-references

- Formula evaluation: `07-formula-system.md`
- Standard library action/formula names: `12-standard-library.md`
- Error handling in rules: `14-error-handling.md`
