// PostMessage bridge for editor ↔ preview communication

export type EditorMessageType = 
  | 'component'
  | 'components'
  | 'selection'
  | 'highlight'
  | 'drag-started'
  | 'drag-ended'
  | 'mousemove'
  | 'set_timeline_keyframes'
  | 'set_timeline_time'
  | 'style_variant_changed'
  | 'preview_style';

export type PreviewMessageType =
  | 'selection'
  | 'highlight'
  | 'selectionRect'
  | 'highlightRect'
  | 'nodeMoved'
  | 'keydown'
  | 'keyup';

interface EditorMessage {
  type: EditorMessageType;
  payload: any;
}

interface PreviewMessage {
  type: PreviewMessageType;
  payload: any;
}

/**
 * Send message to preview iframe
 */
export function sendToPreview(iframe: HTMLIFrameElement, message: EditorMessage): void {
  iframe.contentWindow?.postMessage(message, '*');
}

/**
 * Listen for messages from preview
 */
export function listenFromPreview(
  callback: (message: PreviewMessage) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type) {
      callback(event.data as PreviewMessage);
    }
  };
  
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
