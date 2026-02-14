/**
 * Problem Detection
 * Based on specs/search-and-linting.md
 */

import type { ProjectFiles } from '@layr/types';
import type { Issue, IssueLevel, Rule, SearchOptions, FixFunction, FixPatch } from './types';
import { walkProject, createMemo } from './walker';

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
  // Import all rules from rule files
  const rules: Rule[] = [];
  
  // Component rules
  rules.push(...componentRules);
  
  // Formula rules
  rules.push(...formulaRules);
  
  // Action rules
  rules.push(...actionRules);
  
  // Variable rules
  rules.push(...variableRules);
  
  // API rules
  rules.push(...apiRules);
  
  // Attribute rules
  rules.push(...attributeRules);
  
  // Event rules
  rules.push(...eventRules);
  
  // Context rules
  rules.push(...contextRules);
  
  // Slot rules
  rules.push(...slotRules);
  
  // Workflow rules
  rules.push(...workflowRules);
  
  // Style rules
  rules.push(...styleRules);
  
  // DOM rules
  rules.push(...domRules);
  
  // Logic rules
  rules.push(...logicRules);
  
  // Routing rules
  rules.push(...routingRules);
  
  // Misc rules
  rules.push(...miscRules);
  
  return rules;
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

// ============================================================================
// Rule Definitions (Placeholder - would be in separate files)
// ============================================================================

const componentRules: Rule[] = [
  {
    code: 'unknown component',
    level: 'error',
    category: 'components',
    visit: (report, ctx) => {
      // Check for component references that don't exist
      const componentNames = new Set(Object.keys(ctx.files.components || {}));
      
      for (const [name, component] of Object.entries(ctx.files.components || {})) {
        if (!component) continue;
        
        // Check all component nodes
        for (const [nodeId, node] of Object.entries(component.nodes || {})) {
          if (!node || node.type !== 'component') continue;
          if (!componentNames.has(node.name) && !node.package) {
            report({ componentName: node.name }, ['components', name, 'nodes', nodeId]);
          }
        }
      }
    }
  },
  {
    code: 'no reference component',
    level: 'warning',
    category: 'components',
    visit: (report, ctx) => {
      // Check for unused components
      const referenced = ctx.memo('referencedComponents', () => {
        const refs = new Set<string>();
        for (const component of Object.values(ctx.files.components || {})) {
          if (!component) continue;
          for (const node of Object.values(component.nodes || {})) {
            if (node?.type === 'component') {
              refs.add(node.name);
            }
          }
        }
        return refs;
      });
      
      for (const name of Object.keys(ctx.files.components || {})) {
        if (!referenced.has(name)) {
          report({ name }, ['components', name], ['delete-component']);
        }
      }
    },
    fixes: {
      'delete-component': ({ files, path }) => {
        const name = path[1] as string;
        const newFiles = { ...files };
        delete newFiles.components?.[name];
        return newFiles;
      }
    }
  }
];

const formulaRules: Rule[] = [
  {
    code: 'unknown formula',
    level: 'error',
    category: 'formulas',
    visit: (report, ctx) => {
      // Check for unknown formula references
      const formulaNames = new Set([
        ...Object.keys(ctx.files.formulas || {}),
        '@toddle/MAP', '@toddle/FILTER', '@toddle/GET', '@toddle/IF', // etc.
      ]);
      
      // Add package formulas
      for (const pkg of Object.values(ctx.files.packages || {})) {
        if (!pkg) continue;
        for (const name of Object.keys(pkg.formulas || {})) {
          formulaNames.add(`${pkg.manifest.name}/${name}`);
        }
      }
      
      // Walk all formulas and check references
      // This is a simplified check
      const walkFormula = (formula: any, path: (string | number)[]): void => {
        if (!formula || typeof formula !== 'object') return;
        
        if (formula.type === 'function') {
          const fnName = formula.name as string;
          if (!formulaNames.has(fnName)) {
            report({ formulaName: fnName }, path);
          }
        }
        
        // Recursively check nested formulas
        for (const [key, value] of Object.entries(formula)) {
          if (value && typeof value === 'object') {
            walkFormula(value, [...path, key]);
          }
        }
      };
      
      // Walk all formulas in components
      for (const [name, component] of Object.entries(ctx.files.components || {})) {
        if (!component) continue;
        for (const [fnName, formula] of Object.entries(component.formulas || {})) {
          if (formula) {
            walkFormula(formula.formula, ['components', name, 'formulas', fnName]);
          }
        }
      }
    }
  }
];

const actionRules: Rule[] = [];
const variableRules: Rule[] = [];
const apiRules: Rule[] = [];
const attributeRules: Rule[] = [];
const eventRules: Rule[] = [];
const contextRules: Rule[] = [];
const slotRules: Rule[] = [];
const workflowRules: Rule[] = [];
const styleRules: Rule[] = [];
const domRules: Rule[] = [];
const logicRules: Rule[] = [];
const routingRules: Rule[] = [];
const miscRules: Rule[] = [];
