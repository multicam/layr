import type { Formula } from '@layr/types';
import type { FormulaContext } from '@layr/core';
import type { RenderContext } from './component';
import type { NodeModel } from '@layr/types';

/**
 * Evaluate a condition formula
 */
export function evaluateCondition(
  condition: Formula | undefined,
  ctx: RenderContext
): boolean {
  if (!condition) return true;
  
  // Simple value evaluation
  if (condition.type === 'value') {
    return toBoolean(condition.value);
  }
  
  // For more complex formulas, we'd need full evaluation
  // This is a simplified version
  return true;
}

/**
 * Evaluate repeat formula and return items
 */
export function evaluateRepeat(
  repeat: Formula | undefined,
  ctx: RenderContext
): unknown[] {
  if (!repeat) return [null]; // No repeat = single render
  
  // Simple array evaluation
  if (repeat.type === 'value') {
    const value = repeat.value;
    if (Array.isArray(value)) return value;
    return [null];
  }
  
  return [null];
}

/**
 * Create repeated elements for a node
 */
export function createRepeatedNodes(
  node: NodeModel,
  allNodes: Record<string, NodeModel>,
  ctx: RenderContext
): Array<{ node: NodeModel; listItem: ListItemContext | null }> {
  const items = evaluateRepeat((node as any).repeat, ctx);
  const repeatKey = (node as any).repeatKey;
  
  return items.map((item, index) => {
    const listItem: ListItemContext | null = items.length === 1 && index === 0 && item === null
      ? null
      : {
          Item: item,
          Index: index,
          Key: repeatKey?.type === 'value' 
            ? String(repeatKey.value ?? index)
            : String(index),
        };
    
    return { node, listItem };
  });
}

/**
 * Check if node should render based on condition
 */
export function shouldRender(
  node: NodeModel,
  ctx: RenderContext
): boolean {
  const condition = (node as any).condition;
  if (!condition) return true;
  
  return evaluateCondition(condition, ctx);
}

// Helper
function toBoolean(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

interface ListItemContext {
  Item: unknown;
  Index: number;
  Key: string;
}
