/**
 * Minimalist Theme
 * Clean, comfortable reading experience with subtle styling.
 * Default theme for new projects.
 */

import type { Theme, ThemePropertyDefinition } from '@layr/types';
import { colorTokens, fontFamilies, fontSizes, fontWeights, lineHeights, spacing, borderRadius, shadows } from './tokens';

export const minimalLight: Theme = {
  name: 'minimal-light',
  isDefault: true,
  propertyDefinitions: {
    // Colors
    '--background': { type: 'color', value: '#ffffff', description: 'Background color' },
    '--foreground': { type: 'color', value: '#171717', description: 'Foreground/text color' },
    '--muted': { type: 'color', value: '#737373', description: 'Muted/subdued text' },
    '--accent': { type: 'color', value: '#2563eb', description: 'Primary accent color' },
    '--border': { type: 'color', value: '#e5e5e5', description: 'Border color' },
    '--card': { type: 'color', value: '#fafafa', description: 'Card background' },
    
    // Typography
    '--font-sans': { type: 'string', value: fontFamilies.sans },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.medium },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: lineHeights.relaxed },
    
    // Spacing
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.lg },
    
    // Shadows
    '--shadow': { type: 'string', value: shadows.light.md },
  },
};

export const minimalDark: Theme = {
  name: 'minimal-dark',
  propertyDefinitions: {
    '--background': { type: 'color', value: '#0a0a0a' },
    '--foreground': { type: 'color', value: '#fafafa' },
    '--muted': { type: 'color', value: '#a3a3a3' },
    '--accent': { type: 'color', value: '#3b82f6' },
    '--border': { type: 'color', value: '#262626' },
    '--card': { type: 'color', value: '#171717' },
    
    '--font-sans': { type: 'string', value: fontFamilies.sans },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.medium },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: lineHeights.relaxed },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.lg },
    
    '--shadow': { type: 'string', value: shadows.dark.md },
  },
};

export const minimalTheme = {
  id: 'minimal',
  displayName: 'Minimalist',
  description: 'A clean theme for comfortable reading',
  default: 'minimal-light',
  defaultDark: 'minimal-dark',
  defaultLight: 'minimal-light',
  themes: {
    'minimal-light': minimalLight,
    'minimal-dark': minimalDark,
  },
} as const;
