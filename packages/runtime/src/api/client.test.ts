import { describe, test, expect, beforeAll, afterEach, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import { createApiClient, createApiSignal } from './client';
import type { Signal } from '@layr/core';
import type { ComponentData } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let document: Document;

function createTestSignal(): Signal<ComponentData> {
  return new Signal<ComponentData>({
    Attributes: {},
    Variables: {},
    Apis: {},
  });
}

describe('API Client', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
  });

  describe('createApiClient', () => {
    test('creates client with fetch method', () => {
      const signal = createTestSignal();
      const client = createApiClient(signal);
      
      expect(client.fetch).toBeDefined();
      expect(client.abort).toBeDefined();
      expect(client.getStatus).toBeDefined();
    });

    test('sets loading status on fetch', async () => {
      const signal = createTestSignal();
      const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
      
      // Start fetch but don't await
      const fetchPromise = client.fetch('test', {
        method: 'GET',
        url: '/get',
      });
      
      // Check loading status was set
      const status = client.getStatus('test');
      expect(status?.isLoading).toBe(true);
      
      await fetchPromise;
    });

    test('updates signal after fetch', async () => {
      const signal = createTestSignal();
      const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
      
      await client.fetch('test', {
        method: 'GET',
        url: '/get',
      });
      
      const data = signal.get();
      expect(data.Apis['test']).toBeDefined();
      expect(data.Apis['test'].isLoading).toBe(false);
    });

    test('handles fetch error', async () => {
      const signal = createTestSignal();
      const client = createApiClient(signal, { timeout: 1 });
      
      // Use invalid URL that will fail
      const result = await client.fetch('error', {
        method: 'GET',
        url: 'https://invalid.invalid/test',
      });
      
      expect(result.error).toBeDefined();
      expect(result.isLoading).toBe(false);
    });

    test('abort cancels request', async () => {
      const signal = createTestSignal();
      const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
      
      const fetchPromise = client.fetch('abort-test', {
        method: 'GET',
        url: '/delay/5', // 5 second delay
      });
      
      // Abort immediately
      client.abort('abort-test');
      
      const result = await fetchPromise;
      expect(result.error).toBeDefined();
    });
  });

  describe('getStatus', () => {
    test('returns undefined for unknown API', () => {
      const signal = createTestSignal();
      const client = createApiClient(signal);
      
      expect(client.getStatus('unknown')).toBeUndefined();
    });

    test('returns status after fetch', async () => {
      const signal = createTestSignal();
      const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
      
      await client.fetch('status-test', {
        method: 'GET',
        url: '/get',
      });
      
      const status = client.getStatus('status-test');
      expect(status).toBeDefined();
      expect(status?.isLoading).toBe(false);
    });
  });

  describe('config', () => {
    test('merges headers', async () => {
      // Mock fetch to capture headers without network dependency
      const originalFetch = globalThis.fetch;
      let capturedHeaders: Record<string, string> | undefined;

      globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string> | undefined;
        return new Response(JSON.stringify({ headers: capturedHeaders }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const signal = createTestSignal();
        const client = createApiClient(signal, {
          baseUrl: 'https://example.com',
          headers: { 'X-Custom': 'custom-value' },
        });

        const result = await client.fetch('headers-test', {
          method: 'GET',
          url: '/test',
          headers: { 'X-Another': 'another-value' },
        });

        expect(result.error).toBeNull();
        expect(capturedHeaders).toEqual({
          'X-Custom': 'custom-value',
          'X-Another': 'another-value',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});

describe('API Client streaming', () => {
  test('handles streaming response', async () => {
    const signal = createTestSignal();
    const messages: unknown[] = [];
    
    const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
    
    const result = await client.fetch('stream', {
      method: 'GET',
      url: '/stream/3',
      parserMode: 'stream',
      onMessage: (data) => messages.push(data),
    });
    
    // Streaming mode returns null data
    expect(result.data).toBeNull();
  });

  test('handles blob response', async () => {
    const signal = createTestSignal();
    const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
    
    const result = await client.fetch('blob', {
      method: 'GET',
      url: '/image/png',
      parserMode: 'blob',
    });
    
    expect(result.data).toBeInstanceOf(Blob);
  });

  test('handles text response', async () => {
    const signal = createTestSignal();
    const client = createApiClient(signal, { baseUrl: 'https://httpbin.org' });
    
    const result = await client.fetch('text', {
      method: 'GET',
      url: '/robots.txt',
      parserMode: 'text',
    });
    
    expect(typeof result.data).toBe('string');
  });
});

describe('API Client credentials', () => {
  test('sends credentials', async () => {
    const signal = createTestSignal();
    const client = createApiClient(signal, {
      baseUrl: 'https://httpbin.org',
      credentials: 'include',
    });

    const result = await client.fetch('creds', {
      method: 'GET',
      url: '/cookies',
    });

    expect(result.error).toBeNull();
  });
});

describe('API Client HTTP errors', () => {
  test('handles HTTP 404 error', async () => {
    const signal = createTestSignal();

    // Mock fetch to return 404
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' },
      });
    };

    try {
      const client = createApiClient(signal);

      const result = await client.fetch('notfound', {
        method: 'GET',
        url: 'https://example.com/notfound',
      });

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toBe('HTTP 404: Not Found');
      expect(result.isLoading).toBe(false);
      expect(result.data).toBeNull();
      expect(result.response?.status).toBe(404);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('handles HTTP 500 error', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' },
      });
    };

    try {
      const client = createApiClient(signal);

      const result = await client.fetch('server-error', {
        method: 'POST',
        url: 'https://example.com/api/error',
      });

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toBe('HTTP 500: Internal Server Error');
      expect(result.response?.status).toBe(500);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('handles HTTP 401 unauthorized', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal);

      const result = await client.fetch('unauthorized', {
        method: 'GET',
        url: 'https://example.com/protected',
      });

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toBe('HTTP 401: Unauthorized');
      expect(result.response?.status).toBe(401);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('includes response headers in error status', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response('Bad Request', {
        status: 400,
        statusText: 'Bad Request',
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': 'INVALID_INPUT',
        },
      });
    };

    try {
      const client = createApiClient(signal);

      const result = await client.fetch('bad-request', {
        method: 'POST',
        url: 'https://example.com/api',
        body: { test: 'data' },
      });

      expect(result.response?.headers).toBeDefined();
      expect(result.response?.headers['x-error-code']).toBe('INVALID_INPUT');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('API Client abort behavior', () => {
  test('aborts existing request when new request starts with same name', async () => {
    const signal = createTestSignal();
    const abortEvents: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      // Listen for abort
      init?.signal?.addEventListener('abort', () => {
        abortEvents.push('aborted');
      });

      // Simulate slow request
      await new Promise(resolve => setTimeout(resolve, 100));

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal);

      // Start first request (don't await)
      const firstPromise = client.fetch('duplicate', {
        method: 'GET',
        url: 'https://example.com/slow',
      });

      // Small delay to ensure first request started
      await new Promise(resolve => setTimeout(resolve, 10));

      // Start second request with same name
      const secondPromise = client.fetch('duplicate', {
        method: 'GET',
        url: 'https://example.com/fast',
      });

      // Wait for both
      await Promise.all([firstPromise, secondPromise]);

      // First request should have been aborted
      expect(abortEvents).toContain('aborted');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('API Client buildUrl', () => {
  test('handles absolute URLs without baseUrl', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    let fetchedUrl: string = '';
    globalThis.fetch = async (url: string | URL | Request) => {
      fetchedUrl = url.toString();
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal, { baseUrl: 'https://default.com' });

      await client.fetch('absolute', {
        method: 'GET',
        url: 'https://custom.com/path',
      });

      // Should use absolute URL, not baseUrl
      expect(fetchedUrl).toBe('https://custom.com/path');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('handles http:// absolute URLs', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    let fetchedUrl: string = '';
    globalThis.fetch = async (url: string | URL | Request) => {
      fetchedUrl = url.toString();
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal, { baseUrl: 'https://default.com' });

      await client.fetch('http-url', {
        method: 'GET',
        url: 'http://insecure.com/path',
      });

      expect(fetchedUrl).toBe('http://insecure.com/path');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('appends path without leading slash to baseUrl', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    let fetchedUrl: string = '';
    globalThis.fetch = async (url: string | URL | Request) => {
      fetchedUrl = url.toString();
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal, { baseUrl: 'https://api.example.com' });

      await client.fetch('no-slash', {
        method: 'GET',
        url: 'users/list',
      });

      expect(fetchedUrl).toBe('https://api.example.com/users/list');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('handles path without baseUrl', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    let fetchedUrl: string = '';
    globalThis.fetch = async (url: string | URL | Request) => {
      fetchedUrl = url.toString();
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal); // No baseUrl

      await client.fetch('no-base', {
        method: 'GET',
        url: '/api/users',
      });

      expect(fetchedUrl).toBe('/api/users');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('removes trailing slash from baseUrl', async () => {
    const signal = createTestSignal();

    const originalFetch = globalThis.fetch;
    let fetchedUrl: string = '';
    globalThis.fetch = async (url: string | URL | Request) => {
      fetchedUrl = url.toString();
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const client = createApiClient(signal, { baseUrl: 'https://api.example.com/' });

      await client.fetch('trailing', {
        method: 'GET',
        url: '/users',
      });

      expect(fetchedUrl).toBe('https://api.example.com/users');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createApiSignal', () => {
  test('creates signal with initial status', () => {
    const signal = createTestSignal();
    const client = createApiClient(signal);
    const apiSignal = createApiSignal(client, 'test');

    expect(apiSignal.get()).toEqual({
      data: null,
      isLoading: false,
      error: null,
    });
  });
});
