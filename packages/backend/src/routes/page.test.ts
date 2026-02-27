import { describe, test, expect, beforeEach, mock, afterEach } from 'bun:test';
import { matchPath, matchRoute, renderPage, handlePage } from './page';
import type { Project, Component } from '@layr/types';
import type { Context } from 'hono';

// Mock loadProject
const loadProjectMock = mock((projectId: string) => null);

// We need to mock the module
mock.module('../loader/project', () => ({
  loadProject: loadProjectMock,
}));

describe('matchPath', () => {
  test('matches exact path', () => {
    const result = matchPath('/about', '/about');
    expect(result).toBeDefined();
    expect(result?.params).toEqual({});
  });

  test('extracts single parameter', () => {
    const result = matchPath('/users/:id', '/users/123');
    expect(result).toBeDefined();
    expect(result?.params.id).toBe('123');
  });

  test('extracts multiple parameters', () => {
    const result = matchPath('/users/:id/posts/:postId', '/users/1/posts/abc');
    expect(result).toBeDefined();
    expect(result?.params.id).toBe('1');
    expect(result?.params.postId).toBe('abc');
  });

  test('returns null for no match', () => {
    const result = matchPath('/about', '/home');
    expect(result).toBeNull();
  });

  test('matches root path', () => {
    const result = matchPath('/', '/');
    expect(result).toBeDefined();
  });

  test('handles trailing slash', () => {
    const result = matchPath('/about/', '/about');
    expect(result).toBeDefined();
  });

  test('handles catch-all', () => {
    const result = matchPath('/docs/*', '/docs/guide/intro');
    expect(result).toBeDefined();
  });

  test('matches paths with multiple segments', () => {
    const result = matchPath('/a/b/c', '/a/b/c');
    expect(result).toBeDefined();
  });

  test('handles empty path', () => {
    const result = matchPath('', '/');
    expect(result).toBeDefined();
  });

  test('returns null when path has fewer segments than pattern', () => {
    const result = matchPath('/a/b/c', '/a/b');
    expect(result).toBeNull();
  });

  test('returns null when path has more segments than pattern', () => {
    const result = matchPath('/a/b', '/a/b/c');
    expect(result).toBeNull();
  });

  test('extracts all path segments as parameters', () => {
    const result = matchPath('/:category/:subcategory/:item', '/electronics/computers/laptop');
    expect(result).toBeDefined();
    expect(result?.params.category).toBe('electronics');
    expect(result?.params.subcategory).toBe('computers');
    expect(result?.params.item).toBe('laptop');
  });

  test('handles URL-encoded parameters', () => {
    const result = matchPath('/search/:query', '/search/hello%20world');
    expect(result).toBeDefined();
    expect(result?.params.query).toBe('hello world');
  });

  test('handles special characters in parameters', () => {
    const result = matchPath('/file/:name', '/file/my-file_v2.0');
    expect(result).toBeDefined();
    expect(result?.params.name).toBe('my-file_v2.0');
  });

  test('catch-all captures remaining path', () => {
    const result = matchPath('/docs/*', '/docs/api/v2/endpoints');
    expect(result).toBeDefined();
    expect(result?.params['*']).toBe('api/v2/endpoints');
  });

  test('catch-all with single segment', () => {
    const result = matchPath('/docs/*', '/docs/guide');
    expect(result).toBeDefined();
    expect(result?.params['*']).toBe('guide');
  });

  test('catch-all returns null when path too short', () => {
    const result = matchPath('/docs/api/*', '/docs');
    expect(result).toBeNull();
  });

  test('catch-all with prefix parameters', () => {
    const result = matchPath('/docs/:version/*', '/docs/v1/guide/intro');
    expect(result).toBeDefined();
    expect(result?.params.version).toBe('v1');
    expect(result?.params['*']).toBe('guide/intro');
  });

  test('returns null for catch-all with wrong prefix', () => {
    const result = matchPath('/docs/api/*', '/guides/api/v1');
    expect(result).toBeNull();
  });

  test('parameter with static segments', () => {
    const result = matchPath('/users/:id/profile', '/users/42/profile');
    expect(result).toBeDefined();
    expect(result?.params.id).toBe('42');
  });

  test('does not match when static segment differs', () => {
    const result = matchPath('/users/:id/profile', '/users/42/settings');
    expect(result).toBeNull();
  });

  test('handles numeric parameters', () => {
    const result = matchPath('/posts/:year/:month', '/posts/2024/06');
    expect(result).toBeDefined();
    expect(result?.params.year).toBe('2024');
    expect(result?.params.month).toBe('06');
  });

  test('handles empty parameter value edge case', () => {
    // This should not match because there's no value after the colon
    const result = matchPath('/users/:id', '/users/');
    expect(result).toBeNull();
  });

  test('handles double slashes in path', () => {
    const result = matchPath('/about', '//about');
    // Double slashes get filtered out
    expect(result).toBeDefined();
  });

  test('handles unicode in path', () => {
    const result = matchPath('/café/:item', '/café/croissant');
    expect(result).toBeDefined();
    expect(result?.params.item).toBe('croissant');
  });

  test('handles URL-encoded unicode', () => {
    const result = matchPath('/search/:q', '/search/%E4%B8%AD%E6%96%87');
    expect(result).toBeDefined();
    expect(result?.params.q).toBe('中文');
  });

  test('matches exact same path and pattern', () => {
    const result = matchPath('/exact/path/here', '/exact/path/here');
    expect(result).toBeDefined();
    expect(result?.params).toEqual({});
  });

  test('parameter at start of pattern', () => {
    const result = matchPath(':lang/home', 'en/home');
    expect(result).toBeDefined();
    expect(result?.params.lang).toBe('en');
  });

  test('consecutive parameters', () => {
    const result = matchPath('/:a/:b/:c', '/x/y/z');
    expect(result).toBeDefined();
    expect(result?.params.a).toBe('x');
    expect(result?.params.b).toBe('y');
    expect(result?.params.c).toBe('z');
  });

  test('catch-all with no extra path captures empty string', () => {
    const result = matchPath('/docs/*', '/docs');
    // Implementation returns empty string for * when no extra path
    expect(result).toBeDefined();
    expect(result?.params['*']).toBe('');
  });

  test('deeply nested path', () => {
    const result = matchPath('/a/b/c/d/e/f', '/a/b/c/d/e/f');
    expect(result).toBeDefined();
  });

  test('returns null for partial match', () => {
    const result = matchPath('/api/users', '/api/users/extra');
    expect(result).toBeNull();
  });
});

describe('matchRoute', () => {
  const createMockProject = (pages: Record<string, { path: string }>): Project => {
    const components: Record<string, Component> = {};
    for (const [name, route] of Object.entries(pages)) {
      components[name] = {
        name,
        route: { path: route.path },
        nodes: {},
      };
    }
    return {
      files: { components },
    } as Project;
  };

  test('matches exact route', () => {
    const project = createMockProject({
      Home: { path: '/' },
      About: { path: '/about' },
    });

    const result = matchRoute(project, '/about');
    expect(result).toBeDefined();
    expect(result?.page).toBe('About');
    expect(result?.params).toEqual({});
  });

  test('matches root route', () => {
    const project = createMockProject({
      Home: { path: '/' },
    });

    const result = matchRoute(project, '/');
    expect(result).toBeDefined();
    expect(result?.page).toBe('Home');
  });

  test('matches route with parameters', () => {
    const project = createMockProject({
      UserDetail: { path: '/users/:id' },
    });

    const result = matchRoute(project, '/users/123');
    expect(result).toBeDefined();
    expect(result?.page).toBe('UserDetail');
    expect(result?.params.id).toBe('123');
  });

  test('matches catch-all route', () => {
    const project = createMockProject({
      Docs: { path: '/docs/*' },
    });

    const result = matchRoute(project, '/docs/guide/intro');
    expect(result).toBeDefined();
    expect(result?.page).toBe('Docs');
    expect(result?.params['*']).toBe('guide/intro');
  });

  test('returns null for non-matching route', () => {
    const project = createMockProject({
      Home: { path: '/' },
      About: { path: '/about' },
    });

    const result = matchRoute(project, '/contact');
    expect(result).toBeNull();
  });

  test('handles empty components object', () => {
    const project: Project = {
      files: { components: {} },
    } as Project;

    const result = matchRoute(project, '/any');
    expect(result).toBeNull();
  });

  test('skips components without routes', () => {
    const project: Project = {
      files: {
        components: {
          Button: { name: 'Button', nodes: {} }, // No route
          Page: { name: 'Page', route: { path: '/page' }, nodes: {} },
        },
      },
    } as Project;

    const result = matchRoute(project, '/page');
    expect(result).toBeDefined();
    expect(result?.page).toBe('Page');
  });

  test('handles null components', () => {
    const project: Project = {
      files: {
        components: {
          NullComp: null as any,
          Page: { name: 'Page', route: { path: '/page' }, nodes: {} },
        },
      },
    } as Project;

    const result = matchRoute(project, '/page');
    expect(result).toBeDefined();
    expect(result?.page).toBe('Page');
  });

  test('returns first matching route', () => {
    const project = createMockProject({
      First: { path: '/first' },
      Second: { path: '/first' },
    });

    const result = matchRoute(project, '/first');
    expect(result).toBeDefined();
    expect(result?.page).toBe('First');
  });

  test('handles project without files', () => {
    const project = {} as Project;
    const result = matchRoute(project, '/any');
    expect(result).toBeNull();
  });

  test('handles project with undefined components', () => {
    const project = { files: {} } as Project;
    const result = matchRoute(project, '/any');
    expect(result).toBeNull();
  });
});

describe('renderPage', () => {
  const createProjectWithPage = (pageName: string, nodes?: Component['nodes']): Project => {
    return {
      files: {
        components: {
          [pageName]: {
            name: pageName,
            nodes: nodes || {},
          },
        },
      },
      project: { short_id: 'test-project' },
    } as Project;
  };

  test('renders basic page HTML', () => {
    const project = createProjectWithPage('TestPage');

    const html = renderPage(project, 'TestPage', {});

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>TestPage</title>');
    expect(html).toContain('id="App"');
  });

  test('includes page name in title', () => {
    const project = createProjectWithPage('My Custom Page');

    const html = renderPage(project, 'My Custom Page', {});

    expect(html).toContain('<title>My Custom Page</title>');
  });

  test('escapes HTML in page name', () => {
    const project = createProjectWithPage('<script>alert("xss")</script>');

    const html = renderPage(project, '<script>alert("xss")</script>', {});

    expect(html).not.toContain('<script>alert("xss")</script></title>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('includes SSR data in script tag', () => {
    const project = createProjectWithPage('TestPage');

    const html = renderPage(project, 'TestPage', { id: '123' });

    expect(html).toContain('id="layr-data"');
    expect(html).toContain('"params":{"id":"123"}');
    expect(html).toContain('"page":"TestPage"');
  });

  test('includes project short_id in data', () => {
    const project = createProjectWithPage('TestPage');

    const html = renderPage(project, 'TestPage', {});

    expect(html).toContain('"project":"test-project"');
  });

  test('handles missing page gracefully', () => {
    const project: Project = {
      files: { components: {} },
    } as Project;

    const html = renderPage(project, 'NonExistent', {});

    expect(html).toContain('Page component not found');
  });

  test('handles null nodes', () => {
    const project = createProjectWithPage('EmptyPage', null as any);

    const html = renderPage(project, 'EmptyPage', {});

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>EmptyPage</title>');
  });

  test('escapes angle brackets in JSON data', () => {
    const project = createProjectWithPage('TestPage');

    const html = renderPage(project, 'TestPage', { script: '</script><script>alert(1)' });

    // JSON should escape </script> to prevent XSS
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('\\u003c');
  });

  test('handles project without short_id', () => {
    const project: Project = {
      files: {
        components: {
          TestPage: { name: 'TestPage', nodes: {} },
        },
      },
    } as Project;

    const html = renderPage(project, 'TestPage', {});

    expect(html).toContain('"project":"unknown"');
  });

  test('includes meta charset and viewport', () => {
    const project = createProjectWithPage('TestPage');

    const html = renderPage(project, 'TestPage', {});

    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });
});

describe('handlePage', () => {
  // Note: handlePage requires a Hono Context which is complex to mock
  // These tests verify the core logic through matchRoute and renderPage
  // Integration tests with actual Hono would be more appropriate

  test('integration: matchRoute + renderPage produces valid output', () => {
    const project: Project = {
      files: {
        components: {
          Home: {
            name: 'Home',
            route: { path: '/' },
            nodes: {},
          },
          UserPage: {
            name: 'UserPage',
            route: { path: '/users/:id' },
            nodes: {},
          },
          NotFound: {
            name: 'NotFound',
            route: { path: '/404' },
            nodes: {},
          },
        },
      },
      project: { short_id: 'test-project' },
    } as Project;

    // Test matching user page
    const match = matchRoute(project, '/users/123');
    expect(match).toBeDefined();
    expect(match?.page).toBe('UserPage');
    expect(match?.params.id).toBe('123');

    // Render the matched page
    const html = renderPage(project, match!.page, match!.params);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>UserPage</title>');
    expect(html).toContain('"id":"123"');
  });

  test('integration: handles 404 page lookup', () => {
    const project: Project = {
      files: {
        components: {
          Home: {
            name: 'Home',
            route: { path: '/' },
            nodes: {},
          },
          NotFound: {
            name: 'NotFound',
            route: { path: '/404' },
            nodes: {},
          },
        },
      },
      project: { short_id: 'test-project' },
    } as Project;

    // Try to match non-existent route
    const match = matchRoute(project, '/nonexistent');
    expect(match).toBeNull();

    // Can still match 404 page
    const notFoundMatch = matchRoute(project, '/404');
    expect(notFoundMatch).toBeDefined();
    expect(notFoundMatch?.page).toBe('NotFound');
  });
});

describe('handlePage', () => {
  const createMockContext = (path: string): Context => {
    return {
      req: { path },
      html: (content: string, status = 200) => new Response(content, {
        status,
        headers: { 'Content-Type': 'text/html' }
      }),
    } as unknown as Context;
  };

  const createTestProject = (): Project => ({
    files: {
      components: {
        Home: { name: 'Home', route: { path: '/' }, nodes: {} },
        About: { name: 'About', route: { path: '/about' }, nodes: {} },
        UserDetail: { name: 'UserDetail', route: { path: '/users/:id' }, nodes: {} },
        NotFound: { name: 'NotFound', route: { path: '/404' }, nodes: {} },
      },
    },
    project: { short_id: 'test-project' },
  } as Project);

  beforeEach(() => {
    loadProjectMock.mockClear();
  });

  test('returns 404 when project not found', async () => {
    loadProjectMock.mockReturnValue(null);
    const c = createMockContext('/demo/about');

    const response = await handlePage(c, 'nonexistent');
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Project not found');
  });

  test('handles matched route and returns HTML', async () => {
    const project = createTestProject();
    loadProjectMock.mockReturnValue({ id: 'demo', project, path: '/demo' });
    const c = createMockContext('/demo/about');

    const response = await handlePage(c, 'demo');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>About</title>');
  });

  test('extracts parameters from route', async () => {
    const project = createTestProject();
    loadProjectMock.mockReturnValue({ id: 'demo', project, path: '/demo' });
    const c = createMockContext('/demo/users/123');

    const response = await handlePage(c, 'demo');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>UserDetail</title>');
    expect(html).toContain('"id":"123"');
  });

  test('handles root path', async () => {
    const project = createTestProject();
    loadProjectMock.mockReturnValue({ id: 'demo', project, path: '/demo' });
    const c = createMockContext('/demo');

    const response = await handlePage(c, 'demo');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Home</title>');
  });

  test('returns 404 for non-matching route with no 404 page', async () => {
    const project: Project = {
      files: {
        components: {
          Home: { name: 'Home', route: { path: '/' }, nodes: {} },
        },
      },
      project: { short_id: 'test-project' },
    } as Project;
    loadProjectMock.mockReturnValue({ id: 'demo', project, path: '/demo' });
    const c = createMockContext('/demo/nonexistent');

    const response = await handlePage(c, 'demo');
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Not found');
  });

  test('uses 404 page when available', async () => {
    // The code looks for a component named '404' when rendering 404
    const project: Project = {
      files: {
        components: {
          Home: { name: 'Home', route: { path: '/' }, nodes: {} },
          '404': { name: '404', route: { path: '/404' }, nodes: {} },
        },
      },
      project: { short_id: 'test-project' },
    } as Project;
    loadProjectMock.mockReturnValue({ id: 'demo', project, path: '/demo' });
    const c = createMockContext('/demo/nonexistent');

    const response = await handlePage(c, 'demo');
    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain('<title>404</title>');
  });
});
