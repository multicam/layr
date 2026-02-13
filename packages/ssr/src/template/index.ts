/**
 * Template Substitution System
 * Based on specs/template-substitution.md
 */

import type { Formula } from '@layr/types';
import type { FormulaContext } from '@layr/core';

/**
 * Substitute template placeholders with values
 * Format: ${path.to.value} or {{path.to.value}}
 */
export function substituteTemplate(
  template: string,
  ctx: FormulaContext
): string {
  return template.replace(/\$\{([^}]+)\}|\{\{([^}]+)\}\}/g, (match, dollarPath, bracePath) => {
    const path = dollarPath || bracePath;
    const value = resolvePath(path.trim(), ctx);
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Substitute with custom resolver
 */
export function substituteWithResolver(
  template: string,
  resolver: (path: string) => unknown
): string {
  return template.replace(/\$\{([^}]+)\}|\{\{([^}]+)\}\}/g, (match, dollarPath, bracePath) => {
    const path = dollarPath || bracePath;
    const value = resolver(path.trim());
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Resolve a path string to a value
 */
function resolvePath(pathStr: string, ctx: FormulaContext): unknown {
  const parts = pathStr.split('.');
  let current: unknown = ctx.data;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  
  return current;
}

/**
 * Check if string contains template patterns
 */
export function hasTemplate(str: string): boolean {
  return /\$\{[^}]+\}|\{\{[^}]+\}\}/.test(str);
}

/**
 * Extract all template paths from a string
 */
export function extractTemplatePaths(template: string): string[] {
  const paths: string[] = [];
  const regex = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    paths.push((match[1] || match[2]).trim());
  }
  
  return paths;
}

/**
 * Template cache
 */
const templateCache = new Map<string, CompiledTemplate>();

interface CompiledTemplate {
  parts: TemplatePart[];
}

type TemplatePart = 
  | { type: 'literal'; value: string }
  | { type: 'variable'; path: string };

/**
 * Compile a template for faster repeated substitution
 */
export function compileTemplate(template: string): (ctx: FormulaContext) => string {
  const cached = templateCache.get(template);
  if (cached) {
    return (ctx) => evaluateCompiled(cached, ctx);
  }
  
  const parts: TemplatePart[] = [];
  let lastIndex = 0;
  const regex = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'literal', value: template.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'variable', path: (match[1] || match[2]).trim() });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < template.length) {
    parts.push({ type: 'literal', value: template.slice(lastIndex) });
  }
  
  const compiled: CompiledTemplate = { parts };
  templateCache.set(template, compiled);
  
  return (ctx) => evaluateCompiled(compiled, ctx);
}

function evaluateCompiled(compiled: CompiledTemplate, ctx: FormulaContext): string {
  let result = '';
  for (const part of compiled.parts) {
    if (part.type === 'literal') {
      result += part.value;
    } else {
      const value = resolvePath(part.path, ctx);
      result += value !== null && value !== undefined ? String(value) : '';
    }
  }
  return result;
}

export function clearTemplateCache(): void {
  templateCache.clear();
}
