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

    test('extracts title element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['title1']
          },
          title1: {
            id: 'title1',
            type: 'element',
            tag: 'title',
            children: [],
            attrs: {}
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({ type: 'title', content: '' });
    });

    test('extracts meta element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['meta1']
          },
          meta1: {
            id: 'meta1',
            type: 'element',
            tag: 'meta',
            children: [],
            attrs: {
              charset: { type: 'value', value: 'utf-8' }
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'meta',
        attrs: { charset: 'utf-8' }
      });
    });

    test('extracts link element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['link1']
          },
          link1: {
            id: 'link1',
            type: 'element',
            tag: 'link',
            children: [],
            attrs: {
              rel: { type: 'value', value: 'stylesheet' },
              href: { type: 'value', value: '/style.css' }
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'link',
        attrs: { rel: 'stylesheet', href: '/style.css' }
      });
    });

    test('extracts script element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['script1']
          },
          script1: {
            id: 'script1',
            type: 'element',
            tag: 'script',
            children: [],
            attrs: {
              src: { type: 'value', value: '/app.js' }
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'script',
        attrs: { src: '/app.js' },
        content: ''
      });
    });

    test('extracts style element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['style1']
          },
          style1: {
            id: 'style1',
            type: 'element',
            tag: 'style',
            children: [],
            attrs: {}
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'style',
        content: ''
      });
    });

    test('extracts base element from head node', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['base1']
          },
          base1: {
            id: 'base1',
            type: 'element',
            tag: 'base',
            children: [],
            attrs: {
              href: { type: 'value', value: 'https://example.com/' }
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'base',
        attrs: { href: 'https://example.com/' }
      });
    });

    test('ignores unknown element types in head', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['unknown1']
          },
          unknown1: {
            id: 'unknown1',
            type: 'element',
            tag: 'div',
            children: [],
            attrs: {}
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toEqual([]);
    });

    test('handles component without nodes', () => {
      const component: Component = {
        name: 'Test',
      };

      const items = getHeadItems(component);
      expect(items).toEqual([]);
    });

    test('extracts attrs with null value', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['meta1']
          },
          meta1: {
            id: 'meta1',
            type: 'element',
            tag: 'meta',
            children: [],
            attrs: {
              charset: { type: 'value', value: null }
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'meta',
        attrs: { charset: '' }
      });
    });

    test('ignores attrs without value type', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: ['head1'] },
          head1: {
            id: 'head1',
            type: 'element',
            tag: 'head',
            children: ['meta1']
          },
          meta1: {
            id: 'meta1',
            type: 'element',
            tag: 'meta',
            children: [],
            attrs: {
              charset: 'plain-string' as any
            }
          },
        },
      };

      const items = getHeadItems(component);
      expect(items).toContainEqual({
        type: 'meta',
        attrs: {}
      });
    });

    test('handles route without title or description', () => {
      const component: Component = {
        name: 'Test',
        route: { path: '/' },
        nodes: {
          root: { id: 'root', type: 'element', tag: 'div', children: [] },
        },
      };

      const items = getHeadItems(component);
      expect(items).toEqual([]);
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

    test('renders title without content', () => {
      const items: HeadItem[] = [
        { type: 'title' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<title></title>');
    });

    test('renders style tag', () => {
      const items: HeadItem[] = [
        { type: 'style', content: 'body { margin: 0; }' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<style>');
      expect(html).toContain('body { margin: 0; }');
      expect(html).toContain('</style>');
    });

    test('renders style tag with attrs', () => {
      const items: HeadItem[] = [
        { type: 'style', attrs: { type: 'text/css' }, content: 'body {}' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<style type="text/css">');
    });

    test('renders base tag', () => {
      const items: HeadItem[] = [
        { type: 'base', attrs: { href: 'https://example.com/' } },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<base href="https://example.com/">');
    });

    test('renders base tag without attrs', () => {
      const items: HeadItem[] = [
        { type: 'base' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<base>');
    });

    test('renders meta tag without attrs', () => {
      const items: HeadItem[] = [
        { type: 'meta' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<meta>');
    });

    test('renders link tag without attrs', () => {
      const items: HeadItem[] = [
        { type: 'link' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<link>');
    });

    test('renders script with inline content', () => {
      const items: HeadItem[] = [
        { type: 'script', attrs: {}, content: 'console.log("hello");' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<script>');
      expect(html).toContain('console.log("hello");');
      expect(html).toContain('</script>');
    });

    test('escapes closing tag in script content', () => {
      const items: HeadItem[] = [
        { type: 'script', attrs: {}, content: 'var x = "</script>";' },
      ];

      const html = renderHeadItems(items);
      // The </script> in content is escaped to <\/script>
      expect(html).toContain('<\\/script>');
      // The closing tag at the end is still present (this is how HTML works)
    });

    test('escapes closing tag in style content', () => {
      const items: HeadItem[] = [
        { type: 'style', content: '/* </style> */' },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('<\\/style>');
    });

    test('ignores unknown item type', () => {
      const items: HeadItem[] = [
        { type: 'unknown' } as HeadItem,
      ];

      const html = renderHeadItems(items);
      expect(html).toBe('');
    });

    test('renders boolean attribute', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { async: null } },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('async');
    });

    test('rejects invalid attribute names', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { 'onclick="alert(1)"': 'test' } as any },
      ];

      const html = renderHeadItems(items);
      expect(html).not.toContain('onclick');
    });

    test('escapes attribute values', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { content: '"quoted" & <tagged>' } },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('&quot;quoted&quot;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
    });

    test('validates attribute names', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { '123invalid': 'value' } as any },
      ];

      const html = renderHeadItems(items);
      expect(html).not.toContain('123invalid');
    });

    test('allows valid attribute names with special chars', () => {
      const items: HeadItem[] = [
        { type: 'meta', attrs: { 'data_test': 'value', 'xml:lang': 'en' } },
      ];

      const html = renderHeadItems(items);
      expect(html).toContain('data_test');
      expect(html).toContain('xml:lang');
    });

    test('returns empty string for empty array', () => {
      const html = renderHeadItems([]);
      expect(html).toBe('');
    });
  });
});
