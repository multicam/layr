import { describe, test, expect } from 'bun:test';
// Import directly from the file, not from index which loads Monaco
import { tokenize } from './tokenizer';
import { TokenType } from './tokenizer';

describe('tokenizer', () => {
  test('tokenizes simple value', () => {
    const tokens = tokenize('hello');
    expect(tokens).toHaveLength(2); // identifier + EOF
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe('hello');
  });

  test('tokenizes path', () => {
    const tokens = tokenize('Variables.name');
    expect(tokens[0].type).toBe(TokenType.Path);
    expect(tokens[0].value).toBe('Variables.name');
  });

  test('tokenizes formula call', () => {
    const tokens = tokenize('@toddle/add(1, 2)');
    expect(tokens[0].value).toBe('@toddle/add');
    expect(tokens[1].value).toBe('(');
    expect(tokens[2].type).toBe(TokenType.Number);
    expect(tokens[2].value).toBe('1');
  });

  test('tokenizes string', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens[0].type).toBe(TokenType.String);
    expect(tokens[0].value).toBe('hello world');
  });

  test('tokenizes number', () => {
    const tokens = tokenize('42.5');
    expect(tokens[0].type).toBe(TokenType.Number);
    expect(tokens[0].value).toBe('42.5');
  });

  test('tokenizes operators', () => {
    const tokens = tokenize('a + b');
    expect(tokens[1].type).toBe(TokenType.Operator);
    expect(tokens[1].value).toBe('+');
  });

  test('handles empty input', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(1); // Just EOF
    expect(tokens[0].type).toBe(TokenType.EOF);
  });
});
