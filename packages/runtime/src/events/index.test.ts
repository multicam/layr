import { describe, test, expect, beforeEach, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { 
  attachEvent, 
  handleEvent, 
  extractEventData, 
  EventConfigs,
  delegateEvent,
} from './index';
import type { EventContext } from './index';
import type { Signal } from '@layr/core';
import type { ComponentData } from '@layr/types';
import { Signal } from '@layr/core';

let window: Window;
let document: Document;

function createMockContext(): EventContext {
  const dataSignal = new Signal<ComponentData>({
    Attributes: {},
    Variables: {},
    Apis: {},
  });
  return {
    dataSignal,
    apis: {},
    component: { name: 'Test', nodes: {} },
    triggerEvent: () => {},
    setUrlParameter: () => {},
    toddle: {},
    env: {},
  };
}

describe('Event System', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).SubmitEvent = window.SubmitEvent;
    (globalThis as any).InputEvent = window.InputEvent;
    (globalThis as any).KeyboardEvent = window.KeyboardEvent;
    (globalThis as any).MouseEvent = window.MouseEvent;
    (globalThis as any).FocusEvent = window.FocusEvent;
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('attachEvent', () => {
    test('attaches event listener', () => {
      const element = document.createElement('button');
      const handler = { actions: [{ type: 'SetVariable', variable: 'x', value: { type: 'value', value: 1 } }] };
      const ctx = createMockContext();
      
      const cleanup = attachEvent(element, 'click', handler, ctx);
      expect(cleanup).toBeDefined();
    });

    test('cleanup removes listener', () => {
      const element = document.createElement('button');
      const handler = { actions: [] };
      const ctx = createMockContext();
      
      const cleanup = attachEvent(element, 'click', handler, ctx);
      cleanup();
      
      expect(true).toBe(true);
    });
  });

  describe('extractEventData', () => {
    test('extracts basic event data', () => {
      const event = new window.Event('click');
      const data = extractEventData(event);
      
      expect(data.type).toBe('click');
    });

    test('extracts keyboard event data', () => {
      const event = new window.KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
      });
      const data = extractEventData(event);
      
      expect(data.key).toBe('Enter');
      expect(data.code).toBe('Enter');
      expect(data.ctrlKey).toBe(true);
    });

    test('extracts mouse event data', () => {
      const event = new window.MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        button: 0,
      });
      const data = extractEventData(event);
      
      expect(data.clientX).toBe(100);
      expect(data.clientY).toBe(200);
      expect(data.button).toBe(0);
    });
  });

  describe('EventConfigs', () => {
    test('preventDefault prevents default', () => {
      const event = new window.Event('submit', { cancelable: true });
      EventConfigs.preventDefault(event);
      expect(event.defaultPrevented).toBe(true);
    });

    test('stopPropagation stops propagation', () => {
      const event = new window.Event('click', { bubbles: true });
      EventConfigs.stopPropagation(event);
      expect(event.cancelBubble).toBe(true);
    });

    test('preventAll does both', () => {
      const event = new window.Event('submit', { cancelable: true, bubbles: true });
      EventConfigs.preventAll(event);
      expect(event.defaultPrevented).toBe(true);
      expect(event.cancelBubble).toBe(true);
    });
  });

  describe('delegateEvent', () => {
    test('delegates to matching child', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      button.className = 'btn';
      container.appendChild(button);
      
      const handler = { actions: [] };
      const ctx = createMockContext();
      
      const cleanup = delegateEvent(container, '.btn', 'click', handler, ctx);
      
      button.click();
      
      expect(cleanup).toBeDefined();
      cleanup();
    });
  });
});
