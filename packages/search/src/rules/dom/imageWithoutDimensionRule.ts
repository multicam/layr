/**
 * Image Without Dimension Rule
 * Detects <img> elements missing width, height, or aspect-ratio CSS properties
 *
 * This causes Cumulative Layout Shift (CLS) - a Core Web Vital metric.
 * Images should have explicit dimensions to prevent layout shifts during load.
 */

import type { Rule } from '../../types';
import type { ComponentNode, StyleMap } from '@layr/types';

/**
 * Check if a style map contains dimension-related properties
 */
function hasDimensionStyles(styles: StyleMap | undefined): boolean {
  if (!styles) return false;

  // Check for width/height/aspect-ratio in any breakpoint
  for (const breakpointStyles of Object.values(styles)) {
    if (!breakpointStyles) continue;

    for (const styleDecl of breakpointStyles) {
      if (!styleDecl) continue;

      const prop = styleDecl.property?.toLowerCase();
      if (prop === 'width' || prop === 'height' || prop === 'aspect-ratio') {
        // Check if the value is not empty
        const value = styleDecl.value;
        if (value !== undefined && value !== null && value !== '') {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if attrs contain width or height attributes
 */
function hasDimensionAttrs(node: ComponentNode): boolean {
  if (node.type !== 'element') return false;

  const attrs = node.attrs || {};

  // Check for width attribute
  const widthAttr = attrs['width'];
  if (widthAttr) {
    if (widthAttr.type === 'value' && widthAttr.value !== null && widthAttr.value !== undefined && widthAttr.value !== '') {
      return true;
    }
    if (widthAttr.type === 'path' || widthAttr.type === 'function') {
      return true;
    }
  }

  // Check for height attribute
  const heightAttr = attrs['height'];
  if (heightAttr) {
    if (heightAttr.type === 'value' && heightAttr.value !== null && heightAttr.value !== undefined && heightAttr.value !== '') {
      return true;
    }
    if (heightAttr.type === 'path' || heightAttr.type === 'function') {
      return true;
    }
  }

  return false;
}

export const imageWithoutDimensionRule: Rule<{ tag: string }> = {
  code: 'image without dimension',
  level: 'warning',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;

        // Only check img elements
        if (elementNode.tag !== 'img') continue;

        // Check if element has dimension attributes
        if (hasDimensionAttrs(elementNode)) continue;

        // Check if element has dimension styles
        if (hasDimensionStyles(elementNode.styles)) continue;

        // No dimensions found - report issue
        report({ tag: elementNode.tag }, ['components', compName, 'nodes', nodeId]);
      }
    }
  },
};
