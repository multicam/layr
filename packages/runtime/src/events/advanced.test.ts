import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { attachEvent, extractEventData, EventConfigs } from './index';
import type { FormulaContext } from '@layr/core';

let window: Window;
let document: Document;

function createMockContext(): FormulaContext {
  return {
    data: { Attributes: {}, Variables: {}, Apis: {} },
    toddle: { getCustomFormula: () => undefined, errors: [] },
  };
}

describe('event system advanced', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).document = document;
    (globalThis as any).window = window;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).InputEvent = window.InputEvent;
    (globalThis as any).MouseEvent = window.MouseEvent;
    (globalThis as any).KeyboardEvent = window.KeyboardEvent;
  });

  describe('attachEvent', () => {
    test('attaches and returns cleanup', () => {
      const element = document.createElement('button');
      document.body.appendChild(element);
      
      const cleanup = attachEvent(element, 'click', { actions: [] }, createMockContext());
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    test('cleanup removes listener', () => {
      const element = document.createElement('button');
      document.body.appendChild(element);
      
      const cleanup = attachEvent(element, 'click', { actions: [] }, createMockContext());
      cleanup();
      element.click();
    });
  });

  describe('extractEventData', () => {
    test('extracts mouse position', () => {
      const event = new window.MouseEvent('click', { clientX: 100, clientY: 200 });
      const data = extractEventData(event);
      
      expect(data.clientX).toBe(100);
      expect(data.clientY).toBe(200);
    });

    test('extracts keyboard data', () => {
      const event = new window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
      const data = extractEventData(event);
      
      expect(data.key).toBe('Enter');
      expect(data.ctrlKey).toBe(true);
    });

    test('extracts target value from input', () => {
      const input = document.createElement('input');
      input.value = 'test';
      
      const event = new window.InputEvent('input');
      Object.defineProperty(event, 'target', { value: input, enumerable: true });
      
      const data = extractEventData(event);
      expect(data.value).toBe('test');
    });

    test('extracts type', () => {
      const event = new window.MouseEvent('click');
      const data = extractEventData(event);
      expect(data.type).toBe('click');
    });
  });

  describe('EventConfigs', () => {
    test('stopPropagation config exists', () => {
      expect(typeof EventConfigs.stopPropagation).toBe('function');
    });

    test('preventDefault config exists', () => {
      expect(typeof EventConfigs.preventDefault).toBe('function');
    });
  });
});
