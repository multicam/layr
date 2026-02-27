/**
 * Unknown CSS Variable Rule
 * Detects CSS var() references to undefined CSS custom properties
 *
 * CSS variables should be declared (typically in :root or component styles)
 * before being used.
 */

import type { Rule } from '../../types';
import type { StyleMap, ComponentNode } from '@layr/types';

/**
 * Collect all defined CSS variables from the project
 */
function collectDefinedCSSVariables(files: any): Set<string> {
  const defined = new Set<string>();

  // Check global CSS variables
  if (files.globalStyles?.cssVariables) {
    for (const varName of Object.keys(files.globalStyles.cssVariables)) {
      defined.add(varName);
      // Also add without -- prefix for matching
      if (varName.startsWith('--')) {
        defined.add(varName.substring(2));
      }
    }
  }

  // Check theme CSS variables
  if (files.themes) {
    for (const theme of Object.values(files.themes)) {
      if (!theme) continue;
      if ((theme as any).cssVariables) {
        for (const varName of Object.keys((theme as any).cssVariables)) {
          defined.add(varName);
          if (varName.startsWith('--')) {
            defined.add(varName.substring(2));
          }
        }
      }
    }
  }

  // Check component-level CSS variables
  for (const [compName, component] of Object.entries(files.components || {})) {
    if (!component) continue;

    if ((component as any).cssVariables) {
      for (const varName of Object.keys((component as any).cssVariables)) {
        defined.add(varName);
        if (varName.startsWith('--')) {
          defined.add(varName.substring(2));
        }
      }
    }
  }

  // Add common CSS variables that might be available
  const commonVars = [
    // Browser defaults (not real, but commonly expected)
  ];
  commonVars.forEach(v => defined.add(v));

  return defined;
}

/**
 * Extract CSS variable references from a style value
 */
function extractCSSVariableRefs(value: string): string[] {
  const refs: string[] = [];
  // Match var(--name) or var(--name, fallback)
  const varRegex = /var\s*\(\s*(--[a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = varRegex.exec(value)) !== null) {
    refs.push(match[1]); // Include -- prefix
  }
  return refs;
}

/**
 * Check styles for CSS variable references
 */
function checkStylesForCSSVariables(
  styles: StyleMap | undefined,
  nodeId: string,
  compName: string,
  definedVars: Set<string>,
  report: (data: { variable: string; property: string }, path: (string | number)[]) => void
): void {
  if (!styles) return;

  for (const [breakpoint, styleDecls] of Object.entries(styles)) {
    if (!styleDecls) continue;

    for (const styleDecl of styleDecls) {
      if (!styleDecl) continue;

      // Skip formula values (evaluated at runtime)
      if (styleDecl.value?.type === 'formula') continue;

      const value = styleDecl.value;
      if (typeof value !== 'string') continue;

      const refs = extractCSSVariableRefs(value);
      for (const varRef of refs) {
        // Check if variable is defined (with or without -- prefix)
        const varWithoutPrefix = varRef.startsWith('--') ? varRef.substring(2) : varRef;
        if (!definedVars.has(varRef) && !definedVars.has(varWithoutPrefix)) {
          report(
            { variable: varRef, property: styleDecl.property },
            ['components', compName, 'nodes', nodeId, 'styles', breakpoint, styleDecl.property]
          );
        }
      }
    }
  }
}

export const unknownCSSVariableRule: Rule<{ variable: string; property: string }> = {
  code: 'unknown css variable',
  level: 'error',
  category: 'styles',
  visit: (report, ctx) => {
    const { files } = ctx;

    // Collect all defined CSS variables
    const definedVars = collectDefinedCSSVariables(files);

    // Check styles in components for CSS variable references
    for (const [compName, component] of Object.entries(files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node) continue;

        if (node.type === 'element' && node.styles) {
          checkStylesForCSSVariables(
            node.styles,
            nodeId,
            compName,
            definedVars,
            report
          );
        }
      }
    }

    // Check global styles for CSS variable references
    if (files.globalStyles?.styles) {
      for (const [selector, styles] of Object.entries(files.globalStyles.styles)) {
        if (typeof styles === 'object') {
          for (const [property, value] of Object.entries(styles)) {
            if (typeof value === 'string') {
              const refs = extractCSSVariableRefs(value);
              for (const varRef of refs) {
                const varWithoutPrefix = varRef.startsWith('--') ? varRef.substring(2) : varRef;
                if (!definedVars.has(varRef) && !definedVars.has(varWithoutPrefix)) {
                  report(
                    { variable: varRef, property },
                    ['globalStyles', 'styles', selector, property]
                  );
                }
              }
            }
          }
        }
      }
    }
  },
};
