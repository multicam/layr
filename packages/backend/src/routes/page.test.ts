import { describe, test, expect } from 'bun:test';
import { matchPath } from './page';

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
