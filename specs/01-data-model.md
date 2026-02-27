# Layr Data Model

Covers the complete JSON data model for a Layr project — the single file that represents an entire application. Implemented in `packages/types/src/` (types) and `packages/core/src/component/schemas/` (Zod validation).

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| Project envelope (id, project, commit, files) | MVP |
| Component + page data model | MVP |
| Node models (element, text, component, slot) | MVP |
| Formula AST (all operation types) | MVP |
| Action models (all types) | MVP |
| Route declarations (static + dynamic) | MVP |
| Zod validation schemas | MVP |
| API service definitions | MVP |
| Custom routes (redirect/rewrite) | MVP |
| Theme V2 (design tokens) | MVP |
| Package dependency system | MVP |
| Theme V1 (legacy, read-only support) | MVP |
| Limit enforcement | MVP |
| Circular dependency detection | MVP |

---

## Top-Level Envelope

A project is a single JSON file with four root fields.

```typescript
// packages/types/src/project.ts
interface Project {
  id?: string            // UUID — snapshot identifier
  project: ToddleProject // Metadata
  commit: string         // SHA-256 hash of canonical JSON
  files: ProjectFiles    // All functional assets
}
```

### ToddleProject

```typescript
interface ToddleProject {
  id: string                          // UUID
  name: string                        // Human-readable name
  short_id: string                    // URL-safe slug (lowercase, underscores)
  type: 'app' | 'package'
  description?: string
  emoji?: string | null
  thumbnail?: { path: string } | null
}
```

| Rule | Detail |
|------|--------|
| `short_id` | Unique within deployment; used as custom element prefix and code module namespace |
| `type: 'app'` | Has routable pages; can be served |
| `type: 'package'` | Exports components/formulas/actions; no routable pages |

### ProjectFiles

```typescript
interface ProjectFiles {
  components: Partial<Record<string, Component>>   // Key = component name
  packages?: Partial<Record<string, InstalledPackage>>
  actions?: Record<string, PluginAction>
  formulas?: Record<string, PluginFormula>
  routes?: Record<string, CustomRoute>
  config?: ProjectConfig
  themes?: Record<string, Theme>
  services?: Record<string, ApiService>
}
```

`Partial<Record>` on `components` and `packages` supports lazy loading — values may be `undefined` while loading.

---

## Component

The core data unit. Both pages and reusable components share the same type; a page adds a `route` field.

```typescript
// packages/types/src/component.ts
interface Component {
  name: string
  route?: PageRoute                              // Present only on pages
  attributes?: Record<string, ComponentAttribute>
  variables?: Record<string, ComponentVariable>
  formulas?: Record<string, ComponentFormula>
  contexts?: Record<string, ComponentContext>
  workflows?: Record<string, ComponentWorkflow>
  apis?: Record<string, ComponentAPI>
  nodes: Record<string, NodeModel>               // Must include key 'root'
  events?: ComponentEvent[]
  onLoad?: EventModel
  onAttributeChange?: EventModel
  exported?: boolean                             // Package export flag
  customElement?: { enabled?: Formula }          // Web Component mode [Phase 2]
}
```

### Sub-types

```typescript
interface ComponentAttribute {
  name: string
  testValue?: unknown   // Used in editor preview
}

interface ComponentVariable {
  initialValue: Formula  // Evaluated at mount
}

interface ComponentFormula {
  name: string
  arguments?: Array<{ name: string; testValue?: unknown }>
  memoize?: boolean
  exposeInContext?: boolean   // Makes value available to descendants
  formula: Formula
}

interface ComponentWorkflow {
  name: string
  parameters: Array<{ name: string; testValue?: unknown }>
  callbacks?: Array<{ name: string; testValue?: unknown }>
  actions: ActionModel[]
  exposeInContext?: boolean   // Makes callable by descendants
}

interface ComponentContext {
  formulas: string[]          // Formula names to consume from provider
  workflows: string[]         // Workflow names callable from provider
  componentName?: string      // Provider component name
  package?: string            // Provider package
}

interface ComponentEvent {
  name: string
  testValue?: unknown
}

interface EventModel {
  actions: ActionModel[]
}
```

---

## Node Models

All UI structure is a flat dictionary of nodes. `children` arrays reference node IDs. Every component's `nodes` record **must** contain key `'root'`.

```typescript
// packages/types/src/node.ts
type NodeModel =
  | ElementNodeModel
  | TextNodeModel
  | ComponentNodeModel
  | SlotNodeModel

interface NodeBase {
  id?: string
  type: 'element' | 'text' | 'component' | 'slot'
  condition?: Formula
  repeat?: Formula
  repeatKey?: Formula
  slot?: string     // Target slot name in parent component
}
```

### ElementNodeModel

```typescript
interface ElementNodeModel extends NodeBase {
  type: 'element'
  tag: string
  attrs?: Record<string, Formula>
  style?: Record<string, string>             // Base CSS
  variants?: StyleVariant[]
  animations?: Record<string, Record<string, AnimationKeyframe>>
  children: string[]
  events?: Record<string, EventModel>
  classes?: Record<string, { formula?: Formula }>
  customProperties?: Record<string, CustomProperty>
}
```

### TextNodeModel

```typescript
interface TextNodeModel extends NodeBase {
  type: 'text'
  value: Formula        // Evaluates to string
  children?: never
}
```

### ComponentNodeModel

```typescript
interface ComponentNodeModel extends NodeBase {
  type: 'component'
  name: string          // Component name
  package?: string      // Package namespace; null = local
  path?: string
  attrs: Record<string, Formula>     // Attribute bindings
  children: string[]                 // Slotted child IDs
  events?: Record<string, EventModel>
  style?: Record<string, string>
  variants?: StyleVariant[]
  customProperties?: Record<string, CustomProperty>
}
```

### SlotNodeModel

```typescript
interface SlotNodeModel extends NodeBase {
  type: 'slot'
  name?: string         // Slot name; undefined resolves to 'default'
  children: string[]    // Fallback content IDs
  repeat?: never        // Slots cannot be repeated
  repeatKey?: never
}
```

### StyleVariant

```typescript
interface StyleVariant {
  id?: string
  className?: string
  hover?: boolean
  active?: boolean
  focus?: boolean
  focusWithin?: boolean
  disabled?: boolean
  checked?: boolean
  empty?: boolean
  firstChild?: boolean
  lastChild?: boolean
  evenChild?: boolean
  oddChild?: boolean
  autofill?: boolean
  startingStyle?: boolean
  pseudoElement?: string
  mediaQuery?: MediaQuery
  breakpoint?: 'small' | 'medium' | 'large'
  style?: Record<string, string>
  customProperties?: Record<string, CustomProperty>
}

interface MediaQuery {
  'min-width'?: string
  'max-width'?: string
  'min-height'?: string
  'max-height'?: string
  'prefers-reduced-motion'?: 'reduce' | 'no-preference'
}

interface AnimationKeyframe {
  position: number   // 0–1
  key: string        // CSS property
  value: string      // CSS value
}

interface CustomProperty {
  formula: Formula
  unit?: string      // e.g. 'px', 'rem'
}
```

---

## Formula AST

Formulas are a recursive discriminated union. All formula expressions are built by composing these operation types.

```typescript
// packages/types/src/formula.ts
type Formula =
  | ValueOperation
  | PathOperation
  | FunctionOperation
  | ObjectOperation
  | ArrayOperation
  | SwitchOperation
  | OrOperation
  | AndOperation
  | ApplyOperation
  | RecordOperation    // Deprecated — use ObjectOperation
```

### Operation Types

| Type | Discriminator | Key Fields | Description |
|------|--------------|------------|-------------|
| `ValueOperation` | `type: 'value'` | `value: string \| number \| boolean \| null \| object` | Literal value |
| `PathOperation` | `type: 'path'` | `path: string[]` | Data path lookup in `ComponentData` |
| `FunctionOperation` | `type: 'function'` | `name`, `package?`, `arguments`, `variableArguments?`, `display_name?` | Call built-in or project formula |
| `ObjectOperation` | `type: 'object'` | `arguments?: FunctionArgument[]` | Object literal (named entries) |
| `ArrayOperation` | `type: 'array'` | `arguments: { formula }[]` | Array literal |
| `SwitchOperation` | `type: 'switch'` | `cases: { condition, formula }[]`, `default: Formula` | Conditional branching |
| `OrOperation` | `type: 'or'` | `arguments: { formula }[]` | Logical OR |
| `AndOperation` | `type: 'and'` | `arguments: { formula }[]` | Logical AND |
| `ApplyOperation` | `type: 'apply'` | `name: string`, `arguments` | Call a formula defined in same component |
| `RecordOperation` | `type: 'record'` | `arguments?` | **Deprecated** — same as object |

```typescript
interface FunctionArgument {
  name?: string
  formula: Formula
  isFunction?: boolean   // true for higher-order args (map, filter)
}
```

**Built-in naming convention:** `name` starts with `@toddle/` for built-in formulas (e.g. `@toddle/concatenate`).

---

## Action Models

Actions are executed sequentially. `Switch` and `Fetch` actions can contain nested action arrays.

```typescript
// packages/types/src/action.ts
type ActionModel =
  | SetVariableAction
  | TriggerEventAction
  | SwitchAction
  | FetchAction
  | AbortFetchAction
  | CustomAction
  | SetURLParameterAction    // Deprecated — use SetURLParameters
  | SetURLParametersAction
  | TriggerWorkflowAction
  | WorkflowCallbackAction
```

### Action Types

```typescript
interface SetVariableAction {
  type: 'SetVariable'
  name: string       // Variable name
  data?: Formula
}

interface TriggerEventAction {
  type: 'TriggerEvent'
  name: string       // Event name
  data?: Formula
}

interface SwitchAction {
  type: 'Switch'
  data?: Formula
  cases: Array<{ condition: Formula; actions: ActionModel[] }>
  default?: { actions: ActionModel[] }
}

interface FetchAction {
  type: 'Fetch'
  name: string       // API name in component.apis
  inputs?: Array<{ name: string; formula?: Formula }>
  onSuccess?: { actions: ActionModel[] }
  onError?: { actions: ActionModel[] }
  onMessage?: { actions: ActionModel[] }
}

interface AbortFetchAction {
  type: 'AbortFetch'
  name: string       // API name to abort
}

interface CustomAction {
  type?: 'Custom'    // undefined for legacy custom actions
  name: string
  package?: string
  version?: 2
  arguments?: Array<{ name: string; formula: Formula }>
  data?: Formula
  events?: Record<string, { actions: ActionModel[]; dummyEvent?: unknown }>
}

interface SetURLParameterAction {
  type: 'SetURLParameter'    // Deprecated
  name: string
  data?: Formula
  historyMode?: 'push' | 'replace'
}

interface SetURLParametersAction {
  type: 'SetURLParameters'
  parameters: Array<{ name: string; formula: Formula }>
  historyMode?: 'push' | 'replace'
}

interface TriggerWorkflowAction {
  type: 'TriggerWorkflow'
  name: string
  parameters?: Array<{ name: string; formula?: Formula }>
  callbacks?: Record<string, { actions: ActionModel[] }>
  componentName?: string    // Context provider component
  package?: string
}

interface WorkflowCallbackAction {
  type: 'TriggerWorkflowCallback'
  name: string
  data?: Formula
}
```

---

## Routes

### PageRoute (on Component)

```typescript
// packages/types/src/route.ts
interface PageRoute {
  path: string
  query?: Record<string, RouteQueryParam>
  title?: string
  description?: string
  info?: RouteInfo
}

interface RouteInfo {
  title?: { formula: Formula }
  description?: { formula: Formula }
  language?: { formula: Formula }
  icon?: { formula: Formula }
  charset?: { formula: Formula }
  meta?: Array<{
    tag: 'meta' | 'link' | 'script' | 'noscript' | 'style'
    attrs?: Record<string, Formula>
    content?: Formula
  }>
}

interface RouteQueryParam {
  attribute: string
  default?: Formula
}
```

### Custom Routes (in ProjectFiles)

```typescript
interface CustomRoute {
  name: string
  type: 'redirect' | 'rewrite'
  source: RouteSource
  destination: RouteDestination
  status?: number        // HTTP status code for redirects (default 302)
  enabled?: Formula
}

interface RouteSource {
  type: 'path' | 'pattern'
  value: string
}

interface RouteDestination {
  type: 'url' | 'page'
  url?: Formula
  path?: Formula[]
  queryParams?: Record<string, { formula: Formula; enabled?: Formula }>
  hash?: Formula
}
```

---

## ComponentAPI

```typescript
// packages/types/src/component.ts
interface ComponentAPI {
  name: string
  type: 'v1' | 'v2'

  // V2 fields
  method?: Formula
  url?: Formula
  headers?: Record<string, { formula: Formula; enabled?: Formula }>
  queryParams?: Record<string, { formula: Formula; enabled?: Formula }>
  body?: Formula
  timeout?: Formula
  credentials?: Formula
  parserMode?: Formula
  isError?: Formula

  // Common
  autoFetch?: Formula
  server?: { ssr?: { enabled: Formula } }
  client?: {
    onCompleted?: EventModel
    onFailed?: EventModel
    onMessage?: EventModel
  }

  // V1 fields (legacy)
  path?: Formula
  searchParams?: Array<{ name: string; value: Formula }>
  throttle?: number
  debounce?: number
}
```

---

## ApiService (in ProjectFiles)

```typescript
// packages/types/src/project.ts
interface ApiService {
  name: string
  type: 'supabase' | 'xano' | 'custom'
  baseUrl?: Formula
  docsUrl?: Formula
  apiKey?: Formula
  meta?: Record<string, unknown>   // type-specific metadata
}
```

---

## InstalledPackage

```typescript
interface InstalledPackage {
  manifest: PackageManifest
  components: Partial<Record<string, Component>>
  actions?: Record<string, PluginAction>
  formulas?: Record<string, PluginFormula>
}

interface PackageManifest {
  name: string      // Package namespace (e.g. 'best_like_button')
  commit: string    // SHA hash — version lock
}

interface PluginAction {
  name: string
  action: ActionModel
}

interface PluginFormula {
  name: string
  formula: Formula
}
```

**Component resolution order:**
1. Local project: `files.components[name]`
2. Installed packages: `files.packages[packageName].components[name]`
3. Standard library: built-in via `@toddle/` prefix

**Reference format:** `packageName/componentName` (e.g. `best_like_button/best-like-button`)

---

## ProjectConfig

```typescript
interface ProjectConfig {
  runtimeVersion?: string
  meta?: ProjectMeta
  theme?: ProjectThemeConfig
}

interface ProjectMeta {
  icon?: { formula: Formula } | null
  robots?: { formula: Formula } | null
  sitemap?: { formula: Formula } | null
  manifest?: { formula: Formula } | null
  serviceWorker?: { formula: Formula } | null
}
```

---

## Theme (V2)

See `21-themes.md` for full theme rendering. Storage type:

```typescript
// packages/types/src/theme.ts
interface Theme {
  name: string
  isDefault?: boolean
  propertyDefinitions: Record<string, ThemePropertyDefinition>
}

interface ThemePropertyDefinition {
  type: 'color' | 'string' | 'number'
  value: string
  description?: string
}

interface ThemeDefinition {
  id: string
  displayName: string
  description: string
  default: string
  defaultDark?: string
  defaultLight?: string
  themes: Record<string, Theme>
}

interface ProjectThemeConfig {
  themeId: string
  activeVariant: 'light' | 'dark' | string
  followSystem?: boolean
}
```

---

## Zod Schemas

All schemas live in `packages/types/src/schemas.ts`. TypeScript types must match schemas — `z.ZodType<T>` enforces compile-time alignment.

### FormulaSchema (excerpt)

```typescript
// packages/types/src/schemas.ts
export const FormulaSchema: z.ZodType<Formula> = z.union([
  ValueOperationSchema,    // { type: 'value', value: string|number|boolean|null|object }
  PathOperationSchema,     // { type: 'path', path: string[] }
  FunctionOperationSchema, // { type: 'function', name, package?, arguments, ... }
  ApplyOperationSchema,    // { type: 'apply', name, arguments? }
  ArrayOperationSchema,    // { type: 'array', arguments: { formula }[] }
  ObjectOperationSchema,   // { type: 'object', arguments?: { name?, formula }[] }
  RecordOperationSchema,   // { type: 'record', ... } — deprecated
  OrOperationSchema,       // { type: 'or', arguments: { formula }[] }
  AndOperationSchema,      // { type: 'and', arguments: { formula }[] }
  SwitchOperationSchema,   // { type: 'switch', cases: { condition, formula }[], default }
])
// Uses z.lazy() for self-referential arguments
```

### ActionModelSchema (excerpt)

```typescript
export const ActionModelSchema: z.ZodType<ActionModel> = z.union([
  VariableActionModelSchema,      // SetVariable
  EventActionModelSchema,         // TriggerEvent
  SwitchActionModelSchema,        // Switch (recursive via z.lazy)
  FetchActionModelSchema,         // Fetch (recursive callbacks)
  CustomActionModelSchema,        // Custom / undefined type
  SetURLParameterActionSchema,    // SetURLParameter (deprecated)
  SetURLParametersActionSchema,   // SetURLParameters
  TriggerWorkflowActionSchema,    // TriggerWorkflow (recursive callbacks)
  WorkflowCallbackActionSchema,   // TriggerWorkflowCallback
  AbortFetchActionSchema,         // AbortFetch
])
// All nested action arrays use z.lazy(() => z.array(ActionModelSchema))
```

### NodeModelSchema

```typescript
export const NodeModelSchema: z.ZodType = z.union([
  TextNodeModelSchema,       // type: 'text', value: FormulaSchema
  SlotNodeModelSchema,       // type: 'slot', name?, children: string[]
  ElementNodeModelSchema,    // type: 'element', tag, attrs, style, children, events, variants...
  ComponentNodeModelSchema,  // type: 'component', name, package?, attrs, children, events...
])
```

### ComponentSchema / PageSchema

```typescript
export const ComponentSchema = z.object({
  name: z.string(),
  exported: z.boolean().optional(),
  attributes: z.record(ComponentAttributeSchema).optional(),
  variables: z.record(ComponentVariableSchema).optional(),
  formulas: z.record(ComponentFormulaSchema).optional(),
  workflows: z.record(ComponentWorkflowSchema).optional(),
  contexts: z.record(ComponentContextSchema).optional(),
  apis: z.record(z.unknown()).optional(),
  nodes: z.record(NodeModelSchema),
  events: z.array(ComponentEventSchema).optional(),
  onLoad: z.object({ trigger: z.literal('Load'), actions: z.array(ActionModelSchema) }).optional(),
  onAttributeChange: z.object({ trigger: z.literal('Attribute change'), actions: z.array(ActionModelSchema) }).optional(),
  customElement: z.object({ enabled: FormulaSchema.optional() }).optional(),
})

export const PageSchema = ComponentSchema.extend({
  route: RouteDeclarationSchema,
  attributes: z.record(z.unknown()).optional().default({}),
})
```

### Shallow Schemas (performance)

```typescript
// Replace all nested schemas with z.any() for top-level-only validation
export const ShallowComponentSchema = z.object({
  name: z.string(),
  exported: z.boolean().optional(),
  attributes: z.any().optional(),
  variables: z.any().optional(),
  formulas: z.any().optional(),
  workflows: z.any().optional(),
  contexts: z.any().optional(),
  apis: z.any().optional(),
  nodes: z.any(),
  events: z.any().optional(),
  onLoad: z.any().optional(),
  onAttributeChange: z.any().optional(),
  customElement: z.any().optional(),
})

export const ShallowPageSchema = ShallowComponentSchema.extend({
  route: z.any(),
  attributes: z.any().optional(),
})
```

### Metadata Schema

```typescript
export const MetadataSchema = z.object({
  comments: z.record(z.object({ index: z.number(), text: z.string() })).optional(),
}).optional()
// Attached via '@layr/metadata' key on any entity
```

---

## Validation Functions

```typescript
// packages/types/src/schemas.ts
validateComponent(data: unknown): ValidationResult
validatePage(data: unknown): ValidationResult
validateFormula(data: unknown): ValidationResult
validateAction(data: unknown): ValidationResult
validateNode(data: unknown): ValidationResult

interface ValidationResult {
  success: boolean
  errors: Array<{
    path: string[]
    message: string
    expected?: string
    received?: string
  }>
}
```

---

## ComponentData (Runtime State)

The reactive data context available to all formulas within a component.

```typescript
// packages/types/src/signal.ts
interface ComponentData {
  Location?: LocationState | null    // Pages only
  Attributes: Record<string, unknown>
  Variables?: Record<string, unknown>
  Contexts?: Record<string, Record<string, unknown>>
  Apis?: Record<string, ApiStatus>
  Args?: unknown                     // Inside formula functions
  Parameters?: Record<string, unknown>  // Inside workflows
  Event?: unknown                    // Inside event handlers
  ListItem?: ListItemContext | null   // Inside repeat
  Page?: { Theme: string | null }    // Pages only
}

interface ListItemContext {
  Item: unknown
  Index: number
  Key: string
  Parent?: ListItemContext | null
}
```

### Path Expression Examples

| Path | Resolves To |
|------|-------------|
| `['Attributes', 'title']` | Input attribute named `title` |
| `['Variables', 'count']` | Variable named `count` |
| `['Apis', 'fetchUsers', 'data']` | API response data |
| `['Contexts', 'AuthProvider', 'user']` | Context provider formula value |
| `['ListItem', 'Item']` | Current repeat item |
| `['Location', 'params', 'id']` | URL path parameter |

---

## ApiStatus (Runtime)

```typescript
// packages/types/src/api.ts
interface ApiStatus<T = unknown> {
  data: T | null
  isLoading: boolean
  error: unknown | null
  response?: ApiResponse
}

interface ApiResponse {
  headers: Record<string, string>
  status: number
  statusText: string
  performance?: {
    requestStart?: number
    responseStart?: number
    responseEnd?: number
  }
}
```

---

## Signal Interface

```typescript
// packages/types/src/signal.ts
interface Signal<T> {
  get(): T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(notify: (value: T) => void, config?: { destroy?: () => void }): () => void
  destroy(): void
  map<T2>(fn: (value: T) => T2): Signal<T2>
}
```

`set()` uses deep equality (`fast-deep-equal`) to skip redundant updates. `map()` creates parent→child dependency: destroying parent destroys derived signal.

---

## System Limits

### Project Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxComponents` | 1,000 | Components in `files.components` |
| `maxPackages` | 50 | Installed packages |
| `maxProjectFormulas` | 200 | Project-level custom formulas |
| `maxProjectActions` | 100 | Project-level custom actions |
| `maxRoutes` | 100 | Custom route definitions |
| `maxThemes` | 20 | Named theme definitions |
| `maxServices` | 20 | API service definitions |
| `maxProjectFileSize` | 50 MB | Total project JSON size |

### Component Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxNodes` | 10,000 | Nodes per component |
| `maxAttributes` | 50 | Attribute definitions |
| `maxVariables` | 50 | Variable definitions |
| `maxFormulas` | 100 | Formula definitions |
| `maxApis` | 30 | API definitions |
| `maxWorkflows` | 30 | Workflow definitions |
| `maxEvents` | 20 | Declared events |
| `maxContexts` | 10 | Context subscriptions |
| `maxNodeChildren` | 500 | Children per node |
| `maxVariants` | 50 | Style variants per node |

### Nesting Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxComponentDepth` | 50 | Parent→child nesting |
| `maxFormulaDepth` | 256 | Formula AST depth |
| `maxActionDepth` | 100 | Nested action execution depth |
| `maxPackageDepth` | 10 | Package dependency chain depth |

---

## Structural Invariants

| ID | Invariant | Violation Behavior |
|----|-----------|-------------------|
| I-ROOT | `nodes` must contain key `'root'` | Build error |
| I-NODE-ID | Node IDs unique within component | Build error |
| I-COMPONENT-KEY | `files.components[key]` key matches `component.name` | Build error |
| I-NO-DANGLING | Every `children` entry resolves to existing node ID | Build error |
| I-COMPONENT-REF | Every `ComponentNodeModel.name` resolves to existing component | Runtime warn, skip |
| I-FORMULA-REF | Every `apply` references a formula in `component.formulas` | Runtime warn, null |
| I-WORKFLOW-REF | Every `TriggerWorkflow` resolves a workflow | Runtime warn, skip |
| I-API-REF | Every `Fetch` action references an API in `component.apis` | Runtime error, skip |
| I-NO-CYCLE-PACKAGE | Package dependency graph is acyclic | Build error |
| I-NO-CYCLE-COMPONENT | No direct self-reference in component node tree | Build + runtime error |
| I-ROUTE-UNIQUE | No two pages have identical route patterns | Build warn, first wins |
| I-SLOT-NO-REPEAT | `SlotNodeModel.repeat` must be `never` | Schema error |

---

## Cross-References

| Spec | Relationship |
|------|-------------|
| `02-component-system.md` | Component rendering, slots, context, traversal |
| `03-formula-system.md` | Formula evaluation engine |
| `04-action-system.md` | Action execution engine |
| `05-signal-system.md` | Signal implementation |
| `06-rendering.md` | SSR + CSR rendering pipeline |
| `09-route-matching.md` | URL matching against `RouteDeclaration` |
| `10-api-system.md` | API request execution from `ComponentAPI` |
| `20-styling-engine.md` | CSS generation from node styles and variants |
| `21-themes.md` | Theme rendering from `files.themes` |
| `32-backend-server.md` | Project JSON persistence and serving |
| `33-packages-and-plugins.md` | Package resolution and `InstalledPackage` lifecycle |
