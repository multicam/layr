/**
 * Node Model Types
 * Based on specs/component-system.md
 *
 * Field names match the JSON schema (schemas.ts is the source of truth).
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
// Style Variant & Custom Properties
// ============================================================================

export interface MediaQuery {
  'min-width'?: string;
  'max-width'?: string;
  'min-height'?: string;
  'max-height'?: string;
  'prefers-reduced-motion'?: 'reduce' | 'no-preference';
}

export type BreakpointName = 'small' | 'medium' | 'large';

export interface StyleVariant {
  id?: string;
  className?: string;
  hover?: boolean;
  active?: boolean;
  focus?: boolean;
  focusWithin?: boolean;
  disabled?: boolean;
  checked?: boolean;
  empty?: boolean;
  firstChild?: boolean;
  lastChild?: boolean;
  evenChild?: boolean;
  oddChild?: boolean;
  autofill?: boolean;
  startingStyle?: boolean;
  mediaQuery?: MediaQuery;
  breakpoint?: BreakpointName;
  pseudoElement?: string;
  style?: Record<string, string>;
  customProperties?: Record<string, CustomProperty>;
}

export interface AnimationKeyframe {
  position: number;
  key: string;
  value: string;
}

export interface CustomProperty {
  formula: Formula;
  unit?: string;
}

// ============================================================================
// Element Node
// ============================================================================

export interface ElementNodeModel extends NodeBase {
  type: 'element';
  tag: string;
  attrs?: Record<string, Formula>;
  style?: Record<string, string>;
  variants?: StyleVariant[];
  animations?: Record<string, Record<string, AnimationKeyframe>>;
  children: string[];
  events?: Record<string, EventModel>;
  classes?: Record<string, { formula?: Formula }>;
  customProperties?: Record<string, CustomProperty>;
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
  style?: Record<string, string>;
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
