/**
 * Invalid Style Syntax Rule
 * Detects CSS values that fail parsing (invalid CSS syntax)
 *
 * This rule uses a basic CSS parser to validate style declarations.
 * Can auto-fix by removing invalid properties.
 */

import type { Rule } from '../../types';
import type { StyleDeclaration, StyleMap, ComponentNode } from '@layr/types';

/**
 * Basic CSS property validation
 * Checks for common syntax errors in CSS values
 */
function isValidCSSValue(property: string, value: string): { valid: boolean; error?: string } {
  // Empty values are invalid
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: 'empty value' };
  }

  // Check for unbalanced parentheses
  let parenCount = 0;
  let bracketCount = 0;
  for (const char of value) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    if (parenCount < 0 || bracketCount < 0) {
      return { valid: false, error: 'unbalanced brackets' };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, error: 'unbalanced parentheses' };
  }
  if (bracketCount !== 0) {
    return { valid: false, error: 'unbalanced brackets' };
  }

  // Check for invalid var() syntax
  const varMatches = value.match(/var\s*\(/g);
  if (varMatches) {
    // Check that var() has proper syntax: var(--name) or var(--name, fallback)
    const varRegex = /var\s*\(\s*--[\w-]+(\s*,\s*.+)?\s*\)/g;
    let match;
    let validVarCount = 0;
    while ((match = varRegex.exec(value)) !== null) {
      validVarCount++;
    }
    if (validVarCount !== varMatches.length) {
      return { valid: false, error: 'invalid var() syntax' };
    }
  }

  // Check for invalid calc() syntax
  if (value.includes('calc(')) {
    const calcRegex = /calc\s*\([^)]*\)/g;
    const calcMatches = value.match(calcRegex);
    if (calcMatches) {
      for (const calcMatch of calcMatches) {
        // Basic validation - should have operators between values
        const inner = calcMatch.replace(/calc\s*\(\s*/, '').replace(/\s*\)$/, '');
        if (inner.length > 0 && !/[\+\-\*\/]/.test(inner)) {
          // calc() with a single value might be valid, but often indicates an error
          // Only flag if it's clearly malformed
        }
      }
    }
  }

  // Check for invalid color values
  if (property.includes('color') || property === 'background' || property === 'border-color') {
    // Hex colors should be valid
    if (value.startsWith('#')) {
      const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
      if (!hexRegex.test(value)) {
        return { valid: false, error: 'invalid hex color' };
      }
    }
  }

  // Check for invalid URL values
  if (value.includes('url(')) {
    const urlRegex = /url\s*\(\s*['"]?[^'")\s]+['"]?\s*\)/;
    if (!urlRegex.test(value)) {
      return { valid: false, error: 'invalid url() syntax' };
    }
  }

  return { valid: true };
}

/**
 * Check all styles in a style map
 */
function checkStyles(
  styles: StyleMap,
  nodeId: string,
  compName: string,
  report: (data: { property: string; value: string; error: string }, path: (string | number)[], fixes?: string[]) => void
): void {
  if (!styles) return;

  for (const [breakpoint, styleDecls] of Object.entries(styles)) {
    if (!styleDecls) continue;

    for (const styleDecl of styleDecls) {
      if (!styleDecl) continue;

      // Skip if value is a formula reference (will be evaluated at runtime)
      if (styleDecl.value?.type === 'formula') continue;

      // Get the string value
      const value = styleDecl.value;
      if (typeof value !== 'string') continue;

      const property = styleDecl.property;
      const { valid, error } = isValidCSSValue(property, value);

      if (!valid) {
        report(
          { property, value, error: error || 'invalid syntax' },
          ['components', compName, 'nodes', nodeId, 'styles', breakpoint, property],
          ['remove-invalid-style']
        );
      }
    }
  }
}

export const invalidStyleSyntaxRule: Rule<{ property: string; value: string; error: string }> = {
  code: 'invalid style syntax',
  level: 'error',
  category: 'styles',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node) continue;

        // Only element nodes have styles
        if (node.type !== 'element') continue;

        const elementNode = node;
        if (elementNode.styles) {
          checkStyles(elementNode.styles, nodeId, compName, report);
        }
      }
    }
  },
  fixes: {
    'remove-invalid-style': ({ files, path }) => {
      // Path: ['components', compName, 'nodes', nodeId, 'styles', breakpoint, property]
      if (path.length < 7) return undefined;

      const compName = path[1] as string;
      const nodeId = path[3] as string;
      const breakpoint = path[5] as string;
      const property = path[6] as string;

      const newFiles = structuredClone(files);
      const styles = newFiles.components?.[compName]?.nodes?.[nodeId]?.styles as any;
      if (!styles?.[breakpoint]) return undefined;

      // Remove the invalid style declaration
      styles[breakpoint] = styles[breakpoint].filter(
        (decl: StyleDeclaration) => decl.property !== property
      );

      return newFiles;
    },
  },
};
