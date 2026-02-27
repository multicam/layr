/**
 * Environment & DOM Formulas
 * Based on specs/12-standard-library.md
 * Server/client aware formulas that handle SSR gracefully
 */

import { registerFormula } from '../index';

export function registerEnvironmentFormulas(): void {
  // branchName - Returns env.branchName
  registerFormula('@toddle/branchName', (args, ctx) => {
    return ctx?.env?.branchName ?? null;
  });

  // canShare - Returns navigator.canShare() result
  registerFormula('@toddle/canShare', (args, ctx) => {
    // Server-side: return false
    if (ctx?.env?.isServer ?? typeof navigator === 'undefined') {
      return false;
    }

    // Check if Web Share API is available
    if (typeof navigator.canShare !== 'function') {
      return false;
    }

    // If data is provided, check if that specific share is possible
    const data = args.data as ShareData | undefined;
    if (data) {
      try {
        return navigator.canShare(data);
      } catch {
        return false;
      }
    }

    // Just check if sharing is available at all
    return true;
  });

  // currentURL - Returns current URL (server/client aware)
  registerFormula('@toddle/currentURL', (args, ctx) => {
    // Server-side: return from request context
    if (ctx?.env?.isServer) {
      return ctx?.env?.request?.url ?? null;
    }

    // Client-side: return window.location.href
    if (typeof window !== 'undefined') {
      return window.location.href;
    }

    return null;
  });

  // getElementById - Returns document.getElementById() result
  registerFormula('@toddle/getElementById', (args, ctx) => {
    // Server-side: return null
    if (ctx?.env?.isServer ?? typeof document === 'undefined') {
      return null;
    }

    const id = args.id as string;
    if (typeof id !== 'string') return null;

    return document.getElementById(id);
  });

  // getCookie - Reads cookie (server/client aware)
  registerFormula('@toddle/getCookie', (args, ctx) => {
    const name = args.name as string;
    if (typeof name !== 'string') return null;

    // Server-side: read from request cookies
    if (ctx?.env?.isServer) {
      return ctx?.env?.request?.cookies?.[name] ?? null;
    }

    // Client-side: parse from document.cookie
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (decodeURIComponent(key) === name) {
        return decodeURIComponent(value);
      }
    }

    return null;
  });

  // getHttpOnlyCookie - Reads HttpOnly cookie (server only)
  registerFormula('@toddle/getHttpOnlyCookie', (args, ctx) => {
    const name = args.name as string;
    if (typeof name !== 'string') return null;

    // HttpOnly cookies are only accessible on the server
    if (!ctx?.env?.isServer) {
      return null;
    }

    return ctx?.env?.request?.cookies?.[name] ?? null;
  });

  // isServer - Returns true on server, false on client
  registerFormula('@toddle/isServer', (args, ctx) => {
    return ctx?.env?.isServer ?? false;
  });

  // languages - Returns navigator.languages
  registerFormula('@toddle/languages', (args, ctx) => {
    // Server-side: return default
    if (ctx?.env?.isServer ?? typeof navigator === 'undefined') {
      return ['en'];
    }

    return navigator.languages ?? ['en'];
  });

  // userAgent - Returns user agent string
  registerFormula('@toddle/userAgent', (args, ctx) => {
    // Server-side: read from request headers
    if (ctx?.env?.isServer) {
      return ctx?.env?.request?.headers?.['user-agent'] ?? null;
    }

    // Client-side: return navigator.userAgent
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }

    return null;
  });
}
