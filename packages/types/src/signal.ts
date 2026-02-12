/**
 * Signal Types
 * Based on specs/reactive-signal-system.md
 */

// ============================================================================
// Signal Interface
// ============================================================================

export interface Signal<T> {
  get(): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
  subscribe(
    notify: (value: T) => void,
    config?: { destroy?: () => void }
  ): () => void;
  destroy(): void;
  map<T2>(fn: (value: T) => T2): Signal<T2>;
}

// ============================================================================
// Subscriber
// ============================================================================

export interface Subscriber<T> {
  notify: (value: T) => void;
  destroy?: () => void;
}

// ============================================================================
// Component Data (Runtime State)
// ============================================================================

export interface ComponentData {
  Location?: LocationState | null;
  Attributes: Record<string, unknown>;
  Variables?: Record<string, unknown>;
  Contexts?: Record<string, Record<string, unknown>>;
  Apis?: Record<string, ApiStatus>;
  Args?: unknown;
  Parameters?: Record<string, unknown>;
  Event?: unknown;
  ListItem?: ListItemContext | null;
  Page?: { Theme: string | null };
}

export interface ListItemContext {
  Item: unknown;
  Index: number;
  Key: string;
  Parent?: ListItemContext | null;
}

// Forward declarations
import type { LocationState } from './route';
import type { ApiStatus } from './api';
