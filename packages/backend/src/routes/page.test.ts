import { describe, test, expect } from 'bun:test';
import { matchPath } from './page';

// Test the matchPath function directly
describe('matchPath', () => {
  test('matches exact path', () => {
    const result = matchPath('/', '/');
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({});
  });

  test('matches static segments', () => {
    const result = matchPath('/about', '/about');
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({});
  });

  test('matches parameterized path', () => {
    const result = matchPath('/users/:id', '/users/123');
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ id: '123' });
  });

  test('returns null for non-matching paths', () => {
    expect(matchPath('/about', '/contact')).toBeNull();
  });

  test('returns null for different lengths', () => {
    expect(matchPath('/about', '/about/us')).toBeNull();
  });

  test('decodes URL-encoded params', () => {
    const result = matchPath('/search/:query', '/search/hello%20world');
    expect(result?.params.query).toBe('hello world');
  });

  test('handles multiple params', () => {
    const result = matchPath('/users/:userId/posts/:postId', '/users/1/posts/abc');
    expect(result?.params).toEqual({ userId: '1', postId: 'abc' });
  });
});
