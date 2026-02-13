/**
 * Page Lifecycle System
 * Based on specs/page-lifecycle.md
 * 
 * Manages component lifecycle events (onLoad, onUnmount, onAttributeChange).
 */

import type { Signal } from '@layr/core';
import type { ActionModel, Component } from '@layr/types';

// ============================================================================
// Lifecycle Types
// ============================================================================

export interface LifecycleEvent {
  trigger: 'Load' | 'Attribute change';
  actions: ActionModel[];
}

export interface LifecycleContext {
  data: Record<string, unknown>;
  triggerActionEvent: (name: string, data?: unknown) => void;
  setVariable: (name: string, value: unknown) => void;
  fetchApi: (name: string, inputs?: Record<string, unknown>) => Promise<void>;
  abortController: AbortController;
}

export interface LifecycleHandler {
  onLoad?: LifecycleEvent;
  onAttributeChange?: LifecycleEvent;
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

type LifecycleCallback = () => void | Promise<void>;

const mountCallbacks: LifecycleCallback[] = [];
const unmountCallbacks: LifecycleCallback[] = [];
const attributeChangeCallbacks: Array<(attrs: Record<string, unknown>) => void> = [];

/**
 * Reset all lifecycle callbacks. Used for test teardown and page transitions.
 */
export function resetLifecycleCallbacks(): void {
  mountCallbacks.length = 0;
  unmountCallbacks.length = 0;
  attributeChangeCallbacks.length = 0;
}

/**
 * Register a callback for component mount.
 */
export function onMount(callback: LifecycleCallback): () => void {
  mountCallbacks.push(callback);
  return () => {
    const index = mountCallbacks.indexOf(callback);
    if (index > -1) mountCallbacks.splice(index, 1);
  };
}

/**
 * Register a callback for component unmount.
 */
export function onUnmount(callback: LifecycleCallback): () => void {
  unmountCallbacks.push(callback);
  return () => {
    const index = unmountCallbacks.indexOf(callback);
    if (index > -1) unmountCallbacks.splice(index, 1);
  };
}

/**
 * Register a callback for attribute changes.
 */
export function onAttributesChange(
  callback: (attrs: Record<string, unknown>) => void
): () => void {
  attributeChangeCallbacks.push(callback);
  return () => {
    const index = attributeChangeCallbacks.indexOf(callback);
    if (index > -1) attributeChangeCallbacks.splice(index, 1);
  };
}

/**
 * Trigger mount callbacks.
 */
export async function triggerMount(): Promise<void> {
  for (const callback of mountCallbacks) {
    await callback();
  }
}

/**
 * Trigger unmount callbacks.
 */
export async function triggerUnmount(): Promise<void> {
  for (const callback of unmountCallbacks) {
    await callback();
  }
}

/**
 * Trigger attribute change callbacks.
 */
export function triggerAttributeChange(attrs: Record<string, unknown>): void {
  for (const callback of attributeChangeCallbacks) {
    callback(attrs);
  }
}

// ============================================================================
// Component Lifecycle Manager
// ============================================================================

export interface ComponentLifecycleOptions {
  component: Component;
  dataSignal: Signal<Record<string, unknown>>;
  abortController: AbortController;
  handleAction: (action: ActionModel, ctx: Partial<LifecycleContext>) => Promise<void>;
}

/**
 * Create a lifecycle manager for a component.
 */
export function createComponentLifecycle(options: ComponentLifecycleOptions): {
  initialize: () => Promise<void>;
  destroy: () => void;
  handleAttributeChange: (newAttrs: Record<string, unknown>) => void;
} {
  const { component, dataSignal, abortController, handleAction } = options;
  
  let destroyed = false;
  let unsubscribers: Array<() => void> = [];
  
  /**
   * Initialize lifecycle events.
   */
  async function initialize(): Promise<void> {
    if (destroyed) return;
    
    // Handle onLoad
    if (component.onLoad?.actions) {
      const ctx: Partial<LifecycleContext> = {
        data: dataSignal.get(),
        abortController,
      };
      
      for (const action of component.onLoad.actions) {
        if (abortController.signal.aborted) break;
        await handleAction(action, ctx);
      }
    }
    
    // Subscribe to attribute changes
    if (component.onAttributeChange?.actions) {
      // Subscribe to route signal changes
      const unsubscribe = dataSignal.subscribe((data) => {
        if (destroyed) return;
        handleAttributeChange(data.Attributes ?? {});
      });
      unsubscribers.push(unsubscribe);
    }
  }
  
  /**
   * Destroy lifecycle.
   */
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    // Abort any pending operations
    abortController.abort();

    // Run unmount callbacks
    // TODO: destroy() calls global triggerUnmount() which fires ALL registered callbacks,
    // not just those for this component instance. Needs scoping per component.
    triggerUnmount();

    // Unsubscribe from signals
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
    unsubscribers = [];
  }
  
  /**
   * Handle attribute change event.
   */
  function handleAttributeChange(newAttrs: Record<string, unknown>): void {
    if (destroyed) return;
    if (!component.onAttributeChange?.actions) return;
    
    const ctx: Partial<LifecycleContext> = {
      data: { ...dataSignal.get(), Attributes: newAttrs },
      abortController,
    };
    
    for (const action of component.onAttributeChange.actions) {
      if (abortController.signal.aborted) break;
      handleAction(action, ctx);
    }
  }
  
  return {
    initialize,
    destroy,
    handleAttributeChange,
  };
}

// ============================================================================
// Global Toddle Object
// ============================================================================

export interface ToddleEnv {
  isServer: boolean;
  branchName?: string;
  request?: Request;
  runtime: 'page' | 'preview' | 'custom-element';
  logErrors: boolean;
}

export interface ToddleGlobal {
  project: string;
  branch: string;
  commit: string;
  errors: Error[];
  formulas: Record<string, Record<string, unknown>>;
  actions: Record<string, Record<string, unknown>>;
  isEqual: (a: unknown, b: unknown) => boolean;
  registerFormula: (name: string, handler: unknown) => void;
  registerAction: (name: string, handler: unknown) => void;
  getFormula: (name: string) => unknown;
  getAction: (name: string) => unknown;
  getCustomFormula: (name: string, packageName?: string) => unknown;
  getCustomAction: (name: string, packageName?: string) => unknown;
  getArgumentInputData: (
    name: string,
    args: unknown[],
    idx: number,
    data: unknown
  ) => unknown;
  data: Record<string, unknown>;
  components: Component[];
  locationSignal?: Signal<unknown>;
  eventLog: Array<{
    component: string;
    node: string;
    event: string;
    time: string;
    data: unknown;
  }>;
  pageState?: Record<string, unknown>;
  env: ToddleEnv;
}

/**
 * Check if global toddle object exists.
 */
export function hasToddleGlobal(): boolean {
  return typeof globalThis !== 'undefined' && '__toddle' in globalThis;
}

/**
 * Get the global toddle object.
 */
export function getToddleGlobal(): ToddleGlobal | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as any).__toddle;
}

/**
 * Initialize the global toddle object.
 */
export function initToddleGlobal(options: {
  project: string;
  branch: string;
  commit: string;
  env: ToddleEnv;
}): ToddleGlobal {
  const toddle: ToddleGlobal = {
    project: options.project,
    branch: options.branch,
    commit: options.commit,
    errors: [],
    formulas: {},
    actions: {},
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    registerFormula: () => {},
    registerAction: () => {},
    getFormula: () => undefined,
    getAction: () => undefined,
    getCustomFormula: () => undefined,
    getCustomAction: () => undefined,
    getArgumentInputData: () => undefined,
    data: {},
    components: [],
    eventLog: [],
    env: options.env,
  };
  
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__toddle = toddle;
  }
  
  return toddle;
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Log component state to console.
 */
export function logState(): void {
  const toddle = getToddleGlobal();
  if (!toddle) {
    console.log('Toddle global not found');
    return;
  }
  
  console.table({
    project: toddle.project,
    branch: toddle.branch,
    commit: toddle.commit,
    errorCount: toddle.errors.length,
    componentCount: toddle.components.length,
    runtime: toddle.env.runtime,
  });
  
  if (toddle.errors.length > 0) {
    console.group('Errors');
    for (const error of toddle.errors) {
      console.error(error);
    }
    console.groupEnd();
  }
}
