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
      const signal = createTestSignal();
      const client = createApiClient(signal, {
        baseUrl: 'https://httpbin.org',
        headers: { 'X-Custom': 'custom-value' },
      });
      
      const result = await client.fetch('headers-test', {
        method: 'GET',
        url: '/headers',
        headers: { 'X-Another': 'another-value' },
      });
      
      expect(result.error).toBeNull();
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
