import { describe, test, expect } from 'bun:test';
import { ElementCatalog, HTML_ELEMENTS } from './ElementCatalog';

describe('HTML_ELEMENTS', () => {
  test('contains popular elements', () => {
    const popularTags = HTML_ELEMENTS.filter(e => e.isPopular).map(e => e.tag);
    expect(popularTags).toContain('div');
    expect(popularTags).toContain('span');
    expect(popularTags).toContain('button');
  });

  test('contains void elements', () => {
    const voidTags = HTML_ELEMENTS.filter(e => e.isVoid).map(e => e.tag);
    expect(voidTags).toContain('img');
    expect(voidTags).toContain('input');
    expect(voidTags).toContain('br');
    expect(voidTags).toContain('hr');
  });

  test('all elements have required fields', () => {
    for (const el of HTML_ELEMENTS) {
      expect(el.name).toBeDefined();
      expect(el.tag).toBeDefined();
      expect(el.categories).toBeDefined();
    }
  });
});

describe('ElementCatalog', () => {
  test('exports element count', () => {
    expect(HTML_ELEMENTS.length).toBeGreaterThan(20);
  });
});
