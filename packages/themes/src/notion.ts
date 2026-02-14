/**
 * Notion Theme
 * Clean, emoji-rich theme inspired by Notion with subtle borders.
 */

import type { Theme } from '@layr/types';
import { colorTokens, fontFamilies, fontSizes, fontWeights, spacing, borderRadius, shadows } from './tokens';

export const notionLight: Theme = {
  name: 'notion-light',
  isDefault: true,
  propertyDefinitions: {
    '--background': { type: 'color', value: colorTokens.notion.light.bg, description: 'Background' },
    '--foreground': { type: 'color', value: colorTokens.notion.light.fg, description: 'Text color' },
    '--muted': { type: 'color', value: colorTokens.notion.light.muted, description: 'Muted text' },
    '--accent': { type: 'color', value: '#2383e2', description: 'Accent (blue)' },
    '--border': { type: 'color', value: colorTokens.notion.light.border, description: 'Border' },
    '--card': { type: 'color', value: colorTokens.notion.light.card, description: 'Card background' },
    
    '--font-sans': { type: 'string', value: fontFamilies.notion },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.medium },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.md },
    
    '--shadow': { type: 'string', value: shadows.light.sm },
  },
};

export const notionDark: Theme = {
  name: 'notion-dark',
  propertyDefinitions: {
    '--background': { type: 'color', value: colorTokens.notion.dark.bg },
    '--foreground': { type: 'color', value: colorTokens.notion.dark.fg },
    '--muted': { type: 'color', value: colorTokens.notion.dark.muted },
    '--accent': { type: 'color', value: '#529cca' },
    '--border': { type: 'color', value: colorTokens.notion.dark.border },
    '--card': { type: 'color', value: colorTokens.notion.dark.card },
    
    '--font-sans': { type: 'string', value: fontFamilies.notion },
    '--font-mono': { type: 'string', value: fontFamilies.mono },
    '--font-size-base': { type: 'string', value: fontSizes.base },
    '--font-weight-normal': { type: 'string', value: fontWeights.normal },
    '--font-weight-medium': { type: 'string', value: fontWeights.medium },
    '--font-weight-bold': { type: 'string', value: fontWeights.bold },
    '--line-height': { type: 'string', value: '1.5' },
    
    '--spacing-unit': { type: 'string', value: spacing['1'] },
    '--radius': { type: 'string', value: borderRadius.md },
    
    '--shadow': { type: 'string', value: shadows.dark.sm },
  },
};

export const notionTheme = {
  id: 'notion',
  displayName: 'Notion',
  description: 'Clean theme inspired by Notion with subtle borders',
  default: 'notion-light',
  defaultDark: 'notion-dark',
  defaultLight: 'notion-light',
  themes: {
    'notion-light': notionLight,
    'notion-dark': notionDark,
  },
} as const;
