/**
 * Unknown Cookie Rule
 * Detects formulas that read cookies that are not declared
 *
 * Cookies should be declared before being accessed in formulas.
 */

import type { Rule } from '../../types';
import type { Formula, Component, Project } from '@layr/types';

/**
 * Collect all declared cookies from the project
 */
function collectDeclaredCookies(files: any): Set<string> {
  const declared = new Set<string>();

  // Check project-level cookies
  if (files.project?.cookies) {
    for (const cookie of files.project.cookies) {
      if (cookie?.name) {
        declared.add(cookie.name);
      }
    }
  }

  // Check component-level cookies
  for (const [compName, component] of Object.entries(files.components || {})) {
    if (!component) continue;

    if ((component as any).cookies) {
      for (const cookie of (component as any).cookies) {
        if (cookie?.name) {
          declared.add(cookie.name);
        }
      }
    }
  }

  return declared;
}

/**
 * Check if a formula references a cookie
 */
function referencesCookie(formula: Formula | undefined): string | null {
  if (!formula) return null;

  if (formula.type === 'path') {
    const path = formula.path;
    // Check for cookie reference like ['Cookies', 'cookieName']
    if (path.length >= 2 && path[0] === 'Cookies') {
      return path[1] as string;
    }
    // Also check for alternative naming
    if (path.length >= 2 && (path[0] === 'Cookie' || path[0] === 'cookie')) {
      return path[1] as string;
    }
  }

  // Check function arguments
  if (formula.type === 'function') {
    for (const arg of Object.values(formula.args || {})) {
      const cookieName = referencesCookie(arg);
      if (cookieName) return cookieName;
    }
  }

  return null;
}

/**
 * Recursively walk a node's formulas to find cookie references
 */
function findCookieReferencesInNode(
  node: any,
  nodeId: string,
  compName: string,
  declaredCookies: Set<string>,
  report: (data: { cookie: string }, path: (string | number)[]) => void
): void {
  // Check condition formula
  if (node.condition) {
    const cookieName = referencesCookie(node.condition);
    if (cookieName && !declaredCookies.has(cookieName)) {
      report({ cookie: cookieName }, ['components', compName, 'nodes', nodeId, 'condition']);
    }
  }

  // Check attribute formulas
  if (node.attrs) {
    for (const [attrName, attrFormula] of Object.entries(node.attrs)) {
      const cookieName = referencesCookie(attrFormula as Formula);
      if (cookieName && !declaredCookies.has(cookieName)) {
        report({ cookie: cookieName }, ['components', compName, 'nodes', nodeId, 'attrs', attrName]);
      }
    }
  }

  // Check style formulas
  if (node.styles) {
    for (const [breakpoint, styleDecls] of Object.entries(node.styles)) {
      for (const styleDecl of (styleDecls as any[]) || []) {
        if (styleDecl?.value?.type === 'formula') {
          const cookieName = referencesCookie(styleDecl.value.formula);
          if (cookieName && !declaredCookies.has(cookieName)) {
            report({ cookie: cookieName }, ['components', compName, 'nodes', nodeId]);
          }
        }
      }
    }
  }

  // Check text node value
  if (node.type === 'text' && node.value) {
    const cookieName = referencesCookie(node.value);
    if (cookieName && !declaredCookies.has(cookieName)) {
      report({ cookie: cookieName }, ['components', compName, 'nodes', nodeId]);
    }
  }
}

/**
 * Walk actions to find cookie references
 */
function findCookieReferencesInActions(
  actions: any[] | undefined,
  path: (string | number)[],
  declaredCookies: Set<string>,
  report: (data: { cookie: string }, path: (string | number)[]) => void
): void {
  if (!actions) return;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action) continue;

    // Check action input formulas
    if (action.inputs) {
      for (const [inputName, inputFormula] of Object.entries(action.inputs)) {
        const cookieName = referencesCookie(inputFormula as Formula);
        if (cookieName && !declaredCookies.has(cookieName)) {
          report({ cookie: cookieName }, [...path, i, 'inputs', inputName]);
        }
      }
    }

    // Recursively check nested actions
    if (action.actions) {
      findCookieReferencesInActions(action.actions, [...path, i, 'actions'], declaredCookies, report);
    }
    if (action.then) {
      findCookieReferencesInActions(action.then, [...path, i, 'then'], declaredCookies, report);
    }
    if (action.else) {
      findCookieReferencesInActions(action.else, [...path, i, 'else'], declaredCookies, report);
    }
    if (action.cases) {
      for (let j = 0; j < action.cases.length; j++) {
        const caseItem = action.cases[j];
        if (caseItem?.actions) {
          findCookieReferencesInActions(caseItem.actions, [...path, i, 'cases', j, 'actions'], declaredCookies, report);
        }
      }
    }
  }
}

export const unknownCookieRule: Rule<{ cookie: string }> = {
  code: 'unknown cookie',
  level: 'error',
  category: 'misc',
  visit: (report, ctx) => {
    const { files } = ctx;

    // Collect all declared cookies
    const declaredCookies = collectDeclaredCookies(files);

    // Check components for cookie references
    for (const [compName, component] of Object.entries(files.components || {})) {
      if (!component?.nodes) continue;

      // Check nodes
      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node) continue;
        findCookieReferencesInNode(node, nodeId, compName, declaredCookies, report);
      }

      // Check event handlers
      if (component.events) {
        for (const [eventName, event] of Object.entries(component.events)) {
          if (event?.actions) {
            findCookieReferencesInActions(
              event.actions,
              ['components', compName, 'events', eventName, 'actions'],
              declaredCookies,
              report
            );
          }
        }
      }

      // Check workflows
      if (component.workflows) {
        for (const [workflowName, workflow] of Object.entries(component.workflows)) {
          if (workflow?.actions) {
            findCookieReferencesInActions(
              workflow.actions,
              ['components', compName, 'workflows', workflowName, 'actions'],
              declaredCookies,
              report
            );
          }
        }
      }
    }
  },
};
