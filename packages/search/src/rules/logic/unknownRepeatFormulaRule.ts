/**
 * Unknown Repeat Index Formula Rule
 * Detects formulas that reference repeat index when the node doesn't have a repeat configuration
 * or the index path is invalid
 */

import type { Rule } from '../../types';
import type { Formula, ComponentNode } from '@layr/types';

/**
 * Check if a formula references repeat index
 */
function referencesRepeatIndex(formula: Formula | undefined): boolean {
  if (!formula) return false;

  if (formula.type === 'path') {
    const path = formula.path;
    // Check for repeat index reference like ['Index'] or ['Repeat', 'Index']
    if (path.length > 0) {
      const first = path[0];
      if (first === 'Index' || first === 'RepeatIndex') {
        return true;
      }
      // Check nested paths like ['Repeat', 'Index']
      if (path.includes('Index') || path.includes('RepeatIndex')) {
        return true;
      }
    }
  }

  // Check function arguments
  if (formula.type === 'function') {
    for (const arg of Object.values(formula.args || {})) {
      if (referencesRepeatIndex(arg)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a node has a repeat configuration
 */
function hasRepeatConfig(node: ComponentNode): boolean {
  return !!(node as any).repeat;
}

/**
 * Recursively check all formulas in a node for repeat index references
 */
function checkNodeFormulas(
  node: ComponentNode,
  nodeId: string,
  compName: string,
  report: (data: { path: string[] }, path: (string | number)[]) => void
): void {
  // Check condition formula
  if ((node as any).condition && referencesRepeatIndex((node as any).condition)) {
    if (!hasRepeatConfig(node)) {
      report(
        { path: ['condition'] },
        ['components', compName, 'nodes', nodeId, 'condition']
      );
    }
  }

  // Check style formulas
  if (node.type === 'element' && node.styles) {
    for (const [breakpoint, styleDecls] of Object.entries(node.styles)) {
      for (const styleDecl of styleDecls || []) {
        if (styleDecl.value?.type === 'formula') {
          const formula = (styleDecl.value as any).formula;
          if (referencesRepeatIndex(formula) && !hasRepeatConfig(node)) {
            report(
              { path: ['styles', breakpoint, styleDecl.property] },
              ['components', compName, 'nodes', nodeId]
            );
          }
        }
      }
    }
  }

  // Check text node value
  if (node.type === 'text' && node.value) {
    if (referencesRepeatIndex(node.value) && !hasRepeatConfig(node)) {
      report(
        { path: ['value'] },
        ['components', compName, 'nodes', nodeId]
      );
    }
  }

  // Check attribute formulas
  if (node.type === 'element' && node.attrs) {
    for (const [attrName, attrFormula] of Object.entries(node.attrs)) {
      if (referencesRepeatIndex(attrFormula) && !hasRepeatConfig(node)) {
        report(
          { path: ['attrs', attrName] },
          ['components', compName, 'nodes', nodeId]
        );
      }
    }
  }
}

export const unknownRepeatIndexFormulaRule: Rule<{ path: string[] }> = {
  code: 'unknown repeat index formula',
  level: 'error',
  category: 'logic',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node) continue;
        checkNodeFormulas(node, nodeId, compName, report);
      }
    }
  },
};

/**
 * Unknown Repeat Item Formula Rule
 * Detects formulas that reference repeat item when the node doesn't have a repeat configuration
 */

/**
 * Check if a formula references repeat item
 */
function referencesRepeatItem(formula: Formula | undefined): boolean {
  if (!formula) return false;

  if (formula.type === 'path') {
    const path = formula.path;
    // Check for repeat item reference like ['Item'] or ['Repeat', 'Item']
    if (path.length > 0) {
      const first = path[0];
      if (first === 'Item' || first === 'RepeatItem') {
        return true;
      }
      // Check nested paths
      if (path.includes('Item') || path.includes('RepeatItem')) {
        return true;
      }
    }
  }

  // Check function arguments
  if (formula.type === 'function') {
    for (const arg of Object.values(formula.args || {})) {
      if (referencesRepeatItem(arg)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Recursively check all formulas in a node for repeat item references
 */
function checkNodeFormulasForItem(
  node: ComponentNode,
  nodeId: string,
  compName: string,
  report: (data: { path: string[] }, path: (string | number)[]) => void
): void {
  // Check condition formula
  if ((node as any).condition && referencesRepeatItem((node as any).condition)) {
    if (!hasRepeatConfig(node)) {
      report(
        { path: ['condition'] },
        ['components', compName, 'nodes', nodeId, 'condition']
      );
    }
  }

  // Check style formulas
  if (node.type === 'element' && node.styles) {
    for (const [breakpoint, styleDecls] of Object.entries(node.styles)) {
      for (const styleDecl of styleDecls || []) {
        if (styleDecl.value?.type === 'formula') {
          const formula = (styleDecl.value as any).formula;
          if (referencesRepeatItem(formula) && !hasRepeatConfig(node)) {
            report(
              { path: ['styles', breakpoint, styleDecl.property] },
              ['components', compName, 'nodes', nodeId]
            );
          }
        }
      }
    }
  }

  // Check text node value
  if (node.type === 'text' && node.value) {
    if (referencesRepeatItem(node.value) && !hasRepeatConfig(node)) {
      report(
        { path: ['value'] },
        ['components', compName, 'nodes', nodeId]
      );
    }
  }

  // Check attribute formulas
  if (node.type === 'element' && node.attrs) {
    for (const [attrName, attrFormula] of Object.entries(node.attrs)) {
      if (referencesRepeatItem(attrFormula) && !hasRepeatConfig(node)) {
        report(
          { path: ['attrs', attrName] },
          ['components', compName, 'nodes', nodeId]
        );
      }
    }
  }
}

export const unknownRepeatItemFormulaRule: Rule<{ path: string[] }> = {
  code: 'unknown repeat item formula',
  level: 'error',
  category: 'logic',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node) continue;
        checkNodeFormulasForItem(node, nodeId, compName, report);
      }
    }
  },
};
