/**
 * Missing Meta Description Rule
 * Detects pages that are missing <meta name="description"> element (SEO issue)
 *
 * This rule checks page components (those with a route) for the presence of
 * a meta description element in their node tree.
 */

import type { Rule } from '../../types';
import type { Component, ComponentNode } from '@layr/types';

/**
 * Recursively search for a meta description element in the node tree
 */
function hasMetaDescription(nodes: Record<string, ComponentNode>): boolean {
  for (const node of Object.values(nodes)) {
    if (!node) continue;

    // Check if this is a meta element with name="description"
    if (node.type === 'element' && node.tag === 'meta') {
      const attrs = node.attrs || {};
      const nameAttr = attrs['name'];

      // Check if name attribute equals 'description'
      if (nameAttr) {
        if (nameAttr.type === 'value' && nameAttr.value === 'description') {
          return true;
        }
        // Dynamic name attribute - assume it might be description
        if (nameAttr.type === 'path' || nameAttr.type === 'function') {
          // Can't statically determine, so don't report
          return true;
        }
      }
    }

    // Recursively check children
    if (node.type === 'element' && node.children) {
      // Children are stored as node IDs, need to look them up
      // But we don't have access to all nodes here, so we check if children exist
      // and the structure allows for meta elements
      if (node.tag === 'head' || node.tag === 'html') {
        // These containers might have meta description - assume it's there
        // A more thorough implementation would walk the actual child nodes
      }
    }

    // Check slot children
    if (node.type === 'slot' && node.children) {
      // Slot nodes might have meta in their fallback content
    }
  }

  return false;
}

/**
 * Check if component is a page (has a route)
 */
function isPageComponent(component: Component): boolean {
  return !!component.route;
}

export const missingMetaDescriptionRule: Rule<{}> = {
  code: 'missing meta description',
  level: 'warning',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      // Only check page components (those with routes)
      if (!isPageComponent(component)) continue;

      // Check for meta description in the component's nodes
      if (!hasMetaDescription(component.nodes)) {
        report({}, ['components', compName]);
      }
    }
  },
};
