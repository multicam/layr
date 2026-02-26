import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  BREAKPOINTS,
  renderMediaQuery,
  renderBreakpointQuery,
  variantSelector,
  CustomPropertyStyleSheet,
  SYNTAX_FALLBACKS,
  renderPropertyDefinition,
  styleToCss,
  prefersReducedMotion,
  getCurrentBreakpoint,
} from './index';
import type { MediaQuery, StyleVariant, CssSyntax } from './index';

describe('Responsive Styling System', () => {
  describe('BREAKPOINTS', () => {
    test('has correct breakpoint values', () => {
      expect(BREAKPOINTS.small).toBe(576);
      expect(BREAKPOINTS.medium).toBe(960);
      expect(BREAKPOINTS.large).toBe(1440);
    });
  });

  describe('renderMediaQuery', () => {
    test('renders min-width query', () => {
      const query: MediaQuery = { 'min-width': '768px' };
      expect(renderMediaQuery(query)).toBe('(min-width: 768px)');
    });

    test('renders max-width query', () => {
      const query: MediaQuery = { 'max-width': '1024px' };
      expect(renderMediaQuery(query)).toBe('(max-width: 1024px)');
    });

    test('renders combined queries', () => {
      const query: MediaQuery = {
        'min-width': '768px',
        'max-width': '1024px',
      };
      expect(renderMediaQuery(query)).toBe('(min-width: 768px) and (max-width: 1024px)');
    });

    test('includes prefers-reduced-motion', () => {
      const query: MediaQuery = { 'prefers-reduced-motion': 'reduce' };
      expect(renderMediaQuery(query)).toBe('(prefers-reduced-motion: reduce)');
    });

    test('returns empty string for empty query', () => {
      expect(renderMediaQuery({})).toBe('');
    });
  });

  describe('renderBreakpointQuery', () => {
    test('renders small breakpoint', () => {
      expect(renderBreakpointQuery('small')).toBe('(min-width: 576px)');
    });

    test('renders medium breakpoint', () => {
      expect(renderBreakpointQuery('medium')).toBe('(min-width: 960px)');
    });

    test('renders large breakpoint', () => {
      expect(renderBreakpointQuery('large')).toBe('(min-width: 1440px)');
    });
  });

  describe('variantSelector', () => {
    test('generates hover selector', () => {
      const variant: StyleVariant = { hover: true };
      expect(variantSelector(variant)).toBe(':hover');
    });

    test('generates focus selector', () => {
      const variant: StyleVariant = { focus: true };
      expect(variantSelector(variant)).toBe(':focus');
    });

    test('generates combined pseudo-classes', () => {
      const variant: StyleVariant = { hover: true, focus: true };
      expect(variantSelector(variant)).toBe(':hover:focus');
    });

    test('includes class name', () => {
      const variant: StyleVariant = { className: 'btn', hover: true };
      expect(variantSelector(variant)).toBe('.btn:hover');
    });

    test('includes pseudo-element', () => {
      const variant: StyleVariant = { pseudoElement: 'before' };
      expect(variantSelector(variant)).toBe('::before');
    });

    test('includes class and pseudo-element', () => {
      const variant: StyleVariant = { className: 'card', hover: true, pseudoElement: 'after' };
      expect(variantSelector(variant)).toBe('.card:hover::after');
    });

    test('generates autofill selector', () => {
      const variant: StyleVariant = { autofill: true };
      expect(variantSelector(variant)).toBe(':is(:-webkit-autofill, :autofill)');
    });

    test('handles empty variant', () => {
      const variant: StyleVariant = {};
      expect(variantSelector(variant)).toBe('');
    });
  });

  describe('SYNTAX_FALLBACKS', () => {
    test('has fallback for color', () => {
      expect(SYNTAX_FALLBACKS.color).toBe('transparent');
    });

    test('has fallback for length', () => {
      expect(SYNTAX_FALLBACKS.length).toBe('0px');
    });

    test('has fallback for number', () => {
      expect(SYNTAX_FALLBACKS.number).toBe('0');
    });
  });

  describe('renderPropertyDefinition', () => {
    test('renders primitive syntax', () => {
      const css = renderPropertyDefinition('my-color', { type: 'primitive', name: 'color' }, true, 'red');
      
      expect(css).toContain('@property --my-color');
      expect(css).toContain("syntax: '<color>'");
      expect(css).toContain('inherits: true');
      expect(css).toContain('initial-value: red');
    });

    test('renders keyword syntax', () => {
      const css = renderPropertyDefinition(
        'my-prop',
        { type: 'keyword', keywords: ['auto', 'none'] },
        false,
        'auto'
      );
      
      expect(css).toContain("syntax: 'auto | none'");
      expect(css).toContain('inherits: false');
    });
  });

  describe('styleToCss', () => {
    test('converts style object to CSS string', () => {
      const css = styleToCss({
        color: 'red',
        fontSize: '16px',
        marginTop: '10px',
      });
      
      expect(css).toContain('color: red');
      expect(css).toContain('font-size: 16px');
      expect(css).toContain('margin-top: 10px');
    });

    test('converts camelCase to kebab-case', () => {
      const css = styleToCss({ backgroundColor: 'blue' });
      expect(css).toContain('background-color: blue');
    });

    test('handles empty object', () => {
      expect(styleToCss({})).toBe('');
    });
  });

  describe('prefersReducedMotion', () => {
    test('returns boolean', () => {
      // Will be false in test environment
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getCurrentBreakpoint', () => {
    test('returns a breakpoint name', () => {
      const breakpoint = getCurrentBreakpoint();
      expect(['small', 'medium', 'large']).toContain(breakpoint);
    });
  });

  describe('CustomPropertyStyleSheet', () => {
    // Set up global CSS API mocks
    class MockCSSStyleRule {
      selectorText: string;
      style: { setProperty: ReturnType<typeof mock>; removeProperty: ReturnType<typeof mock>; length: number };

      constructor(selector: string) {
        this.selectorText = selector;
        this.style = {
          setProperty: mock(() => {}),
          removeProperty: mock(() => ''),
          length: 0,
        };
      }
    }

    class MockCSSMediaRule {
      cssRules: MockCSSStyleRule[];

      constructor() {
        this.cssRules = [];
      }
    }

    let mockStyleSheet: {
      cssRules: (MockCSSStyleRule | MockCSSMediaRule)[];
      insertRule: ReturnType<typeof mock>;
      deleteRule: ReturnType<typeof mock>;
    };
    let mockRoot: { adoptedStyleSheets: unknown[] };

    beforeEach(() => {
      // Set up global classes
      Object.defineProperty(globalThis, 'CSSStyleRule', {
        value: MockCSSStyleRule,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'CSSMediaRule', {
        value: MockCSSMediaRule,
        writable: true,
        configurable: true,
      });

      mockStyleSheet = {
        cssRules: [],
        insertRule: mock((rule: string, index: number) => {
          // Parse the rule and add appropriate mock
          if (rule.startsWith('@media')) {
            const mediaRule = new MockCSSMediaRule();
            const styleRule = new MockCSSStyleRule(rule.match(/\{ ([^{]+) \{/)?.[1]?.trim() || '.unknown');
            mediaRule.cssRules.push(styleRule);
            mockStyleSheet.cssRules.push(mediaRule);
          } else {
            const selector = rule.replace(/\s*\{\s*\}\s*$/, '');
            mockStyleSheet.cssRules.push(new MockCSSStyleRule(selector));
          }
          return index;
        }),
        deleteRule: mock((index: number) => {
          mockStyleSheet.cssRules.splice(index, 1);
        }),
      };

      mockRoot = {
        adoptedStyleSheets: [],
      };
    });

    test('creates new stylesheet when not provided', () => {
      Object.defineProperty(globalThis, 'CSSStyleSheet', {
        value: mock(() => mockStyleSheet),
        writable: true,
        configurable: true,
      });

      new CustomPropertyStyleSheet(mockRoot as unknown as Document);

      expect(mockRoot.adoptedStyleSheets.length).toBe(1);
    });

    test('uses provided stylesheet', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      expect(mockRoot.adoptedStyleSheets.length).toBe(0);
    });

    test('registerProperty returns setter function', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      const setter = sheet.registerProperty('.my-element', '--my-color');

      expect(typeof setter).toBe('function');
      expect(mockStyleSheet.insertRule).toHaveBeenCalled();
    });

    test('registerProperty inserts media query rule when mediaQuery provided', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      sheet.registerProperty('.element', '--color', {
        mediaQuery: { 'min-width': '768px' },
      });

      expect(mockStyleSheet.insertRule).toHaveBeenCalledWith(
        expect.stringContaining('@media'),
        expect.any(Number)
      );
    });

    test('setter function sets property value', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      const setter = sheet.registerProperty('.element', '--color');
      setter('red');

      const rule = mockStyleSheet.cssRules[0] as MockCSSStyleRule;
      expect(rule.style.setProperty).toHaveBeenCalledWith('--color', 'red');
    });

    test('unregisterProperty removes property', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      // Register first
      sheet.registerProperty('.element', '--color');
      // Then unregister
      sheet.unregisterProperty('.element', '--color');

      const rule = mockStyleSheet.cssRules[0] as MockCSSStyleRule;
      expect(rule.style.removeProperty).toHaveBeenCalledWith('--color');
    });

    test('unregisterProperty with deepClean removes empty rule', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      // Register first
      sheet.registerProperty('.element', '--color');
      expect(mockStyleSheet.cssRules.length).toBe(1);

      // Then unregister with deepClean
      sheet.unregisterProperty('.element', '--color', { deepClean: true });

      expect(mockStyleSheet.deleteRule).toHaveBeenCalled();
    });

    test('unregisterProperty keeps rule when not empty with deepClean', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      // Register first
      sheet.registerProperty('.element', '--color');

      // Set style length > 0 to simulate non-empty rule
      const rule = mockStyleSheet.cssRules[0] as MockCSSStyleRule;
      (rule.style as { length: number }).length = 2;

      // Then unregister with deepClean
      sheet.unregisterProperty('.element', '--color', { deepClean: true });

      expect(mockStyleSheet.deleteRule).not.toHaveBeenCalled();
    });

    test('hydrateFromBase indexes existing rules', () => {
      // Pre-populate with a rule
      const existingRule = new MockCSSStyleRule('.existing');
      mockStyleSheet.cssRules = [existingRule as unknown as MockCSSStyleRule];

      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      // Register should use existing rule, not create new one
      const setter = sheet.registerProperty('.existing', '--test');

      // Should NOT have inserted a new rule (found existing)
      expect(mockStyleSheet.insertRule).not.toHaveBeenCalled();
    });

    test('startingStyle wrapper in buildFullSelector', () => {
      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      sheet.registerProperty('.element', '--opacity', { startingStyle: true });

      expect(mockStyleSheet.insertRule).toHaveBeenCalledWith(
        expect.stringContaining('@starting-style'),
        expect.any(Number)
      );
    });

    test('hydrateFromBase handles media rules', () => {
      // Pre-populate with a media rule
      const mediaRule = new MockCSSMediaRule();
      const styleRule = new MockCSSStyleRule('.inside-media');
      mediaRule.cssRules.push(styleRule);
      mockStyleSheet.cssRules = [mediaRule as unknown as MockCSSMediaRule];

      const sheet = new CustomPropertyStyleSheet(
        mockRoot as unknown as Document,
        mockStyleSheet as unknown as CSSStyleSheet
      );

      // Register should find the rule inside media
      const setter = sheet.registerProperty('.inside-media', '--test');

      // Should NOT have inserted a new rule
      expect(mockStyleSheet.insertRule).not.toHaveBeenCalled();
    });
  });
});
