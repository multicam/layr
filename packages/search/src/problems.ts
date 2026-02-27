/**
 * Problem Detection
 * Based on specs/search-and-linting.md
 */

import type { ProjectFiles } from '@layr/types';
import type { Issue, IssueLevel, Rule, SearchOptions, FixFunction, FixPatch } from './types';
import { walkProject, createMemo } from './walker';

// Import all rules
import {
  // Actions
  unknownActionRule,
  // APIs
  unknownApiRule,
  unknownApiInputRule,
  // Attributes
  noReferenceAttributeRule,
  unknownAttributeRule,
  // Components
  unknownComponentRule,
  // DOM
  nonEmptyVoidElementRule,
  missingAltAttributeRule,
  // Events
  unknownEventRule,
  // Formulas
  unknownFormulaRule,
  // Logic
  noStaticNodeConditionRule,
  noUnnecessaryConditionTruthyRule,
  noUnnecessaryConditionFalsyRule,
  // Routing
  duplicateRouteRule,
  duplicateUrlParameterRule,
  // Variables
  unknownVariableRule,
  noReferenceVariableRule,
  unknownVariableSetterRule,
  // Workflows
  unknownTriggerWorkflowRule,
  unknownWorkflowParameterRule,
} from './rules';

// ============================================================================
// Find Problems
// ============================================================================

export interface FindProblemsArgs {
  files: ProjectFiles;
  options?: SearchOptions;
}

export function findProblems(
  args: FindProblemsArgs,
  respond: (results: Issue[]) => void
): void {
  const { files, options } = args;
  const issues: Issue[] = [];
  const batchSize = options?.batchSize ?? 'per-file';
  
  // Get all rules
  const allRules = getAllRules();
  
  // Filter rules by options
  const filteredRules = allRules.filter(rule => {
    if (options?.levels && !options.levels.includes(rule.level)) return false;
    if (options?.rules && !options.rules.includes(rule.code)) return false;
    return true;
  });
  
  // Convert rules to visitors
  const visitors = filteredRules.map(rule => ({
    nodeType: 'component' as const, // Simplified - rules implement their own traversal
    visit: () => {} // Placeholder
  }));
  
  // Run each rule
  const memo = createMemo();
  
  for (const rule of filteredRules) {
    const ruleIssues: Issue[] = [];
    
    rule.visit(
      (data, path, fixes) => {
        ruleIssues.push({
          rule: rule.code,
          level: rule.level,
          category: rule.category,
          path,
          data,
          fixes
        });
      },
      { files, memo }
    );
    
    if (batchSize === 'all') {
      issues.push(...ruleIssues);
    } else if (batchSize === 'per-file') {
      // Batch by component name
      const byComponent = new Map<string, Issue[]>();
      for (const issue of ruleIssues) {
        const componentName = issue.path[1] as string;
        if (!byComponent.has(componentName)) {
          byComponent.set(componentName, []);
        }
        byComponent.get(componentName)!.push(issue);
      }
      for (const [, componentIssues] of byComponent) {
        respond(componentIssues);
      }
    } else {
      // Fixed batch size
      for (let i = 0; i < ruleIssues.length; i += batchSize as number) {
        respond(ruleIssues.slice(i, i + (batchSize as number)));
      }
    }
  }
  
  if (batchSize === 'all') {
    respond(issues);
  }
}

// ============================================================================
// Fix Problems
// ============================================================================

export interface FixProblemsArgs {
  files: ProjectFiles;
  options?: SearchOptions;
  fixRule: string;
  fixType: string;
}

export function fixProblems(
  args: FixProblemsArgs,
  respond: (result: FixPatch[]) => void
): void {
  const { files, options, fixRule, fixType } = args;
  
  // Get the rule
  const allRules = getAllRules();
  const rule = allRules.find(r => r.code === fixRule);
  
  if (!rule?.fixes?.[fixType]) {
    respond([]);
    return;
  }
  
  const fixFn = rule.fixes[fixType];
  const memo = createMemo();
  const patches: FixPatch[] = [];
  
  rule.visit(
    (data, path) => {
      const result = fixFn({ files, path, data });
      if (result) {
        // Compute diff patches
        const diff = computeDiff(files, result);
        patches.push(...diff);
      }
    },
    { files, memo }
  );
  
  respond(patches);
}

// ============================================================================
// Fix Project (Iterative)
// ============================================================================

export function fixProject(
  files: ProjectFiles,
  fixRule: string,
  fixType: string,
  options?: SearchOptions
): ProjectFiles {
  let currentFiles = files;
  let hasChanges = true;
  
  while (hasChanges) {
    hasChanges = false;
    
    fixProblems(
      { files: currentFiles, options, fixRule, fixType },
      (patches) => {
        if (patches.length > 0) {
          currentFiles = applyPatches(currentFiles, patches);
          hasChanges = true;
        }
      }
    );
  }
  
  return currentFiles;
}

// ============================================================================
// Helpers
// ============================================================================

function getAllRules(): Rule[] {
  return [
    // Actions
    unknownActionRule,

    // APIs
    unknownApiRule,
    unknownApiInputRule,

    // Attributes
    noReferenceAttributeRule,
    unknownAttributeRule,

    // Components
    unknownComponentRule,

    // DOM
    nonEmptyVoidElementRule,
    missingAltAttributeRule,

    // Events
    unknownEventRule,

    // Formulas
    unknownFormulaRule,

    // Logic
    noStaticNodeConditionRule,
    noUnnecessaryConditionTruthyRule,
    noUnnecessaryConditionFalsyRule,

    // Routing
    duplicateRouteRule,
    duplicateUrlParameterRule,

    // Variables
    unknownVariableRule,
    noReferenceVariableRule,
    unknownVariableSetterRule,

    // Workflows
    unknownTriggerWorkflowRule,
    unknownWorkflowParameterRule,
  ];
}

function computeDiff(original: ProjectFiles, modified: ProjectFiles): FixPatch[] {
  // Simple diff implementation
  // In production, use a library like fast-json-patch
  const patches: FixPatch[] = [];
  
  // This is a simplified diff - a real implementation would do deep comparison
  if (JSON.stringify(original) !== JSON.stringify(modified)) {
    patches.push({
      op: 'replace',
      path: '',
      value: modified
    });
  }
  
  return patches;
}

function applyPatches(files: ProjectFiles, patches: FixPatch[]): ProjectFiles {
  // Simple patch application
  // In production, use a library like fast-json-patch
  if (patches.length === 1 && patches[0].op === 'replace' && patches[0].path === '') {
    return patches[0].value as ProjectFiles;
  }
  return files;
}
