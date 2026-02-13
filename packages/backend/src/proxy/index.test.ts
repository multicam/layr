import { describe, test, expect } from 'bun:test';
import { createProxy, fontProxy, fontStaticProxy } from './index';

describe('proxy', () => {
  describe('createProxy', () => {
    test('creates proxy function', () => {
      const proxy = createProxy({ target: 'https://example.com' });
      expect(typeof proxy).toBe('function');
    });

    test('accepts config options', () => {
      const proxy = createProxy({ 
        target: 'https://example.com',
        changeOrigin: true,
        timeout: 5000,
      });
      expect(typeof proxy).toBe('function');
    });
  });

  describe('fontProxy', () => {
    test('creates Google Fonts proxy', () => {
      const proxy = fontProxy();
      expect(typeof proxy).toBe('function');
    });
  });

  describe('fontStaticProxy', () => {
    test('creates Google Fonts static proxy', () => {
      const proxy = fontStaticProxy();
      expect(typeof proxy).toBe('function');
    });
  });
});
