/**
 * Shadow Tokens
 * Light and dark mode shadows
 */

export const shadows = {
  light: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
  dark: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  },
  // Neobrutalism hard shadows
  hard: {
    sm: '2px 2px 0 currentColor',
    md: '4px 4px 0 currentColor',
    lg: '6px 6px 0 currentColor',
  },
  // Colored neobrutalism shadows
  colored: {
    black: '4px 4px 0 #000000',
    white: '4px 4px 0 #ffffff',
  },
} as const;
