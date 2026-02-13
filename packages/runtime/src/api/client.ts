/**
 * API Client System
 * Based on specs/api-integration.md
 */

import type { Signal } from '@layr/core';
import type { ApiStatus, ComponentData } from '@layr/types';

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  timeout?: number;
}

export interface ApiClient {
  fetch<T = unknown>(
    name: string,
    config: ApiRequestConfig
  ): Promise<ApiStatus<T>>;
  
  abort(name: string): void;
  
  getStatus<T = unknown>(name: string): ApiStatus<T> | undefined;
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  parserMode?: 'json' | 'text' | 'blob' | 'stream';
  onMessage?: (data: unknown) => void;
}

/**
 * Create API client
 */
export function createApiClient(
  dataSignal: Signal<ComponentData>,
  config: ApiClientConfig = {}
): ApiClient {
  const abortControllers = new Map<string, AbortController>();
  const statusMap = new Map<string, ApiStatus>();
  
  return {
    async fetch<T = unknown>(name: string, reqConfig: ApiRequestConfig): Promise<ApiStatus<T>> {
      // Abort existing request
      const existing = abortControllers.get(name);
      if (existing) {
        existing.abort();
      }
      
      // Create new abort controller
      const controller = new AbortController();
      abortControllers.set(name, controller);
      
      // Set loading status
      const loadingStatus: ApiStatus<T> = {
        data: null,
        isLoading: true,
        error: null,
      };
      statusMap.set(name, loadingStatus);
      updateApisInSignal(dataSignal, name, loadingStatus);
      
      try {
        // Build request
        const url = buildUrl(reqConfig.url, config.baseUrl);
        const headers = { ...config.headers, ...reqConfig.headers };
        
        const response = await fetch(url, {
          method: reqConfig.method,
          headers,
          body: reqConfig.body ? JSON.stringify(reqConfig.body) : undefined,
          signal: controller.signal,
          credentials: reqConfig.credentials || config.credentials,
        });

        // Check for HTTP errors
        if (!response.ok) {
          const errorStatus: ApiStatus<T> = {
            data: null,
            isLoading: false,
            error: new Error(`HTTP ${response.status}: ${response.statusText}`),
            response: {
              headers: Object.fromEntries(response.headers.entries()),
              status: response.status,
              statusText: response.statusText,
            },
          };
          statusMap.set(name, errorStatus);
          updateApisInSignal(dataSignal, name, errorStatus);
          return errorStatus;
        }

        // Parse response
        let data: T;

        if (reqConfig.parserMode === 'text') {
          data = (await response.text()) as T;
        } else if (reqConfig.parserMode === 'blob') {
          data = (await response.blob()) as T;
        } else if (reqConfig.parserMode === 'stream') {
          // Handle streaming
          const reader = response.body?.getReader();
          if (reader && reqConfig.onMessage) {
            readStream(reader, reqConfig.onMessage);
          }
          data = null as T;
        } else {
          data = await response.json();
        }

        const successStatus: ApiStatus<T> = {
          data,
          isLoading: false,
          error: null,
          response: {
            headers: Object.fromEntries(response.headers.entries()),
            status: response.status,
            statusText: response.statusText,
          },
        };

        statusMap.set(name, successStatus);
        updateApisInSignal(dataSignal, name, successStatus);

        return successStatus;
        
      } catch (error) {
        const errorStatus: ApiStatus<T> = {
          data: null,
          isLoading: false,
          error,
        };
        
        statusMap.set(name, errorStatus);
        updateApisInSignal(dataSignal, name, errorStatus);
        
        return errorStatus;
      } finally {
        abortControllers.delete(name);
      }
    },
    
    abort(name: string): void {
      const controller = abortControllers.get(name);
      if (controller) {
        controller.abort();
        abortControllers.delete(name);
      }
    },
    
    getStatus<T = unknown>(name: string): ApiStatus<T> | undefined {
      return statusMap.get(name) as ApiStatus<T> | undefined;
    },
  };
}

/**
 * Build full URL
 */
function buildUrl(path: string, baseUrl?: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
  }
  
  return path;
}

/**
 * Update APIs in data signal
 */
function updateApisInSignal(
  dataSignal: Signal<ComponentData>,
  apiName: string,
  status: ApiStatus
): void {
  dataSignal.update((d) => ({
    ...d,
    Apis: {
      ...d.Apis,
      [apiName]: status,
    },
  }));
}

/**
 * Read stream
 */
async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onMessage: (data: unknown) => void
): Promise<void> {
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      onMessage(text);
    }
  } catch (e) {
    console.error('Stream error:', e);
  }
}

/**
 * Create API status signal
 */
export function createApiSignal<T = unknown>(
  client: ApiClient,
  apiName: string
): Signal<ApiStatus<T>> {
  // This would create a derived signal from the client status
  // For now, return a simple signal
  return new Signal({ data: null, isLoading: false, error: null });
}

// Need to import Signal class
import { Signal } from '@layr/core';
