/**
 * SEO & Web Standards Endpoints
 * Based on specs/seo-web-standards.md
 * 
 * Provides sitemap generation, robots.txt, speculation rules, and meta tag utilities.
 */

// ============================================================================
// Sitemap Generation
// ============================================================================

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapOptions {
  origin: string;
  maxPages?: number;
}

/**
 * Generate sitemap XML from route list.
 */
export function generateSitemap(
  routes: Array<{ path: string }>,
  options: SitemapOptions
): string {
  const { origin, maxPages = 1000 } = options;
  
  // Limit pages
  const limitedRoutes = routes.slice(0, maxPages);
  
  // Sort by path length (shortest first)
  limitedRoutes.sort((a, b) => a.path.length - b.path.length);
  
  const urls = limitedRoutes.map(route => {
    const loc = `${origin}${route.path}`;
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Filter routes to only include static paths.
 */
export function filterStaticRoutes(
  routes: Array<{
    path: Array<{ type: 'static' | 'param'; name: string }>;
  }>
): Array<{ path: string }> {
  const staticRoutes: Array<{ path: string }> = [];
  
  for (const route of routes) {
    // Check if all path segments are static
    const isStatic = route.path.every(segment => segment.type === 'static');
    
    if (isStatic) {
      const path = '/' + route.path.map(s => s.name).join('/');
      staticRoutes.push({ path });
    }
  }
  
  return staticRoutes;
}

// ============================================================================
// Robots.txt Generation
// ============================================================================

export interface RobotsTxtOptions {
  origin: string;
  disallowPaths?: string[];
  allowPaths?: string[];
}

/**
 * Generate robots.txt content.
 */
export function generateRobotsTxt(options: RobotsTxtOptions): string {
  const { origin, disallowPaths = [], allowPaths = [] } = options;
  
  const lines: string[] = [
    `Sitemap: ${origin}/sitemap.xml`,
    '',
    'User-agent: *',
  ];
  
  // Default disallow paths
  const defaultDisallow = [
    '/_toddle',
    '/_toddle/',
    '/.toddle',
    '/.toddle/',
    '/.layr',
    '/.layr/',
    '/_api',
    '/_api/',
  ];
  
  const allDisallow = [...defaultDisallow, ...disallowPaths];
  
  // Add disallow rules
  for (const path of allDisallow) {
    lines.push(`Disallow: ${path}`);
  }
  
  // Add allow rules (Cloudflare images by default)
  const defaultAllow = ['/cdn-cgi/imagedelivery/*'];
  const allAllow = [...defaultAllow, ...allowPaths];
  
  for (const path of allAllow) {
    lines.push(`Allow: ${path}`);
  }
  
  // Additional disallow after allow
  lines.push('Disallow: /cdn-cgi/');
  
  return lines.join('\n');
}

// ============================================================================
// Speculation Rules
// ============================================================================

export interface SpeculationRule {
  source: 'document';
  where: {
    selector_matches?: string;
    href_matches?: string;
  };
  eagerness: 'eager' | 'moderate' | 'conservative';
}

/**
 * Generate speculation rules for prerendering.
 */
export function generateSpeculationRules(): string {
  const rules: SpeculationRule[] = [
    {
      source: 'document',
      where: { selector_matches: '[data-prerender="eager"]' },
      eagerness: 'eager',
    },
    {
      source: 'document',
      where: { selector_matches: '[data-prerender="moderate"]' },
      eagerness: 'moderate',
    },
  ];
  
  return JSON.stringify({ prerender: rules });
}

/**
 * Render speculation rules as script tag.
 */
export function renderSpeculationRules(): string {
  const rules = generateSpeculationRules();
  return `<script type="speculationrules">${rules}</script>`;
}

// ============================================================================
// Web App Manifest
// ============================================================================

export interface ManifestOptions {
  name: string;
  shortName?: string;
  description?: string;
  startUrl?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  backgroundColor?: string;
  themeColor?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

/**
 * Generate web app manifest JSON.
 */
export function generateManifest(options: ManifestOptions): string {
  const manifest = {
    name: options.name,
    short_name: options.shortName ?? options.name,
    description: options.description,
    start_url: options.startUrl ?? '/',
    display: options.display ?? 'standalone',
    background_color: options.backgroundColor ?? '#ffffff',
    theme_color: options.themeColor ?? '#000000',
    icons: options.icons ?? [],
  };
  
  return JSON.stringify(manifest, null, 2);
}

// ============================================================================
// Meta Tag Utilities
// ============================================================================

export interface MetaTag {
  name?: string;
  property?: string;
  content?: string;
  charset?: string;
  httpEquiv?: string;
}

/**
 * Render a meta tag to HTML.
 */
export function renderMetaTag(tag: MetaTag): string {
  const attrs: string[] = [];
  
  if (tag.name) attrs.push(`name="${escapeAttr(tag.name)}"`);
  if (tag.property) attrs.push(`property="${escapeAttr(tag.property)}"`);
  if (tag.content) attrs.push(`content="${escapeAttr(tag.content)}"`);
  if (tag.charset) attrs.push(`charset="${escapeAttr(tag.charset)}"`);
  if (tag.httpEquiv) attrs.push(`http-equiv="${escapeAttr(tag.httpEquiv)}"`);
  
  return `<meta ${attrs.join(' ')}>`;
}

/**
 * Generate Open Graph meta tags.
 */
export function generateOpenGraphTags(options: {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  siteName?: string;
}): string {
  const tags: MetaTag[] = [
    { property: 'og:title', content: options.title },
  ];
  
  if (options.description) {
    tags.push({ property: 'og:description', content: options.description });
  }
  
  if (options.url) {
    tags.push({ property: 'og:url', content: options.url });
  }
  
  if (options.image) {
    tags.push({ property: 'og:image', content: options.image });
  }
  
  if (options.type) {
    tags.push({ property: 'og:type', content: options.type });
  } else {
    tags.push({ property: 'og:type', content: 'website' });
  }
  
  if (options.siteName) {
    tags.push({ property: 'og:site_name', content: options.siteName });
  }
  
  return tags.map(renderMetaTag).join('\n');
}

/**
 * Generate Twitter Card meta tags.
 */
export function generateTwitterCardTags(options: {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  title?: string;
  description?: string;
  image?: string;
}): string {
  const tags: MetaTag[] = [
    { name: 'twitter:card', content: options.card ?? 'summary' },
  ];
  
  if (options.site) {
    tags.push({ name: 'twitter:site', content: options.site });
  }
  
  if (options.title) {
    tags.push({ name: 'twitter:title', content: options.title });
  }
  
  if (options.description) {
    tags.push({ name: 'twitter:description', content: options.description });
  }
  
  if (options.image) {
    tags.push({ name: 'twitter:image', content: options.image });
  }
  
  return tags.map(renderMetaTag).join('\n');
}

// ============================================================================
// Favicon Utilities
// ============================================================================

export interface FaviconLink {
  rel: string;
  type?: string;
  sizes?: string;
  href: string;
}

/**
 * Generate favicon link tags.
 */
export function generateFaviconLinks(iconPath: string): string {
  // Check if it's a Cloudflare image
  const isCloudflare = iconPath.startsWith('/cdn-cgi/imagedelivery/');
  
  if (isCloudflare) {
    // Extract base path
    const parts = iconPath.split('/');
    parts.pop(); // Remove variant
    const basePath = parts.join('/');
    
    return [
      `<link rel="icon" sizes="16x16" href="${basePath}/16" />`,
      `<link rel="icon" sizes="32x32" href="${basePath}/32" />`,
      `<link rel="shortcut icon" href="${basePath}/48" />`,
    ].join('\n');
  }
  
  return `<link rel="icon" href="${escapeAttr(iconPath)}" />`;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape HTML attribute value.
 */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
