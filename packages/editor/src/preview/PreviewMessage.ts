// PostMessage protocol for editor ↔ preview communication
// Based on specs/editor-integration.md

import type { Component, NodeModel, Formula } from '@layr/types';

// === Message Types ===

export type EditorMessageType =
  // Component & Data
  | 'component'
  | 'components'
  | 'packages'
  | 'global_formulas'
  | 'global_actions'
  | 'theme'
  | 'attrs'
  | 'mode'
  | 'reload'
  
  // Selection & Interaction
  | 'selection'
  | 'highlight'
  | 'click'
  | 'dblclick'
  | 'mousemove'
  | 'update_inner_text'
  | 'get_computed_style'
  | 'report_document_scroll_size'
  
  // Drag & Drop
  | 'drag-started'
  | 'drag-ended'
  | 'keydown'
  | 'keyup'
  
  // Timeline & Animation
  | 'set_timeline_keyframes'
  | 'set_timeline_time'
  
  // Style Previewing
  | 'style_variant_changed'
  | 'preview_style'
  | 'preview_resources'
  | 'preview_theme'
  
  // API & Introspection
  | 'fetch_api'
  | 'introspect_graphql_api';

export type PreviewMessageType =
  // Selection State
  | 'selection'
  | 'highlight'
  | 'selectionRect'
  | 'highlightRect'
  | 'textComputedStyle'
  | 'computedStyle'
  
  // Navigation & Events
  | 'navigate'
  | 'component event'
  | 'data'
  | 'documentScrollSize'
  
  // Keyboard Forwarding
  | 'keydown'
  | 'keyup'
  | 'keypress'
  
  // Drag & Drop
  | 'nodeMoved'
  
  // GraphQL
  | 'introspectionResult';

// === Message Interfaces ===

export interface EditorMessage {
  type: EditorMessageType;
  payload?: any;
}

export interface PreviewMessage {
  type: PreviewMessageType;
  payload?: any;
}

// === Specific Message Payloads ===

export interface ComponentMessage {
  component: Component;
  scrollKey?: string;
}

export interface SelectionMessage {
  nodeId: string | null;
}

export interface DragStartedMessage {
  x: number;
  y: number;
}

export interface DragEndedMessage {
  canceled?: boolean;
}

export interface MouseMoveMessage {
  x: number;
  y: number;
  metaKey?: boolean;
}

export interface NodeMovedMessage {
  copy: boolean;
  parent: string | null;
  index: number;
}

export interface SelectionRectMessage {
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius?: string;
    rotate?: string;
  };
}

export interface TimelineTimeMessage {
  time: number;
  timingFunction?: string;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface PreviewStyleMessage {
  styles: Record<string, string>;
  pseudoElement?: string;
}

// === Communication Functions ===

/**
 * Send message to preview iframe
 */
export function sendToPreview(
  iframe: HTMLIFrameElement | null,
  type: EditorMessageType,
  payload?: any
): void {
  if (!iframe?.contentWindow) return;
  
  iframe.contentWindow.postMessage({ type, payload }, '*');
}

/**
 * Create message listener for preview messages
 */
export function createPreviewListener(
  handlers: Partial<Record<PreviewMessageType, (payload: any) => void>>
): () => void {
  const handler = (event: MessageEvent) => {
    const { type, payload } = event.data || {};
    
    if (type && handlers[type as PreviewMessageType]) {
      handlers[type as PreviewMessageType]!(payload);
    }
  };
  
  window.addEventListener('message', handler);
  
  return () => window.removeEventListener('message', handler);
}

// === Preview Runtime Bridge ===

export class PreviewBridge {
  private iframe: HTMLIFrameElement | null = null;
  private cleanup: (() => void) | null = null;
  
  constructor(
    private handlers: Partial<Record<PreviewMessageType, (payload: any) => void>> = {}
  ) {}
  
  attach(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
    this.cleanup = createPreviewListener(this.handlers);
  }
  
  detach(): void {
    this.cleanup?.();
    this.iframe = null;
  }
  
  // Component messages
  sendComponent(component: Component, scrollKey?: string): void {
    sendToPreview(this.iframe, 'component', { component, scrollKey });
  }
  
  sendComponents(components: Record<string, Component>): void {
    sendToPreview(this.iframe, 'components', { components });
  }
  
  // Selection messages
  sendSelection(nodeId: string | null): void {
    sendToPreview(this.iframe, 'selection', { nodeId });
  }
  
  sendHighlight(nodeId: string | null): void {
    sendToPreview(this.iframe, 'highlight', { nodeId });
  }
  
  // Drag messages
  sendDragStarted(x: number, y: number): void {
    sendToPreview(this.iframe, 'drag-started', { x, y });
  }
  
  sendDragEnded(canceled?: boolean): void {
    sendToPreview(this.iframe, 'drag-ended', { canceled });
  }
  
  sendMouseMove(x: number, y: number, metaKey?: boolean): void {
    sendToPreview(this.iframe, 'mousemove', { x, y, metaKey });
  }
  
  // Mode
  sendMode(mode: 'design' | 'test'): void {
    sendToPreview(this.iframe, 'mode', { mode });
  }
  
  // Reload
  sendReload(): void {
    sendToPreview(this.iframe, 'reload', {});
  }
  
  // Style preview
  sendPreviewStyle(styles: Record<string, string>, pseudoElement?: string): void {
    sendToPreview(this.iframe, 'preview_style', { styles, pseudoElement });
  }
  
  // Timeline
  sendTimelineTime(time: number, timingFunction?: string, fillMode?: string): void {
    sendToPreview(this.iframe, 'set_timeline_time', { time, timingFunction, fillMode });
  }
  
  // API
  sendFetchApi(apiKey: string): void {
    sendToPreview(this.iframe, 'fetch_api', { apiKey });
  }
}
