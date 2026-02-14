/**
 * Terminal Theme
 * Retro CLI-inspired theme with terminal aesthetics.
 */

import type { Theme } from '@layr/types';
import { fontFamilies, fontSizes, fontWeights, spacing, borderRadius } from './tokens';

export const terminalLight: Theme = {
  name: 'terminal-light',
  isDefault: true,
  propertyDefinitions: {
    '--background': { type: 'color', value: '#f0f0f0', description: 'Background' },
    '--foreground': { type: 'color', value: '#0c0c0c', description: 'Text color' },
    '--muted': { type: 'color', value: '#666666', description: 'Muted text' },
    '--accent': { type: 'color', value: '#008800', description: 'Accent (green)' },
    '--border': { type: 'color', value: '#0c0c0c', description: 'Border' },
    '--card': { type: 'color', value: '#e0e0e0', description: 'Card background' },
    
    '--font-sans': { type: 'string', value: fontFamilies.mono },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.sm },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.normal },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.6' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    
    '--shadow': { type: 'string', value: 'none' },
    '--cursor-color': { type: 'color', value: '#008800' },
  },
};

export const terminalDark: Theme = {
  name: 'terminal-dark',
  propertyDefinitions: {
    '--background': { type: 'color', value: '#0c0c0c' },
    '--foreground': { type: 'color', value: '#00ff00' },
    '--muted': { type: 'color', value: '#008800' },
    '--accent': { type: 'color', value: '#00ff00' },
    '--border': { type: 'color', value: '#00ff00' },
    '--card': { type: 'color', value: '#1a1a1a' },
    
    '--font-sans': { type: 'string', value: fontFamilies.mono },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.sm },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.normal },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.6' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.none },
    
    '--shadow': { type: 'string', value: 'none' },
    '--cursor-color': { type: 'color', value: '#00ff00' },
  },
};

export const terminalTheme = {
  id: 'terminal',
  displayName: 'Terminal',
  description: 'Retro CLI-inspired theme with terminal aesthetics',
  default: 'terminal-dark',
  defaultDark: 'terminal-dark',
  defaultLight: 'terminal-light',
  themes: {
    'terminal-light': terminalLight,
    'terminal-dark': terminalDark,
  },
} as const;
