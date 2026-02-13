/**
 * Image & CDN Management
 * Based on specs/image-cdn-management.md
 * 
 * Handles Cloudflare Image Delivery integration and URL transformations.
 */

import type { Component, ElementNodeModel } from '@layr/types';

// ============================================================================
// Cloudflare Image Detection
// ============================================================================

/**
 * Check if a path is a Cloudflare image path.
 */
export function isCloudflareImagePath(path: string | null | undefined): path is string {
  if (typeof path !== 'string') return false;
  return path.startsWith('/cdn-cgi/imagedelivery/');
}

// ============================================================================
// Responsive Icon Generation
// ============================================================================

/**
 * Generate responsive icon URLs from a Cloudflare image.
 */
export function generateIconUrls(iconPath: string): {
  icon16: string;
  icon32: string;
  icon48: string;
} | null {
  if (!isCloudflareImagePath(iconPath)) return null;
  
  // Extract base path by removing the variant (last segment)
  const parts = iconPath.split('/');
  parts.pop(); // Remove variant
  const basePath = parts.join('/');
  
  return {
    icon16: `${basePath}/16`,
    icon32: `${basePath}/32`,
    icon48: `${basePath}/48`,
  };
}

/**
 * Generate favicon link tags from an icon path.
 */
export function generateFaviconTags(iconPath: string, origin?: string): string[] {
  const absolutePath = origin && !iconPath.startsWith('http')
    ? `${origin}${iconPath}`
    : iconPath;
  
  if (isCloudflareImagePath(iconPath)) {
    const urls = generateIconUrls(iconPath);
    if (!urls) return [];
    
    return [
      `<link rel="icon" sizes="16x16" href="${urls.icon16}" />`,
      `<link rel="icon" sizes="32x32" href="${urls.icon32}" />`,
      `<link rel="shortcut icon" href="${urls.icon48}" />`,
    ];
  }
  
  return [`<link rel="icon" href="${absolutePath}" />`];
}

// ============================================================================
// Thumbnail Generation
// ============================================================================

/**
 * Generate a thumbnail URL for og:image.
 */
export function generateThumbnailUrl(
  thumbnailPath: string | null | undefined,
  origin?: string
): string | null {
  if (!thumbnailPath) return null;
  
  const absolutePath = origin && !thumbnailPath.startsWith('http')
    ? `${origin}${thumbnailPath}`
    : thumbnailPath;
  
  if (isCloudflareImagePath(thumbnailPath)) {
    // Append /256 for thumbnail variant
    const parts = thumbnailPath.split('/');
    parts.pop(); // Remove current variant
    const basePath = parts.join('/');
    const thumbnailUrl = `${basePath}/256`;
    
    return origin ? `${origin}${thumbnailUrl}` : thumbnailUrl;
  }
  
  return absolutePath;
}

// ============================================================================
// Relative Path Transformation
// ============================================================================

/**
 * Transform relative src paths to absolute URLs.
 */
export function transformRelativePaths(urlOrigin: string): (component: Component) => Component {
  return (component: Component) => {
    if (!component.nodes) return component;
    
    const newNodes = { ...component.nodes };
    
    for (const [nodeId, node] of Object.entries(newNodes)) {
      if (node.type === 'element') {
        const elemNode = node as ElementNodeModel;
        
        if (elemNode.attrs) {
          const newAttrs = { ...elemNode.attrs };
          
          for (const [attrName, attrValue] of Object.entries(newAttrs)) {
            if (attrName === 'src' && attrValue && attrValue.type === 'value') {
              const value = attrValue.value;
              if (typeof value === 'string' && !value.startsWith('http') && !value.startsWith('data:')) {
                // Resolve relative URL
                try {
                  const absoluteUrl = new URL(value, urlOrigin).href;
                  newAttrs[attrName] = { type: 'value', value: absoluteUrl };
                } catch {
                  // Keep original value on error
                }
              }
            }
          }
          
          newNodes[nodeId] = { ...elemNode, attrs: newAttrs };
        }
      }
    }
    
    return { ...component, nodes: newNodes };
  };
}

// ============================================================================
// Robots.txt Integration
// ============================================================================

/**
 * Get Cloudflare-specific robots.txt rules.
 */
export function getCloudflareRobotsRules(): string[] {
  return [
    'Allow: /cdn-cgi/imagedelivery/*',
    'Disallow: /cdn-cgi/',
  ];
}

// ============================================================================
// Image URL Utilities
// ============================================================================

/**
 * Build a Cloudflare image URL.
 */
export function buildCloudflareImageUrl(
  accountHash: string,
  imageId: string,
  variant: string = 'public'
): string {
  return `/cdn-cgi/imagedelivery/${accountHash}/${imageId}/${variant}`;
}

/**
 * Parse a Cloudflare image URL into components.
 */
export function parseCloudflareImageUrl(
  url: string
): { accountHash: string; imageId: string; variant: string } | null {
  if (!isCloudflareImageUrl(url)) return null;
  
  const parts = url.replace('/cdn-cgi/imagedelivery/', '').split('/');
  
  if (parts.length < 3) return null;
  
  return {
    accountHash: parts[0],
    imageId: parts[1],
    variant: parts[2],
  };
}

/**
 * Check if URL is a Cloudflare image URL (alias for consistency).
 */
export function isCloudflareImageUrl(url: string): boolean {
  return isCloudflareImagePath(url);
}

/**
 * Get image variant from Cloudflare URL.
 */
export function getImageVariant(url: string): string | null {
  const parsed = parseCloudflareImageUrl(url);
  return parsed?.variant ?? null;
}

/**
 * Set image variant on Cloudflare URL.
 */
export function setImageVariant(url: string, variant: string): string | null {
  if (!isCloudflareImagePath(url)) return null;
  
  const parts = url.split('/');
  parts.pop(); // Remove current variant
  parts.push(variant);
  
  return parts.join('/');
}

// ============================================================================
// Image Size Constants
// ============================================================================

export const IMAGE_VARIANTS = {
  THUMBNAIL: '256',
  ICON_SMALL: '16',
  ICON_MEDIUM: '32',
  ICON_LARGE: '48',
  SMALL: '320',
  MEDIUM: '640',
  LARGE: '1024',
  PUBLIC: 'public',
} as const;

export type ImageVariant = typeof IMAGE_VARIANTS[keyof typeof IMAGE_VARIANTS];
