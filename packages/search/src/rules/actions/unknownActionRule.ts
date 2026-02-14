/**
 * Unknown Action Rule
 * Checks for references to non-existent custom actions
 */

import type { Rule } from '../../types';

export const unknownActionRule: Rule = {
  code: 'unknown action',
  level: 'error',
  category: 'actions',
  visit: (report, ctx) => {
    const actionNames = new Set<string>();
    
    // Collect all action names
    for (const name of Object.keys(ctx.files.actions || {})) {
      actionNames.add(name);
    }
    
    // Add package actions
    for (const pkg of Object.values(ctx.files.packages || {})) {
      if (!pkg) continue;
      for (const name of Object.keys(pkg.actions || {})) {
        actionNames.add(`${pkg.manifest.name}/${name}`);
      }
    }
    
    // Standard library actions
    actionNames.add('@toddle/gotoURL');
    actionNames.add('@toddle/refresh');
    actionNames.add('@toddle/copyToClipboard');
    actionNames.add('@toddle/setLocalStorage');
    actionNames.add('@toddle/getLocalStorage');
    actionNames.add('@toddle/console');
    actionNames.add('@toddle/scrollIntoView');
    actionNames.add('@toddle/pushDataLayer');
    
    // Walk all action references
    const walkActions = (action: any, path: (string | number)[]): void => {
      if (!action || typeof action !== 'object') return;
      
      if (action.type === 'Custom' || action.type === undefined) {
        const name = action.name as string;
        if (name && !actionNames.has(name) && !name.startsWith('@toddle/')) {
          report({ actionName: name }, path);
        }
      }
      
      // Recursively check nested actions
      if (action.cases) {
        for (let i = 0; i < action.cases.length; i++) {
          for (let j = 0; j < (action.cases[i].actions?.length || 0); j++) {
            walkActions(action.cases[i].actions[j], [...path, 'cases', i, 'actions', j]);
          }
        }
      }
      if (action.default?.actions) {
        for (let j = 0; j < action.default.actions.length; j++) {
          walkActions(action.default.actions[j], [...path, 'default', 'actions', j]);
        }
      }
    };
    
    // Walk all actions in components
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      // Check workflows
      for (const [wfName, workflow] of Object.entries(component.workflows || {})) {
        if (!workflow) continue;
        for (let i = 0; i < (workflow.actions?.length || 0); i++) {
          walkActions(workflow.actions?.[i], ['components', compName, 'workflows', wfName, 'actions', i]);
        }
      }
      
      // Check events
      for (const [evtName, event] of Object.entries(component.events || {})) {
        if (!event) continue;
        for (let i = 0; i < (event.actions?.length || 0); i++) {
          walkActions(event.actions?.[i], ['components', compName, 'events', evtName, 'actions', i]);
        }
      }
      
      // Check node events
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;
        if (node.type === 'element' || node.type === 'component') {
          for (const [evtName, event] of Object.entries(node.events || {})) {
            if (!event) continue;
            for (let i = 0; i < (event.actions?.length || 0); i++) {
              walkActions(event.actions?.[i], ['components', compName, 'nodes', nodeId, 'events', evtName, 'actions', i]);
            }
          }
        }
      }
    }
  }
};
