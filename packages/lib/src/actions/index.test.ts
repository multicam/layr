import { describe, test, expect, beforeEach } from 'bun:test';
import {
  actions,
  registerAction,
  getAction,
  registerActions,
} from './index';
import type { ActionContext } from '@layr/core';

// Mock action context
const createMockContext = (overrides: Partial<ActionContext> = {}): ActionContext => ({
  preview: false,
  event: undefined,
  onUnmount: undefined,
  ...overrides,
} as ActionContext);

describe('action registry', () => {
  beforeEach(() => {
    actions.clear();
  });

  test('registerAction adds handler to registry', () => {
    const handler = () => {};
    registerAction('test-action', handler);
    expect(actions.has('test-action')).toBe(true);
    expect(actions.get('test-action')).toBe(handler);
  });

  test('getAction returns registered handler', () => {
    const handler = () => {};
    registerAction('my-action', handler);
    expect(getAction('my-action')).toBe(handler);
  });

  test('getAction returns undefined for unregistered action', () => {
    expect(getAction('nonexistent')).toBeUndefined();
  });

  test('registerActions registers all standard actions', () => {
    registerActions();

    // Local storage
    expect(getAction('@toddle/saveToLocalStorage')).toBeDefined();
    expect(getAction('@toddle/deleteFromLocalStorage')).toBeDefined();
    expect(getAction('@toddle/clearLocalStorage')).toBeDefined();

    // Session storage
    expect(getAction('@toddle/saveToSessionStorage')).toBeDefined();
    expect(getAction('@toddle/deleteFromSessionStorage')).toBeDefined();
    expect(getAction('@toddle/clearSessionStorage')).toBeDefined();

    // Cookies
    expect(getAction('@toddle/setCookie')).toBeDefined();

    // Navigation
    expect(getAction('@toddle/goToURL')).toBeDefined();

    // Events
    expect(getAction('@toddle/focus')).toBeDefined();
    expect(getAction('@toddle/preventDefault')).toBeDefined();
    expect(getAction('@toddle/stopPropagation')).toBeDefined();

    // Timers
    expect(getAction('@toddle/sleep')).toBeDefined();
    expect(getAction('@toddle/interval')).toBeDefined();

    // Debug
    expect(getAction('@toddle/logToConsole')).toBeDefined();

    // Sharing
    expect(getAction('@toddle/copyToClipboard')).toBeDefined();
    expect(getAction('@toddle/share')).toBeDefined();

    // Theme
    expect(getAction('@toddle/setTheme')).toBeDefined();
  });
});

describe('event actions', () => {
  beforeEach(() => {
    actions.clear();
    registerActions();
  });

  test('focus calls element.focus()', () => {
    let focusCalled = false;
    const mockElement = {
      focus: () => { focusCalled = true; },
    };

    const action = getAction('@toddle/focus')!;
    action({ element: mockElement }, createMockContext());
    expect(focusCalled).toBe(true);
  });

  test('focus ignores elements without focus method', () => {
    const action = getAction('@toddle/focus')!;
    // Should not throw
    action({ element: { notFocus: true } }, createMockContext());
    action({ element: null }, createMockContext());
    action({}, createMockContext());
  });

  test('preventDefault calls event.preventDefault()', () => {
    let prevented = false;
    const mockEvent = {
      preventDefault: () => { prevented = true; },
    };

    const action = getAction('@toddle/preventDefault')!;
    action({}, createMockContext({ event: mockEvent as unknown as Event }));
    expect(prevented).toBe(true);
  });

  test('preventDefault handles missing event', () => {
    const action = getAction('@toddle/preventDefault')!;
    // Should not throw
    action({}, createMockContext());
    action({}, createMockContext({ event: undefined }));
  });

  test('stopPropagation calls event.stopPropagation()', () => {
    let stopped = false;
    const mockEvent = {
      stopPropagation: () => { stopped = true; },
    };

    const action = getAction('@toddle/stopPropagation')!;
    action({}, createMockContext({ event: mockEvent as unknown as Event }));
    expect(stopped).toBe(true);
  });

  test('stopPropagation handles missing event', () => {
    const action = getAction('@toddle/stopPropagation')!;
    // Should not throw
    action({}, createMockContext());
  });
});

describe('timer actions', () => {
  beforeEach(() => {
    actions.clear();
    registerActions();
  });

  test('sleep waits for specified delay', async () => {
    const action = getAction('@toddle/sleep')!;
    const start = Date.now();
    await action({ delay: 20 }, createMockContext());
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(15);
  });

  test('sleep ignores non-number delay', async () => {
    const action = getAction('@toddle/sleep')!;
    const start = Date.now();
    await action({ delay: 'not a number' }, createMockContext());
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10);
  });

  test('sleep registers cleanup callback when onUnmount provided', async () => {
    const cleanupCallbacks: (() => void)[] = [];
    const ctx = createMockContext({
      onUnmount: (cb: () => void) => { cleanupCallbacks.push(cb); },
    });

    const action = getAction('@toddle/sleep')!;
    // Use a short delay so test completes quickly
    action({ delay: 10 }, ctx);

    expect(cleanupCallbacks.length).toBe(1);
  });

  test('interval calls onTick repeatedly', async () => {
    let tickCount = 0;
    const action = getAction('@toddle/interval')!;

    const cleanupCallbacks: (() => void)[] = [];
    action(
      { delay: 10, onTick: () => { tickCount++; } },
      createMockContext({ onUnmount: (cb) => cleanupCallbacks.push(cb) })
    );

    await new Promise(resolve => setTimeout(resolve, 45));
    expect(tickCount).toBeGreaterThanOrEqual(3);

    // Cleanup
    cleanupCallbacks[0]();
  });

  test('interval ignores non-number delay', () => {
    const action = getAction('@toddle/interval')!;
    // Should not throw
    action({ delay: 'invalid', onTick: () => {} }, createMockContext());
  });

  test('interval handles missing onTick', async () => {
    const action = getAction('@toddle/interval')!;

    const cleanupCallbacks: (() => void)[] = [];
    action(
      { delay: 10 },
      createMockContext({ onUnmount: (cb) => cleanupCallbacks.push(cb) })
    );

    await new Promise(resolve => setTimeout(resolve, 25));
    // Should not throw

    // Cleanup
    cleanupCallbacks[0]();
  });
});

describe('debug actions', () => {
  beforeEach(() => {
    actions.clear();
    registerActions();
  });

  test('logToConsole logs with label', () => {
    const messages: unknown[][] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => { messages.push(args); };

    const action = getAction('@toddle/logToConsole')!;
    action({ label: 'Test', data: { foo: 'bar' } }, createMockContext());

    console.log = origLog;
    expect(messages[0]).toEqual(['Test', { foo: 'bar' }]);
  });

  test('logToConsole uses default label', () => {
    const messages: unknown[][] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => { messages.push(args); };

    const action = getAction('@toddle/logToConsole')!;
    action({ data: 'value' }, createMockContext());

    console.log = origLog;
    expect(messages[0]).toEqual(['Log', 'value']);
  });

  test('logToConsole handles missing data', () => {
    const messages: unknown[][] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => { messages.push(args); };

    const action = getAction('@toddle/logToConsole')!;
    action({}, createMockContext());

    console.log = origLog;
    expect(messages.length).toBe(1);
  });
});
