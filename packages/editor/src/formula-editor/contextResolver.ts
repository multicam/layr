import type { Component } from '@layr/types';

export interface AutocompleteContext {
  variables: string[];
  attributes: string[];
  formulas: string[];
  apis: string[];
  components: string[];
}

/**
 * Resolve autocomplete context from component and selection
 */
export function resolveAutocompleteContext(
  component: Component | null,
  selectedNodeId: string | null
): AutocompleteContext {
  const context: AutocompleteContext = {
    variables: [],
    attributes: [],
    formulas: [],
    apis: [],
    components: [],
  };
  
  if (!component) return context;
  
  // Get component variables and attributes
  context.variables = ['name', 'count', 'items']; // Placeholder
  context.attributes = ['class', 'id', 'style'];
  
  // Get built-in formulas
  context.formulas = BUILTIN_FORMULAS;
  
  // Get APIs
  context.apis = Object.keys(component.apis || {});
  
  return context;
}

/**
 * Get autocomplete suggestions based on partial input
 */
export function getSuggestions(
  input: string,
  context: AutocompleteContext,
  cursorPosition: number
): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];
  
  // Extract partial token before cursor
  const beforeCursor = input.slice(0, cursorPosition);
  const match = beforeCursor.match(/[\w.]*$/);
  const partial = match ? match[0] : '';
  
  // Check for path prefixes
  if (partial.startsWith('Variables.')) {
    return getPathSuggestions('Variables', context.variables, partial);
  }
  
  if (partial.startsWith('Attributes.')) {
    return getPathSuggestions('Attributes', context.attributes, partial);
  }
  
  if (partial.startsWith('Apis.')) {
    return getPathSuggestions('Apis', context.apis, partial);
  }
  
  // Check for formula prefix
  if (partial.startsWith('@toddle/')) {
    const formulaPartial = partial.slice(8);
    return context.formulas
      .filter(f => f.startsWith(formulaPartial))
      .map(f => ({
        label: `@toddle/${f}`,
        kind: 'formula' as const,
        insertText: `@toddle/${f}($0)`,
        documentation: `Formula: ${f}`,
      }));
  }
  
  // Root level suggestions
  if (partial.length >= 1) {
    // Paths
    for (const v of ['Variables', 'Attributes', 'Apis', 'ListItem']) {
      if (v.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: v,
          kind: 'path',
          insertText: `${v}.`,
          documentation: `${v} context`,
        });
      }
    }
    
    // Formulas
    for (const f of context.formulas) {
      if (f.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: `@toddle/${f}`,
          kind: 'formula',
          insertText: `@toddle/${f}($0)`,
          documentation: `Formula: ${f}`,
        });
      }
    }
  }
  
  return suggestions;
}

function getPathSuggestions(
  prefix: string,
  items: string[],
  partial: string
): AutocompleteSuggestion[] {
  const afterPrefix = partial.slice(prefix.length + 1);
  
  return items
    .filter(item => item.toLowerCase().startsWith(afterPrefix.toLowerCase()))
    .map(item => ({
      label: `${prefix}.${item}`,
      kind: 'property' as const,
      insertText: `${prefix}.${item}`,
      documentation: `${prefix}.${item}`,
    }));
}

export interface AutocompleteSuggestion {
  label: string;
  kind: 'formula' | 'variable' | 'property' | 'path' | 'keyword';
  insertText: string;
  documentation: string;
}

// Built-in formulas list (inline to avoid importing full lib)
const BUILTIN_FORMULAS = [
  'map', 'filter', 'reduce', 'find', 'findIndex', 'includes',
  'indexOf', 'length', 'slice', 'concat', 'reverse', 'sort',
  'flat', 'every', 'some',
  'concatenate', 'split', 'uppercase', 'lowercase', 'trim',
  'substring', 'replace', 'replaceAll', 'startsWith', 'endsWith',
  'string-includes', 'string-length', 'pad-start', 'pad-end', 'repeat',
  'add', 'subtract', 'multiply', 'divide', 'mod', 'power', 'sqrt',
  'abs', 'round', 'floor', 'ceil', 'min', 'max', 'random',
  'keys', 'values', 'entries', 'fromEntries', 'merge',
  'equals', 'not-equals', 'greaterThan', 'lessThan',
  'greaterThanOrEqual', 'lessThanOrEqual', 'between',
  'if', 'switch', 'and', 'or', 'not',
  'default', 'toString', 'typeof', 'first', 'last', 'get',
];
