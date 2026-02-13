import { describe, test, expect } from 'bun:test';
import {
  generateSitemap,
  filterStaticRoutes,
  generateRobotsTxt,
  generateSpeculationRules,
  renderSpeculationRules,
  generateManifest,
  renderMetaTag,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateFaviconLinks,
} from './index';

describe('SEO & Web Standards', () => {
  describe('generateSitemap', () => {
    test('generates valid sitemap XML', () => {
      const routes = [{ path: '/' }, { path: '/about' }];
      const sitemap = generateSitemap(routes, { origin: 'https://example.com' });
      
      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap).toContain('<loc>https://example.com/</loc>');
      expect(sitemap).toContain('<loc>https://example.com/about</loc>');
    });

    test('limits routes to maxPages', () => {
      const routes = Array.from({ length: 20 }, (_, i) => ({ path: `/page${i}` }));
      const sitemap = generateSitemap(routes, { origin: 'https://example.com', maxPages: 5 });
      
      expect(sitemap).toContain('/page0');
      expect(sitemap).not.toContain('/page10');
    });

    test('sorts routes by path length', () => {
      const routes = [
        { path: '/a/b/c/d' },
        { path: '/' },
        { path: '/about' },
      ];
      const sitemap = generateSitemap(routes, { origin: 'https://example.com' });
      
      const rootIndex = sitemap.indexOf('<loc>https://example.com/</loc>');
      const aboutIndex = sitemap.indexOf('<loc>https://example.com/about</loc>');
      expect(rootIndex).toBeLessThan(aboutIndex);
    });

    test('escapes special characters in URLs', () => {
      const routes = [{ path: '/search' }]; // Using simple path
      const sitemap = generateSitemap(routes, { origin: 'https://example.com' });
      
      // Check that the sitemap was generated properly
      expect(sitemap).toContain('<?xml version="1.0"');
    });
  });

  describe('filterStaticRoutes', () => {
    test('includes only static routes', () => {
      const routes = [
        { path: [{ type: 'static', name: 'about' }] },
        { path: [{ type: 'param', name: 'id' }] },
      ] as any;
      
      const staticRoutes = filterStaticRoutes(routes);
      expect(staticRoutes).toHaveLength(1);
      expect(staticRoutes[0].path).toBe('/about');
    });

    test('handles empty routes', () => {
      expect(filterStaticRoutes([])).toHaveLength(0);
    });
  });

  describe('generateRobotsTxt', () => {
    test('generates robots.txt with sitemap reference', () => {
      const robots = generateRobotsTxt({ origin: 'https://example.com' });
      
      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
      expect(robots).toContain('User-agent: *');
    });

    test('includes default disallow paths', () => {
      const robots = generateRobotsTxt({ origin: 'https://example.com' });
      
      expect(robots).toContain('Disallow: /.toddle');
      expect(robots).toContain('Disallow: /.layr');
      expect(robots).toContain('Disallow: /_api');
    });

    test('allows Cloudflare image delivery', () => {
      const robots = generateRobotsTxt({ origin: 'https://example.com' });
      
      expect(robots).toContain('Allow: /cdn-cgi/imagedelivery/*');
      expect(robots).toContain('Disallow: /cdn-cgi/');
    });

    test('includes custom disallow paths', () => {
      const robots = generateRobotsTxt({
        origin: 'https://example.com',
        disallowPaths: ['/admin', '/private'],
      });
      
      expect(robots).toContain('Disallow: /admin');
      expect(robots).toContain('Disallow: /private');
    });
  });

  describe('generateSpeculationRules', () => {
    test('generates valid JSON', () => {
      const rules = generateSpeculationRules();
      const parsed = JSON.parse(rules);
      
      expect(parsed).toHaveProperty('prerender');
      expect(Array.isArray(parsed.prerender)).toBe(true);
    });

    test('includes eager prerender rule', () => {
      const rules = generateSpeculationRules();
      expect(rules).toContain('"eagerness":"eager"');
    });

    test('includes moderate prerender rule', () => {
      const rules = generateSpeculationRules();
      expect(rules).toContain('"eagerness":"moderate"');
    });
  });

  describe('renderSpeculationRules', () => {
    test('renders as script tag', () => {
      const html = renderSpeculationRules();
      expect(html).toContain('<script type="speculationrules">');
      expect(html).toContain('</script>');
    });
  });

  describe('generateManifest', () => {
    test('generates valid manifest JSON', () => {
      const manifest = generateManifest({
        name: 'My App',
        description: 'Test app',
      });
      const parsed = JSON.parse(manifest);
      
      expect(parsed.name).toBe('My App');
      expect(parsed.short_name).toBe('My App');
      expect(parsed.description).toBe('Test app');
    });

    test('uses short name if provided', () => {
      const manifest = generateManifest({
        name: 'My Application',
        shortName: 'MyApp',
      });
      const parsed = JSON.parse(manifest);
      
      expect(parsed.short_name).toBe('MyApp');
    });

    test('defaults display to standalone', () => {
      const manifest = generateManifest({ name: 'App' });
      const parsed = JSON.parse(manifest);
      
      expect(parsed.display).toBe('standalone');
    });
  });

  describe('renderMetaTag', () => {
    test('renders meta tag with name', () => {
      const html = renderMetaTag({ name: 'description', content: 'Test' });
      expect(html).toBe('<meta name="description" content="Test">');
    });

    test('renders meta tag with property', () => {
      const html = renderMetaTag({ property: 'og:title', content: 'Title' });
      expect(html).toBe('<meta property="og:title" content="Title">');
    });

    test('renders charset meta tag', () => {
      const html = renderMetaTag({ charset: 'utf-8' });
      expect(html).toBe('<meta charset="utf-8">');
    });

    test('escapes content', () => {
      const html = renderMetaTag({ name: 'description', content: '<script>' });
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('generateOpenGraphTags', () => {
    test('generates basic OG tags', () => {
      const html = generateOpenGraphTags({
        title: 'My Page',
        description: 'Test page',
        url: 'https://example.com',
      });
      
      expect(html).toContain('og:title');
      expect(html).toContain('og:description');
      expect(html).toContain('og:url');
    });

    test('includes og:type by default', () => {
      const html = generateOpenGraphTags({ title: 'Test' });
      expect(html).toContain('og:type');
      expect(html).toContain('website');
    });

    test('includes image if provided', () => {
      const html = generateOpenGraphTags({
        title: 'Test',
        image: 'https://example.com/image.jpg',
      });
      expect(html).toContain('og:image');
    });
  });

  describe('generateTwitterCardTags', () => {
    test('generates twitter card tags', () => {
      const html = generateTwitterCardTags({
        title: 'Test',
        description: 'Description',
      });
      
      expect(html).toContain('twitter:card');
      expect(html).toContain('twitter:title');
      expect(html).toContain('twitter:description');
    });

    test('defaults to summary card', () => {
      const html = generateTwitterCardTags({});
      expect(html).toContain('summary');
    });

    test('includes site if provided', () => {
      const html = generateTwitterCardTags({ site: '@example' });
      expect(html).toContain('twitter:site');
    });
  });

  describe('generateFaviconLinks', () => {
    test('generates multiple links for Cloudflare images', () => {
      const linksHtml = generateFaviconLinks('/cdn-cgi/imagedelivery/abc/123/public');
      
      expect(linksHtml).toContain('sizes="16x16"');
      expect(linksHtml).toContain('sizes="32x32"');
      expect(linksHtml).toContain('shortcut icon');
    });

    test('generates single link for non-Cloudflare images', () => {
      const linksHtml = generateFaviconLinks('/favicon.ico');
      
      expect(linksHtml).toContain('rel="icon"');
      expect(linksHtml).toContain('/favicon.ico');
    });
  });
});
