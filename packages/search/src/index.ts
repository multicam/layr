/**
 * @layr/search - Search & Linting System
 * Based on specs/search-and-linting.md
 */

// Types
export type {
  Issue,
  IssueLevel,
  IssueReport,
  Rule,
  RuleCategory,
  RuleContext,
  FixFunction,
  NodeType,
  Visitor,
  SearchOptions,
  FixPatch,
  FixResult,
} from './types';

// Problems
export { findProblems, fixProblems, fixProject } from './problems';
export type { FindProblemsArgs, FixProblemsArgs } from './problems';

// Walker
export { walkProject, createMemo } from './walker';

// Contextless evaluation
export { 
  contextlessEvaluateFormula, 
  isAlwaysTrue, 
  isAlwaysFalse, 
  isStaticCondition 
} from './contextless';
export type { ContextlessResult } from './contextless';

// Rules (individual exports for direct use)
export * from './rules';
