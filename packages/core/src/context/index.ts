/**
 * Context Providers System
 * Based on specs/context-providers.md
 */

import type { Signal } from '../signal/signal';
import { isSignal } from '../signal/signal';
import type { Component } from '@layr/types';

export type ContextKey = string | symbol;

export interface ContextProvider<T = unknown> {
  key: ContextKey;
  get(): T | undefined;
  getSignal(): Signal<T> | undefined;
}

export interface PreviewContextConfig {
  providerName: string;
  packageName?: string;
  formulas: string[];
}

export interface PreviewContextData {
  [providerName: string]: {
    [formulaName: string]: unknown;
  };
}

const providers = new Map<ContextKey, ContextProvider>();

/**
 * Register a context provider
 *
 * WARNING: Global provide/consume are for browser-only usage.
 * For SSR, use ContextScope to avoid cross-request state leakage.
 */
export function provide<T>(key: ContextKey, value: T | Signal<T>): ContextProvider<T> {
  const valueIsSignal = isSignal(value);

  const provider: ContextProvider<T> = {
    key,
    get: () => valueIsSignal ? (value as Signal<T>).get() : (value as T),
    getSignal: () => valueIsSignal ? (value as Signal<T>) : undefined,
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
    const valueIsSignal = isSignal(value);

    const provider: ContextProvider<T> = {
      key,
      get: () => valueIsSignal ? (value as Signal<T>).get() : (value as T),
      getSignal: () => valueIsSignal ? (value as Signal<T>) : undefined,
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
 * Resolve preview context for editor preview mode
 * When a consumer is rendered in editor preview without a real provider ancestor,
 * build a synthetic context using test data.
 */
export function resolvePreviewContext(options: {
  config: PreviewContextConfig;
  providerComponent: any;
  applyFormula: (formula: any, ctx: any) => unknown;
  buildTestContext: (component: any) => any;
}): PreviewContextData {
  const { config, providerComponent, applyFormula, buildTestContext } = options;
  
  // Build synthetic context using test data
  const testContext = buildTestContext(providerComponent);
  
  // Evaluate each requested formula
  const results: PreviewContextData = {};
  const providerData: Record<string, unknown> = {};
  
  for (const formulaName of config.formulas) {
    const formula = providerComponent.formulas?.[formulaName];
    if (formula && formula.exposeInContext) {
      try {
        providerData[formulaName] = applyFormula(formula.formula, testContext);
      } catch (e) {
        console.warn(`Failed to evaluate context formula ${formulaName}:`, e);
        providerData[formulaName] = null;
      }
    } else {
      console.warn(`Formula ${formulaName} not found or not exposed on provider ${config.providerName}`);
    }
  }
  
  results[config.providerName] = providerData;
  return results;
}

/**
 * Check if component is a context provider
 */
export function isContextProvider(component: Component): boolean {
  if (!component) return false;

  for (const formula of Object.values(component.formulas ?? {})) {
    if (formula?.exposeInContext === true) return true;
  }

  for (const workflow of Object.values(component.workflows ?? {})) {
    if (workflow?.exposeInContext === true) return true;
  }

  return false;
}

/**
 * Get exposed formulas from a component
 */
export function getExposedFormulas(component: Component): string[] {
  if (!component?.formulas) return [];

  return Object.entries(component.formulas)
    .filter(([_, formula]) => formula?.exposeInContext === true)
    .map(([name]) => name);
}

/**
 * Get exposed workflows from a component
 */
export function getExposedWorkflows(component: Component): string[] {
  if (!component?.workflows) return [];

  return Object.entries(component.workflows)
    .filter(([_, workflow]) => workflow?.exposeInContext === true)
    .map(([name]) => name);
}

/**
 * Build provider key with package namespace
 */
export function buildProviderKey(providerName: string, packageName?: string): string {
  if (packageName) {
    return `${packageName}/${providerName}`;
  }
  return providerName;
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
