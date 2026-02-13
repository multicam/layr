/**
 * Event System
 * Based on specs/event-system.md
 */

import type { ActionModel, ComponentData } from '@layr/types';
import type { Signal } from '@layr/core';

export interface EventHandler {
  actions: ActionModel[];
}

export interface EventContext {
  dataSignal: Signal<ComponentData>;
  apis: Record<string, any>;
  component: any;
  triggerEvent: (name: string, data: unknown) => void;
  setUrlParameter: (key: string, value: string | null) => void;
  toddle: any;
  env: any;
}

/**
 * Attach event handler to element
 */
export function attachEvent(
  element: Element,
  eventName: string,
  handler: EventHandler,
  ctx: EventContext
): () => void {
  const listener = (e: Event) => {
    handleEvent(e, handler, ctx);
  };
  
  element.addEventListener(eventName, listener);
  
  return () => {
    element.removeEventListener(eventName, listener);
  };
}

/**
 * Handle triggered event
 */
export function handleEvent(
  event: Event,
  handler: EventHandler,
  ctx: EventContext
): void {
  const eventData = extractEventData(event);
  
  for (const action of handler.actions) {
    executeAction(action, ctx, eventData);
  }
}

/**
 * Extract data from DOM event
 */
export function extractEventData(event: Event): Record<string, unknown> {
  const data: Record<string, unknown> = {
    type: event.type,
    target: null,
    currentTarget: null,
  };
  
  // Check HTMLElement in global scope
  const HTMLElementClass = (globalThis as any).HTMLElement;
  
  if (HTMLElementClass && event.target instanceof HTMLElementClass) {
    data.target = extractElementData(event.target as HTMLElement);
  }
  
  if (HTMLElementClass && event.currentTarget instanceof HTMLElementClass) {
    data.currentTarget = extractElementData(event.currentTarget as HTMLElement);
  }
  
  // Handle specific event types
  if (typeof SubmitEvent !== 'undefined' && event instanceof SubmitEvent) {
    const form = event.target as HTMLFormElement;
    if (form && form.tagName === 'FORM') {
      try {
        data.formData = Object.fromEntries(new FormData(form));
      } catch {}
      data.submitter = event.submitter;
    }
  }
  
  if (typeof InputEvent !== 'undefined' && event instanceof InputEvent) {
    const target = event.target as HTMLInputElement;
    if (target && 'value' in target) {
      data.value = target.value;
    }
    data.inputType = event.inputType;
  }
  
  if (typeof KeyboardEvent !== 'undefined' && event instanceof KeyboardEvent) {
    data.key = event.key;
    data.code = event.code;
    data.altKey = event.altKey;
    data.ctrlKey = event.ctrlKey;
    data.shiftKey = event.shiftKey;
    data.metaKey = event.metaKey;
  }
  
  if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.button = event.button;
    data.buttons = event.buttons;
  }
  
  if (typeof FocusEvent !== 'undefined' && event instanceof FocusEvent) {
    data.relatedTarget = event.relatedTarget;
  }
  
  return data;
}

function extractElementData(element: HTMLElement): Record<string, unknown> {
  const data: Record<string, unknown> = {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    dataset: { ...element.dataset },
  };
  
  if ('value' in element) data.value = (element as HTMLInputElement).value;
  if ('checked' in element) data.checked = (element as HTMLInputElement).checked;
  if ('disabled' in element) data.disabled = (element as HTMLButtonElement).disabled;
  if ('href' in element) data.href = (element as HTMLAnchorElement).href;
  if ('src' in element) data.src = (element as HTMLImageElement).src;
  
  return data;
}

function executeAction(
  action: ActionModel,
  ctx: EventContext,
  eventData: Record<string, unknown>
): void {
  console.log('Execute action:', action.type);
}

export const EventConfigs = {
  preventDefault: (event: Event) => event.preventDefault(),
  stopPropagation: (event: Event) => event.stopPropagation(),
  preventAll: (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  },
};

export function delegateEvent(
  container: Element,
  selector: string,
  eventName: string,
  handler: EventHandler,
  ctx: EventContext
): () => void {
  const listener = (e: Event) => {
    const target = e.target?.closest(selector);
    if (target) {
      handleEvent(e, handler, ctx);
    }
  };
  
  container.addEventListener(eventName, listener);
  
  return () => {
    container.removeEventListener(eventName, listener);
  };
}
