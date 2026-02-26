import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
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

describe('local storage actions', () => {
  let localStorageMock: Record<string, string> = {};
  let originalWindow: typeof window | undefined;
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    actions.clear();
    registerActions();
    localStorageMock = {};

    // Store originals
    originalWindow = (globalThis as any).window;
    originalLocalStorage = (globalThis as any).localStorage;

    // Mock window and localStorage
    (globalThis as any).window = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
      clear: () => { localStorageMock = {}; },
    };
  });

  afterEach(() => {
    // Restore originals
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    if (originalLocalStorage !== undefined) {
      (globalThis as any).localStorage = originalLocalStorage;
    }
  });

  test('saveToLocalStorage stores value', () => {
    const action = getAction('@toddle/saveToLocalStorage')!;
    action({ key: 'myKey', value: { foo: 'bar' } }, createMockContext());

    expect(localStorageMock['myKey']).toBe('{"foo":"bar"}');
  });

  test('saveToLocalStorage ignores non-string key', () => {
    const action = getAction('@toddle/saveToLocalStorage')!;
    action({ key: 123, value: 'test' }, createMockContext());

    expect(localStorageMock['123']).toBeUndefined();
  });

  test('saveToLocalStorage skips on server (no window)', () => {
    delete (globalThis as any).window;

    const action = getAction('@toddle/saveToLocalStorage')!;
    // Should not throw
    action({ key: 'test', value: 'data' }, createMockContext());
  });

  test('deleteFromLocalStorage removes key', () => {
    localStorageMock['toDelete'] = 'value';
    const action = getAction('@toddle/deleteFromLocalStorage')!;
    action({ key: 'toDelete' }, createMockContext());

    expect(localStorageMock['toDelete']).toBeUndefined();
  });

  test('deleteFromLocalStorage ignores non-string key', () => {
    localStorageMock['123'] = 'value';
    const action = getAction('@toddle/deleteFromLocalStorage')!;
    action({ key: 123 }, createMockContext());

    expect(localStorageMock['123']).toBe('value');
  });

  test('clearLocalStorage removes all keys', () => {
    localStorageMock['a'] = '1';
    localStorageMock['b'] = '2';

    const action = getAction('@toddle/clearLocalStorage')!;
    action({}, createMockContext());

    expect(Object.keys(localStorageMock).length).toBe(0);
  });
});

describe('session storage actions', () => {
  let sessionStorageMock: Record<string, string> = {};

  beforeEach(() => {
    actions.clear();
    registerActions();
    sessionStorageMock = {};

    (globalThis as any).window = {};
    (globalThis as any).sessionStorage = {
      getItem: (key: string) => sessionStorageMock[key] ?? null,
      setItem: (key: string, value: string) => { sessionStorageMock[key] = value; },
      removeItem: (key: string) => { delete sessionStorageMock[key]; },
      clear: () => { sessionStorageMock = {}; },
    };
  });

  test('saveToSessionStorage stores value', () => {
    const action = getAction('@toddle/saveToSessionStorage')!;
    action({ key: 'sessionKey', value: [1, 2, 3] }, createMockContext());

    expect(sessionStorageMock['sessionKey']).toBe('[1,2,3]');
  });

  test('saveToSessionStorage ignores non-string key', () => {
    const action = getAction('@toddle/saveToSessionStorage')!;
    action({ key: null, value: 'test' }, createMockContext());

    expect(sessionStorageMock['null']).toBeUndefined();
  });

  test('deleteFromSessionStorage removes key', () => {
    sessionStorageMock['removeMe'] = 'value';
    const action = getAction('@toddle/deleteFromSessionStorage')!;
    action({ key: 'removeMe' }, createMockContext());

    expect(sessionStorageMock['removeMe']).toBeUndefined();
  });

  test('clearSessionStorage removes all keys', () => {
    sessionStorageMock['x'] = '1';
    sessionStorageMock['y'] = '2';

    const action = getAction('@toddle/clearSessionStorage')!;
    action({}, createMockContext());

    expect(Object.keys(sessionStorageMock).length).toBe(0);
  });
});

describe('cookie actions', () => {
  let cookieValue = '';

  beforeEach(() => {
    actions.clear();
    registerActions();
    cookieValue = '';

    (globalThis as any).document = {
      cookie: '',
    };
    Object.defineProperty((globalThis as any).document, 'cookie', {
      get: () => cookieValue,
      set: (v: string) => { cookieValue = v; },
    });
  });

  test('setCookie sets basic cookie', () => {
    const action = getAction('@toddle/setCookie')!;
    action({ name: 'testCookie', value: 'testValue' }, createMockContext());

    expect(cookieValue).toContain('testCookie=testValue');
  });

  test('setCookie sets cookie with expiration', () => {
    const action = getAction('@toddle/setCookie')!;
    action({ name: 'expCookie', value: 'expValue', expiresIn: 3600 }, createMockContext());

    expect(cookieValue).toContain('expCookie=expValue');
    expect(cookieValue).toContain('Expires=');
  });

  test('setCookie sets cookie with custom path and sameSite', () => {
    const action = getAction('@toddle/setCookie')!;
    action({
      name: 'customCookie',
      value: 'customValue',
      path: '/app',
      sameSite: 'Strict',
    }, createMockContext());

    expect(cookieValue).toContain('Path=/app');
    expect(cookieValue).toContain('SameSite=Strict');
  });

  test('setCookie encodes cookie name and value', () => {
    const action = getAction('@toddle/setCookie')!;
    action({ name: 'test cookie', value: 'hello world' }, createMockContext());

    expect(cookieValue).toContain('test%20cookie=hello%20world');
  });

  test('setCookie ignores non-string name', () => {
    const action = getAction('@toddle/setCookie')!;
    action({ name: 123, value: 'test' }, createMockContext());

    expect(cookieValue).toBe('');
  });

  test('setCookie skips on server (no document)', () => {
    delete (globalThis as any).document;

    const action = getAction('@toddle/setCookie')!;
    // Should not throw
    action({ name: 'test', value: 'test' }, createMockContext());
  });
});

describe('navigation actions', () => {
  beforeEach(() => {
    actions.clear();
    registerActions();

    (globalThis as any).window = {
      location: { href: '' },
    };
  });

  test('goToURL navigates to URL', () => {
    const action = getAction('@toddle/goToURL')!;
    action({ url: 'https://example.com' }, createMockContext());

    expect((globalThis as any).window.location.href).toBe('https://example.com');
  });

  test('goToURL ignores non-string URL', () => {
    const action = getAction('@toddle/goToURL')!;
    action({ url: 123 }, createMockContext());

    expect((globalThis as any).window.location.href).toBe('');
  });

  test('goToURL skips in preview mode', () => {
    const action = getAction('@toddle/goToURL')!;
    action({ url: 'https://example.com' }, createMockContext({ preview: true }));

    expect((globalThis as any).window.location.href).toBe('');
  });

  test('goToURL skips on server (no window)', () => {
    delete (globalThis as any).window;

    const action = getAction('@toddle/goToURL')!;
    // Should not throw
    action({ url: 'https://example.com' }, createMockContext());
  });
});

describe('sharing actions', () => {
  let clipboardData = '';

  beforeEach(() => {
    actions.clear();
    registerActions();
    clipboardData = '';

    (globalThis as any).navigator = {
      clipboard: {
        writeText: async (text: string) => { clipboardData = text; },
      },
      share: undefined,
    };
  });

  test('copyToClipboard writes text', async () => {
    const action = getAction('@toddle/copyToClipboard')!;
    await action({ value: 'copy me' }, createMockContext());

    expect(clipboardData).toBe('copy me');
  });

  test('copyToClipboard ignores non-string value', async () => {
    const action = getAction('@toddle/copyToClipboard')!;
    await action({ value: 123 }, createMockContext());

    expect(clipboardData).toBe('');
  });

  test('copyToClipboard handles errors gracefully', async () => {
    (globalThis as any).navigator = {
      clipboard: {
        writeText: async () => { throw new Error('Clipboard denied'); },
      },
    };

    const errors: unknown[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => { errors.push(args); };

    const action = getAction('@toddle/copyToClipboard')!;
    await action({ value: 'test' }, createMockContext());

    console.error = origError;
    expect(errors.length).toBe(1);
  });

  test('copyToClipboard skips on server (no navigator)', async () => {
    delete (globalThis as any).navigator;

    const action = getAction('@toddle/copyToClipboard')!;
    // Should not throw
    await action({ value: 'test' }, createMockContext());
  });

  test('share calls navigator.share with all options', async () => {
    let sharedData: any = null;
    (globalThis as any).navigator.share = async (data: any) => { sharedData = data; };

    const action = getAction('@toddle/share')!;
    await action({ url: 'https://example.com', title: 'Title', text: 'Text' }, createMockContext());

    expect(sharedData).toEqual({
      url: 'https://example.com',
      title: 'Title',
      text: 'Text',
    });
  });

  test('share handles missing options', async () => {
    let sharedData: any = null;
    (globalThis as any).navigator.share = async (data: any) => { sharedData = data; };

    const action = getAction('@toddle/share')!;
    await action({}, createMockContext());

    expect(sharedData).toEqual({
      url: undefined,
      title: undefined,
      text: undefined,
    });
  });

  test('share skips if navigator.share not available', async () => {
    (globalThis as any).navigator.share = undefined;

    const action = getAction('@toddle/share')!;
    // Should not throw
    await action({ url: 'https://example.com' }, createMockContext());
  });

  test('share handles cancellation silently', async () => {
    (globalThis as any).navigator.share = async () => { throw new Error('User cancelled'); };

    const action = getAction('@toddle/share')!;
    // Should not throw
    await action({ url: 'https://example.com' }, createMockContext());
  });

  test('share skips on server (no navigator)', async () => {
    delete (globalThis as any).navigator;

    const action = getAction('@toddle/share')!;
    // Should not throw
    await action({ url: 'https://example.com' }, createMockContext());
  });
});

describe('theme actions', () => {
  let themeAttribute = '';

  beforeEach(() => {
    actions.clear();
    registerActions();
    themeAttribute = '';

    (globalThis as any).document = {
      documentElement: {
        setAttribute: (_name: string, value: string) => { themeAttribute = value; },
        removeAttribute: () => { themeAttribute = ''; },
        getAttribute: () => themeAttribute,
      },
    };
  });

  test('setTheme sets data-nc-theme attribute', () => {
    const action = getAction('@toddle/setTheme')!;
    action({ name: 'dark' }, createMockContext());

    expect(themeAttribute).toBe('dark');
  });

  test('setTheme removes attribute when name is null', () => {
    themeAttribute = 'existing';
    const action = getAction('@toddle/setTheme')!;
    action({ name: null }, createMockContext());

    expect(themeAttribute).toBe('');
  });

  test('setTheme removes attribute when name is undefined', () => {
    themeAttribute = 'existing';
    const action = getAction('@toddle/setTheme')!;
    action({ name: undefined }, createMockContext());

    expect(themeAttribute).toBe('');
  });

  test('setTheme skips on server (no document)', () => {
    delete (globalThis as any).document;

    const action = getAction('@toddle/setTheme')!;
    // Should not throw
    action({ name: 'dark' }, createMockContext());
  });
});

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
