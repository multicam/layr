/**
 * Brutalism Theme
 * Bold, monochromatic theme with thick borders and raw aesthetics.
 */

import type { Theme } from '@layr/types';
import { fontFamilies, fontSizes, fontWeights, spacing, borderRadius, shadows } from './tokens';

export const brutalismLight: Theme = {
  name: 'brutalism-light',
  isDefault: true,
  propertyDefinitions: {
    '--background': { type: 'color', value: '#ffffff', description: 'Background color' },
    '--foreground': { type: 'color', value: '#000000', description: 'Foreground/text color' },
    '--muted': { type: 'color', value: '#666666', description: 'Muted text' },
    '--accent': { type: 'color', value: '#000000', description: 'Accent (same as foreground)' },
    '--border': { type: 'color', value: '#000000', description: 'Border color' },
    '--card': { type: 'color', value: '#ffffff', description: 'Card background' },
    
    '--font-sans': { type: 'string', value: fontFamilies.mono },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.bold },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    '--border-width': { type: 'string', value: '3px' },
    
    '--shadow': { type: 'string', value: shadows.hard.md },
  },
};

export const brutalismDark: Theme = {
  name: 'brutalism-dark',
  propertyDefinitions: {
    '--background': { type: 'color', value: '#000000' },
    '--foreground': { type: 'color', value: '#ffffff' },
    '--muted': { type: 'color', value: '#999999' },
    '--accent': { type: 'color', value: '#ffffff' },
    '--border': { type: 'color', value: '#ffffff' },
    '--card': { type: 'color', value: '#000000' },
    
    '--font-sans': { type: 'string', value: fontFamilies.mono },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.bold },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    '--border-width': { type: 'string', value: '3px' },
    
    '--shadow': { type: 'string', value: shadows.colored.white },
  },
};

export const brutalismTheme = {
  id: 'brutalism',
  displayName: 'Brutalism',
  description: 'Bold, monochromatic theme with thick borders',
  default: 'brutalism-light',
  defaultDark: 'brutalism-dark',
  defaultLight: 'brutalism-light',
  themes: {
    'brutalism-light': brutalismLight,
    'brutalism-dark': brutalismDark,
  },
} as const;
