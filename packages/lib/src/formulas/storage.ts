/**
 * Storage Formulas
 * Based on specs/12-standard-library.md
 * SSR-safe formulas for reading from browser storage
 */

import { registerFormula } from '../index';

export function registerStorageFormulas(): void {
  // getFromLocalStorage - Read and JSON parse from localStorage
  registerFormula('@toddle/getFromLocalStorage', (args, ctx) => {
    // Server-side or no localStorage: return null
    if (ctx?.env?.isServer ?? typeof localStorage === 'undefined') {
      return null;
    }

    const key = args.key as string;
    if (typeof key !== 'string') return null;

    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;

      return JSON.parse(value);
    } catch {
      // If JSON parse fails, return null
      return null;
    }
  });

  // getFromSessionStorage - Read and JSON parse from sessionStorage
  registerFormula('@toddle/getFromSessionStorage', (args, ctx) => {
    // Server-side or no sessionStorage: return null
    if (ctx?.env?.isServer ?? typeof sessionStorage === 'undefined') {
      return null;
    }

    const key = args.key as string;
    if (typeof key !== 'string') return null;

    try {
      const value = sessionStorage.getItem(key);
      if (value === null) return null;

      return JSON.parse(value);
    } catch {
      // If JSON parse fails, return null
      return null;
    }
  });
}
