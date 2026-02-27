/**
 * Unknown Classname Rule
 * Detects className attribute references to class names not defined in the project
 *
 * Class names should be defined in themes, global styles, or component styles.
 */

import type { Rule } from '../../types';
import type { ComponentNode, Formula } from '@layr/types';

/**
 * Collect all defined class names from the project
 */
function collectDefinedClassnames(files: any): Set<string> {
  const defined = new Set<string>();

  // Check global CSS classes
  if (files.globalStyles?.classes) {
    for (const className of Object.keys(files.globalStyles.classes)) {
      defined.add(className);
    }
  }

  // Check theme classes
  if (files.themes) {
    for (const theme of Object.values(files.themes)) {
      if (!theme) continue;
      if ((theme as any).classes) {
        for (const className of Object.keys((theme as any).classes)) {
          defined.add(className);
        }
      }
    }
  }

  // Check component-level style classes
  for (const [compName, component] of Object.entries(files.components || {})) {
    if (!component) continue;

    // Check component styles
    if ((component as any).styles?.classes) {
      for (const className of Object.keys((component as any).styles.classes)) {
        defined.add(className);
      }
    }

    // Check nodes for style classes
    if (component.nodes) {
      for (const node of Object.values(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        // Collect class names defined in node styles
        if (node.styles) {
          for (const styleDecls of Object.values(node.styles)) {
            for (const decl of styleDecls as any[] || []) {
              if (decl?.className) {
                defined.add(decl.className);
              }
            }
          }
        }
      }
    }
  }

  // Add common utility classes that are always available
  const utilityClasses = [
    'hidden', 'visible', 'flex', 'grid', 'block', 'inline', 'inline-block',
    'absolute', 'relative', 'fixed', 'sticky',
  ];
  utilityClasses.forEach(cls => defined.add(cls));

  return defined;
}

/**
 * Extract class names from a className formula
 */
function extractClassnames(formula: Formula | undefined): string[] {
  if (!formula) return [];

  const classNames: string[] = [];

  if (formula.type === 'value') {
    const value = formula.value;
    if (typeof value === 'string') {
      // Split by spaces to get individual class names
      classNames.push(...value.split(/\s+/).filter(c => c.length > 0));
    }
    if (Array.isArray(value)) {
      classNames.push(...value.filter(v => typeof v === 'string'));
    }
  }

  if (formula.type === 'path') {
    // Dynamic class name - can't validate statically
    return [];
  }

  if (formula.type === 'function') {
    // Check function arguments for class names
    if (formula.name === 'concatenate' || formula.name === '@toddle/concatenate') {
      for (const arg of Object.values(formula.args || {})) {
        classNames.push(...extractClassnames(arg as Formula));
      }
    }
  }

  return classNames;
}

export const unknownClassnameRule: Rule<{ classname: string }> = {
  code: 'unknown classname',
  level: 'error',
  category: 'styles',
  visit: (report, ctx) => {
    const { files } = ctx;

    // Collect all defined class names
    const definedClassnames = collectDefinedClassnames(files);

    // Check className attributes in components
    for (const [compName, component] of Object.entries(files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node || node.type !== 'element') continue;

        const elementNode = node;
        const attrs = elementNode.attrs || {};

        // Check className attribute
        const classNameAttr = attrs['className'] || attrs['class'];
        if (!classNameAttr) continue;

        const classNames = extractClassnames(classNameAttr);

        for (const className of classNames) {
          if (!definedClassnames.has(className)) {
            report(
              { classname: className },
              ['components', compName, 'nodes', nodeId, 'attrs', 'className']
            );
          }
        }
      }
    }
  },
};
