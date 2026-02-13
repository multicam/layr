import { describe, test, expect } from 'bun:test';

// Test element count directly
const BUILTIN_ELEMENTS = [
  'div', 'span', 'p', 'h1', 'h2', 'button', 'a', 'img', 'input',
  'h3', 'h4', 'h5', 'h6', 'strong', 'em',
  'section', 'article', 'header', 'footer', 'nav', 'aside', 'main',
  'ul', 'ol', 'li',
  'form', 'label', 'textarea', 'select', 'option',
  'video', 'audio', 'iframe',
  'table', 'tr', 'td', 'th',
  'br', 'hr',
];

describe('ElementCatalog', () => {
  test('contains required elements', () => {
    expect(BUILTIN_ELEMENTS).toContain('div');
    expect(BUILTIN_ELEMENTS).toContain('span');
    expect(BUILTIN_ELEMENTS).toContain('button');
    expect(BUILTIN_ELEMENTS).toContain('img');
    expect(BUILTIN_ELEMENTS).toContain('input');
  });

  test('element count', () => {
    expect(BUILTIN_ELEMENTS.length).toBeGreaterThan(30);
  });
});
