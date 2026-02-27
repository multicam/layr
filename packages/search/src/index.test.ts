import { describe, it, expect } from 'bun:test';
import { contextlessEvaluateFormula, isAlwaysTrue, isAlwaysFalse } from './contextless';

describe('contextlessEvaluateFormula', () => {
  it('evaluates literal values', () => {
    expect(contextlessEvaluateFormula({ type: 'value', value: 42 })).toEqual({
      isStatic: true,
      result: 42,
    });
    
    expect(contextlessEvaluateFormula({ type: 'value', value: 'hello' })).toEqual({
      isStatic: true,
      result: 'hello',
    });
    
    expect(contextlessEvaluateFormula({ type: 'value', value: null })).toEqual({
      isStatic: true,
      result: null,
    });
    
    expect(contextlessEvaluateFormula({ type: 'value', value: true })).toEqual({
      isStatic: true,
      result: true,
    });
  });
  
  it('evaluates arrays', () => {
    expect(contextlessEvaluateFormula({
      type: 'array',
      items: [
        { type: 'value', value: 1 },
        { type: 'value', value: 2 },
        { type: 'value', value: 3 },
      ],
    })).toEqual({
      isStatic: true,
      result: [1, 2, 3],
    });
  });
  
  it('marks arrays with dynamic items as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'array',
      items: [
        { type: 'value', value: 1 },
        { type: 'path', path: ['Variables', 'x'] },
      ],
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });
  
  it('evaluates records', () => {
    expect(contextlessEvaluateFormula({
      type: 'record',
      properties: {
        a: { type: 'value', value: 1 },
        b: { type: 'value', value: 'test' },
      },
    })).toEqual({
      isStatic: true,
      result: { a: 1, b: 'test' },
    });
  });
  
  it('evaluates AND operations', () => {
    expect(contextlessEvaluateFormula({
      type: 'and',
      operands: [
        { type: 'value', value: true },
        { type: 'value', value: true },
      ],
    })).toEqual({
      isStatic: true,
      result: true,
    });
    
    expect(contextlessEvaluateFormula({
      type: 'and',
      operands: [
        { type: 'value', value: true },
        { type: 'value', value: false },
      ],
    })).toEqual({
      isStatic: true,
      result: false,
    });
  });
  
  it('evaluates OR operations', () => {
    expect(contextlessEvaluateFormula({
      type: 'or',
      operands: [
        { type: 'value', value: false },
        { type: 'value', value: true },
      ],
    })).toEqual({
      isStatic: true,
      result: true,
    });
    
    expect(contextlessEvaluateFormula({
      type: 'or',
      operands: [
        { type: 'value', value: false },
        { type: 'value', value: false },
      ],
    })).toEqual({
      isStatic: true,
      result: false,
    });
  });
  
  it('marks path access as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'path',
      path: ['Variables', 'x'],
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });
  
  it('marks function calls as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'function',
      name: '@toddle/GET',
      arguments: [],
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });
});

describe('isAlwaysTrue', () => {
  it('returns true for always-true conditions', () => {
    expect(isAlwaysTrue({ type: 'value', value: true })).toBe(true);
    expect(isAlwaysTrue({
      type: 'and',
      operands: [{ type: 'value', value: true }, { type: 'value', value: true }],
    })).toBe(true);
  });
  
  it('returns false for dynamic or falsy conditions', () => {
    expect(isAlwaysTrue({ type: 'value', value: false })).toBe(false);
    expect(isAlwaysTrue({ type: 'path', path: ['x'] })).toBe(false);
  });
});

describe('isAlwaysFalse', () => {
  it('returns true for always-false conditions', () => {
    expect(isAlwaysFalse({ type: 'value', value: false })).toBe(true);
    expect(isAlwaysFalse({
      type: 'and',
      operands: [{ type: 'value', value: true }, { type: 'value', value: false }],
    })).toBe(true);
  });

  it('returns false for dynamic or truthy conditions', () => {
    expect(isAlwaysFalse({ type: 'value', value: true })).toBe(false);
    expect(isAlwaysFalse({ type: 'path', path: ['x'] })).toBe(false);
  });
});

// Tests for previously uncovered code paths
describe('contextlessEvaluateFormula edge cases', () => {
  it('handles null formula', () => {
    expect(contextlessEvaluateFormula(null as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('handles undefined formula', () => {
    expect(contextlessEvaluateFormula(undefined as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('handles non-object formula', () => {
    expect(contextlessEvaluateFormula('string' as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
    expect(contextlessEvaluateFormula(42 as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('marks records with dynamic values as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'record',
      properties: {
        a: { type: 'value', value: 1 },
        b: { type: 'path', path: ['Variables', 'x'] },
      },
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('marks AND with dynamic operand as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'and',
      operands: [
        { type: 'value', value: true },
        { type: 'path', path: ['Variables', 'x'] },
      ],
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('marks OR with dynamic operand as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'or',
      operands: [
        { type: 'value', value: false },
        { type: 'path', path: ['Variables', 'x'] },
      ],
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('evaluates NOT operations', () => {
    // Static NOT - true becomes false
    expect(contextlessEvaluateFormula({
      type: 'not',
      operand: { type: 'value', value: true },
    })).toEqual({
      isStatic: true,
      result: false,
    });

    // Static NOT - false becomes true
    expect(contextlessEvaluateFormula({
      type: 'not',
      operand: { type: 'value', value: false },
    })).toEqual({
      isStatic: true,
      result: true,
    });

    // Dynamic NOT - non-static
    expect(contextlessEvaluateFormula({
      type: 'not',
      operand: { type: 'path', path: ['Variables', 'x'] },
    })).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('marks switch formulas as non-static', () => {
    expect(contextlessEvaluateFormula({
      type: 'switch',
      value: { type: 'value', value: 1 },
      cases: [],
    } as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('handles error formula type', () => {
    expect(contextlessEvaluateFormula({
      type: 'error',
      message: 'test error',
    } as any)).toEqual({
      isStatic: true,
      result: undefined,
    });
  });

  it('handles unknown formula types', () => {
    expect(contextlessEvaluateFormula({
      type: 'unknown',
    } as any)).toEqual({
      isStatic: false,
      result: undefined,
    });
  });

  it('handles empty AND operands', () => {
    expect(contextlessEvaluateFormula({
      type: 'and',
      operands: [],
    })).toEqual({
      isStatic: true,
      result: true,
    });
  });

  it('handles empty OR operands', () => {
    expect(contextlessEvaluateFormula({
      type: 'or',
      operands: [],
    })).toEqual({
      isStatic: true,
      result: false,
    });
  });

  it('handles empty array items', () => {
    expect(contextlessEvaluateFormula({
      type: 'array',
      items: [],
    })).toEqual({
      isStatic: true,
      result: [],
    });
  });

  it('handles empty record properties', () => {
    expect(contextlessEvaluateFormula({
      type: 'record',
      properties: {},
    })).toEqual({
      isStatic: true,
      result: {},
    });
  });
});
