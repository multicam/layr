/**
 * @layr/themes
 * Default themes for Layr projects
 * Based on specs/default-styleguide.md
 */

import type { Theme } from '@layr/types';

// Export tokens
export * from './tokens';

// Import theme definitions (must be before usage)
import { minimalTheme, minimalLight, minimalDark } from './minimal';
import { brutalismTheme, brutalismLight, brutalismDark } from './brutalism';
import { neobrutalismTheme, neobrutalismLight, neobrutalismDark } from './neobrutalism';
import { terminalTheme, terminalLight, terminalDark } from './terminal';
import { notionTheme, notionLight, notionDark } from './notion';

// Export individual themes
export { minimalTheme, minimalLight, minimalDark } from './minimal';
export { brutalismTheme, brutalismLight, brutalismDark } from './brutalism';
export { neobrutalismTheme, neobrutalismLight, neobrutalismDark } from './neobrutalism';
export { terminalTheme, terminalLight, terminalDark } from './terminal';
export { notionTheme, notionLight, notionDark } from './notion';

// Theme definition type
export interface ThemeDefinition {
  id: string;
  displayName: string;
  description: string;
  default: string;
  defaultDark?: string;
  defaultLight?: string;
  themes: Record<string, Theme>;
  order?: number;
}

// All available themes
export const themeDefinitions: ThemeDefinition[] = [
  { ...minimalTheme, order: 0 },
  { ...brutalismTheme, order: 1 },
  { ...neobrutalismTheme, order: 2 },
  { ...terminalTheme, order: 3 },
  { ...notionTheme, order: 4 },
];

// Theme lookup by ID
export const themeMap: Record<string, ThemeDefinition> = Object.fromEntries(
  themeDefinitions.map(t => [t.id, t])
);

// Get theme preview colors (for UI)
export function getThemePreviewColors(themeId: string): {
  background: string;
  foreground: string;
  accent: string;
} | null {
  const def = themeMap[themeId];
  if (!def) return null;
  
  const lightTheme = def.themes[def.defaultLight || def.default];
  if (!lightTheme) return null;
  
  return {
    background: lightTheme.propertyDefinitions['--background']?.value || '#ffffff',
    foreground: lightTheme.propertyDefinitions['--foreground']?.value || '#000000',
    accent: lightTheme.propertyDefinitions['--accent']?.value || '#2563eb',
  };
}

// Get all themes as flat record (for project.files.themes)
export function getAllThemes(): Record<string, Theme> {
  const result: Record<string, Theme> = {};
  for (const def of themeDefinitions) {
    for (const [name, theme] of Object.entries(def.themes)) {
      result[name] = theme;
    }
  }
  return result;
}

// Get themes for a specific theme definition
export function getThemesForDefinition(themeId: string): Record<string, Theme> | null {
  const def = themeMap[themeId];
  return def?.themes || null;
}

// Default theme for new projects
export const DEFAULT_THEME = minimalTheme;
