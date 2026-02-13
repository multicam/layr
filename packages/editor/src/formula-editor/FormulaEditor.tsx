import { useRef, useEffect, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { Formula } from '@layr/types';

interface FormulaEditorProps {
  value: Formula | undefined;
  onChange?: (formula: Formula) => void;
  context?: {
    variables?: string[];
    attributes?: string[];
    formulas?: string[];
  };
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}

export function FormulaEditor({
  value,
  onChange,
  context,
  placeholder = 'Enter formula...',
  minHeight = 60,
  maxHeight = 200,
}: FormulaEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Convert formula to string for editor
  const formulaToString = (f: Formula | undefined): string => {
    if (!f) return '';
    if (f.type === 'value') return String(f.value ?? '');
    if (f.type === 'path') return f.path.join('.');
    if (f.type === 'function') {
      const args = (f.arguments || []).map(formulaToString).join(', ');
      return `${f.name}(${args})`;
    }
    return '';
  };
  
  // Parse string to formula
  const stringToFormula = (str: string): Formula => {
    // Simple parsing - in reality would use proper tokenizer
    if (str.startsWith('@toddle/')) {
      return { type: 'function', name: str, arguments: [] };
    }
    if (str.includes('.')) {
      return { type: 'path', path: str.split('.') };
    }
    return { type: 'value', value: str };
  };
  
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure editor
    editor.updateOptions({
      minimap: { enabled: false },
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontSize: 13,
      fontFamily: 'ui-monospace, monospace',
    });
    
    // Register completion provider
    monaco.languages.registerCompletionItemProvider('layr-formula', {
      provideCompletionItems: (model, position) => {
        const suggestions = getCompletionSuggestions(model, position, context);
        return { suggestions };
      },
    });
  };
  
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined && onChange) {
      onChange(stringToFormula(value));
    }
  }, [onChange]);
  
  return (
    <div 
      className="formula-editor-wrapper"
      style={{ minHeight, maxHeight }}
    >
      <Editor
        height={minHeight}
        language="layr-formula"
        value={formulaToString(value)}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          fontSize: 13,
        }}
      />
    </div>
  );
}

function getCompletionSuggestions(
  model: any,
  position: any,
  context?: FormulaEditorProps['context']
): any[] {
  const suggestions: any[] = [];
  const word = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
  
  // Add variables
  if (context?.variables) {
    for (const name of context.variables) {
      suggestions.push({
        label: `Variables.${name}`,
        kind: 4, // Variable
        insertText: `Variables.${name}`,
        range,
        detail: 'Variable',
      });
    }
  }
  
  // Add attributes
  if (context?.attributes) {
    for (const name of context.attributes) {
      suggestions.push({
        label: `Attributes.${name}`,
        kind: 10, // Property
        insertText: `Attributes.${name}`,
        range,
        detail: 'Attribute',
      });
    }
  }
  
  // Add formulas
  if (context?.formulas) {
    for (const name of context.formulas) {
      suggestions.push({
        label: name,
        kind: 1, // Function
        insertText: `${name}($0)`,
        insertTextRules: 4, // InsertAsSnippet
        range,
        detail: 'Formula',
      });
    }
  }
  
  // Add built-in suggestions if no context
  if (!context) {
    const builtins = [
      { label: 'Variables', kind: 4, insertText: 'Variables.' },
      { label: 'Attributes', kind: 4, insertText: 'Attributes.' },
      { label: 'Apis', kind: 4, insertText: 'Apis.' },
      { label: 'ListItem', kind: 4, insertText: 'ListItem.' },
    ];
    
    for (const item of builtins) {
      suggestions.push({
        ...item,
        range,
      });
    }
  }
  
  return suggestions;
}

export default FormulaEditor;
