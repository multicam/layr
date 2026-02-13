import { describe, test, expect } from 'bun:test';
import { getHeadItems, renderHeadItems, type HeadItem } from './head';
import type { Component } from '@layr/types';

describe('head', () => {
  describe('getHeadItems', () => {
    test('returns empty array for component without head', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: [] },
        },
      };
      
      const items = getHeadItems(component);
      expect(items).toEqual([]);
    });

    test('extracts title from route', () => {
      const component: Component = {
        name: 'Test',
        route: { path: '/', title: 'Home Page' },
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: [] },
        },
      };
      
      const items = getHeadItems(component);
      expect(items).toContainEqual({ type: 'title', content: 'Home Page' });
    });

    test('extracts meta description', () => {
      const component: Component = {
        name: 'Test',
        route: { path: '/', description: 'Test description' },
        nodes: { root: { id: 'root', type: 'element', tag: 'div', children: [] } },
      };
      
      const items = getHeadItems(component);
      expect(items).toContainEqual({ 
        type: 'meta', 
        attrs: { name: 'description', content: 'Test description' } 
      });
    });
  });

  describe('renderHeadItems', () => {
    test('renders title', () => {
      const items: HeadItem[] = [
        { type: 'title', content: 'My Page' },
      ];
      
      const html = renderHeadItems(items);
      expect(html).toContain('<title>My Page</title>');
    });

    test('renders meta tag', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { charset: 'utf-8' } },
      ];
      
      const html = renderHeadItems(items);
      expect(html).toContain('<meta charset="utf-8">');
    });

    test('renders link tag', () => {
      const items: HeadItem[] = [
        { type: 'link', attrs: { rel: 'stylesheet', href: '/style.css' } },
      ];
      
      const html = renderHeadItems(items);
      expect(html).toContain('<link rel="stylesheet" href="/style.css">');
    });

    test('renders script tag', () => {
      const items: HeadItem[] = [
        { type: 'script', attrs: { src: '/app.js' }, content: '' },
      ];
      
      const html = renderHeadItems(items);
      expect(html).toContain('<script src="/app.js">');
    });

    test('escapes HTML in content', () => {
      const items: HeadItem[] = [
        { type: 'title', content: '<script>alert(1)</script>' },
      ];
      
      const html = renderHeadItems(items);
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    test('renders multiple items', () => {
      const items: HeadItem[] = [
        { type: 'title', content: 'Page' },
        { type: 'meta', attrs: { name: 'description', content: 'Desc' } },
      ];
      
      const html = renderHeadItems(items);
      expect(html).toContain('<title>Page</title>');
      expect(html).toContain('<meta name="description"');
    });
  });
});
