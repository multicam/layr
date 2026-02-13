// Signal
export { Signal, createSignal } from './signal/signal';

// Formula
export { applyFormula, toBoolean } from './formula/evaluate';
export * from './formula/operations';
export type { FormulaContext } from './formula/context';

// Actions
export { handleAction } from './action/handle';

// Context
export { 
  provide, 
  consume, 
  consumeSignal,
  hasContext, 
  unprovide, 
  clearProviders,
  createContext,
  ContextScope,
  ContextKeys,
} from './context/index';
export type { ContextProvider, ContextKey } from './context/index';

// Traversal & Introspection
export {
  getFormulasInFormula,
  getFormulasInAction,
  getActionsInAction,
  getFormulasInNode,
  getActionsInNode,
  getFormulasInComponent,
  getActionsInComponent,
  getFormulasInApi,
  collectFormulaReferences,
  collectActionReferences,
  collectSubComponentNames,
} from './traversal/index';
export type {
  FormulaVisit,
  ActionVisit,
  GlobalFormulas,
} from './traversal/index';

// Validation Schemas
export {
  SCHEMA_DESCRIPTIONS,
  MetadataSchema,
  ValueOperationSchema,
  PathOperationSchema,
  FunctionArgumentSchema,
  FormulaSchema,
  ActionModelSchema,
  EventModelSchema,
  MediaQuerySchema,
  CustomPropertySchema,
  StyleVariantSchema,
  NodeModelSchema,
  ComponentSchema,
  PageSchema,
  ShallowComponentSchema,
  ShallowPageSchema,
  validateComponent,
  validatePage,
  validateFormula,
  validateAction,
  validateNode,
} from './schemas/index';
export type { ValidationResult } from './schemas/index';
