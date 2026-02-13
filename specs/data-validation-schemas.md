# Data Validation & Schema System Specification

## Purpose

The Data Validation & Schema System provides runtime type validation for all Layr data models using Zod schemas. It serves as the single source of truth for the shape and constraints of every entity in the system — components, pages, nodes, formulas, actions, APIs, routes, workflows, variables, attributes, contexts, and events. The schemas are consumed by the editor (for AI-assisted editing and structured output), by import/export pipelines, and by any tooling that reads or writes Layr project files.

### Jobs to Be Done

- Validate that component/page JSON files conform to the expected structure before processing
- Provide rich, human-readable descriptions on every field to support AI-assisted editing and documentation generation
- Define discriminated unions that map 1:1 with the TypeScript type system (`NodeModel`, `Formula`, `ActionModel`)
- Support two validation depths: full (deep recursive) and shallow (top-level only, `z.any()` for nested fields) for performance-sensitive paths
- Centralize schema descriptions so field documentation is consistent across all consumers

---

## Architecture

### File Layout

All schemas reside in `packages/core/src/component/schemas/`:

| File | Exports | Validates |
|------|---------|-----------|
| `zod-schemas.ts` | `SCHEMA_DESCRIPTIONS`, `MetadataSchema` | Shared description strings and base metadata |
| `component-schema.ts` | `ComponentSchema`, `PageSchema`, `ShallowComponentSchema`, `ShallowPageSchema` | Top-level component and page definitions |
| `node-schema.ts` | `NodeModelSchema` | All node types (element, text, slot, component) |
| `formula-schema.ts` | `FormulaSchema`, `ComponentFormulaSchema` | Formula AST and component-level formula definitions |
| `action-schema.ts` | `ActionModelSchema` | All action types (variable, event, switch, fetch, custom, URL, workflow) |
| `event-schema.ts` | `EventModelSchema`, `ComponentEventSchema` | Event triggers with action lists, component event declarations |
| `api-schema.ts` | `ComponentAPISchema` | API request definitions (v2 and legacy v1) |
| `route-schema.ts` | `RouteSchema` | Route path segments, query parameters, SEO metadata |
| `workflow-schema.ts` | `ComponentWorkflowSchema` | Workflow definitions with parameters and actions |
| `variable-schema.ts` | `ComponentVariableSchema` | Variable definitions with initial value formulas |
| `attribute-schema.ts` | `ComponentAttributeSchema` | Component attribute definitions with test values |
| `context-schema.ts` | `ComponentContextSchema` | Context subscriptions (formulas and workflows from ancestors) |

### Dependency Graph

```
zod-schemas.ts (base descriptions + MetadataSchema)
  ├── formula-schema.ts (FormulaSchema — self-referential via z.lazy)
  │     ├── node-schema.ts (uses FormulaSchema for conditions, repeats, attrs)
  │     ├── action-schema.ts (uses FormulaSchema for data, conditions)
  │     ├── event-schema.ts (uses ActionModelSchema)
  │     ├── api-schema.ts (uses FormulaSchema, EventModelSchema)
  │     ├── route-schema.ts (uses FormulaSchema for SEO fields)
  │     ├── variable-schema.ts (uses FormulaSchema for initial values)
  │     └── workflow-schema.ts (uses ActionModelSchema)
  ├── attribute-schema.ts (standalone, uses MetadataSchema)
  └── context-schema.ts (standalone)
        │
        └── component-schema.ts (composes all of the above)
```

---

## Data Models

### MetadataSchema

Base metadata attached to any entity via the `@layr/metadata` key.

| Field | Type | Description |
|-------|------|-------------|
| `comments` | `Record<string, { index: number, text: string }>?` | Indexed comments attached to the entity |

### SCHEMA_DESCRIPTIONS

A centralized object of description factory functions. Each function accepts a `type` parameter (e.g. `"component"`, `"page"`, `"element node"`) and returns a context-specific description string. Keys include:

| Key | Signature | Purpose |
|-----|-----------|---------|
| `animations` | `(type: string) => string` | Animations defined on a node |
| `animationKey` | `string` | Unique key identifying an animation |
| `animationKeyframeKey` | `string` | Unique key identifying a keyframe |
| `apis` | `(type: string) => string` | API definitions in a component/page |
| `children` | `string` | List of child node IDs |
| `condition` | `(type: string) => string` | Conditional rendering formula |
| `formulas` | `(type: string) => string` | Formula definitions |
| `metadata` | `(type: string) => string` | Metadata for any entity |
| `onAttributeChange` | `(type: string) => string` | Lifecycle event on attribute change |
| `onLoad` | `(type: string) => string` | Lifecycle event on load |
| `repeat` | `(type: string) => string` | Repeat formula for list rendering |
| `repeatKey` | `(type: string) => string` | Unique key formula for repeated items |
| `slot` | `(type: string) => string` | Slot name for component composition |
| `style` | `(type: string) => string` | Default style for a node |
| `testData` | `(type: string) => string` | Test/preview data |
| `variables` | `(type: string) => string` | Variable definitions |
| `variants` | `(type: string) => string` | Style variants (hover, media query, etc.) |
| `workflows` | `(type: string) => string` | Workflow definitions |

---

## Schema Specifications

### FormulaSchema

A recursive discriminated union representing the formula AST. Uses `z.lazy()` for self-referential types.

**Operation Types (discriminated on `type`):**

| Type | Schema | Description |
|------|--------|-------------|
| `value` | `ValueOperationSchema` | Literal value: `string \| number \| boolean \| null \| {}` |
| `path` | `PathOperationSchema` | Data path lookup: `string[]` segments into the component data context |
| `array` | `ArrayOperationSchema` | Array literal: list of `{ formula }` elements |
| `object` | `ObjectOperationSchema` | Object literal: list of named `{ name, formula }` entries |
| `record` | `RecordOperationSchema` | **Deprecated** — use object operation instead |
| `and` | `AndOperationSchema` | Logical AND: all formulas must be truthy |
| `or` | `OrOperationSchema` | Logical OR: at least one formula must be truthy |
| `switch` | `SwitchOperationSchema` | Branching: cases array (currently max length 1) with conditions and a default |
| `function` | `ProjectFunctionOperationSchema` | Call to a user-defined project formula by key |
| `function` | `BuiltInFunctionOperationSchema` | Call to a built-in formula (prefixed `@toddle/`). Includes `display_name` and `variableArguments` |
| `apply` | `ApplyOperationSchema` | Call to another formula defined in the same component |

**Shared Sub-schemas:**

- `FunctionArgument`: `{ name: string, formula: Formula, isFunction?: boolean }` — Argument to a formula. `isFunction` is true for higher-order arguments (e.g. in `map`, `filter`).

**All operation types** support an optional `@layr/metadata` field for comments.

### NodeModelSchema

A discriminated union on `type` with four variants:

#### TextNodeModel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'text'` | Yes | Discriminator |
| `value` | `Formula` | Yes | Text content formula |
| `condition` | `Formula?` | No | Conditional rendering |
| `repeat` | `Formula?` | No | List rendering |
| `repeatKey` | `Formula?` | No | Unique key for repeated items |
| `slot` | `string?` | No | Target slot name |

#### SlotNodeModel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'slot'` | Yes | Discriminator |
| `children` | `string[]` | Yes | Default child node IDs |
| `name` | `string?` | No | Named slot identifier |
| `condition` | `Formula?` | No | Conditional rendering |
| `slot` | `string?` | No | Target slot name |

#### ElementNodeModel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'element'` | Yes | Discriminator |
| `tag` | `string` | Yes | HTML tag (e.g. `div`, `img`) |
| `attrs` | `Record<string, Formula>` | Yes | HTML attributes as formulas |
| `style` | `Record<string, string>` | Yes | Default CSS styles |
| `children` | `string[]` | Yes | Child node IDs |
| `events` | `Record<string, EventModel>` | Yes | Event handlers |
| `classes` | `Record<string, { formula? }>` | Yes | Conditional CSS classes |
| `customProperties` | `Record<CustomPropertyName, CustomProperty>?` | No | Custom CSS properties |
| `condition` | `Formula?` | No | Conditional rendering |
| `repeat` | `Formula?` | No | List rendering |
| `repeatKey` | `Formula?` | No | Unique key for repeated items |
| `slot` | `string?` | No | Target slot name |
| `variants` | `StyleVariant[]?` | No | Style variants (hover, focus, media queries) |
| `animations` | `Record<string, Record<string, AnimationKeyframe>>?` | No | Keyframe animations |

#### ComponentNodeModel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'component'` | Yes | Discriminator |
| `name` | `string` | Yes | Referenced component name |
| `package` | `string?` | No | Package name (null = local) |
| `attrs` | `Record<string, Formula>` | Yes | Attribute values as formulas |
| `children` | `string[]` | Yes | Child node IDs (for slots) |
| `events` | `Record<string, EventModel>` | Yes | Custom event handlers |
| `style` | `Record<string, string>?` | No | Override styles |
| `condition` | `Formula?` | No | Conditional rendering |
| `repeat` | `Formula?` | No | List rendering |
| `repeatKey` | `Formula?` | No | Unique key for repeated items |
| `slot` | `string?` | No | Target slot name |
| `variants` | `StyleVariant[]?` | No | Style variants |
| `animations` | `Record<string, Record<string, AnimationKeyframe>>?` | No | Keyframe animations |

### ActionModelSchema

A discriminated union on `type` with these variants:

| Type | Schema | Description |
|------|--------|-------------|
| `SetVariable` | `VariableActionModelSchema` | Set a component variable to a formula result |
| `TriggerEvent` | `EventActionModelSchema` | Emit a custom event with data |
| `Switch` | `SwitchActionModelSchema` | Conditional branching: first matching case executes |
| `Fetch` | `FetchActionModelSchema` | Trigger an API fetch with optional input overrides and success/error/message callbacks |
| `Custom` (or undefined) | `CustomActionModelSchema` | User-defined or package action with named arguments and events |
| (built-in) | `BuiltInActionModelSchema` | System action (prefixed `@toddle/`) with label and events |
| `SetURLParameter` | `SetURLParameterActionSchema` | **Deprecated** — set a single URL parameter |
| `SetURLParameters` | `SetMultiUrlParameterActionSchema` | Set multiple URL parameters with history mode control |
| `TriggerWorkflow` | `WorkflowActionModelSchema` | Execute a workflow with parameters, optionally from a context provider |

### ComponentSchema / PageSchema

Top-level component and page schemas that compose all sub-schemas.

**Common fields (shared between component and page):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Component/page identifier |
| `exported` | `boolean?` | No | Whether exported in a package |
| `nodes` | `Record<string, NodeModel>?` | No | All nodes indexed by ID (must include `'root'`) |
| `variables` | `Record<string, ComponentVariable>?` | No | Reactive state |
| `formulas` | `Record<string, ComponentFormula>?` | No | Computed values |
| `workflows` | `Record<string, ComponentWorkflow>?` | No | Reusable action sequences |
| `apis` | `Record<string, ComponentAPI>?` | No | HTTP API definitions |
| `events` | `ComponentEvent[]?` | No | Declared emittable events |
| `contexts` | `Record<string, ComponentContext>?` | No | Context subscriptions |
| `onLoad` | `{ trigger: 'Load', actions: ActionModel[] }?` | No | Mount lifecycle |
| `onAttributeChange` | `{ trigger: 'Attribute change', actions: ActionModel[] }?` | No | Attribute change lifecycle |

**Component-specific:**

| Field | Type | Description |
|-------|------|-------------|
| `attributes` | `Record<string, ComponentAttribute>?` | Input props with test values |

**Page-specific:**

| Field | Type | Description |
|-------|------|-------------|
| `attributes` | `{}?` | Always empty for pages |
| `route` | `RouteDeclaration` | Required route definition with path, query, and SEO info |

### StyleVariant

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `style` | `Record<string, string>` | Yes | CSS properties |
| `id` | `string?` | No | Variant identifier |
| `className` | `string?` | No | Class-based variant trigger |
| `hover` | `boolean?` | No | `:hover` pseudo-class |
| `active` | `boolean?` | No | `:active` pseudo-class |
| `focus` | `boolean?` | No | `:focus` pseudo-class |
| `focusWithin` | `boolean?` | No | `:focus-within` pseudo-class |
| `disabled` | `boolean?` | No | `:disabled` pseudo-class |
| `empty` | `boolean?` | No | `:empty` pseudo-class |
| `firstChild` | `boolean?` | No | `:first-child` pseudo-class |
| `lastChild` | `boolean?` | No | `:last-child` pseudo-class |
| `evenChild` | `boolean?` | No | `:nth-child(even)` pseudo-class |
| `startingStyle` | `boolean?` | No | `@starting-style` rule |
| `mediaQuery` | `MediaQuery?` | No | Responsive breakpoint conditions |

### MediaQuery

| Field | Type | Description |
|-------|------|-------------|
| `min-width` | `string?` | Minimum viewport width |
| `max-width` | `string?` | Maximum viewport width |
| `min-height` | `string?` | Minimum viewport height |
| `max-height` | `string?` | Maximum viewport height |
| `prefers-reduced-motion` | `'reduce' \| 'no-preference'?` | Motion preference |

### AnimationKeyframe

| Field | Type | Description |
|-------|------|-------------|
| `position` | `number` | 0–1 position in animation timeline |
| `key` | `string` | CSS property being animated |
| `value` | `string` | CSS property value at this keyframe |

### CustomProperty (Design Token)

| Field | Type | Description |
|-------|------|-------------|
| `formula` | `Formula` | Value formula |
| `unit` | `string?` | CSS unit (e.g. `px`, `rem`) |
| `syntax` | `CssSyntaxNode?` | CSS type definition for validation/animation |

### RouteSchema

| Field | Type | Description |
|-------|------|-------------|
| `path` | `Array<StaticPathSegment \| DynamicPathSegment>` | URL path segments |
| `query` | `Record<string, { name, testValue }>` | Query parameter definitions |
| `info` | `RouteInfo?` | SEO metadata (title, description, icon, language, charset, meta tags) |

**StaticPathSegment:** `{ type: 'static', name: string, optional?: boolean }`

**DynamicPathSegment:** `{ type: 'param', name: string, testValue: string, optional?: boolean }`

**MetaEntry (head tags):**

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `'meta' \| 'link' \| 'script' \| 'noscript' \| 'style'` | Head tag type |
| `attrs` | `Record<string, Formula>` | Tag attributes |
| `content` | `Formula?` | Tag content (for script/style) |

---

## Shallow vs Deep Schemas

The system provides two validation depths:

| Schema | Variant | Use Case |
|--------|---------|----------|
| `ComponentSchema` | Deep | Full recursive validation of all nested structures |
| `ShallowComponentSchema` | Shallow | Top-level field presence only; nested fields are `z.any()` |
| `PageSchema` | Deep | Full validation of page components |
| `ShallowPageSchema` | Shallow | Top-level validation of page components |

**Shallow schemas** replace all nested schema references (nodes, variables, formulas, workflows, APIs, events, contexts, onLoad, onAttributeChange) with `z.any()`. This is useful for:
- Performance-sensitive validation paths where only top-level shape matters
- Partial updates where nested data may be incomplete
- Schema generation for tools that only need field names and descriptions

---

## Business Rules & Validation Logic

1. **Formula recursion**: `FormulaSchema` is self-referential — formulas can contain sub-formulas at arbitrary depth. Handled via `z.lazy()`.
2. **Action recursion**: `ActionModelSchema` is self-referential — `Switch` cases contain action arrays, `Fetch` callbacks contain action arrays, `Custom` events contain action arrays. All handled via `z.lazy()`.
3. **Switch case limit**: `SwitchOperationSchema` (formula) enforces `.length(1)` on the cases array — the UI currently supports only a single case with a default.
4. **Legacy support**: Both `RecordOperationSchema` (formula) and `LegacyComponentAPISchema` (API) are preserved for backward compatibility but are deprecated.
5. **Built-in naming convention**: Built-in formula names are always prefixed with `@toddle/`. Built-in action names follow the same convention.
6. **Metadata convention**: The `@layr/metadata` key is reserved across all entities for system metadata (comments).
7. **Component vs Page discrimination**: Pages require a `route` field and have empty `attributes`. Components have optional `attributes` with no `route`.

---

## Edge Cases & Error Handling

- **Missing root node**: The `nodes` record must contain a `'root'` key at the application level; the schema itself does not enforce this (it's a business rule validated elsewhere).
- **Circular formula references**: The schema validates structure only; circular `apply` references (formula A calls formula B which calls formula A) are detected at evaluation time, not validation time.
- **Legacy action type**: `CustomActionModel` allows `type` to be `undefined` for legacy actions that predate the `type` discriminator.
- **Empty optional fields**: All optional fields use `nullish()` (accepts `undefined` and `null`) to be lenient with JSON serialization.
- **Unknown fields**: Zod's default behavior strips unknown fields during parsing; schemas do not use `.strict()` to allow forward-compatible extra fields.

---

## External Dependencies

- **Zod** (`zod`): Runtime schema validation library. All schemas are Zod types.
- **TypeScript types**: Each schema is explicitly typed as `z.ZodType<T>` where `T` is the corresponding interface from `component.types.ts`, ensuring compile-time alignment between schemas and types.

---

## Consumers

| Consumer | Usage |
|----------|-------|
| Editor (AI-assisted editing) | Schema descriptions power LLM system prompts for structured output |
| Import/export pipeline | Validates component JSON files on read |
| CLI tooling | Validates project files during build |
| Documentation generation | Schema descriptions serve as field documentation |

---

## System Limits

### Schema Validation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxValidationDepth` | 256 | Maximum nested schema depth |
| `maxValidationTime` | 1,000ms | Maximum validation time |
| `maxErrorCount` | 100 | Maximum errors before stopping |

### Enforcement

- **Depth limit:** Throw `RangeError`
- **Time limit:** Return partial validation
- **Error count:** Truncate errors, return

---

## Invariants

### Schema Invariants

1. **I-SCHEMA-TYPE-MATCH:** Zod type MUST match TypeScript type.
2. **I-SCHEMA-DESCRIPTION:** All schemas MUST have descriptions.
3. **I-SCHEMA-NULLISH-OPTIONAL:** Optional fields use `.nullish()`.

### Validation Invariants

4. **I-VALIDATE-COMPLETE:** Validation MUST validate entire structure.
5. **I-VALIDATE-ERROR-DETAIL:** Errors MUST include path and message.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-SCHEMA-TYPE-MATCH | TypeScript | Compile error |
| I-SCHEMA-DESCRIPTION | Lint | Warning |
| I-VALIDATE-COMPLETE | Runtime | Return all errors |

---

## Error Handling

### Validation Error Format

```typescript
interface ValidationError {
  path: string[];
  message: string;
  expected?: string;
  received?: string;
}
```

---

## Changelog

### Unreleased
- Added System Limits section with validation limits
- Added Invariants section with 5 schema and validation invariants
- Added Error Handling section with error format
