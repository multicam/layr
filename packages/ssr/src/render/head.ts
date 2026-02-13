import type { Component } from '@layr/types';

export interface HeadItem {
  type: string;
  attrs?: Record<string, string | null>;
  content?: string;
}

/**
 * Extract head items from component
 */
export function getHeadItems(component: Component): HeadItem[] {
  const items: HeadItem[] = [];
  const nodes = component.nodes || {};
  
  // Look for head elements in the component
  for (const node of Object.values(nodes)) {
    if (node.type === 'element' && (node as any).tag === 'head') {
      // Process head children
      const children = (node as any).children || [];
      for (const childId of children) {
        const child = nodes[childId];
        if (child && child.type === 'element') {
          const element = child as any;
          const item = nodeToHeadItem(element);
          if (item) items.push(item);
      }
    }
    }
  }
  
  // Also check page route info
  const route = component.route || {};
  if (route.title) {
    items.push({ type: 'title', content: route.title });
  }
  
  if (route.description) {
    items.push({ 
      type: 'meta', 
      attrs: { name: 'description', content: route.description } 
    });
  }
  
  return items;
}

/**
 * Convert node to head item
 */
function nodeToHeadItem(node: any): HeadItem | null {
  const tag = node.tag?.toLowerCase();
  
  switch (tag) {
    case 'title':
      return { type: 'title', content: getTextContent(node) };
      
    case 'meta':
      return { type: 'meta', attrs: extractAttrs(node) };
      
    case 'link':
      return { type: 'link', attrs: extractAttrs(node) };
      
    case 'script':
      return { 
        type: 'script', 
        attrs: extractAttrs(node),
        content: getTextContent(node),
      };
      
    case 'style':
      return { type: 'style', content: getTextContent(node) };
      
    case 'base':
      return { type: 'base', attrs: extractAttrs(node) };
      
    default:
      return null;
  }
}

/**
 * Extract attributes from node
 */
function extractAttrs(node: any): Record<string, string | null> {
  const attrs: Record<string, string | null> = {};
  
  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      if ((value as any)?.type === 'value') {
        attrs[key] = String((value as any).value ?? '');
      }
    }
  }
  
  return attrs;
}

/**
 * Get text content from node
 */
function getTextContent(node: any): string {
  if (!node.children) return '';
  
  // This would need access to all nodes to resolve children
  // Simplified version
  return '';
}

/**
 * Render head items to HTML
 */
export function renderHeadItems(items: HeadItem[]): string {
  return items.map(item => renderHeadItem(item)).join('\n');
}

/**
 * Render single head item
 */
function renderHeadItem(item: HeadItem): string {
  switch (item.type) {
    case 'title':
      return `<title>${escapeHtml(item.content || '')}</title>`;
      
    case 'meta':
      return renderVoidElement('meta', item.attrs);
      
    case 'link':
      return renderVoidElement('link', item.attrs);
      
    case 'script':
      return renderElement('script', item.attrs, item.content || '');
      
    case 'style':
      return renderElement('style', item.attrs, item.content || '');
      
    case 'base':
      return renderVoidElement('base', item.attrs);
      
    default:
      return '';
  }
}

/**
 * Render void element (self-closing)
 */
function renderVoidElement(tag: string, attrs?: Record<string, string | null>): string {
  const attrStr = attrs ? renderAttrs(attrs) : '';
  return `<${tag}${attrStr}>`;
}

/**
 * Render element with content
 */
function renderElement(tag: string, attrs: Record<string, string | null> | undefined, content: string): string {
  const attrStr = attrs ? renderAttrs(attrs) : '';
  return `<${tag}${attrStr}>${escapeHtml(content)}</${tag}>`;
}

/**
 * Render attributes
 */
function renderAttrs(attrs: Record<string, string | null>): string {
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null) {
      parts.push(` ${key}`);
    } else {
      parts.push(` ${key}="${escapeAttr(value)}"`);
    }
  }
  
  return parts.join('');
}

/**
 * Escape HTML
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape attribute value
 */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
