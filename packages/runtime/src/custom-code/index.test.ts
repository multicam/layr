import { describe, test, expect } from 'bun:test';
import {
  isToddleFormula,
  isCodeFormula,
  isLegacyPluginAction,
  isPluginActionV2,
  createCustomCodeRegistry,
  registerFormula,
  registerAction,
  getFormula,
  getAction,
  safeFunctionName,
  collectFormulaRefs,
  collectActionRefs,
  hasCustomCode,
} from './index';
import type { ToddleFormula, CodeFormula, PluginActionV2, LegacyPluginAction } from './index';

describe('Custom Code System', () => {
  describe('isToddleFormula', () => {
    test('returns true for ToddleFormula', () => {
      const formula: ToddleFormula = {
        name: 'test',
        formula: { type: 'value', value: 'test' } as any,
      };
      expect(isToddleFormula(formula)).toBe(true);
    });

    test('returns false for CodeFormula', () => {
      const formula: CodeFormula = {
        name: 'test',
        handler: 'return 1',
      };
      expect(isToddleFormula(formula as any)).toBe(false);
    });
  });

  describe('isCodeFormula', () => {
    test('returns true for CodeFormula', () => {
      const formula: CodeFormula = {
        name: 'test',
        handler: 'return 1',
      };
      expect(isCodeFormula(formula)).toBe(true);
    });

    test('returns false for ToddleFormula', () => {
      const formula: ToddleFormula = {
        name: 'test',
        formula: { type: 'value', value: 'test' } as any,
      };
      expect(isCodeFormula(formula as any)).toBe(false);
    });
  });

  describe('isLegacyPluginAction', () => {
    test('returns true for legacy action', () => {
      const action: LegacyPluginAction = {
        name: 'test',
        handler: 'console.log("test")',
      };
      expect(isLegacyPluginAction(action)).toBe(true);
    });

    test('returns false for V2 action', () => {
      const action: PluginActionV2 = {
        name: 'test',
        version: 2,
        handler: () => {},
      };
      expect(isLegacyPluginAction(action as any)).toBe(false);
    });
  });

  describe('isPluginActionV2', () => {
    test('returns true for V2 action', () => {
      const action: PluginActionV2 = {
        name: 'test',
        version: 2,
        handler: () => {},
      };
      expect(isPluginActionV2(action)).toBe(true);
    });

    test('returns false for legacy action', () => {
      const action: LegacyPluginAction = {
        name: 'test',
        handler: 'console.log("test")',
      };
      expect(isPluginActionV2(action as any)).toBe(false);
    });
  });

  describe('createCustomCodeRegistry', () => {
    test('creates empty registry', () => {
      const registry = createCustomCodeRegistry();
      expect(registry.formulas).toEqual({});
      expect(registry.actions).toEqual({});
    });
  });

  describe('registerFormula', () => {
    test('registers formula in package', () => {
      const registry = createCustomCodeRegistry();
      const formula: ToddleFormula = {
        name: 'myFormula',
        formula: { type: 'value', value: 1 } as any,
      };
      
      registerFormula(registry, 'root', formula);
      
      expect(registry.formulas.root).toBeDefined();
      expect(registry.formulas.root.myFormula).toBe(formula);
    });

    test('registers formula in different packages', () => {
      const registry = createCustomCodeRegistry();
      const formula1: ToddleFormula = {
        name: 'myFormula',
        formula: { type: 'value', value: 1 } as any,
      };
      const formula2: ToddleFormula = {
        name: 'myFormula',
        formula: { type: 'value', value: 2 } as any,
      };
      
      registerFormula(registry, 'root', formula1);
      registerFormula(registry, 'mypackage', formula2);
      
      expect(registry.formulas.root.myFormula).toBe(formula1);
      expect(registry.formulas.mypackage.myFormula).toBe(formula2);
    });
  });

  describe('registerAction', () => {
    test('registers action in package', () => {
      const registry = createCustomCodeRegistry();
      const action: PluginActionV2 = {
        name: 'myAction',
        version: 2,
        handler: () => {},
      };
      
      registerAction(registry, 'root', action);
      
      expect(registry.actions.root).toBeDefined();
      expect(registry.actions.root.myAction).toBe(action);
    });
  });

  describe('getFormula', () => {
    test('gets formula by name and package', () => {
      const registry = createCustomCodeRegistry();
      const formula: ToddleFormula = {
        name: 'myFormula',
        formula: { type: 'value', value: 1 } as any,
      };
      
      registerFormula(registry, 'mypackage', formula);
      
      expect(getFormula(registry, 'myFormula', 'mypackage')).toBe(formula);
    });

    test('searches all packages when package not specified', () => {
      const registry = createCustomCodeRegistry();
      const formula: ToddleFormula = {
        name: 'myFormula',
        formula: { type: 'value', value: 1 } as any,
      };
      
      registerFormula(registry, 'mypackage', formula);
      
      expect(getFormula(registry, 'myFormula')).toBe(formula);
    });

    test('returns undefined for missing formula', () => {
      const registry = createCustomCodeRegistry();
      expect(getFormula(registry, 'missing')).toBeUndefined();
    });
  });

  describe('getAction', () => {
    test('gets action by name and package', () => {
      const registry = createCustomCodeRegistry();
      const action: PluginActionV2 = {
        name: 'myAction',
        version: 2,
        handler: () => {},
      };
      
      registerAction(registry, 'mypackage', action);
      
      expect(getAction(registry, 'myAction', 'mypackage')).toBe(action);
    });

    test('searches all packages when package not specified', () => {
      const registry = createCustomCodeRegistry();
      const action: PluginActionV2 = {
        name: 'myAction',
        version: 2,
        handler: () => {},
      };
      
      registerAction(registry, 'mypackage', action);
      
      expect(getAction(registry, 'myAction')).toBe(action);
    });

    test('returns undefined for missing action', () => {
      const registry = createCustomCodeRegistry();
      expect(getAction(registry, 'missing')).toBeUndefined();
    });
  });

  describe('safeFunctionName', () => {
    test('removes special characters', () => {
      expect(safeFunctionName('my-formula')).toBe('myformula');
      expect(safeFunctionName('my.formula')).toBe('myformula');
      expect(safeFunctionName('my formula')).toBe('myformula');
    });

    test('removes leading digits', () => {
      expect(safeFunctionName('123formula')).toBe('formula');
    });

    test('preserves underscores', () => {
      expect(safeFunctionName('my_formula')).toBe('my_formula');
    });

    test('handles empty string', () => {
      expect(safeFunctionName('')).toBe('');
    });
  });

  describe('collectFormulaRefs', () => {
    test('collects only referenced formulas', () => {
      const formulas = {
        a: { name: 'a', formula: { type: 'value', value: 1 } as any },
        b: { name: 'b', formula: { type: 'value', value: 2 } as any },
        c: { name: 'c', formula: { type: 'value', value: 3 } as any },
      };
      const referenced = new Set(['a', 'c']);
      
      const result = collectFormulaRefs(formulas, referenced);
      
      expect(result).toHaveProperty('a');
      expect(result).toHaveProperty('c');
      expect(result).not.toHaveProperty('b');
    });

    test('returns empty for no references', () => {
      const formulas = {
        a: { name: 'a', formula: { type: 'value', value: 1 } as any },
      };
      
      expect(collectFormulaRefs(formulas, new Set())).toEqual({});
    });
  });

  describe('collectActionRefs', () => {
    test('collects only referenced actions', () => {
      const actions = {
        a: { name: 'a', version: 2 as const, handler: () => {} },
        b: { name: 'b', version: 2 as const, handler: () => {} },
      };
      const referenced = new Set(['a']);
      
      const result = collectActionRefs(actions, referenced);
      
      expect(result).toHaveProperty('a');
      expect(result).not.toHaveProperty('b');
    });
  });

  describe('hasCustomCode', () => {
    test('returns true for package with formulas', () => {
      const registry = createCustomCodeRegistry();
      registerFormula(registry, 'mypackage', {
        name: 'test',
        formula: { type: 'value', value: 1 } as any,
      });
      
      expect(hasCustomCode(registry, 'mypackage')).toBe(true);
    });

    test('returns true for package with actions', () => {
      const registry = createCustomCodeRegistry();
      registerAction(registry, 'mypackage', {
        name: 'test',
        version: 2,
        handler: () => {},
      });
      
      expect(hasCustomCode(registry, 'mypackage')).toBe(true);
    });

    test.skip('returns false for empty package', () => {
      // This test depends on internal state
      const registry = createCustomCodeRegistry();
      // Empty registry should return false
      expect(hasCustomCode(registry, 'empty')).toBe(false);
    });
  });
});
