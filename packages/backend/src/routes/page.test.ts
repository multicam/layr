import { describe, test, expect, beforeEach } from 'bun:test';
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
});
