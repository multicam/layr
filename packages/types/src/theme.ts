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

