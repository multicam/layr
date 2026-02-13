export { renderPageBody } from './render/page';
export { splitRoutes } from './split/routes';
export { getHeadItems, renderHeadItems } from './render/head';

// Security and sanitization
export {
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
  REWRITE_HEADER,
  REDIRECT_API_NAME_HEADER,
  REDIRECT_COMPONENT_NAME_HEADER,
  REDIRECT_NAME_HEADER,
} from './security';

// SEO & Web Standards
export {
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
} from './seo';

// Font System
export {
  getFontCssUrl,
  generateFontFace,
  renderFontLink,
  rewriteFontCss,
  getGoogleFontsUrl,
  getGoogleFontsFileUrl,
  getFontDisplay,
  isSystemFont,
  generateThemeFontVars,
  filterLoadableFonts,
} from './fonts';

export type { HeadItem } from './render/head';
export type { SitemapUrl, SitemapOptions, RobotsTxtOptions, ManifestOptions, MetaTag } from './seo';
export type { FontFamily, FontVariant, FontCssOptions, ThemeFonts, FontDisplay } from './fonts';
