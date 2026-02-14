/**
 * Static Condition Rules
 * Detects conditions that always evaluate to true or false
 */

import type { Rule } from '../../types';
import { contextlessEvaluateFormula } from '../../contextless';
import type { Formula } from '@layr/types';

export const noStaticNodeConditionRule: Rule = {
  code: 'no static node condition',
  level: 'warning',
  category: 'logic',
  visit: (report, ctx) => {
    const walkFormula = (formula: Formula | undefined, path: (string | number)[]): void => {
      if (!formula || typeof formula !== 'object') return;
      
      const result = contextlessEvaluateFormula(formula);
      if (result.isStatic) {
        report({ 
          isTruthy: !!result.result,
          value: result.result 
        }, path, ['remove-condition']);
      }
    };
    
    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;
        if (node.condition) {
          walkFormula(node.condition, ['components', name, 'nodes', nodeId, 'condition']);
        }
      }
    }
  },
  fixes: {
    'remove-condition': ({ files, path }) => {
      const compName = path[1] as string;
      const nodeId = path[3] as string;
      const newFiles = structuredClone(files);
      const node = newFiles.components?.[compName]?.nodes?.[nodeId];
      if (node) {
        delete (node as any).condition;
      }
      return newFiles;
    }
  }
};

export const noUnnecessaryConditionTruthyRule: Rule = {
  code: 'no unnecessary condition truthy',
  level: 'warning',
  category: 'logic',
  visit: (report, ctx) => {
    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node?.condition) continue;
        
        const result = contextlessEvaluateFormula(node.condition);
        if (result.isStatic && result.result === true) {
          report({ nodeId }, ['components', name, 'nodes', nodeId, 'condition'], ['remove-condition']);
        }
      }
    }
  },
  fixes: {
    'remove-condition': ({ files, path }) => {
      const compName = path[1] as string;
      const nodeId = path[3] as string;
      const newFiles = structuredClone(files);
      const node = newFiles.components?.[compName]?.nodes?.[nodeId];
      if (node) {
        delete (node as any).condition;
      }
      return newFiles;
    }
  }
};

export const noUnnecessaryConditionFalsyRule: Rule = {
  code: 'no unnecessary condition falsy',
  level: 'warning',
  category: 'logic',
  visit: (report, ctx) => {
    for (const [name, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node?.condition) continue;
        
        const result = contextlessEvaluateFormula(node.condition);
        if (result.isStatic && !result.result) {
          report({ nodeId }, ['components', name, 'nodes', nodeId, 'condition'], ['remove-node']);
        }
      }
    }
  },
  fixes: {
    'remove-node': ({ files, path }) => {
      const compName = path[1] as string;
      const nodeId = path[3] as string;
      const newFiles = structuredClone(files);
      const component = newFiles.components?.[compName];
      if (component?.nodes) {
        delete component.nodes[nodeId];
      }
      return newFiles;
    }
  }
};
