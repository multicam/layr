/**
 * No Reference Global CSS Variable Rule
 * Detects global CSS variables that are defined but never referenced anywhere in the project
 *
 * This indicates dead code in CSS variables.
 */

import type { Rule } from '../../types';
import type { StyleMap, ComponentNode, Formula } from '@layr/types';

/**
 * Collect all CSS variable usages from the project
 */
function collectCSSVariableUsages(files: any): Set<string> {
  const used = new Set<string>();

  /**
   * Extract CSS variable references from a style value
   */
  function extractRefs(value: string): void {
    const varRegex = /var\s*\(\s*(--[a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = varRegex.exec(value)) !== null) {
      used.add(match[1]);
      // Also add without -- prefix
      used.add(match[1].substring(2));
    }
  }

  // Check styles in components
  for (const [compName, component] of Object.entries(files.components || {})) {
    if (!component?.nodes) continue;

    for (const node of Object.values(component.nodes)) {
      if (!node) continue;

      if (node.type === 'element' && node.styles) {
        for (const styleDecls of Object.values(node.styles)) {
          for (const decl of (styleDecls as any[]) || []) {
            if (!decl) continue;
            if (decl.value?.type === 'formula') continue;
            if (typeof decl.value === 'string') {
              extractRefs(decl.value);
            }
          }
        }
      }
    }
  }

  // Check global styles
  if (files.globalStyles?.styles) {
    for (const styles of Object.values(files.globalStyles.styles)) {
      if (typeof styles === 'object') {
        for (const value of Object.values(styles)) {
          if (typeof value === 'string') {
            extractRefs(value);
          }
        }
      }
    }
  }

  return used;
}

/**
 * Collect all defined global CSS variables
 */
function collectGlobalCSSVariables(files: any): Map<string, (string | number)[]> {
  const defined = new Map<string, (string | number)[]>();

  // Check global CSS variables
  if (files.globalStyles?.cssVariables) {
    for (const varName of Object.keys(files.globalStyles.cssVariables)) {
      defined.set(varName, ['globalStyles', 'cssVariables', varName]);
    }
  }

  // Check theme CSS variables (themes are global)
  if (files.themes) {
    for (const [themeName, theme] of Object.entries(files.themes)) {
      if (!theme) continue;
      if ((theme as any).cssVariables) {
        for (const varName of Object.keys((theme as any).cssVariables)) {
          defined.set(varName, ['themes', themeName, 'cssVariables', varName]);
        }
      }
    }
  }

  return defined;
}

export const noReferenceGlobalCSSVariableRule: Rule<{ variable: string }> = {
  code: 'no reference global css variable',
  level: 'warning',
  category: 'styles',
  visit: (report, ctx) => {
    const { files } = ctx;

    // Collect all CSS variable usages
    const usedVars = collectCSSVariableUsages(files);

    // Collect all defined global CSS variables
    const globalVars = collectGlobalCSSVariables(files);

    // Report unused global CSS variables
    for (const [varName, path] of globalVars) {
      const varWithoutPrefix = varName.startsWith('--') ? varName.substring(2) : varName;
      const varWithPrefix = varName.startsWith('--') ? varName : `--${varName}`;

      // Check if variable is used
      if (!usedVars.has(varName) && !usedVars.has(varWithoutPrefix) && !usedVars.has(varWithPrefix)) {
        report({ variable: varName }, path);
      }
    }
  },
};
