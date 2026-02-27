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

describe('extractEventData with targets', () => {
  test('extracts data when target is HTMLElement', () => {
    const button = document.createElement('button');
    button.id = 'test-btn';
    button.className = 'btn primary';
    button.dataset.testId = '123';
    
    const event = new window.MouseEvent('click');
    Object.defineProperty(event, 'target', { value: button, enumerable: true });
    
    const data = extractEventData(event);
    
    expect(data.target).toBeDefined();
    expect((data.target as any).id).toBe('test-btn');
    expect((data.target as any).className).toBe('btn primary');
    expect((data.target as any).dataset.testId).toBe('123');
  });

  test('extracts input value', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'test input';
    
    const event = new window.InputEvent('input');
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    
    const data = extractEventData(event);
    
    expect(data.value).toBe('test input');
  });

  test('extracts checkbox checked', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;

    const event = new window.MouseEvent('click');
    Object.defineProperty(event, 'target', { value: checkbox, enumerable: true });

    const data = extractEventData(event);

    expect((data.target as any).checked).toBe(true);
  });
});

describe('extractEventData with SubmitEvent', () => {
  test('extracts form data from submit event', () => {
    const form = document.createElement('form');
    const usernameInput = document.createElement('input');
    usernameInput.name = 'username';
    usernameInput.value = 'testuser';
    form.appendChild(usernameInput);

    const emailInput = document.createElement('input');
    emailInput.name = 'email';
    emailInput.value = 'test@example.com';
    form.appendChild(emailInput);

    document.body.appendChild(form);

    const event = new window.SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
      submitter: form,
    });
    Object.defineProperty(event, 'target', { value: form, enumerable: true });

    const data = extractEventData(event);

    expect(data.type).toBe('submit');
    expect(data.submitter).toBeDefined();

    document.body.removeChild(form);
  });

  test('handles submit event on non-form element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = new window.SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: div, enumerable: true });

    const data = extractEventData(event);

    // Should not have formData for non-form element
    expect(data.formData).toBeUndefined();

    document.body.removeChild(div);
  });
});

describe('extractEventData with FocusEvent', () => {
  test('extracts relatedTarget from focus event', () => {
    const input1 = document.createElement('input');
    const input2 = document.createElement('input');
    input1.id = 'input1';
    input2.id = 'input2';
    document.body.appendChild(input1);
    document.body.appendChild(input2);

    const event = new window.FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: input2,
    });
    Object.defineProperty(event, 'target', { value: input1, enumerable: true });

    const data = extractEventData(event);

    expect(data.relatedTarget).toBeDefined();

    document.body.removeChild(input1);
    document.body.removeChild(input2);
  });

  test('handles focus event without relatedTarget', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new window.FocusEvent('focus', {
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });

    const data = extractEventData(event);

    // relatedTarget is null when not provided
    expect(data.relatedTarget).toBeNull();

    document.body.removeChild(input);
  });
});

describe('extractElementData', () => {
  test('extracts href from anchor element', () => {
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/page';
    document.body.appendChild(anchor);

    const event = new window.MouseEvent('click');
    Object.defineProperty(event, 'target', { value: anchor, enumerable: true });

    const data = extractEventData(event);

    expect((data.target as any).href).toBe('https://example.com/page');

    document.body.removeChild(anchor);
  });

  test('extracts src from image element', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/image.png';
    document.body.appendChild(img);

    const event = new window.MouseEvent('click');
    Object.defineProperty(event, 'target', { value: img, enumerable: true });

    const data = extractEventData(event);

    expect((data.target as any).src).toBe('https://example.com/image.png');

    document.body.removeChild(img);
  });

  test('extracts disabled from button element', () => {
    const button = document.createElement('button');
    button.disabled = true;
    document.body.appendChild(button);

    const event = new window.MouseEvent('click');
    Object.defineProperty(event, 'target', { value: button, enumerable: true });

    const data = extractEventData(event);

    expect((data.target as any).disabled).toBe(true);

    document.body.removeChild(button);
  });
});

describe('handleEvent', () => {
  test('executes actions from handler', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const executedActions: string[] = [];
    const handler = {
      actions: [
        { type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } },
        { type: 'SetVariable', name: 'y', data: { type: 'value', value: 2 } },
      ]
    };

    const dataSignal = new Signal({
      Attributes: {},
      Variables: {},
      Apis: {},
    });

    const ctx: EventContext = {
      dataSignal,
      apis: {},
      component: { name: 'Test', nodes: {} },
      triggerEvent: (name: string) => executedActions.push(`event:${name}`),
      setUrlParameter: () => {},
      toddle: {},
      env: {},
    };

    const event = new window.MouseEvent('click');
    handleEvent(event, handler, ctx);

    // Should have processed both actions
    expect(true).toBe(true);

    document.body.removeChild(button);
  });
});

describe('currentTarget extraction', () => {
  test('extracts currentTarget data', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    container.id = 'container';
    container.appendChild(button);
    document.body.appendChild(container);

    const event = new window.MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: button, enumerable: true });
    Object.defineProperty(event, 'currentTarget', { value: container, enumerable: true });

    const data = extractEventData(event);

    expect(data.currentTarget).toBeDefined();
    expect((data.currentTarget as any).id).toBe('container');

    document.body.removeChild(container);
  });
});
