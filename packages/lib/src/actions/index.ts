/**
 * Standard Library Actions
 * Based on specs/standard-library.md
 */

import type { ActionContext } from '@layr/core';

export type ActionHandler = (args: Record<string, unknown>, ctx: ActionContext) => void | Promise<void>;
export type ActionRegistry = Map<string, ActionHandler>;

export const actions: ActionRegistry = new Map();

export function registerAction(name: string, handler: ActionHandler): void {
  actions.set(name, handler);
}

export function getAction(name: string): ActionHandler | undefined {
  return actions.get(name);
}

// ============================================================================
// Local Storage Actions
// ============================================================================

const saveToLocalStorage: ActionHandler = (args) => {
  if (typeof window === 'undefined') return;
  const { key, value } = args;
  if (typeof key === 'string') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const deleteFromLocalStorage: ActionHandler = (args) => {
  if (typeof window === 'undefined') return;
  const { key } = args;
  if (typeof key === 'string') {
    localStorage.removeItem(key);
  }
};

const clearLocalStorage: ActionHandler = () => {
  if (typeof window === 'undefined') return;
  localStorage.clear();
};

// ============================================================================
// Session Storage Actions
// ============================================================================

const saveToSessionStorage: ActionHandler = (args) => {
  if (typeof window === 'undefined') return;
  const { key, value } = args;
  if (typeof key === 'string') {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
};

const deleteFromSessionStorage: ActionHandler = (args) => {
  if (typeof window === 'undefined') return;
  const { key } = args;
  if (typeof key === 'string') {
    sessionStorage.removeItem(key);
  }
};

const clearSessionStorage: ActionHandler = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.clear();
};

// ============================================================================
// Cookie Actions
// ============================================================================

const setCookie: ActionHandler = (args) => {
  if (typeof document === 'undefined') return;
  const { name, value, expiresIn, sameSite = 'Lax', path = '/' } = args;
  if (typeof name !== 'string') return;
  
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`;
  
  if (typeof expiresIn === 'number') {
    const expires = new Date(Date.now() + expiresIn * 1000);
    cookie += `; Expires=${expires.toUTCString()}`;
  }
  
  cookie += `; Path=${path}`;
  cookie += `; SameSite=${sameSite}`;
  
  document.cookie = cookie;
};

// ============================================================================
// Navigation Actions
// ============================================================================

const goToURL: ActionHandler = (args, ctx) => {
  if (typeof window === 'undefined') return;
  const { url } = args;
  if (typeof url === 'string') {
    // Check if in preview mode (don't navigate)
    if (ctx?.preview) return;
    window.location.href = url;
  }
};

// ============================================================================
// Event Actions
// ============================================================================

const focus: ActionHandler = (args) => {
  const { element } = args;
  if (element && typeof (element as HTMLElement).focus === 'function') {
    (element as HTMLElement).focus();
  }
};

const preventDefault: ActionHandler = (_args, ctx) => {
  if (ctx?.event && typeof ctx.event.preventDefault === 'function') {
    ctx.event.preventDefault();
  }
};

const stopPropagation: ActionHandler = (_args, ctx) => {
  if (ctx?.event && typeof ctx.event.stopPropagation === 'function') {
    ctx.event.stopPropagation();
  }
};

// ============================================================================
// Timer Actions
// ============================================================================

const sleep: ActionHandler = async (args, ctx) => {
  const { delay } = args;
  if (typeof delay !== 'number') return;
  
  return new Promise<void>((resolve) => {
    const timeoutId = setTimeout(resolve, delay);
    
    // Cleanup on unmount if context provides it
    if (ctx?.onUnmount) {
      ctx.onUnmount(() => clearTimeout(timeoutId));
    }
  });
};

const interval: ActionHandler = (args, ctx) => {
  const { delay, onTick } = args;
  if (typeof delay !== 'number') return;
  
  const intervalId = setInterval(() => {
    if (typeof onTick === 'function') {
      onTick();
    }
  }, delay);
  
  // Cleanup on unmount
  if (ctx?.onUnmount) {
    ctx.onUnmount(() => clearInterval(intervalId));
  }
};

// ============================================================================
// Debug Actions
// ============================================================================

const logToConsole: ActionHandler = (args) => {
  const { label, data } = args;
  console.log(label ?? 'Log', data);
};

// ============================================================================
// Sharing Actions
// ============================================================================

const copyToClipboard: ActionHandler = async (args) => {
  if (typeof navigator === 'undefined') return;
  const { value } = args;
  if (typeof value !== 'string') return;
  
  try {
    await navigator.clipboard.writeText(value);
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
  }
};

const share: ActionHandler = async (args) => {
  if (typeof navigator === 'undefined') return;
  if (!navigator.share) return;
  
  const { url, title, text } = args;
  
  try {
    await navigator.share({
      url: typeof url === 'string' ? url : undefined,
      title: typeof title === 'string' ? title : undefined,
      text: typeof text === 'string' ? text : undefined,
    });
  } catch (e) {
    // User cancelled or error - silently ignore
  }
};

// ============================================================================
// Theme Actions
// ============================================================================

const setTheme: ActionHandler = (args) => {
  const { name } = args;
  
  if (typeof document === 'undefined') return;
  
  if (name === null || name === undefined) {
    // Reset to default
    document.documentElement.removeAttribute('data-nc-theme');
  } else if (typeof name === 'string') {
    document.documentElement.setAttribute('data-nc-theme', name);
  }
};

// ============================================================================
// Register All Actions
// ============================================================================

export function registerActions(): void {
  // Local Storage
  registerAction('@toddle/saveToLocalStorage', saveToLocalStorage);
  registerAction('@toddle/deleteFromLocalStorage', deleteFromLocalStorage);
  registerAction('@toddle/clearLocalStorage', clearLocalStorage);
  
  // Session Storage
  registerAction('@toddle/saveToSessionStorage', saveToSessionStorage);
  registerAction('@toddle/deleteFromSessionStorage', deleteFromSessionStorage);
  registerAction('@toddle/clearSessionStorage', clearSessionStorage);
  
  // Cookies
  registerAction('@toddle/setCookie', setCookie);
  
  // Navigation
  registerAction('@toddle/goToURL', goToURL);
  
  // Events
  registerAction('@toddle/focus', focus);
  registerAction('@toddle/preventDefault', preventDefault);
  registerAction('@toddle/stopPropagation', stopPropagation);
  
  // Timers
  registerAction('@toddle/sleep', sleep);
  registerAction('@toddle/interval', interval);
  
  // Debug
  registerAction('@toddle/logToConsole', logToConsole);
  
  // Sharing
  registerAction('@toddle/copyToClipboard', copyToClipboard);
  registerAction('@toddle/share', share);
  
  // Theme
  registerAction('@toddle/setTheme', setTheme);
}
