/**
 * Theme Types
 * Based on specs/styling-and-theming.md
 */

// ============================================================================
// Theme Definition
// ============================================================================

export interface Theme {
  name: string;
  isDefault?: boolean;
  propertyDefinitions: Record<string, ThemePropertyDefinition>;
}

export interface ThemePropertyDefinition {
  type: 'color' | 'string' | 'number';
  value: string;
  description?: string;
}

/**
 * Complete theme definition with multiple variants (light/dark)
 */
export interface ThemeDefinition {
  id: string;
  displayName: string;
  description: string;
  default: string;
  defaultDark?: string;
  defaultLight?: string;
  themes: Record<string, Theme>;
}

// ============================================================================
// Project Theme Config
// ============================================================================

/**
 * Theme configuration stored in project config
 */
export interface ProjectThemeConfig {
  /** Selected theme definition ID (e.g., 'minimal', 'brutalism') */
  themeId: string;
  /** Active variant ('light', 'dark', or specific theme name) */
  activeVariant: 'light' | 'dark' | string;
  /** Whether to use system preference for dark mode */
  followSystem?: boolean;
}

// ============================================================================
// Design Tokens
// ============================================================================

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'fontFamily' | 'fontSize' | 'spacing' | 'radius' | 'shadow';
}

export interface TokenCategory {
  name: string;
  tokens: DesignToken[];
}

