import { describe, test, expect } from 'bun:test';
import {
  escapeSearchParameter,
  escapeSearchParameters,
  escapeAttrValue,
  toEncodedText,
  skipHopByHopHeaders,
  skipLayrHeaders,
  skipCookieHeader,
  filterProxyResponseHeaders,
  sanitizeProxyHeaders,
  validateUrl,
  isLocalhostUrl,
  isLocalhostHostname,
  applyTemplateValues,
  mapTemplateHeaders,
  escapeScriptTags,
  isCloudflareImagePath,
  PROXY_URL_HEADER,
  PROXY_TEMPLATES_IN_BODY,
} from './index';

describe('Security and Sanitization', () => {
  describe('escapeSearchParameter', () => {
    test('escapes HTML in parameter value', () => {
      expect(escapeSearchParameter('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      );
    });

    test('returns null for undefined', () => {
      expect(escapeSearchParameter(undefined)).toBeNull();
    });

    test('returns null for null', () => {
      expect(escapeSearchParameter(null)).toBeNull();
    });

    test('returns string unchanged if no HTML', () => {
      expect(escapeSearchParameter('hello world')).toBe('hello world');
    });

    test('escapes quotes', () => {
      expect(escapeSearchParameter('test"quote')).toBe('test&quot;quote');
    });
  });

  describe('escapeSearchParameters', () => {
    test('escapes all parameters', () => {
      const params = new URLSearchParams('a=<script>&b=normal');
      const escaped = escapeSearchParameters(params);
      expect(escaped.get('a')).toBe('&lt;script&gt;');
      expect(escaped.get('b')).toBe('normal');
    });

    test('handles empty params', () => {
      const params = new URLSearchParams();
      const escaped = escapeSearchParameters(params);
      expect(escaped.toString()).toBe('');
    });
  });

  describe('escapeAttrValue', () => {
    test('escapes quotes in attribute values', () => {
      expect(escapeAttrValue('test"quote')).toBe('test&quot;quote');
    });

    test('escapes angle brackets', () => {
      expect(escapeAttrValue('<script>')).toBe('&lt;script&gt;');
    });

    test('returns empty string for non-string/number/boolean', () => {
      expect(escapeAttrValue({} as any)).toBe('');
      expect(escapeAttrValue([] as any)).toBe('');
    });

    test('handles numbers', () => {
      expect(escapeAttrValue(42)).toBe('42');
    });

    test('handles booleans', () => {
      expect(escapeAttrValue(true)).toBe('true');
    });
  });

  describe('toEncodedText', () => {
    test('encodes all special characters', () => {
      expect(toEncodedText('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    });

    test('converts newlines to br tags', () => {
      expect(toEncodedText('line1\nline2')).toBe('line1<br />line2');
    });

    test('returns empty string for null', () => {
      expect(toEncodedText(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(toEncodedText(undefined)).toBe('');
    });
  });

  describe('skipHopByHopHeaders', () => {
    test('removes hop-by-hop headers', () => {
      const headers = new Headers({
        'connection': 'keep-alive',
        'content-type': 'application/json',
      });
      const filtered = skipHopByHopHeaders(headers);
      expect(filtered.has('connection')).toBe(false);
      expect(filtered.has('content-type')).toBe(true);
    });
  });

  describe('skipLayrHeaders', () => {
    test('removes x-layr headers', () => {
      const headers = new Headers({
        'x-layr-url': 'https://example.com',
        'content-type': 'application/json',
      });
      const filtered = skipLayrHeaders(headers);
      expect(filtered.has('x-layr-url')).toBe(false);
      expect(filtered.has('content-type')).toBe(true);
    });
  });

  describe('skipCookieHeader', () => {
    test('removes cookie header', () => {
      const headers = new Headers({
        'cookie': 'session=abc',
        'content-type': 'application/json',
      });
      const filtered = skipCookieHeader(headers);
      expect(filtered.has('cookie')).toBe(false);
      expect(filtered.has('content-type')).toBe(true);
    });
  });

  describe('filterProxyResponseHeaders', () => {
    test('only keeps allowed headers', () => {
      const headers = new Headers({
        'content-type': 'application/json',
        'cache-control': 'max-age=3600',
        'x-custom': 'value',
      });
      const filtered = filterProxyResponseHeaders(headers);
      expect(filtered.has('content-type')).toBe(true);
      expect(filtered.has('cache-control')).toBe(true);
      expect(filtered.has('x-custom')).toBe(false);
    });
  });

  describe('sanitizeProxyHeaders', () => {
    test('applies all filters', () => {
      const headers = new Headers({
        'connection': 'keep-alive',
        'cookie': 'session=abc',
        'x-layr-url': 'https://example.com',
        'authorization': 'Bearer token',
      });
      const filtered = sanitizeProxyHeaders(headers);
      expect(filtered.has('connection')).toBe(false);
      expect(filtered.has('cookie')).toBe(false);
      expect(filtered.has('x-layr-url')).toBe(false);
      expect(filtered.has('authorization')).toBe(true);
    });
  });

  describe('validateUrl', () => {
    test('validates absolute URLs', () => {
      const result = validateUrl({ path: 'https://example.com/path' });
      expect(result).not.toBe(false);
      expect((result as URL).href).toBe('https://example.com/path');
    });

    test('validates relative URLs with origin', () => {
      const result = validateUrl({ path: '/path', origin: 'https://example.com' });
      expect(result).not.toBe(false);
      expect((result as URL).href).toBe('https://example.com/path');
    });

    test('returns false for invalid URLs', () => {
      expect(validateUrl({ path: null })).toBe(false);
      expect(validateUrl({ path: undefined })).toBe(false);
    });

    test('returns false for non-string path', () => {
      expect(validateUrl({ path: 123 as any })).toBe(false);
    });
  });

  describe('isLocalhostUrl', () => {
    test('returns true for localhost URLs', () => {
      expect(isLocalhostUrl('http://localhost:54404/page')).toBe(true);
      expect(isLocalhostUrl('http://preview.localhost:54404/page')).toBe(true);
    });

    test('returns false for non-localhost URLs', () => {
      expect(isLocalhostUrl('https://example.com')).toBe(false);
    });
  });

  describe('isLocalhostHostname', () => {
    test('returns true for localhost', () => {
      expect(isLocalhostHostname('localhost')).toBe(true);
      expect(isLocalhostHostname('127.0.0.1')).toBe(true);
    });

    test('returns false for other hostnames', () => {
      expect(isLocalhostHostname('example.com')).toBe(false);
    });
  });

  describe('applyTemplateValues', () => {
    test('substitutes cookie templates', () => {
      const input = 'Token: {{ cookies.token }}';
      const cookies = { token: 'abc123' };
      expect(applyTemplateValues(input, cookies)).toBe('Token: abc123');
    });

    test('substitutes multiple templates', () => {
      const input = '{{ cookies.a }} and {{ cookies.b }}';
      const cookies = { a: '1', b: '2' };
      expect(applyTemplateValues(input, cookies)).toBe('1 and 2');
    });

    test('replaces missing cookies with empty string', () => {
      const input = 'Value: {{ cookies.missing }}';
      expect(applyTemplateValues(input, {})).toBe('Value: ');
    });

    test('handles null input', () => {
      expect(applyTemplateValues(null, {})).toBe('');
    });
  });

  describe('mapTemplateHeaders', () => {
    test('maps templates in header values', () => {
      const headers = new Headers({
        'authorization': 'Bearer {{ cookies.token }}',
      });
      const cookies = { token: 'abc123' };
      const mapped = mapTemplateHeaders(headers, cookies);
      expect(mapped.get('authorization')).toBe('Bearer abc123');
    });
  });

  describe('escapeScriptTags', () => {
    test('escapes closing script tags', () => {
      expect(escapeScriptTags('</script>')).toBe('<\\/script>');
    });

    test('escapes multiple script tags', () => {
      expect(escapeScriptTags('</script><script>')).toBe('<\\/script><script>');
    });
  });

  describe('isCloudflareImagePath', () => {
    test('returns true for Cloudflare image paths', () => {
      expect(isCloudflareImagePath('/cdn-cgi/imagedelivery/abc/123/public')).toBe(true);
    });

    test('returns false for non-Cloudflare paths', () => {
      expect(isCloudflareImagePath('/images/photo.jpg')).toBe(false);
    });

    test('returns false for null', () => {
      expect(isCloudflareImagePath(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isCloudflareImagePath(undefined)).toBe(false);
    });
  });

  describe('Header Constants', () => {
    test('PROXY_URL_HEADER is defined', () => {
      expect(PROXY_URL_HEADER).toBe('x-layr-url');
    });

    test('PROXY_TEMPLATES_IN_BODY is defined', () => {
      expect(PROXY_TEMPLATES_IN_BODY).toBe('x-layr-templates-in-body');
    });
  });
});
