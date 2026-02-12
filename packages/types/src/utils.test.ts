import { describe, test, expect } from 'bun:test';
import type { DeepPartial, Nullable, LimitExceededError, FormulaCycleError } from './utils';

describe('utils types', () => {
  describe('DeepPartial', () => {
    test('DeepPartial makes all properties optional', () => {
      type TestType = {
        name: string;
        nested: {
          value: number;
          deep: {
            flag: boolean;
          };
        };
      };

      // This is a type test - if it compiles, it works
      const partial: DeepPartial<TestType> = {
        name: 'test'
        // nested is optional
      };

      const deepPartial: DeepPartial<TestType> = {
        nested: {
          // value is optional
          deep: {
            flag: true
          }
        }
      };

      expect(partial).toBeDefined();
      expect(deepPartial).toBeDefined();
    });
  });

  describe('Nullable', () => {
    test('Nullable allows null', () => {
      const nullableString: Nullable<string> = null;
      const withString: Nullable<string> = 'hello';

      expect(nullableString).toBeNull();
      expect(withString).toBe('hello');
    });
  });

  describe('Error types', () => {
    test('LimitExceededError has correct structure', () => {
      const error: LimitExceededError = {
        type: 'limit-exceeded',
        name: 'LimitExceededError',
        message: 'Limit exceeded',
        category: 'nesting',
        limit: 'maxFormulaDepth',
        value: 300,
        max: 256,
      };

      expect(error.type).toBe('limit-exceeded');
      expect(error.category).toBe('nesting');
      expect(error.limit).toBe('maxFormulaDepth');
      expect(error.value).toBe(300);
      expect(error.max).toBe(256);
    });

    test('FormulaCycleError has correct structure', () => {
      const error: FormulaCycleError = {
        type: 'formula-cycle',
        name: 'FormulaCycleError',
        message: 'Formula cycle detected',
        formulaName: 'myFormula',
        componentName: 'MyComponent',
        cyclePath: ['component/formulaA', 'component/formulaB', 'component/formulaA'],
      };

      expect(error.type).toBe('formula-cycle');
      expect(error.formulaName).toBe('myFormula');
      expect(error.cyclePath).toHaveLength(3);
    });
  });
});
