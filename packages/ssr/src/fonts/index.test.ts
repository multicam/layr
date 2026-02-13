import { describe, test, expect } from 'bun:test';
import {
  getFontCssUrl,
  generateFontFace,
  renderFontLink,
  rewriteFontCss,
  getGoogleFontsUrl,
  getGoogleFontsFileUrl,
  getFontDisplay,
  isSystemFont,
  generateThemeFontVars,
  filterLoadableFonts,
} from './index';
import type { FontFamily } from './index';

describe('Font System', () => {
  describe('getFontCssUrl', () => {
    test('generates Google Fonts URL', () => {
      const fonts: FontFamily[] = [{
        name: 'Roboto',
        family: 'Roboto',
        provider: 'google',
        type: 'sans-serif',
        variants: [
          { name: 'Regular', weight: '400' },
          { name: 'Bold', weight: '700' },
        ],
      }];
      
      const url = getFontCssUrl({ fonts });
      expect(url).toContain('family=Roboto');
      expect(url).toContain('wght@400;700');
      expect(url).toContain('display=swap');
    });

    test('includes italic axis when present', () => {
      const fonts: FontFamily[] = [{
        name: 'Roboto',
        family: 'Roboto',
        provider: 'google',
        type: 'sans-serif',
        variants: [
          { name: 'Regular', weight: '400' },
          { name: 'Italic', weight: '400', italic: true },
        ],
      }];
      
      const url = getFontCssUrl({ fonts });
      expect(url).toContain('ital,wght@');
    });

    test('returns undefined for empty fonts', () => {
      expect(getFontCssUrl({ fonts: [] })).toBeUndefined();
    });

    test('skips uploaded fonts', () => {
      const fonts: FontFamily[] = [{
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400', url: '/fonts/custom.woff2' }],
      }];
      
      expect(getFontCssUrl({ fonts })).toBeUndefined();
    });

    test('uses custom basePath', () => {
      const fonts: FontFamily[] = [{
        name: 'Test',
        family: 'Test',
        provider: 'google',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      }];
      
      const url = getFontCssUrl({ fonts, basePath: '/custom/path' });
      expect(url).toContain('/custom/path');
    });

    test('makes absolute URL with baseForAbsoluteUrls', () => {
      const fonts: FontFamily[] = [{
        name: 'Test',
        family: 'Test',
        provider: 'google',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      }];
      
      const url = getFontCssUrl({ fonts, baseForAbsoluteUrls: 'https://example.com' });
      expect(url).toContain('https://example.com');
    });
  });

  describe('generateFontFace', () => {
    test('generates @font-face for uploaded fonts', () => {
      const font: FontFamily = {
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
        variants: [
          { name: 'Regular', weight: '400', url: '/fonts/custom.woff2' },
        ],
      };
      
      const css = generateFontFace(font);
      expect(css).toContain('@font-face');
      expect(css).toContain("font-family: 'Custom'");
      expect(css).toContain('font-weight: 400');
      expect(css).toContain('url(\'/fonts/custom.woff2\')');
    });

    test('includes italic style', () => {
      const font: FontFamily = {
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
        variants: [
          { name: 'Italic', weight: '400', italic: true, url: '/fonts/custom-italic.woff2' },
        ],
      };
      
      const css = generateFontFace(font);
      expect(css).toContain('font-style: italic');
    });

    test('returns empty for Google fonts', () => {
      const font: FontFamily = {
        name: 'Roboto',
        family: 'Roboto',
        provider: 'google',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      };
      
      expect(generateFontFace(font)).toBe('');
    });
  });

  describe('renderFontLink', () => {
    test('renders link tag for fonts', () => {
      const fonts: FontFamily[] = [{
        name: 'Test',
        family: 'Test',
        provider: 'google',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      }];
      
      const html = renderFontLink(fonts);
      expect(html).toContain('<link href=');
      expect(html).toContain('rel="stylesheet"');
    });

    test('returns empty for no fonts', () => {
      expect(renderFontLink([])).toBe('');
    });
  });

  describe('rewriteFontCss', () => {
    test('replaces Google Fonts URLs with proxy', () => {
      const css = 'src: url(https://fonts.gstatic.com/s/roboto/font.woff2)';
      const rewritten = rewriteFontCss(css);
      
      expect(rewritten).not.toContain('fonts.gstatic.com');
      expect(rewritten).toContain('/.toddle/fonts/font/');
    });

    test('uses custom proxy path', () => {
      const css = 'src: url(https://fonts.gstatic.com/s/roboto/font.woff2)';
      const rewritten = rewriteFontCss(css, '/custom/font');
      
      expect(rewritten).toContain('/custom/font/');
    });
  });

  describe('getGoogleFontsUrl', () => {
    test('constructs Google Fonts URL', () => {
      expect(getGoogleFontsUrl('css2?family=Roboto')).toBe(
        'https://fonts.googleapis.com/css2?family=Roboto'
      );
    });
  });

  describe('getGoogleFontsFileUrl', () => {
    test('constructs Google Fonts file URL', () => {
      expect(getGoogleFontsFileUrl('s/roboto/font.woff2')).toBe(
        'https://fonts.gstatic.com/s/roboto/font.woff2'
      );
    });
  });

  describe('getFontDisplay', () => {
    test('returns default display value', () => {
      expect(getFontDisplay()).toBe('font-display: swap;');
    });

    test('returns custom display value', () => {
      expect(getFontDisplay('block')).toBe('font-display: block;');
    });
  });

  describe('isSystemFont', () => {
    test('returns true for system fonts', () => {
      expect(isSystemFont('serif')).toBe(true);
      expect(isSystemFont('sans-serif')).toBe(true);
      expect(isSystemFont('monospace')).toBe(true);
      expect(isSystemFont('system-ui')).toBe(true);
    });

    test('returns true for common system fonts (case insensitive)', () => {
      expect(isSystemFont('Arial')).toBe(true);
      expect(isSystemFont('arial')).toBe(true);
      expect(isSystemFont('Roboto')).toBe(true);
    });

    test('returns false for custom fonts', () => {
      expect(isSystemFont('CustomFont')).toBe(false);
    });
  });

  describe('generateThemeFontVars', () => {
    test('generates CSS variables for theme fonts', () => {
      const css = generateThemeFontVars({
        sans: 'Inter',
        serif: 'Merriweather',
        mono: 'Fira Code',
      });
      
      expect(css).toContain('--font-sans');
      expect(css).toContain('--font-serif');
      expect(css).toContain('--font-mono');
      expect(css).toContain(':root');
    });

    test('returns empty for no fonts', () => {
      expect(generateThemeFontVars({})).toBe('');
    });
  });

  describe('filterLoadableFonts', () => {
    test('includes Google fonts', () => {
      const fonts: FontFamily[] = [{
        name: 'Roboto',
        family: 'Roboto',
        provider: 'google',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      }];
      
      expect(filterLoadableFonts(fonts)).toHaveLength(1);
    });

    test('includes uploaded fonts with URL', () => {
      const fonts: FontFamily[] = [{
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400', url: '/font.woff2' }],
      }];
      
      expect(filterLoadableFonts(fonts)).toHaveLength(1);
    });

    test('excludes uploaded fonts without URL', () => {
      const fonts: FontFamily[] = [{
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
        variants: [{ name: 'Regular', weight: '400' }],
      }];
      
      expect(filterLoadableFonts(fonts)).toHaveLength(0);
    });

    test('excludes uploaded fonts without variants', () => {
      const fonts: FontFamily[] = [{
        name: 'Custom',
        family: 'Custom',
        provider: 'upload',
        type: 'sans-serif',
      }];
      
      expect(filterLoadableFonts(fonts)).toHaveLength(0);
    });
  });
});
