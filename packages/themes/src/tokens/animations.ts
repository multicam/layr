/**
 * Animation Tokens
 * Durations, easings, and keyframes
 */

export const durations = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

export const easings = {
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modalBackdrop: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;
