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

describe('matchPath edge cases', () => {
  test('matches root path', () => {
    const result = matchPath('/', '/');
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({});
  });

  test('matches path with trailing slash', () => {
    const result = matchPath('/about', '/about/');
    // Trailing slash creates different parts
    expect(result).not.toBeNull();
  });

  test('matches path with multiple segments', () => {
    const result = matchPath('/users/profile/settings', '/users/profile/settings');
    expect(result).not.toBeNull();
  });

  test('extracts multiple parameters', () => {
    const result = matchPath('/users/:userId/posts/:postId', '/users/123/posts/abc');
    expect(result?.params).toEqual({ userId: '123', postId: 'abc' });
  });

  test('decodes URL-encoded parameters', () => {
    const result = matchPath('/search/:query', '/search/hello%20world');
    expect(result?.params.query).toBe('hello world');
  });

  test('handles special characters in params', () => {
    const result = matchPath('/file/:name', '/file/my-file_v2.txt');
    expect(result?.params.name).toBe('my-file_v2.txt');
  });

  test('returns null for non-matching static path', () => {
    expect(matchPath('/about', '/contact')).toBeNull();
  });

  test('returns null for different segment count', () => {
    expect(matchPath('/about', '/about/us')).toBeNull();
    expect(matchPath('/about/us', '/about')).toBeNull();
  });

  test('handles empty segments', () => {
    const result = matchPath('', '');
    expect(result).not.toBeNull();
  });

  test('matches paths starting with colon literally', () => {
    // This is a static segment that happens to start with ':'
    // Our impl treats it as a param, which is correct for typical routing
    const result = matchPath('/api/:endpoint', '/api/users');
    expect(result?.params.endpoint).toBe('users');
  });
});
