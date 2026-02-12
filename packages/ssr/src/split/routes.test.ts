import { describe, test, expect } from 'bun:test';
import { splitRoutes, takeIncludedComponents } from './routes';
import type { Project, Component } from '@layr/types';

describe('splitRoutes', () => {
  test('splits project into routes', () => {
    const project: Project = {
      project: { id: '1', name: 'Test', type: 'app', short_id: 'test' },
      commit: 'initial',
      files: {
        components: {
          home: {
            name: 'home',
            route: { path: '/' },
            nodes: { root: { type: 'element', tag: 'div', children: [] } },
          },
          about: {
            name: 'about',
            route: { path: '/about' },
            nodes: { root: { type: 'element', tag: 'div', children: [] } },
          },
          button: {
            name: 'button',
            nodes: { root: { type: 'element', tag: 'button', children: [] } },
          },
        },
      },
    };
    
    const routes = splitRoutes(project);
    
    expect(routes).toHaveLength(2);
    expect(routes.find(r => r.pageName === 'home')).toBeDefined();
    expect(routes.find(r => r.pageName === 'about')).toBeDefined();
  });

  test('excludes components without routes', () => {
    const project: Project = {
      project: { id: '1', name: 'Test', type: 'app', short_id: 'test' },
      commit: 'initial',
      files: {
        components: {
          button: {
            name: 'button',
            nodes: { root: { type: 'element', tag: 'button', children: [] } },
          },
        },
      },
    };
    
    const routes = splitRoutes(project);
    expect(routes).toHaveLength(0);
  });

  test('handles empty project', () => {
    const project: Project = {
      project: { id: '1', name: 'Test', type: 'app', short_id: 'test' },
      commit: 'initial',
      files: { components: {} },
    };
    
    const routes = splitRoutes(project);
    expect(routes).toHaveLength(0);
  });
});

describe('takeIncludedComponents', () => {
  test('includes page itself', () => {
    const page: Component = {
      name: 'home',
      route: { path: '/' },
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };
    
    const included = takeIncludedComponents(page, { home: page });
    expect(included).toContain('home');
  });

  test('includes referenced components', () => {
    const button: Component = {
      name: 'button',
      nodes: { root: { type: 'element', tag: 'button', children: [] } },
    };
    
    const page: Component = {
      name: 'home',
      route: { path: '/' },
      nodes: {
        root: { type: 'element', tag: 'div', children: ['btn'] },
        btn: { type: 'component', name: 'button', attrs: {}, children: [] },
      },
    };
    
    const included = takeIncludedComponents(page, { home: page, button });
    expect(included).toContain('home');
    expect(included).toContain('button');
  });

  test('handles nested references', () => {
    const icon: Component = {
      name: 'icon',
      nodes: { root: { type: 'element', tag: 'i', children: [] } },
    };
    
    const button: Component = {
      name: 'button',
      nodes: {
        root: { type: 'element', tag: 'button', children: ['ic'] },
        ic: { type: 'component', name: 'icon', attrs: {}, children: [] },
      },
    };
    
    const page: Component = {
      name: 'home',
      route: { path: '/' },
      nodes: {
        root: { type: 'element', tag: 'div', children: ['btn'] },
        btn: { type: 'component', name: 'button', attrs: {}, children: [] },
      },
    };
    
    const included = takeIncludedComponents(page, { home: page, button, icon });
    expect(included).toContain('home');
    expect(included).toContain('button');
    expect(included).toContain('icon');
  });
});
