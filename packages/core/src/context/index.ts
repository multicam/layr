/**
 * Context Providers System
 * Based on specs/context-providers.md
 */

import type { Signal } from '../signal/signal';

export type ContextKey = string | symbol;

export interface ContextProvider<T = unknown> {
  key: ContextKey;
  get(): T | undefined;
  getSignal(): Signal<T> | undefined;
}

const providers = new Map<ContextKey, ContextProvider>();

/**
 * Register a context provider
 *
 * WARNING: Global provide/consume are for browser-only usage.
 * For SSR, use ContextScope to avoid cross-request state leakage.
 */
export function provide<T>(key: ContextKey, value: T | Signal<T>): ContextProvider<T> {
  const isSignal = typeof (value as any)?.get === 'function' && typeof (value as any)?.subscribe === 'function';
  
  const provider: ContextProvider<T> = {
    key,
    get: () => isSignal ? (value as Signal<T>).get() : (value as T),
    getSignal: () => isSignal ? (value as Signal<T>) : undefined,
  };
  
  providers.set(key, provider);
  return provider;
}

/**
 * Consume a context value
 */
export function consume<T>(key: ContextKey, defaultValue?: T): T | undefined {
  const provider = providers.get(key);
  return provider ? (provider.get() as T) : defaultValue;
}

/**
 * Consume a context signal
 */
export function consumeSignal<T>(key: ContextKey): Signal<T> | undefined {
  const provider = providers.get(key);
  return provider?.getSignal() as Signal<T> | undefined;
}

/**
 * Check if context is provided
 */
export function hasContext(key: ContextKey): boolean {
  return providers.has(key);
}

/**
 * Remove a context provider
 */
export function unprovide(key: ContextKey): boolean {
  return providers.delete(key);
}

/**
 * Clear all providers
 */
export function clearProviders(): void {
  providers.clear();
}

/**
 * Create a typed context
 */
export function createContext<T>(key: string | symbol) {
  return {
    provide: (value: T | Signal<T>) => provide(key, value),
    consume: (defaultValue?: T) => consume(key, defaultValue),
    consumeSignal: () => consumeSignal<T>(key),
    has: () => hasContext(key),
  };
}

/**
 * Scoped context
 */
export class ContextScope {
  private providers = new Map<ContextKey, ContextProvider>();
  private parent?: ContextScope;
  
  constructor(parent?: ContextScope) {
    this.parent = parent;
  }
  
  provide<T>(key: ContextKey, value: T | Signal<T>): ContextProvider<T> {
    const isSignal = typeof (value as any)?.get === 'function' && typeof (value as any)?.subscribe === 'function';

    const provider: ContextProvider<T> = {
      key,
      get: () => isSignal ? (value as Signal<T>).get() : (value as T),
      getSignal: () => isSignal ? (value as Signal<T>) : undefined,
    };

    this.providers.set(key, provider);
    return provider;
  }
  
  consume<T>(key: ContextKey, defaultValue?: T): T | undefined {
    const provider = this.providers.get(key);
    if (provider) return provider.get() as T;
    if (this.parent) return this.parent.consume(key, defaultValue);
    return consume(key, defaultValue);
  }
  
  has(key: ContextKey): boolean {
    if (this.providers.has(key)) return true;
    if (this.parent?.has(key)) return true;
    return hasContext(key);
  }
  
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Common context keys
 */
export const ContextKeys = {
  Attributes: 'layr:attributes',
  Variables: 'layr:variables',
  Apis: 'layr:apis',
  ListItem: 'layr:listItem',
  Component: 'layr:component',
  Page: 'layr:page',
  URL: 'layr:url',
  Route: 'layr:route',
  Env: 'layr:env',
  Request: 'layr:request',
  Response: 'layr:response',
} as const;
