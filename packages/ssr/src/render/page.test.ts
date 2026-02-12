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

describe('renderPageBody edge cases', () => {
  test('renders nested elements', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['child'] },
        child: { type: 'element', tag: 'span', children: ['grandchild'] },
        grandchild: { type: 'element', tag: 'em', children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('<span');
    expect(result.html).toContain('<em');
    expect(result.html).toContain('</em>');
    expect(result.html).toContain('</span>');
    expect(result.html).toContain('</div>');
  });

  test('renders void elements correctly', () => {
    const voidTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
    
    for (const tag of voidTags) {
      const component: Component = {
        name: 'Void',
        nodes: {
          root: { type: 'element', tag, children: [] },
        },
      };
      
      const result = renderPageBody(component);
      expect(result.html).toContain(`<${tag}`);
      expect(result.html).toContain('/>');
    }
  });

  test('renders component nodes', () => {
    const component: Component = {
      name: 'WithComponent',
      nodes: {
        root: { type: 'component', name: 'ChildComponent', attrs: {}, children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('data-component="ChildComponent"');
  });

  test('renders slot nodes with children', () => {
    const component: Component = {
      name: 'WithSlot',
      nodes: {
        root: { type: 'slot', children: ['child1'] },
        child1: { type: 'element', tag: 'span', children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('<span');
  });

  test('handles empty component', () => {
    const component: Component = {
      name: 'Empty',
      nodes: {},
    };
    
    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('handles component without root', () => {
    const component: Component = {
      name: 'NoRoot',
      nodes: {
        other: { type: 'element', tag: 'div', children: [] },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('renders multiple text nodes', () => {
    const component: Component = {
      name: 'MultipleText',
      nodes: {
        root: { type: 'element', tag: 'p', children: ['t1', 't2'] },
        t1: { type: 'text', value: { type: 'value', value: 'First' } },
        t2: { type: 'text', value: { type: 'value', value: 'Second' } },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('First');
    expect(result.html).toContain('Second');
  });

  test('escapes HTML in text values', () => {
    const component: Component = {
      name: 'Escaped',
      nodes: {
        root: { type: 'text', value: { type: 'value', value: '<script>alert(1)</script>' } },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
  });

  test('escapes quotes in text', () => {
    const component: Component = {
      name: 'Quotes',
      nodes: {
        root: { type: 'text', value: { type: 'value', value: 'Say "hello"' } },
      },
    };
    
    const result = renderPageBody(component);
    expect(result.html).toContain('&quot;');
  });
});
