import { describe, test, expect, beforeAll } from 'bun:test';
import app from './index';

describe('backend server', () => {
  describe('health endpoint', () => {
    test('returns ok status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('projects list', () => {
    test('returns projects array', async () => {
      const res = await app.request('/api/projects');
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toHaveProperty('projects');
      expect(Array.isArray(body.projects)).toBe(true);
    });
  });

  describe('static assets', () => {
    test('returns 501 for static assets', async () => {
      const res = await app.request('/_static/test.js');
      expect(res.status).toBe(501);
    });
  });

  describe('root endpoint', () => {
    test('returns HTML at root', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('project routes', () => {
    test('returns 404 for non-existent project', async () => {
      const res = await app.request('/nonexistent-project/');
      expect(res.status).toBe(404);
    });
  });
});
