/**
 * Font System
 * Based on specs/font-system.md
 *
 * Manages web font loading, proxying, and CSS generation.
 */

// ============================================================================
// CSS String Escaping
// ============================================================================

/** Escape a string for use inside CSS single-quoted strings */
function escapeCssString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<\//g, '<\\/');
}

// ============================================================================
// Font Types
// ============================================================================

export interface FontFamily {
  name: string;
  family: string;
  provider: 'google' | 'upload';
  type: 'serif' | 'sans-serif' | 'monospace' | 'cursive';
  variants?: FontVariant[];
}

export interface FontVariant {
  name: string;
  weight: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  italic?: boolean;
  url?: string;
}

export interface FontCssOptions {
  fonts: FontFamily[];
  basePath?: string;
  baseForAbsoluteUrls?: string;
}

// ============================================================================
// Font CSS URL Generation
// ============================================================================

/**
 * Generate a Google Fonts CSS URL from font families.
 */
export function getFontCssUrl(options: FontCssOptions): string | undefined {
  const { fonts, basePath = '/.toddle/fonts/stylesheet/css2', baseForAbsoluteUrls } = options;
  
  if (!fonts || fonts.length === 0) return undefined;
  
  const familyParams: string[] = [];
  
  for (const font of fonts) {
    if (font.provider !== 'google') continue;
    
    const variants = font.variants ?? [];
    if (variants.length === 0) continue;
    
    // Sort variants by weight
    const sorted = [...variants].sort((a, b) => 
      parseInt(a.weight) - parseInt(b.weight)
    );
    
    // Separate standard and italic weights
    const standardWeights: string[] = [];
    const italicWeights: string[] = [];
    
    for (const variant of sorted) {
      if (variant.italic) {
        italicWeights.push(variant.weight);
      } else {
        standardWeights.push(variant.weight);
      }
    }
    
    // Build family parameter
    if (italicWeights.length > 0) {
      // With italic axis
      const weights = [
        ...standardWeights.map(w => `0,${w}`),
        ...italicWeights.map(w => `1,${w}`),
      ].join(';');
      familyParams.push(`family=${encodeURIComponent(font.family)}:ital,wght@${weights}`);
    } else if (standardWeights.length > 0) {
      // No italic
      const weights = standardWeights.join(';');
      familyParams.push(`family=${encodeURIComponent(font.family)}:wght@${weights}`);
    }
  }
  
  if (familyParams.length === 0) return undefined;
  
  const params = familyParams.join('&');
  const url = `${basePath}?display=swap&${params}`;
  
  // Make absolute if needed
  if (baseForAbsoluteUrls && !url.startsWith('http')) {
    try {
      return new URL(url, baseForAbsoluteUrls).href;
    } catch {
      return url;
    }
  }
  
  return url;
}

// ============================================================================
// Font CSS Generation
// ============================================================================

/**
 * Generate @font-face CSS for uploaded fonts.
 */
export function generateFontFace(font: FontFamily): string {
  if (font.provider !== 'upload' || !font.variants?.length) return '';
  
  const rules: string[] = [];
  
  for (const variant of font.variants) {
    if (!variant.url) continue;
    
    const fontStyle = variant.italic ? 'italic' : 'normal';
    const fontWeight = variant.weight;
    
    rules.push(`@font-face {
  font-family: '${escapeCssString(font.family)}';
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  font-display: swap;
  src: url('${escapeCssString(variant.url)}') format('woff2');
}`);
  }
  
  return rules.join('\n\n');
}

/**
 * Generate CSS link tag for fonts.
 */
export function renderFontLink(fonts: FontFamily[], basePath?: string): string {
  const url = getFontCssUrl({ fonts, basePath });
  if (!url) return '';
  return `<link href="${url}" rel="stylesheet" />`;
}

// ============================================================================
// Google Fonts Proxy URL Rewriting
// ============================================================================

/**
 * Rewrite Google Fonts CSS to use local proxy.
 */
export function rewriteFontCss(css: string, fontProxyPath: string = '/.toddle/fonts/font'): string {
  // Replace Google Fonts URLs with proxy URLs
  return css.replace(
    /https:\/\/fonts\.gstatic\.com\//g,
    fontProxyPath + '/'
  );
}

/**
 * Get upstream Google Fonts CSS URL.
 */
export function getGoogleFontsUrl(path: string): string {
  return `https://fonts.googleapis.com/${path}`;
}

/**
 * Get upstream Google Fonts font URL.
 */
export function getGoogleFontsFileUrl(path: string): string {
  return `https://fonts.gstatic.com/${path}`;
}

// ============================================================================
// Font Loading Utilities
// ============================================================================

/**
 * Font display modes.
 */
export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

/**
 * Get font-display CSS value.
 */
export function getFontDisplay(display: FontDisplay = 'swap'): string {
  return `font-display: ${display};`;
}

/**
 * Check if a font is a system font.
 */
export function isSystemFont(family: string): boolean {
  const systemFonts = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'Liberation Sans',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji',
  ];
  
  return systemFonts.some(sf => 
    family.toLowerCase() === sf.toLowerCase()
  );
}

// ============================================================================
// Theme Font Integration
// ============================================================================

export interface ThemeFonts {
  sans?: string;
  serif?: string;
  mono?: string;
}

/**
 * Generate CSS variables for theme fonts.
 */
export function generateThemeFontVars(themeFonts: ThemeFonts): string {
  const vars: string[] = [];

  if (themeFonts.sans) {
    vars.push(`--font-sans: '${escapeCssString(themeFonts.sans)}', sans-serif;`);
  }

  if (themeFonts.serif) {
    vars.push(`--font-serif: '${escapeCssString(themeFonts.serif)}', serif;`);
  }

  if (themeFonts.mono) {
    vars.push(`--font-mono: '${escapeCssString(themeFonts.mono)}', monospace;`);
  }

  if (vars.length === 0) return '';

  return `:root {
  ${vars.join('\n  ')}
}`;
}

/**
 * Filter font families to only include those that need loading.
 */
export function filterLoadableFonts(fonts: FontFamily[]): FontFamily[] {
  return fonts.filter(font => 
    font.provider === 'google' || 
    (font.provider === 'upload' && font.variants?.some(v => v.url))
  );
}
