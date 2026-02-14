/**
 * Signal Implementation
 * Based on specs/reactive-signal-system.md
 * 
 * Informed by SolidJS signals and RxJS observables
 */

import deepEqual from 'fast-deep-equal';

export interface Subscriber<T> {
  notify: (value: T) => void;
  destroy?: () => void;
}

export interface SignalConfig {
  onDestroy?: () => void;
}

export class Signal<T> {
  private value: T;
  private subscribers: Set<Subscriber<T>> = new Set();
  private destroying = false;
  private config?: SignalConfig;

  constructor(initialValue: T, config?: SignalConfig) {
    this.value = initialValue;
    this.config = config;
  }

  /**
   * Get the current value
   */
  get(): T {
    return this.value;
  }

  /**
   * Set a new value and notify subscribers if changed
   */
  set(newValue: T): void {
    // Skip if destroying
    if (this.destroying) return;
    
    // Skip if no subscribers (optimization)
    if (this.subscribers.size === 0) {
      this.value = newValue;
      return;
    }

    // Deep equality check
    if (deepEqual(this.value, newValue)) {
      return;
    }

    this.value = newValue;

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber.notify(newValue);
      } catch (e) {
        console.error('Error in signal subscriber:', e);
      }
    }
  }

  /**
   * Functional update
   */
  update(fn: (value: T) => T): void {
    this.set(fn(this.value));
  }

  /**
   * Subscribe to changes
   * Immediately invokes with current value
   * Returns unsubscribe function
   */
  subscribe(
    notify: (value: T) => void,
    config?: { destroy?: () => void }
  ): () => void {
    const subscriber: Subscriber<T> = {
      notify,
      destroy: config?.destroy,
    };

    this.subscribers.add(subscriber);

    // Immediately invoke with current value
    try {
      notify(this.value);
    } catch (e) {
      console.error('Error in initial subscriber notification:', e);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Destroy the signal and all derived signals
   */
  destroy(): void {
    // Re-entrancy guard
    if (this.destroying) return;
    this.destroying = true;

    // Call all destroy callbacks
    for (const subscriber of this.subscribers) {
      try {
        subscriber.destroy?.();
      } catch (e) {
        console.error('Error in signal destroy callback:', e);
      }
    }

    // Clear subscribers
    this.subscribers.clear();

    // Call config destroy
    this.config?.onDestroy?.();
  }

  /**
   * Destroy all subscribers without destroying the signal itself.
   * Used by the editor for preview re-rendering.
   */
  cleanSubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.destroy?.();
      } catch (e) {
        console.error('Error in cleanSubscribers destroy callback:', e);
      }
    }
    this.subscribers.clear();
  }

  /**
   * Create a derived signal with automatic cleanup.
   * Parent destruction cascades to derived signal via subscriber destroy callback.
   */
  map<T2>(fn: (value: T) => T2): Signal<T2> {
    // Create derived signal with initial value
    const derived = new Signal<T2>(fn(this.value));

    // Subscribe to parent — destroy callback cascades parent destruction to child
    const unsubscribe = this.subscribe(
      (value) => derived.set(fn(value)),
      { destroy: () => derived.destroy() }
    );

    // When derived is destroyed directly, unsubscribe from parent first
    const originalDestroy = derived.destroy.bind(derived);
    derived.destroy = () => {
      unsubscribe();
      originalDestroy();
    };

    return derived;
  }
}

/**
 * Factory function to create signals
 */
export function createSignal<T>(initialValue: T, config?: SignalConfig): Signal<T> {
  return new Signal(initialValue, config);
}

/**
 * Type guard for Signal instances
 */
export function isSignal(value: unknown): value is Signal<unknown> {
  return value instanceof Signal;
}
