/**
 * Color Tokens
 * Shared color definitions for all themes
 */

export interface ColorTokens {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
  card: string;
}

export const colorTokens = {
  // Neutral grays for light mode
  neutralLight: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Neutral grays for dark mode
  neutralDark: {
    50: '#171717',
    100: '#262626',
    200: '#404040',
    300: '#525252',
    400: '#737373',
    500: '#a3a3a3',
    600: '#d4d4d4',
    700: '#e5e5e5',
    800: '#f5f5f5',
    900: '#fafafa',
    950: '#ffffff',
  },
  
  // Blue accent
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Green
  green: {
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
  },
  
  // Red/Rose
  rose: {
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
  },
  
  // Yellow
  yellow: {
    400: '#facc15',
    500: '#eab308',
  },
  
  // Amber (for neobrutalism)
  amber: {
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
  },
  
  // Terminal green
  terminal: {
    green: '#00ff00',
    darkGreen: '#008800',
    black: '#0c0c0c',
    lightGray: '#f0f0f0',
  },
  
  // Notion-inspired
  notion: {
    light: {
      bg: '#ffffff',
      fg: '#37352f',
      muted: '#787774',
      border: '#e9e9e7',
      card: '#f7f6f3',
    },
    dark: {
      bg: '#191919',
      fg: '#e6e6e6',
      muted: '#9b9a97',
      border: '#373737',
      card: '#2f2f2f',
    },
  },
} as const;
