import * as monaco from 'monaco-editor';
import { resolveAutocompleteContext, getSuggestions } from './contextResolver';
import type { Component } from '@layr/types';

/**
 * Create Monaco completion provider for Layr formulas
 */
export function createCompletionProvider(
  getComponent: () => Component | null,
  getSelectedNodeId: () => string | null
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', '@', ' '],
    
    provideCompletionItems: (model, position) => {
      const component = getComponent();
      const selectedNodeId = getSelectedNodeId();
      
      const context = resolveAutocompleteContext(component, selectedNodeId);
      
      const input = model.getValue();
      const cursorPosition = model.getOffsetAt(position);
      
      const suggestions = getSuggestions(input, context, cursorPosition);
      
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      
      return {
        suggestions: suggestions.map(s => ({
          label: s.label,
          kind: mapKind(s.kind),
          insertText: s.insertText,
          insertTextRules: s.insertText.includes('$0') 
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet 
            : undefined,
          range,
          documentation: s.documentation,
        })),
      };
    },
  };
}

function mapKind(kind: string): monaco.languages.CompletionItemKind {
  switch (kind) {
    case 'formula': return monaco.languages.CompletionItemKind.Function;
    case 'variable': return monaco.languages.CompletionItemKind.Variable;
    case 'property': return monaco.languages.CompletionItemKind.Property;
    case 'path': return monaco.languages.CompletionItemKind.Module;
    default: return monaco.languages.CompletionItemKind.Text;
  }
}

/**
 * Register Layr formula language and completion provider
 */
export function registerLayrFormulaLanguage(
  monaco: any,
  getComponent: () => Component | null,
  getSelectedNodeId: () => string | null
): void {
  // Register language
  monaco.languages.register({ id: 'layr-formula' });
  
  // Set token provider
  monaco.languages.setMonarchTokensProvider('layr-formula', {
    keywords: ['true', 'false', 'null', 'undefined'],
    
    operators: [
      '+', '-', '*', '/', '%', '^',
      '=', '!=', '<', '>', '<=', '>=',
      '&&', '||', '!',
      '?.', '??',
    ],
    
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    tokenizer: {
      root: [
        [/[A-Z][a-zA-Z_]*\.[a-zA-Z_.]*/, 'type'],
        [/@toddle\/[a-zA-Z-]+/, 'function'],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/@symbols/, 'operator'],
        [/[{}()\[\]]/, '@brackets'],
        [/[a-zA-Z_]\w*/, 'identifier'],
      ],
    },
  });
  
  // Register completion provider
  monaco.languages.registerCompletionItemProvider(
    'layr-formula',
    createCompletionProvider(getComponent, getSelectedNodeId)
  );
}
