import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { 
  substituteTemplate, 
  substituteWithResolver,
  hasTemplate,
  extractTemplatePaths,
  compileTemplate,
  clearTemplateCache
} from './index';
import type { FormulaContext } from '@layr/core';

function createContext(data: any = {}): FormulaContext {
  return {
    data: {
      Attributes: {},
      Variables: {},
      Apis: {},
      ...data,
    },
    toddle: {
      getCustomFormula: () => undefined,
      errors: [],
    },
  };
}

describe('Template Substitution', () => {
  afterEach(() => {
    clearTemplateCache();
  });

  describe('substituteTemplate', () => {
    test('substitutes ${...} patterns', () => {
      const ctx = createContext({ Variables: { name: 'World' } });
      const result = substituteTemplate('Hello ${Variables.name}!', ctx);
      expect(result).toBe('Hello World!');
    });

    test('substitutes {{...}} patterns', () => {
      const ctx = createContext({ Variables: { name: 'World' } });
      const result = substituteTemplate('Hello {{Variables.name}}!', ctx);
      expect(result).toBe('Hello World!');
    });

    test('substitutes multiple patterns', () => {
      const ctx = createContext({ 
        Variables: { first: 'John', last: 'Doe' } 
      });
      const result = substituteTemplate('${Variables.first} {{Variables.last}}', ctx);
      expect(result).toBe('John Doe');
    });

    test('handles missing values', () => {
      const ctx = createContext();
      const result = substituteTemplate('Hello ${Variables.missing}!', ctx);
      expect(result).toBe('Hello !');
    });

    test('handles nested paths', () => {
      const ctx = createContext({ 
        Variables: { user: { name: 'John' } } 
      });
      const result = substituteTemplate('Hello ${Variables.user.name}!', ctx);
      expect(result).toBe('Hello John!');
    });

    test('handles numbers', () => {
      const ctx = createContext({ Variables: { count: 42 } });
      const result = substituteTemplate('Count: ${Variables.count}', ctx);
      expect(result).toBe('Count: 42');
    });

    test('handles booleans', () => {
      const ctx = createContext({ Variables: { active: true } });
      const result = substituteTemplate('Active: ${Variables.active}', ctx);
      expect(result).toBe('Active: true');
    });

    test('returns original string if no patterns', () => {
      const ctx = createContext();
      const result = substituteTemplate('No patterns here', ctx);
      expect(result).toBe('No patterns here');
    });

    test('handles empty string', () => {
      const ctx = createContext();
      const result = substituteTemplate('', ctx);
      expect(result).toBe('');
    });
  });

  describe('substituteWithResolver', () => {
    test('uses custom resolver', () => {
      const resolver = (path: string) => {
        if (path === 'name') return 'World';
        return null;
      };
      
      const result = substituteWithResolver('Hello ${name}!', resolver);
      expect(result).toBe('Hello World!');
    });

    test('resolver receives trimmed path', () => {
      const paths: string[] = [];
      const resolver = (path: string) => {
        paths.push(path);
        return path;
      };
      
      substituteWithResolver('${ name }', resolver);
      expect(paths[0]).toBe('name');
    });
  });

  describe('hasTemplate', () => {
    test('returns true for ${...}', () => {
      expect(hasTemplate('Hello ${name}')).toBe(true);
    });

    test('returns true for {{...}}', () => {
      expect(hasTemplate('Hello {{name}}')).toBe(true);
    });

    test('returns false for no patterns', () => {
      expect(hasTemplate('Hello World')).toBe(false);
    });

    test('returns true for mixed content', () => {
      expect(hasTemplate('Prefix ${a} middle {{b}} suffix')).toBe(true);
    });
  });

  describe('extractTemplatePaths', () => {
    test('extracts single path', () => {
      const paths = extractTemplatePaths('Hello ${name}');
      expect(paths).toEqual(['name']);
    });

    test('extracts multiple paths', () => {
      const paths = extractTemplatePaths('${a} and {{b}}');
      expect(paths).toEqual(['a', 'b']);
    });

    test('returns empty array for no patterns', () => {
      const paths = extractTemplatePaths('No patterns');
      expect(paths).toEqual([]);
    });

    test('handles nested paths', () => {
      const paths = extractTemplatePaths('${Variables.user.name}');
      expect(paths).toEqual(['Variables.user.name']);
    });
  });

  describe('compileTemplate', () => {
    test('compiles and evaluates template', () => {
      const ctx = createContext({ Variables: { name: 'World' } });
      const compiled = compileTemplate('Hello ${Variables.name}!');
      expect(compiled(ctx)).toBe('Hello World!');
    });

    test('cached compilation returns same result', () => {
      const ctx = createContext({ Variables: { name: 'World' } });
      const compiled1 = compileTemplate('Hello ${Variables.name}!');
      const compiled2 = compileTemplate('Hello ${Variables.name}!');
      
      expect(compiled1(ctx)).toBe('Hello World!');
      expect(compiled2(ctx)).toBe('Hello World!');
    });

    test('handles mixed literals and variables', () => {
      const ctx = createContext({ Variables: { a: 'A', b: 'B' } });
      const compiled = compileTemplate('Start ${Variables.a} middle ${Variables.b} end');
      expect(compiled(ctx)).toBe('Start A middle B end');
    });

    test('handles missing values', () => {
      const ctx = createContext();
      const compiled = compileTemplate('Hello ${Variables.missing}!');
      expect(compiled(ctx)).toBe('Hello !');
    });
  });
});
