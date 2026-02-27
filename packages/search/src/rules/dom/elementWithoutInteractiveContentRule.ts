/**
 * Element Without Interactive Content Rule
 * Detects non-interactive elements (like div, span) with click handlers
 * This is an accessibility concern - interactive elements should be used for interactivity
 */

import type { Rule } from '../../types';
import type { Formula, ComponentNode } from '@layr/types';

/**
 * Interactive HTML elements
 */
const INTERACTIVE_ELEMENTS = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'option',
  'optgroup',
  'details',
  'summary',
  'dialog',
  'menu',
  'menuitem',
]);

/**
 * Check if an element has an event handler
 */
function hasClickHandler(node: ComponentNode): boolean {
  if (node.type !== 'element') return false;

  const events = node.events;
  if (!events) return false;

  // Check for click-related events
  const clickEvents = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
  for (const eventType of clickEvents) {
    if (events[eventType]) {
      return true;
    }
  }

  return false;
}

/**
 * Check if element has an interactive role attribute
 */
function hasInteractiveRole(node: ComponentNode): boolean {
  if (node.type !== 'element') return false;

  const attrs = node.attrs || {};
  const roleAttr = attrs['role'];

  if (!roleAttr) return false;

  // Check if role is a static value
  if (roleAttr.type === 'value') {
    const interactiveRoles = new Set([
      'button',
      'link',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'option',
      'tab',
      'checkbox',
      'radio',
      'switch',
      'slider',
      'spinbutton',
      'textbox',
      'searchbox',
      'combobox',
    ]);
    return interactiveRoles.has(roleAttr.value as string);
  }

  // Dynamic role - assume it might be interactive
  if (roleAttr.type === 'path' || roleAttr.type === 'function') {
    return true;
  }

  return false;
}

/**
 * Check if element has tabindex making it focusable
 */
function hasTabIndex(node: ComponentNode): boolean {
  if (node.type !== 'element') return false;

  const attrs = node.attrs || {};
  const tabindexAttr = attrs['tabindex'];

  if (!tabindexAttr) return false;

  // Check if tabindex is a static value >= 0
  if (tabindexAttr.type === 'value') {
    const val = tabindexAttr.value;
    if (typeof val === 'number' && val >= 0) {
      return true;
    }
  }

  // Dynamic tabindex - assume it might be focusable
  if (tabindexAttr.type === 'path' || tabindexAttr.type === 'function') {
    return true;
  }

  return false;
}

export const elementWithoutInteractiveContentRule: Rule<{ tag: string }> = {
  code: 'element without interactive content',
  level: 'warning',
  category: 'dom',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;
        const tag = elementNode.tag;

        // Skip if it's already an interactive element
        if (INTERACTIVE_ELEMENTS.has(tag)) continue;

        // Check if it has a click handler
        if (!hasClickHandler(elementNode)) continue;

        // Check if it has accessibility attributes making it interactive
        if (hasInteractiveRole(elementNode)) continue;
        if (hasTabIndex(elementNode)) continue;

        // Report issue - non-interactive element with click handler
        report({ tag }, ['components', compName, 'nodes', nodeId]);
      }
    }
  },
};
