/**
 * Navigation System
 * Based on specs/navigation-system.md
 * 
 * Manages client-side URL state, browser history integration, and URL construction.
 */

import type { Signal } from '@layr/core';

// ============================================================================
// Location Types
// ============================================================================

export interface Location {
  route?: {
    path: Array<{ type: 'static' | 'param'; name: string }>;
    query?: Record<string, { name: string }>;
  };
  page?: string;
  path: string;
  params: Record<string, string | null>;
  query: Record<string, string | string[] | null>;
  hash: string | null;
}

export type LocationSignal = Signal<Location>;

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse query string into key-value pairs.
 */
export function parseQuery(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  const str = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (!str) return result;
  
  const pairs = str.split('&').filter(Boolean);
  
  for (const pair of pairs) {
    const index = pair.indexOf('=');
    if (index > 0) {
      const key = decodeURIComponent(pair.slice(0, index));
      const value = decodeURIComponent(pair.slice(index + 1));
      result[key] = value;
    } else {
      result[decodeURIComponent(pair)] = '';
    }
  }
  
  return result;
}

/**
 * Parse URL into location data.
 */
export function parseUrl(component: {
  route?: Location['route'];
  page?: string;
}): Omit<Location, 'route' | 'page'> {
  const path = window.location.pathname;
  const hash = window.location.hash.split('?')[0].slice(1) || null;
  const searchParams = window.location.search;
  
  const params: Record<string, string | null> = {};
  const query: Record<string, string | string[] | null> = {};
  
  // Parse path parameters
  if (component.route?.path) {
    const segments = path.split('/').filter(Boolean);
    
    for (let i = 0; i < component.route.path.length; i++) {
      const segment = component.route.path[i];
      
      if (segment.type === 'param') {
        const value = segments[i];
        params[segment.name] = value ? decodeURIComponent(value) : null;
      }
    }
  }
  
  // Parse query parameters
  const parsedQuery = parseQuery(searchParams);
  
  // Initialize declared query params to null
  if (component.route?.query) {
    for (const key of Object.keys(component.route.query)) {
      query[key] = null;
    }
  }
  
  // Overlay actual values
  for (const [key, value] of Object.entries(parsedQuery)) {
    query[key] = value;
  }
  
  return { path, params, query, hash };
}

// ============================================================================
// URL Construction
// ============================================================================

/**
 * Build a URL string from a location object.
 */
export function getLocationUrl(location: Location): string {
  let path = '';
  
  // Build path
  if (location.route?.path) {
    const segments: string[] = [];
    
    for (const segment of location.route.path) {
      if (segment.type === 'static') {
        segments.push(segment.name);
      } else {
        const value = location.params[segment.name];
        if (value == null) break;
        segments.push(encodeURIComponent(value));
      }
    }
    
    path = '/' + segments.join('/');
  } else if (location.page) {
    // Legacy routing - would use path-to-regexp.compile()
    path = location.path;
  } else {
    path = location.path;
  }
  
  // Add hash (before query for this implementation)
  let result = path;
  if (location.hash) {
    result += '#' + location.hash;
  }
  
  // Add query string
  const queryEntries = Object.entries(location.query)
    .filter(([, v]) => v != null)
    .map(([k, v]) => {
      const key = encodeURIComponent(k);
      const value = typeof v === 'string' ? encodeURIComponent(v) : '';
      return `${key}=${value}`;
    });
  
  if (queryEntries.length > 0) {
    result += '?' + queryEntries.join('&');
  }
  
  return result;
}

// ============================================================================
// Browser History Integration
// ============================================================================

/**
 * Update browser history and location signal.
 */
export function navigate(
  location: Location,
  locationSignal: LocationSignal,
  mode: 'push' | 'replace' = 'push'
): void {
  const url = getLocationUrl(location);
  const currentUrl = getLocationUrl(locationSignal.get());
  
  if (url === currentUrl) return;
  
  if (mode === 'push') {
    window.history.pushState({}, '', url);
  } else {
    window.history.replaceState({}, '', url);
  }
  
  locationSignal.set(location);
}

/**
 * Set a single URL parameter.
 */
export function setUrlParameter(
  name: string,
  value: string | null | undefined,
  locationSignal: LocationSignal,
  mode?: 'push' | 'replace'
): void {
  const current = locationSignal.get();
  
  // Determine if it's a path or query parameter
  const isPathParam = current.route?.path?.some(
    (s) => s.type === 'param' && s.name === name
  );
  
  const newLocation: Location = { ...current };
  
  if (isPathParam) {
    newLocation.params = { ...current.params, [name]: value ?? null };
  } else {
    if (value === undefined) {
      const { [name]: _, ...rest } = current.query;
      newLocation.query = rest as Location['query'];
    } else {
      newLocation.query = { ...current.query, [name]: value };
    }
  }
  
  // Default mode: push for path params, replace for query params
  const defaultMode = isPathParam ? 'push' : 'replace';
  navigate(newLocation, locationSignal, mode ?? defaultMode);
}

/**
 * Set multiple URL parameters atomically.
 */
export function setUrlParameters(
  params: Record<string, string | null | undefined>,
  locationSignal: LocationSignal,
  mode?: 'push' | 'replace'
): void {
  const current = locationSignal.get();
  
  if (!current.route) return;
  
  const newLocation: Location = {
    ...current,
    params: { ...current.params },
    query: { ...current.query },
  };
  
  let hasPathChange = false;
  
  for (const [name, value] of Object.entries(params)) {
    const isPathParam = current.route.path?.some(
      (s) => s.type === 'param' && s.name === name
    );
    
    if (isPathParam) {
      newLocation.params[name] = value ?? null;
      hasPathChange = true;
    } else {
      if (value === undefined) {
        delete newLocation.query[name];
      } else {
        newLocation.query[name] = value;
      }
    }
  }
  
  // Default mode: push if any path param changed
  const defaultMode = hasPathChange ? 'push' : 'replace';
  navigate(newLocation, locationSignal, mode ?? defaultMode);
}

// ============================================================================
// Scroll State Management
// ============================================================================

interface ScrollPosition {
  x: number;
  y: number;
}

interface ScrollState {
  __window: ScrollPosition;
  [key: string]: ScrollPosition;
}

/**
 * Store scroll positions for all scrollable elements.
 */
export function storeScrollState(
  key: string = '',
  querySelector: string = '[data-id]',
  getId: (node: Element) => string | null = (node) => node.getAttribute('data-id')
): () => void {
  const scrollPositions: ScrollState = {
    __window: { x: window.scrollX, y: window.scrollY },
  };
  
  const elements = document.querySelectorAll(querySelector);
  
  for (const element of elements) {
    const id = getId(element);
    if (id && (element.scrollTop !== 0 || element.scrollLeft !== 0)) {
      scrollPositions[id] = {
        x: element.scrollLeft,
        y: element.scrollTop,
      };
    }
  }
  
  sessionStorage.setItem(`scroll-position(${key})`, JSON.stringify(scrollPositions));
  
  // Return restorer function
  return () => restoreScrollState(key, getId);
}

/**
 * Restore scroll positions from stored state.
 */
export function restoreScrollState(
  key: string = '',
  getId: (id: string) => HTMLElement | null = (id) => document.querySelector(`[data-id="${id}"]`)
): void {
  const stored = sessionStorage.getItem(`scroll-position(${key})`);
  if (!stored) return;
  
  try {
    const scrollPositions = JSON.parse(stored) as ScrollState;
    
    // Check for __window key
    if (!scrollPositions.__window) return;
    
    // Restore element positions
    for (const [id, pos] of Object.entries(scrollPositions)) {
      if (id === '__window') continue;
      
      const element = getId(id);
      if (element) {
        element.scrollLeft = pos.x;
        element.scrollTop = pos.y;
      }
    }
    
    // Restore window scroll
    window.scrollTo(scrollPositions.__window.x, scrollPositions.__window.y);
  } catch {
    // Invalid scroll state
  }
}

// ============================================================================
// View Transitions
// ============================================================================

/**
 * Try to start a view transition with graceful fallback.
 */
export function tryStartViewTransition(
  updateCallback: () => void,
  options?: { skipPrefersReducedMotionCheck?: boolean }
): { finished: Promise<void> } {
  // Check for API support
  if (!document.startViewTransition) {
    updateCallback();
    return { finished: Promise.resolve() };
  }
  
  // Check for reduced motion preference
  if (!options?.skipPrefersReducedMotionCheck) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    
    if (prefersReducedMotion) {
      updateCallback();
      return { finished: Promise.resolve() };
    }
  }
  
  // Use native API
  const transition = document.startViewTransition(updateCallback);
  return { finished: transition.finished };
}

// ============================================================================
// URL Validation (shared with SSR)
// ============================================================================

/**
 * Validate and normalize a URL.
 */
export function validateUrl(options: {
  path: string | null | undefined;
  origin?: string;
}): URL | false {
  const { path, origin } = options;
  
  if (typeof path !== 'string') return false;
  
  try {
    const url = new URL(path, origin);
    
    // Re-encode search parameters
    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      params.set(key, value);
    }
    url.search = params.toString();
    
    return url;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a localhost URL.
 */
export function isLocalhostUrl(href: string): boolean {
  return (
    href.startsWith('http://localhost:54404') ||
    href.startsWith('http://preview.localhost:54404')
  );
}

/**
 * Check if a hostname is localhost.
 */
export function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}
