/**
 * Neobrutalism Theme
 * Vibrant, colorful theme with bold borders and playful energy.
 */

import type { Theme } from '@layr/types';
import { fontFamilies, fontSizes, fontWeights, spacing, borderRadius, shadows } from './tokens';

export const neobrutalismLight: Theme = {
  name: 'neobrutalism-light',
  isDefault: true,
  propertyDefinitions: {
    '--background': { type: 'color', value: '#fef08a', description: 'Background (yellow)' },
    '--foreground': { type: 'color', value: '#1c1917', description: 'Foreground/text' },
    '--muted': { type: 'color', value: '#78716c', description: 'Muted text' },
    '--accent': { type: 'color', value: '#f43f5e', description: 'Primary accent (rose)' },
    '--secondary': { type: 'color', value: '#22c55e', description: 'Secondary accent (green)' },
    '--border': { type: 'color', value: '#1c1917', description: 'Border color' },
    '--card': { type: 'color', value: '#ffffff', description: 'Card background' },
    
    '--font-sans': { type: 'string', value: fontFamilies.sans },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.bold },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    '--border-width': { type: 'string', value: '2px' },
    
    '--shadow': { type: 'string', value: shadows.colored.black },
  },
};

export const neobrutalismDark: Theme = {
  name: 'neobrutalism-dark',
  propertyDefinitions: {
    '--background': { type: 'color', value: '#1c1917' },
    '--foreground': { type: 'color', value: '#fef08a' },
    '--muted': { type: 'color', value: '#a8a29e' },
    '--accent': { type: 'color', value: '#fb7185' },
    '--secondary': { type: 'color', value: '#4ade80' },
    '--border': { type: 'color', value: '#fef08a' },
    '--card': { type: 'color', value: '#292524' },
    
    '--font-sans': { type: 'string', value: fontFamilies.sans },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.bold },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    '--border-width': { type: 'string', value: '2px' },
    
    '--shadow': { type: 'string', value: shadows.colored.white },
  },
};

export const neobrutalismTheme = {
  id: 'neobrutalism',
  displayName: 'Neobrutalism',
  description: 'Vibrant, colorful theme with bold borders',
  default: 'neobrutalism-light',
  defaultDark: 'neobrutalism-dark',
  defaultLight: 'neobrutalism-light',
  themes: {
    'neobrutalism-light': neobrutalismLight,
    'neobrutalism-dark': neobrutalismDark,
  },
} as const;
