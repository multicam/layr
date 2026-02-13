/**
 * Responsive Styling & Custom Property System
 * Based on specs/responsive-styling-system.md
 *
 * Manages CSS custom properties, media queries, and style variants.
 */

import type { MediaQuery, BreakpointName, StyleVariant, CustomProperty } from '@layr/types';

// Re-export types from @layr/types (single source of truth)
export type { MediaQuery, BreakpointName, StyleVariant, CustomProperty } from '@layr/types';

/**
 * Breakpoint values in pixels.
 */
export const BREAKPOINTS: Record<BreakpointName, number> = {
  small: 576,
  medium: 960,
  large: 1440,
};

// ============================================================================
// Media Query Utilities
// ============================================================================

/**
 * Generate a CSS media query string from a MediaQuery object.
 */
export function renderMediaQuery(query: MediaQuery): string {
  const conditions: string[] = [];
  
  if (query['min-width']) {
    conditions.push(`(min-width: ${query['min-width']})`);
  }
  if (query['max-width']) {
    conditions.push(`(max-width: ${query['max-width']})`);
  }
  if (query['min-height']) {
    conditions.push(`(min-height: ${query['min-height']})`);
  }
  if (query['max-height']) {
    conditions.push(`(max-height: ${query['max-height']})`);
  }
  if (query['prefers-reduced-motion']) {
    conditions.push(`(prefers-reduced-motion: ${query['prefers-reduced-motion']})`);
  }
  
  return conditions.join(' and ');
}

/**
 * Generate a legacy breakpoint media query.
 */
export function renderBreakpointQuery(breakpoint: BreakpointName): string {
  const value = BREAKPOINTS[breakpoint];
  return `(min-width: ${value}px)`;
}

// ============================================================================
// Variant Selector Generation
// ============================================================================

/**
 * Generate CSS selector for a style variant.
 */
export function variantSelector(variant: StyleVariant): string {
  const parts: string[] = [];
  
  // Class names
  if (variant.className) {
    parts.push(`.${variant.className}`);
  }
  
  // Pseudo-classes
  if (variant.hover) parts.push(':hover');
  if (variant.active) parts.push(':active');
  if (variant.focus) parts.push(':focus');
  if (variant.focusWithin) parts.push(':focus-within');
  if (variant.disabled) parts.push(':disabled');
  if (variant.checked) parts.push(':checked');
  if (variant.empty) parts.push(':empty');
  if (variant.firstChild) parts.push(':first-child');
  if (variant.lastChild) parts.push(':last-child');
  if (variant.evenChild) parts.push(':nth-child(even)');
  if (variant.oddChild) parts.push(':nth-child(odd)');
  if (variant.autofill) parts.push(':is(:-webkit-autofill, :autofill)');
  
  // Pseudo-element
  if (variant.pseudoElement) {
    parts.push(`::${variant.pseudoElement}`);
  }
  
  return parts.join('');
}

// ============================================================================
// Custom Property StyleSheet
// ============================================================================

/**
 * Manages CSS custom properties via CSSOM APIs.
 */
export class CustomPropertyStyleSheet {
  private styleSheet: CSSStyleSheet;
  private ruleMap: Map<string, CSSStyleRule> = new Map();
  private hydrated = false;
  
  constructor(root: Document | ShadowRoot, styleSheet?: CSSStyleSheet) {
    if (styleSheet) {
      this.styleSheet = styleSheet;
    } else {
      this.styleSheet = new CSSStyleSheet();
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.styleSheet];
    }
  }
  
  /**
   * Register a CSS custom property and get an update function.
   */
  registerProperty(
    selector: string,
    name: string,
    options?: {
      mediaQuery?: MediaQuery;
      startingStyle?: boolean;
    }
  ): (newValue: string) => void {
    this.hydrateFromBase();
    
    // Build full selector
    const fullSelector = this.buildFullSelector(selector, options);
    
    // Find or create rule
    let rule = this.ruleMap.get(fullSelector);
    
    if (!rule) {
      // Insert new rule
      const index = this.styleSheet.cssRules.length;
      
      if (options?.mediaQuery) {
        const mediaQuery = renderMediaQuery(options.mediaQuery);
        this.styleSheet.insertRule(`@media ${mediaQuery} { ${fullSelector} {} }`, index);
        
        // Navigate to inner rule
        const mediaRule = this.styleSheet.cssRules[index] as CSSMediaRule;
        rule = mediaRule.cssRules[0] as CSSStyleRule;
      } else {
        this.styleSheet.insertRule(`${fullSelector} {}`, index);
        rule = this.styleSheet.cssRules[index] as CSSStyleRule;
      }
      
      this.ruleMap.set(fullSelector, rule);
    }
    
    // Return setter function
    return (value: string) => {
      rule.style.setProperty(name, value);
    };
  }
  
  /**
   * Unregister a CSS custom property.
   */
  unregisterProperty(
    selector: string,
    name: string,
    options?: {
      mediaQuery?: MediaQuery;
      startingStyle?: boolean;
      deepClean?: boolean;
    }
  ): void {
    const fullSelector = this.buildFullSelector(selector, options);
    const rule = this.ruleMap.get(fullSelector);
    
    if (rule) {
      rule.style.removeProperty(name);
      
      // Deep clean for preview mode
      if (options?.deepClean) {
        const hasRemaining = rule.style.length > 0;
        if (!hasRemaining) {
          // Find and remove the rule
          for (let i = 0; i < this.styleSheet.cssRules.length; i++) {
            const cssRule = this.styleSheet.cssRules[i];
            if (cssRule === rule) {
              this.styleSheet.deleteRule(i);
              this.ruleMap.delete(fullSelector);
              break;
            }
          }
        }
      }
    }
  }
  
  /**
   * Hydrate from existing stylesheet rules.
   */
  private hydrateFromBase(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    
    for (let i = 0; i < this.styleSheet.cssRules.length; i++) {
      const rule = this.styleSheet.cssRules[i];
      this.indexRule(rule, '');
    }
  }
  
  /**
   * Recursively index CSS rules.
   */
  private indexRule(rule: CSSRule, prefix: string): void {
    if (rule instanceof CSSStyleRule) {
      const selector = prefix ? `${prefix} ${rule.selectorText}` : rule.selectorText;
      this.ruleMap.set(selector, rule);
    } else if (rule instanceof CSSMediaRule) {
      for (let i = 0; i < rule.cssRules.length; i++) {
        this.indexRule(rule.cssRules[i], prefix);
      }
    }
  }
  
  /**
   * Build full selector with media query and starting-style wrappers.
   */
  private buildFullSelector(
    selector: string,
    options?: {
      mediaQuery?: MediaQuery;
      startingStyle?: boolean;
    }
  ): string {
    if (options?.startingStyle) {
      return `${selector} { @starting-style {} }`;
    }
    return selector;
  }
}

// ============================================================================
// CSS Custom Property Definition
// ============================================================================

export type CssSyntaxNode = 
  | { type: 'primitive'; name: CssSyntax }
  | { type: 'custom'; name: CssCustomSyntax }
  | { type: 'keyword'; keywords: string[] };

export type CssSyntax = 
  | 'color'
  | 'length'
  | 'length-percentage'
  | 'number'
  | 'percentage'
  | 'angle'
  | 'time'
  | 'resolution'
  | 'custom-ident'
  | 'string'
  | 'image'
  | 'url'
  | 'transform-function'
  | 'transform-list'
  | 'integer'
  | '*';

export type CssCustomSyntax = 'font-family' | string;

/**
 * CSS syntax fallback values.
 */
export const SYNTAX_FALLBACKS: Record<CssSyntax, string> = {
  color: 'transparent',
  length: '0px',
  'length-percentage': '0px',
  number: '0',
  percentage: '0%',
  angle: '0deg',
  time: '0s',
  resolution: '1x',
  'custom-ident': '',
  string: "''",
  image: 'none',
  url: 'none',
  'transform-function': 'none',
  'transform-list': 'none',
  integer: '0',
  '*': '',
};

/**
 * Render a CSS @property definition.
 */
export function renderPropertyDefinition(
  name: string,
  syntax: CssSyntaxNode,
  inherits: boolean,
  initialValue: string
): string {
  let syntaxStr: string;
  
  if (syntax.type === 'primitive') {
    syntaxStr = `<${syntax.name}>`;
  } else if (syntax.type === 'custom') {
    syntaxStr = syntax.name;
  } else {
    syntaxStr = syntax.keywords.join(' | ');
  }
  
  return `@property --${name} {
  syntax: '${syntaxStr}';
  inherits: ${inherits};
  initial-value: ${initialValue};
}`;
}

// ============================================================================
// Node Style Utilities
// ============================================================================

/**
 * Convert a style object to CSS string.
 */
export function styleToCss(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join(' ');
}

/**
 * Convert camelCase to kebab-case.
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get current breakpoint based on window width.
 */
export function getCurrentBreakpoint(): BreakpointName {
  if (typeof window === 'undefined') return 'medium';
  
  const width = window.innerWidth;
  
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'small';
}
