import { describe, test, expect } from 'bun:test';
import {
  isCloudflareImagePath,
  generateIconUrls,
  generateFaviconTags,
  generateThumbnailUrl,
  transformRelativePaths,
  getCloudflareRobotsRules,
  buildCloudflareImageUrl,
  parseCloudflareImageUrl,
  isCloudflareImageUrl,
  getImageVariant,
  setImageVariant,
  IMAGE_VARIANTS,
} from './index';
import type { Component } from '@layr/types';

describe('Image CDN Management', () => {
  describe('isCloudflareImagePath', () => {
    test('returns true for Cloudflare image paths', () => {
      expect(isCloudflareImagePath('/cdn-cgi/imagedelivery/abc/123/public')).toBe(true);
    });

    test('returns false for non-Cloudflare paths', () => {
      expect(isCloudflareImagePath('/images/photo.jpg')).toBe(false);
      expect(isCloudflareImagePath('https://example.com/image.jpg')).toBe(false);
    });

    test('returns false for null', () => {
      expect(isCloudflareImagePath(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isCloudflareImagePath(undefined)).toBe(false);
    });
  });

  describe('generateIconUrls', () => {
    test('generates URLs for Cloudflare images', () => {
      const urls = generateIconUrls('/cdn-cgi/imagedelivery/abc/123/public');
      
      expect(urls).not.toBeNull();
      expect(urls?.icon16).toBe('/cdn-cgi/imagedelivery/abc/123/16');
      expect(urls?.icon32).toBe('/cdn-cgi/imagedelivery/abc/123/32');
      expect(urls?.icon48).toBe('/cdn-cgi/imagedelivery/abc/123/48');
    });

    test('returns null for non-Cloudflare images', () => {
      expect(generateIconUrls('/images/icon.png')).toBeNull();
    });
  });

  describe('generateFaviconTags', () => {
    test('generates multiple tags for Cloudflare images', () => {
      const tags = generateFaviconTags('/cdn-cgi/imagedelivery/abc/123/public');
      
      expect(tags).toHaveLength(3);
      expect(tags[0]).toContain('sizes="16x16"');
      expect(tags[1]).toContain('sizes="32x32"');
      expect(tags[2]).toContain('shortcut icon');
    });

    test('generates single tag for non-Cloudflare images', () => {
      const tags = generateFaviconTags('/favicon.ico');
      
      expect(tags).toHaveLength(1);
      expect(tags[0]).toContain('rel="icon"');
    });

    test('includes origin in URL', () => {
      const tags = generateFaviconTags('/favicon.ico', 'https://example.com');
      expect(tags[0]).toContain('https://example.com/favicon.ico');
    });
  });

  describe('generateThumbnailUrl', () => {
    test('generates thumbnail for Cloudflare images', () => {
      const url = generateThumbnailUrl('/cdn-cgi/imagedelivery/abc/123/public');
      expect(url).toBe('/cdn-cgi/imagedelivery/abc/123/256');
    });

    test('returns original path for non-Cloudflare images', () => {
      const url = generateThumbnailUrl('/images/photo.jpg');
      expect(url).toBe('/images/photo.jpg');
    });

    test('returns null for null path', () => {
      expect(generateThumbnailUrl(null)).toBeNull();
    });

    test('includes origin for Cloudflare images', () => {
      const url = generateThumbnailUrl(
        '/cdn-cgi/imagedelivery/abc/123/public',
        'https://example.com'
      );
      expect(url).toBe('https://example.com/cdn-cgi/imagedelivery/abc/123/256');
    });
  });

  describe('transformRelativePaths', () => {
    test('transforms relative src to absolute', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: {
            id: 'root',
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              src: { type: 'value', value: '/images/photo.jpg' },
            },
          },
        },
      };
      
      const transform = transformRelativePaths('https://example.com');
      const result = transform(component);
      
      const imgNode = result.nodes.root as any;
      expect(imgNode.attrs.src.value).toBe('https://example.com/images/photo.jpg');
    });

    test('does not transform absolute URLs', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: {
            id: 'root',
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              src: { type: 'value', value: 'https://other.com/image.jpg' },
            },
          },
        },
      };
      
      const transform = transformRelativePaths('https://example.com');
      const result = transform(component);
      
      const imgNode = result.nodes.root as any;
      expect(imgNode.attrs.src.value).toBe('https://other.com/image.jpg');
    });

    test('does not transform data URLs', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: {
            id: 'root',
            type: 'element',
            tag: 'img',
            children: [],
            attrs: {
              src: { type: 'value', value: 'data:image/png;base64,abc' },
            },
          },
        },
      };
      
      const transform = transformRelativePaths('https://example.com');
      const result = transform(component);
      
      const imgNode = result.nodes.root as any;
      expect(imgNode.attrs.src.value).toBe('data:image/png;base64,abc');
    });

    test('does not transform non-src attributes', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: {
            id: 'root',
            type: 'element',
            tag: 'a',
            children: [],
            attrs: {
              href: { type: 'value', value: '/page' },
            },
          },
        },
      };
      
      const transform = transformRelativePaths('https://example.com');
      const result = transform(component);
      
      const aNode = result.nodes.root as any;
      expect(aNode.attrs.href.value).toBe('/page');
    });
  });

  describe('getCloudflareRobotsRules', () => {
    test('returns allow rule for images', () => {
      const rules = getCloudflareRobotsRules();
      
      expect(rules).toContain('Allow: /cdn-cgi/imagedelivery/*');
    });

    test('returns disallow rule for CDN', () => {
      const rules = getCloudflareRobotsRules();
      
      expect(rules).toContain('Disallow: /cdn-cgi/');
    });
  });

  describe('buildCloudflareImageUrl', () => {
    test('builds URL from components', () => {
      const url = buildCloudflareImageUrl('abc123', 'img456', 'public');
      expect(url).toBe('/cdn-cgi/imagedelivery/abc123/img456/public');
    });

    test('defaults variant to public', () => {
      const url = buildCloudflareImageUrl('abc123', 'img456');
      expect(url).toBe('/cdn-cgi/imagedelivery/abc123/img456/public');
    });
  });

  describe('parseCloudflareImageUrl', () => {
    test('parses Cloudflare URL', () => {
      const parsed = parseCloudflareImageUrl('/cdn-cgi/imagedelivery/abc/123/public');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.accountHash).toBe('abc');
      expect(parsed?.imageId).toBe('123');
      expect(parsed?.variant).toBe('public');
    });

    test('returns null for non-Cloudflare URLs', () => {
      expect(parseCloudflareImageUrl('/images/photo.jpg')).toBeNull();
    });

    test('returns null for malformed URLs', () => {
      expect(parseCloudflareImageUrl('/cdn-cgi/imagedelivery/abc')).toBeNull();
    });
  });

  describe('isCloudflareImageUrl', () => {
    test('is alias for isCloudflareImagePath', () => {
      expect(isCloudflareImageUrl('/cdn-cgi/imagedelivery/abc/123/public')).toBe(true);
      expect(isCloudflareImageUrl('/images/photo.jpg')).toBe(false);
    });
  });

  describe('getImageVariant', () => {
    test('extracts variant from URL', () => {
      expect(getImageVariant('/cdn-cgi/imagedelivery/abc/123/public')).toBe('public');
      expect(getImageVariant('/cdn-cgi/imagedelivery/abc/123/256')).toBe('256');
    });

    test('returns null for non-Cloudflare URLs', () => {
      expect(getImageVariant('/images/photo.jpg')).toBeNull();
    });
  });

  describe('setImageVariant', () => {
    test('changes variant in URL', () => {
      const url = setImageVariant('/cdn-cgi/imagedelivery/abc/123/public', '256');
      expect(url).toBe('/cdn-cgi/imagedelivery/abc/123/256');
    });

    test('returns null for non-Cloudflare URLs', () => {
      expect(setImageVariant('/images/photo.jpg', '256')).toBeNull();
    });
  });

  describe('IMAGE_VARIANTS', () => {
    test('has expected variant constants', () => {
      expect(IMAGE_VARIANTS.THUMBNAIL).toBe('256');
      expect(IMAGE_VARIANTS.ICON_SMALL).toBe('16');
      expect(IMAGE_VARIANTS.ICON_MEDIUM).toBe('32');
      expect(IMAGE_VARIANTS.ICON_LARGE).toBe('48');
      expect(IMAGE_VARIANTS.SMALL).toBe('320');
      expect(IMAGE_VARIANTS.MEDIUM).toBe('640');
      expect(IMAGE_VARIANTS.LARGE).toBe('1024');
      expect(IMAGE_VARIANTS.PUBLIC).toBe('public');
    });
  });
});
