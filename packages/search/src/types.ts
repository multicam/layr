/**
 * Search & Linting Types
 * Based on specs/search-and-linting.md
 */

import type { ProjectFiles } from '@layr/types';

// ============================================================================
// Issue Types
// ============================================================================

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  rule: string;
  level: IssueLevel;
  category: string;
  path: (string | number)[];
  data?: unknown;
  fixes?: string[];
}

export interface IssueReport {
  issues: Issue[];
}

// ============================================================================
// Rule Types
// ============================================================================

export type RuleCategory =
  | 'actions'
  | 'apis'
  | 'attributes'
  | 'components'
  | 'contexts'
  | 'dom'
  | 'events'
  | 'formulas'
  | 'logic'
  | 'misc'
  | 'routing'
  | 'slots'
  | 'styles'
  | 'variables'
  | 'workflows';

export interface RuleContext {
  files: ProjectFiles;
  memo: <T>(key: string, factory: () => T) => T;
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

export interface FixFunction {
  (args: { files: ProjectFiles; path: (string | number)[]; data: unknown }): 
    ProjectFiles | undefined;
}

// ============================================================================
// Visitor Types
// ============================================================================

export type NodeType =
  | 'component'
  | 'component-node'
  | 'formula'
  | 'style-declaration'
  | 'action-model'
  | 'route'
  | 'route-formula'
  | 'api'
  | 'variable'
  | 'workflow'
  | 'event'
  | 'attribute'
  | 'context'
  | 'theme';

export interface Visitor<Data = unknown, Value = unknown> {
  nodeType: NodeType;
  visit: (
    value: Value,
    report: (data: Data, path: (string | number)[], fixes?: string[]) => void,
    ctx: RuleContext,
    path: (string | number)[]
  ) => void;
}

// ============================================================================
// Search Options
// ============================================================================

export interface SearchOptions {
  levels?: IssueLevel[];
  rules?: string[];
  pathsToVisit?: (string | number)[][];
  batchSize?: number | 'all' | 'per-file';
}

// ============================================================================
// Fix Types
// ============================================================================

export interface FixPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
}

export interface FixResult {
  patches: FixPatch[];
  rule: string;
  fixType: string;
}
