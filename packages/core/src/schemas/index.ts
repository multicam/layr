/**
 * Data Validation Schemas
 * Based on specs/data-validation-schemas.md
 * 
 * Zod schemas for validating Layr data models.
 */

import { z } from 'zod';

// ============================================================================
// Schema Descriptions
// ============================================================================

export const SCHEMA_DESCRIPTIONS = {
  // Common
  animations: (type: string) => `Animations defined on a ${type}`,
  animationKey: 'Unique key identifying an animation',
  animationKeyframeKey: 'Unique key identifying a keyframe',
  apis: (type: string) => `API definitions in a ${type}`,
  children: 'List of child node IDs',
  condition: (type: string) => `Conditional rendering formula for ${type}`,
  formulas: (type: string) => `Formula definitions in a ${type}`,
  metadata: (type: string) => `Metadata for ${type}`,
  onAttributeChange: (type: string) => `Lifecycle event on attribute change for ${type}`,
  onLoad: (type: string) => `Lifecycle event on load for ${type}`,
  repeat: (type: string) => `Repeat formula for list rendering on ${type}`,
  repeatKey: (type: string) => `Unique key formula for repeated items in ${type}`,
  slot: (type: string) => `Slot name for component composition on ${type}`,
  style: (type: string) => `Default style for a ${type}`,
  testData: (type: string) => `Test/preview data for ${type}`,
  variables: (type: string) => `Variable definitions in a ${type}`,
  variants: (type: string) => `Style variants (hover, media query, etc.) for ${type}`,
  workflows: (type: string) => `Workflow definitions in a ${type}`,
};

// ============================================================================
// Metadata Schema
// ============================================================================

export const MetadataSchema = z.object({
  comments: z.record(z.object({
    index: z.number(),
    text: z.string(),
  })).optional(),
}).optional();

// ============================================================================
// Formula Schema (Recursive)
// ============================================================================

const ValueOperationSchema = z.object({
  type: z.literal('value'),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.unknown()),
  ]),
}).describe('Literal value');

const PathOperationSchema = z.object({
  type: z.literal('path'),
  path: z.array(z.string()),
}).describe('Data path lookup');

const FunctionArgumentSchema = z.object({
  name: z.string(),
  formula: z.lazy(() => FormulaSchema),
  isFunction: z.boolean().optional(),
});

const FunctionOperationSchema = z.object({
  type: z.literal('function'),
  name: z.string(),
  package: z.string().optional(),
  display_name: z.string().optional(),
  variableArguments: z.boolean().optional(),
  arguments: z.array(FunctionArgumentSchema).optional(),
}).describe('Function call');

const ApplyOperationSchema = z.object({
  type: z.literal('apply'),
  name: z.string(),
  arguments: z.array(FunctionArgumentSchema).optional(),
}).describe('Call to component formula');

const ArrayOperationSchema = z.object({
  type: z.literal('array'),
  arguments: z.array(z.object({
    formula: z.lazy(() => FormulaSchema),
  })),
}).describe('Array literal');

const ObjectEntrySchema = z.object({
  name: z.string(),
  formula: z.lazy(() => FormulaSchema),
});

const ObjectOperationSchema = z.object({
  type: z.literal('object'),
  arguments: z.array(ObjectEntrySchema).optional(),
}).describe('Object literal');

const RecordOperationSchema = z.object({
  type: z.literal('record'),
  arguments: z.array(ObjectEntrySchema).optional(),
}).describe('Object literal (deprecated)');

const OrOperationSchema = z.object({
  type: z.literal('or'),
  arguments: z.array(z.object({
    formula: z.lazy(() => FormulaSchema),
  })),
}).describe('Logical OR');

const AndOperationSchema = z.object({
  type: z.literal('and'),
  arguments: z.array(z.object({
    formula: z.lazy(() => FormulaSchema),
  })),
}).describe('Logical AND');

const SwitchCaseSchema = z.object({
  condition: z.lazy(() => FormulaSchema),
  formula: z.lazy(() => FormulaSchema),
});

const SwitchOperationSchema = z.object({
  type: z.literal('switch'),
  cases: z.array(SwitchCaseSchema).min(1),
  default: z.lazy(() => FormulaSchema),
}).describe('Branching');

export const FormulaSchema: z.ZodType = z.union([
  ValueOperationSchema,
  PathOperationSchema,
  FunctionOperationSchema,
  ApplyOperationSchema,
  ArrayOperationSchema,
  ObjectOperationSchema,
  RecordOperationSchema,
  OrOperationSchema,
  AndOperationSchema,
  SwitchOperationSchema,
]).describe('Formula AST');

// ============================================================================
// Action Schema (Recursive)
// ============================================================================
// TODO: Schema field names diverge from @layr/types - schemas reflect actual JSON data, types need reconciliation

const ActionModelBase = z.object({
  '@layr/metadata': MetadataSchema,
});

const VariableActionModelSchema = ActionModelBase.extend({
  type: z.literal('SetVariable'),
  name: z.string(),
  data: FormulaSchema.optional(),
});

const EventActionModelSchema = ActionModelBase.extend({
  type: z.literal('TriggerEvent'),
  name: z.string(),
  data: FormulaSchema.optional(),
});

const SwitchActionCaseSchema = z.object({
  condition: FormulaSchema,
  actions: z.lazy(() => z.array(ActionModelSchema)),
});

const SwitchActionModelSchema = ActionModelBase.extend({
  type: z.literal('Switch'),
  data: FormulaSchema.optional(),
  cases: z.array(SwitchActionCaseSchema),
  default: z.object({
    actions: z.lazy(() => z.array(ActionModelSchema)),
  }).optional(),
});

const FetchActionModelSchema = ActionModelBase.extend({
  type: z.literal('Fetch'),
  name: z.string(),
  inputs: z.array(z.object({
    name: z.string(),
    formula: FormulaSchema.optional(),
  })).optional(),
  onSuccess: z.object({
    actions: z.lazy(() => z.array(ActionModelSchema)),
  }).optional(),
  onError: z.object({
    actions: z.lazy(() => z.array(ActionModelSchema)),
  }).optional(),
  onMessage: z.object({
    actions: z.lazy(() => z.array(ActionModelSchema)),
  }).optional(),
});

const CustomActionEventSchema = z.object({
  actions: z.lazy(() => z.array(ActionModelSchema)),
  dummyEvent: z.unknown().optional(),
});

const CustomActionModelSchema = ActionModelBase.extend({
  type: z.literal('Custom').optional(),
  name: z.string(),
  arguments: z.array(z.object({
    name: z.string(),
    formula: FormulaSchema,
  })).optional(),
  events: z.record(CustomActionEventSchema).optional(),
});

const SetURLParameterActionSchema = ActionModelBase.extend({
  type: z.literal('SetURLParameter'),
  name: z.string(),
  data: FormulaSchema.optional(),
  historyMode: z.enum(['push', 'replace']).optional(),
});

const SetMultiUrlParameterActionSchema = ActionModelBase.extend({
  type: z.literal('SetURLParameters'),
  parameters: z.array(z.object({
    name: z.string(),
    formula: FormulaSchema,
  })),
  historyMode: z.enum(['push', 'replace']).optional(),
});

const TriggerWorkflowActionSchema = ActionModelBase.extend({
  type: z.literal('TriggerWorkflow'),
  name: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    formula: FormulaSchema.optional(),
  })).optional(),
  componentName: z.string().optional(),
  package: z.string().optional(),
});

const WorkflowCallbackActionSchema = ActionModelBase.extend({
  type: z.literal('TriggerWorkflowCallback'),
  name: z.string(),
  data: FormulaSchema.optional(),
});

const AbortFetchActionSchema = ActionModelBase.extend({
  type: z.literal('AbortFetch'),
  name: z.string(),
});

export const ActionModelSchema: z.ZodType = z.union([
  VariableActionModelSchema,
  EventActionModelSchema,
  SwitchActionModelSchema,
  FetchActionModelSchema,
  CustomActionModelSchema,
  SetURLParameterActionSchema,
  SetMultiUrlParameterActionSchema,
  TriggerWorkflowActionSchema,
  WorkflowCallbackActionSchema,
  AbortFetchActionSchema,
]).describe('Action model');

// ============================================================================
// Event Model Schema
// ============================================================================

export const EventModelSchema = z.object({
  actions: z.array(ActionModelSchema),
}).describe('Event with action list');

// ============================================================================
// Style Variant Schema
// ============================================================================
// TODO: Schema shape diverges from StyleVariant type in @layr/types - needs reconciliation

const MediaQuerySchema = z.object({
  'min-width': z.string().optional(),
  'max-width': z.string().optional(),
  'min-height': z.string().optional(),
  'max-height': z.string().optional(),
  'prefers-reduced-motion': z.enum(['reduce', 'no-preference']).optional(),
}).describe('Media query conditions');

const AnimationKeyframeSchema = z.object({
  position: z.number().min(0).max(1),
  key: z.string(),
  value: z.string(),
});

export const StyleVariantSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  hover: z.boolean().optional(),
  active: z.boolean().optional(),
  focus: z.boolean().optional(),
  focusWithin: z.boolean().optional(),
  disabled: z.boolean().optional(),
  empty: z.boolean().optional(),
  firstChild: z.boolean().optional(),
  lastChild: z.boolean().optional(),
  evenChild: z.boolean().optional(),
  startingStyle: z.boolean().optional(),
  mediaQuery: MediaQuerySchema.optional(),
  style: z.record(z.string()),
  customProperties: z.record(z.object({
    formula: FormulaSchema,
    unit: z.string().optional(),
  })).optional(),
}).describe('Style variant');

// ============================================================================
// Node Model Schema
// ============================================================================

const NodeBaseSchema = z.object({
  '@layr/metadata': MetadataSchema,
  condition: FormulaSchema.optional(),
  repeat: FormulaSchema.optional(),
  repeatKey: FormulaSchema.optional(),
  slot: z.string().optional(),
});

const CustomPropertySchema = z.object({
  formula: FormulaSchema,
  unit: z.string().optional(),
});

const TextNodeModelSchema = NodeBaseSchema.extend({
  type: z.literal('text'),
  value: FormulaSchema,
}).describe('Text node');

const SlotNodeModelSchema = NodeBaseSchema.extend({
  type: z.literal('slot'),
  name: z.string().optional(),
  children: z.array(z.string()),
}).describe('Slot node');

const ElementNodeModelSchema = NodeBaseSchema.extend({
  type: z.literal('element'),
  tag: z.string(),
  attrs: z.record(FormulaSchema).optional(),
  style: z.record(z.string()).optional(),
  children: z.array(z.string()),
  events: z.record(EventModelSchema).optional(),
  classes: z.record(z.object({
    formula: FormulaSchema.optional(),
  })).optional(),
  customProperties: z.record(CustomPropertySchema).optional(),
  variants: z.array(StyleVariantSchema).optional(),
  animations: z.record(z.record(AnimationKeyframeSchema)).optional(),
}).describe('Element node');

const ComponentNodeModelSchema = NodeBaseSchema.extend({
  type: z.literal('component'),
  name: z.string(),
  package: z.string().optional(),
  attrs: z.record(FormulaSchema).optional(),
  children: z.array(z.string()),
  events: z.record(EventModelSchema).optional(),
  style: z.record(z.string()).optional(),
  customProperties: z.record(CustomPropertySchema).optional(),
  variants: z.array(StyleVariantSchema).optional(),
  animations: z.record(z.record(AnimationKeyframeSchema)).optional(),
}).describe('Component node');

export const NodeModelSchema: z.ZodType = z.union([
  TextNodeModelSchema,
  SlotNodeModelSchema,
  ElementNodeModelSchema,
  ComponentNodeModelSchema,
]).describe('Node model');

// ============================================================================
// Component Schema
// ============================================================================

const ComponentAttributeSchema = z.object({
  name: z.string(),
  testValue: z.unknown().optional(),
}).describe('Component attribute');

const ComponentVariableSchema = z.object({
  initialValue: FormulaSchema,
}).describe('Component variable');

const ComponentFormulaSchema = z.object({
  name: z.string(),
  arguments: z.array(z.object({
    name: z.string(),
    testValue: z.unknown().optional(),
  })).optional(),
  memoize: z.boolean().optional(),
  exposeInContext: z.boolean().optional(),
  formula: FormulaSchema,
}).describe('Component formula');

const ComponentWorkflowSchema = z.object({
  name: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    testValue: z.unknown().optional(),
  })).optional(),
  callbacks: z.array(z.object({
    name: z.string(),
    testValue: z.unknown().optional(),
  })).optional(),
  actions: z.array(ActionModelSchema),
  exposeInContext: z.boolean().optional(),
}).describe('Component workflow');

const ComponentContextSchema = z.object({
  formulas: z.array(z.string()),
  workflows: z.array(z.string()).optional(),
  componentName: z.string().optional(),
  package: z.string().optional(),
}).describe('Context subscription');

const ComponentEventSchema = z.object({
  name: z.string(),
  testValue: z.unknown().optional(),
}).describe('Component event declaration');

// Route schemas
const StaticPathSegmentSchema = z.object({
  type: z.literal('static'),
  name: z.string(),
  optional: z.boolean().optional(),
});

const DynamicPathSegmentSchema = z.object({
  type: z.literal('param'),
  name: z.string(),
  testValue: z.string().optional(),
  optional: z.boolean().optional(),
});

const RouteInfoSchema = z.object({
  title: z.object({ formula: FormulaSchema }).optional(),
  description: z.object({ formula: FormulaSchema }).optional(),
  language: z.object({ formula: FormulaSchema }).optional(),
  icon: z.object({ formula: FormulaSchema }).optional(),
  charset: z.object({ formula: FormulaSchema }).optional(),
  meta: z.array(z.object({
    tag: z.enum(['meta', 'link', 'script', 'noscript', 'style']),
    attrs: z.record(FormulaSchema).optional(),
    content: FormulaSchema.optional(),
  })).optional(),
});

const RouteDeclarationSchema = z.object({
  path: z.array(z.union([StaticPathSegmentSchema, DynamicPathSegmentSchema])),
  query: z.record(z.object({
    name: z.string(),
    testValue: z.unknown().optional(),
  })).optional(),
  info: RouteInfoSchema.optional(),
});

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
  onLoad: z.object({
    trigger: z.literal('Load'),
    actions: z.array(ActionModelSchema),
  }).optional(),
  onAttributeChange: z.object({
    trigger: z.literal('Attribute change'),
    actions: z.array(ActionModelSchema),
  }).optional(),
  customElement: z.object({
    enabled: FormulaSchema.optional(),
  }).optional(),
}).describe('Component definition');

export const PageSchema = ComponentSchema.extend({
  route: RouteDeclarationSchema,
  attributes: z.record(z.unknown()).optional().default({}),
}).describe('Page component definition');

// ============================================================================
// Shallow Schemas (for performance)
// ============================================================================

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
}).describe('Component (shallow)');

export const ShallowPageSchema = ShallowComponentSchema.extend({
  route: z.any(),
  attributes: z.any().optional(),
}).describe('Page component (shallow)');

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  success: boolean;
  errors: Array<{
    path: string[];
    message: string;
    expected?: string;
    received?: string;
  }>;
}

export function validateComponent(data: unknown): ValidationResult {
  const result = ComponentSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
      expected: 'expected' in issue ? String(issue.expected) : undefined,
      received: 'received' in issue ? String(issue.received) : undefined,
    })),
  };
}

export function validatePage(data: unknown): ValidationResult {
  const result = PageSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
      expected: 'expected' in issue ? String(issue.expected) : undefined,
      received: 'received' in issue ? String(issue.received) : undefined,
    })),
  };
}

export function validateFormula(data: unknown): ValidationResult {
  const result = FormulaSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  };
}

export function validateAction(data: unknown): ValidationResult {
  const result = ActionModelSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  };
}

export function validateNode(data: unknown): ValidationResult {
  const result = NodeModelSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  };
}
