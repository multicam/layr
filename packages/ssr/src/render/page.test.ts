import { describe, test, expect } from 'bun:test';
import { renderPageBody, escapeHtml } from './page';
import type { Component } from '@layr/types';

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapes less than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  test('escapes greater than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  test('escapes double quote', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  test('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('leaves normal text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('renderPageBody', () => {
  test('renders empty component', () => {
    const component: Component = {
      name: 'Empty',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('</div>');
  });

  test('renders text node', () => {
    const component: Component = {
      name: 'Text',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['text1'] },
        text1: { type: 'text', value: { type: 'value', value: 'Hello' } },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('Hello');
  });

  test('escapes text content', () => {
    const component: Component = {
      name: 'Escaped',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['text1'] },
        text1: { type: 'text', value: { type: 'value', value: '<script>alert(1)</script>' } },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
  });

  test('renders void element', () => {
    const component: Component = {
      name: 'Void',
      nodes: {
        root: { type: 'element', tag: 'img', children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('<img');
    expect(result.html).toContain('/>');
  });

  test('renders nested elements', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['child'] },
        child: { type: 'element', tag: 'span', children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('<span');
    expect(result.html).toContain('</span>');
    expect(result.html).toContain('</div>');
  });

  test('returns apiCache', () => {
    const component: Component = {
      name: 'Test',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };
    
    const result = renderPageBody(component);
    expect(result.apiCache).toBeDefined();
    expect(typeof result.apiCache).toBe('object');
  });

  test('returns customProperties', () => {
    const component: Component = {
      name: 'Test',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };
    
    const result = renderPageBody(component);
    expect(result.customProperties).toBeDefined();
    expect(typeof result.customProperties).toBe('object');
  });
});
