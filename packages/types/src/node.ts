/**
 * Node Model Types
 * Based on specs/component-system.md
 */

import type { Formula } from './formula';
import type { EventModel } from './component';

// ============================================================================
// Node Model (Union Type)
// ============================================================================

export type NodeModel =
  | ElementNodeModel
  | TextNodeModel
  | ComponentNodeModel
  | SlotNodeModel;

// ============================================================================
// Common Fields (all node types)
// ============================================================================

export interface NodeBase {
  id?: string;
  type: 'element' | 'text' | 'component' | 'slot';
  condition?: Formula;
  repeat?: Formula;
  repeatKey?: Formula;
  slot?: string;
}

// ============================================================================
// Element Node
// ============================================================================

export interface ElementNodeModel extends NodeBase {
  type: 'element';
  tag: string;
  attrs?: Record<string, Formula>;
  style?: NodeStyleModel;
  variants?: StyleVariant[];
  animations?: Record<string, Record<string, AnimationKeyframe>>;
  children: string[];
  events?: Record<string, EventModel>;
  classes?: Record<string, { formula?: Formula }>;
  customProperties?: Record<string, CustomProperty>;
}

export interface NodeStyleModel {
  [property: string]: Formula;
}

export interface StyleVariant {
  name: string;
  mediaQuery?: Formula;
  style?: NodeStyleModel;
  customProperties?: Record<string, CustomProperty>;
}

export interface AnimationKeyframe {
  offset: number;
  properties: Record<string, Formula>;
}

export interface CustomProperty {
  formula: Formula;
  unit?: string;
}

// ============================================================================
// Text Node
// ============================================================================

export interface TextNodeModel extends NodeBase {
  type: 'text';
  value: Formula;
  children?: never;
}

// ============================================================================
// Component Node
// ============================================================================

export interface ComponentNodeModel extends NodeBase {
  type: 'component';
  name: string;
  package?: string;
  path?: string;
  attrs: Record<string, Formula>;
  children: string[];
  events?: Record<string, EventModel>;
  style?: NodeStyleModel;
  variants?: StyleVariant[];
  customProperties?: Record<string, CustomProperty>;
}

// ============================================================================
// Slot Node
// ============================================================================

export interface SlotNodeModel extends NodeBase {
  type: 'slot';
  name?: string;
  children: string[];
  repeat?: never;
  repeatKey?: never;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isElementNode(node: NodeModel): node is ElementNodeModel {
  return node.type === 'element';
}

export function isTextNode(node: NodeModel): node is TextNodeModel {
  return node.type === 'text';
}

export function isComponentNode(node: NodeModel): node is ComponentNodeModel {
  return node.type === 'component';
}

export function isSlotNode(node: NodeModel): node is SlotNodeModel {
  return node.type === 'slot';
}

// ============================================================================
// Helpers
// ============================================================================

export function getNodeChildren(node: NodeModel): string[] {
  if (node.type === 'text') return [];
  return node.children;
}
