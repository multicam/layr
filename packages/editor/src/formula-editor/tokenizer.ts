// Token types
export enum TokenType {
  Identifier = 'identifier',
  Number = 'number',
  String = 'string',
  Operator = 'operator',
  Punctuation = 'punctuation',
  Path = 'path',
  EOF = 'eof',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// Monaco language configuration
export const LayrFormulaLanguage = {
  defaultToken: '',
  tokenPostfix: '.formula',
  
  keywords: [
    'true', 'false', 'null', 'undefined',
  ],
  
  operators: [
    '+', '-', '*', '/', '%', '^',
    '=', '!=', '<', '>', '<=', '>=',
    '&&', '||', '!',
    '?.', '??',
  ],
  
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],
      [/[A-Z][a-zA-Z_]*\.[a-zA-Z_.]*/, 'type'],
      [/@toddle\/[a-zA-Z-]+/, 'function'],
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],
      [/[{}()\[\]]/, '@brackets'],
      [/[,.]/, 'delimiter'],
      [/\s+/, 'white'],
    ],
    
    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
    
    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
};

/**
 * Simple tokenizer for formula parsing
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  
  while (position < input.length) {
    const char = input[position];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      position++;
      continue;
    }
    
    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(input[position + 1]))) {
      let value = '';
      while (position < input.length && /[\d.]/.test(input[position])) {
        value += input[position++];
      }
      tokens.push({ type: TokenType.Number, value, position: position - value.length });
      continue;
    }
    
    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      position++;
      
      while (position < input.length && input[position] !== quote) {
        if (input[position] === '\\') {
          position++;
        }
        value += input[position++];
      }
      position++;
      tokens.push({ type: TokenType.String, value, position: position - value.length - 2 });
      continue;
    }
    
    // Operators
    if (/[+\-*/%=<>!&|^?]/.test(char)) {
      let value = char;
      position++;
      while (position < input.length && /[=<>|&]/.test(input[position])) {
        value += input[position++];
      }
      tokens.push({ type: TokenType.Operator, value, position: position - value.length });
      continue;
    }
    
    // Punctuation
    if (/[(){}\[\],.]/.test(char)) {
      tokens.push({ type: TokenType.Punctuation, value: char, position });
      position++;
      continue;
    }
    
    // Identifiers and paths (including @toddle/ formulas)
    // FIX: Added @ and / to the consumption loop to match entry condition
    if (/[a-zA-Z_@]/.test(char)) {
      let value = '';
      const start = position;
      while (position < input.length && /[a-zA-Z0-9_.@\/\-]/.test(input[position])) {
        value += input[position++];
      }
      
      if (value.includes('.')) {
        tokens.push({ type: TokenType.Path, value, position: start });
      } else {
        tokens.push({ type: TokenType.Identifier, value, position: start });
      }
      continue;
    }
    
    // Unknown - skip
    position++;
  }
  
  tokens.push({ type: TokenType.EOF, value: '', position });
  return tokens;
}
