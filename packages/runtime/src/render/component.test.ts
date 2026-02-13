import { describe, test, expect, beforeAll } from 'bun:test';
import { Window } from 'happy-dom';
import { renderComponent, type RenderContext } from './component';
import { Signal } from '@layr/core';
import type { Component } from '@layr/types';

let window: Window;
let document: Document;

function createTestContext(component: Component): RenderContext {
  const dataSignal = new Signal({
    Attributes: {},
    Variables: {},
    Apis: {},
  });
  const root = document.createElement('div');
  return {
    dataSignal,
    component,
    root,
    abortSignal: new AbortController().signal,
  };
}

describe('renderComponent', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).document = document;
    (globalThis as any).HTMLElement = window.HTMLElement;
  });

  test('returns empty array for component without root', () => {
    const component: Component = {
      name: 'Empty',
      nodes: {},
    };
    
    const ctx = createTestContext(component);
    const result = renderComponent(ctx);
    
    expect(result).toEqual([]);
  });

  test('renders simple component with root', () => {
    const component: Component = {
      name: 'Simple',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'div',
          children: [],
        },
      },
    };
    
    const ctx = createTestContext(component);
    const result = renderComponent(ctx);
    
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('DIV');
  });

  test('renders nested elements', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'div',
          children: ['child'],
        },
        child: {
          id: 'child',
          type: 'element',
          tag: 'span',
          children: [],
        },
      },
    };
    
    const ctx = createTestContext(component);
    const result = renderComponent(ctx);
    
    expect(result).toHaveLength(1);
    const div = result[0];
    expect(div.tagName).toBe('DIV');
    expect(div.children.length).toBe(1);
    expect(div.children[0].tagName).toBe('SPAN');
  });
});
