/**
 * API Types
 * Based on specs/api-integration.md
 */

// ============================================================================
// API Status
// ============================================================================

export interface ApiStatus<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: unknown | null;
  response?: ApiResponse;
}

export interface ApiResponse {
  headers: Record<string, string>;
  status: number;
  statusText: string;
  performance?: {
    requestStart?: number;
    responseStart?: number;
    responseEnd?: number;
  };
}

// ============================================================================
// API Request
// ============================================================================

export interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers: Record<string, string>;
  body?: string | FormData | null;
  signal?: AbortSignal;
  credentials?: 'include' | 'same-origin' | 'omit';
}

// ============================================================================
// API Cache
// ============================================================================

export interface ApiCache {
  [requestHash: string]: ApiStatus;
}

// ============================================================================
// Streaming
// ============================================================================

export type ParserMode = 'json' | 'text' | 'blob' | 'stream' | 'json-stream';

export interface StreamingEvent {
  type: 'message' | 'error' | 'done';
  data?: unknown;
  error?: Error;
}
