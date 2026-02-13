import { describe, test, expect } from 'bun:test';
import {
  BREAKPOINTS,
  renderMediaQuery,
  renderBreakpointQuery,
  variantSelector,
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
});
