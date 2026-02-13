/**
 * Element Definitions Types
 * Based on specs/element-definitions.md
 */

import type { NodeModel } from './node';

// ============================================================================
// Element Categories
// ============================================================================

export type ElementCategory = 
  | 'form'
  | 'typography'
  | 'media'
  | 'svg'
  | 'semantic'
  | 'interactive'
  | 'table'
  | 'list'
  | 'container';

// ============================================================================
// Element Metadata
// ============================================================================

export interface ElementMetadata {
  /** Element tag name */
  name: string;
  /** UI categories for filtering */
  categories: ElementCategory[];
  /** Human-readable description */
  description?: string;
  /** MDN documentation URL */
  link?: string;
  /** Search aliases for discovery */
  aliases?: string[];
  /** Self-closing element (no children) */
  isVoid?: true;
  /** Prioritized in search results */
  isPopular?: true;
  /** Allowed child element tags */
  permittedChildren?: string[];
  /** Allowed parent element tags */
  permittedParents?: string[];
  /** DOM interface inheritance chain */
  interfaces?: string[];
}

// ============================================================================
// Element Definition
// ============================================================================

export interface ElementDefinition {
  metadata: ElementMetadata;
  element: {
    type: 'nodes';
    source: 'catalog';
    nodes: Record<string, NodeModel>;
  };
}

// ============================================================================
// Interface Attribute Metadata
// ============================================================================

export interface InterfaceAttribute {
  description?: string;
  values?: string[];
}

export interface InterfaceEvent {
  description?: string;
}

export interface InterfaceInfo {
  attributes?: Record<string, InterfaceAttribute>;
  events?: Record<string, InterfaceEvent>;
}

// ============================================================================
// Element Registry Types
// ============================================================================

export interface ElementRegistry {
  html: Record<string, ElementDefinition>;
  svg: Record<string, ElementDefinition>;
  interfaces: Record<string, InterfaceInfo>;
}

// ============================================================================
// Void Elements
// ============================================================================

export const VOID_ELEMENTS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
] as const;

export type VoidElement = typeof VOID_ELEMENTS[number];

export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.includes(tag as VoidElement);
}

// ============================================================================
// Popular Elements
// ============================================================================

export const POPULAR_ELEMENTS = [
  'a',
  'button',
  'div',
  'form',
  'h1',
  'h2',
  'h3',
  'img',
  'input',
  'label',
  'li',
  'p',
  'span',
  'ul',
] as const;

export type PopularElement = typeof POPULAR_ELEMENTS[number];

export function isPopularElement(tag: string): boolean {
  return POPULAR_ELEMENTS.includes(tag as PopularElement);
}

// ============================================================================
// Structural Rules
// ============================================================================

export const PERMITTED_CHILDREN: Record<string, string[]> = {
  dl: ['dd', 'dt', 'div', 'script', 'template'],
  ol: ['li', 'template', 'script'],
  ul: ['li', 'template', 'script'],
  select: ['option', 'optgroup', 'hr'],
  optgroup: ['option'],
  table: ['tbody', 'thead', 'tfoot', 'tr', 'colgroup', 'caption'],
  tbody: ['tr'],
  thead: ['tr'],
  tfoot: ['tr'],
  tr: ['td', 'th', 'script', 'template'],
};

export const PERMITTED_PARENTS: Record<string, string[]> = {
  optgroup: ['select'],
  option: ['select', 'datalist', 'optgroup'],
  td: ['tr'],
  th: ['tr'],
  li: ['ul', 'ol', 'menu'],
  legend: ['fieldset'],
  figcaption: ['figure'],
  caption: ['table'],
  tbody: ['table'],
  thead: ['table'],
  tfoot: ['table'],
};

// ============================================================================
// Default Attributes
// ============================================================================

export const DEFAULT_ATTRIBUTES: Record<string, Record<string, string>> = {
  a: { href: '/', 'data-prerender': 'moderate' },
  img: { src: '', alt: '' },
  input: { type: 'text', value: '', placeholder: '' },
  button: { type: 'button' },
  form: { action: '' },
  iframe: { src: '' },
  video: { src: '' },
  textarea: { name: '' },
  select: { name: '' },
  embed: { src: '', type: '' },
};

// ============================================================================
// Type Guards
// ============================================================================

export function isElementDefinition(value: unknown): value is ElementDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'metadata' in value &&
    'element' in value &&
    typeof (value as ElementDefinition).metadata.name === 'string'
  );
}
