import type { Context } from 'hono';
import { loadProject } from '../loader/project';
import type { Project } from '@layr/types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface PageRouteParams {
  projectId: string;
}

/**
 * Match a route to a page in the project
 */
function matchRoute(project: Project, pathname: string): { page: string; params: Record<string, string | null> } | null {
  const pages = Object.values(project.files?.components || {})
    .filter((c): c is NonNullable<typeof c> & { route: NonNullable<typeof c.route> } => c != null && c.route != null);
  
  for (const page of pages) {
    const route = page.route;
    const result = matchPath(route.path, pathname);
    if (result) {
      return { page: page.name, params: result.params };
    }
  }
  
  return null;
}

/**
 * Match a path pattern against a pathname
 */
export function matchPath(pattern: string, pathname: string): { params: Record<string, string | null> } | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  const params: Record<string, string | null> = {};

  // Catch-all wildcard: /docs/* matches /docs/guide/intro
  if (patternParts[patternParts.length - 1] === '*') {
    if (pathParts.length < patternParts.length - 1) return null;
    for (let i = 0; i < patternParts.length - 1; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        return null;
      }
    }
    params['*'] = pathParts.slice(patternParts.length - 1).join('/');
    return { params };
  }

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return { params };
}

/**
 * Handle page requests
 */
export async function handlePage(c: Context, projectId: string): Promise<Response> {
  const loaded = loadProject(projectId);
  
  if (!loaded) {
    return c.html('<html><body><h1>Project not found</h1></body></html>', 404);
  }
  
  // Strip the /:projectId prefix to get the page path
  const fullPath = c.req.path;
  const pathname = fullPath.replace(`/${projectId}`, '') || '/';
  const match = matchRoute(loaded.project, pathname);
  
  if (!match) {
    // Try 404 page
    const notFoundMatch = matchRoute(loaded.project, '/404');
    if (notFoundMatch) {
      return c.html(renderPage(loaded.project, '404', {}), 404);
    }
    return c.html('<html><body><h1>Not found</h1></body></html>', 404);
  }
  
  const html = renderPage(loaded.project, match.page, match.params);
  return c.html(html);
}

/**
 * Render a page to HTML (placeholder for SSR)
 */
function renderPage(project: Project, pageName: string, params: Record<string, string | null>): string {
  const page = project.files?.components?.[pageName];
  
  if (!page) {
    return '<html><body><h1>Page component not found</h1></body></html>';
  }
  
  // TODO: Implement actual SSR rendering
  const safeName = escapeHtml(pageName);
  const safeParams = escapeHtml(JSON.stringify(params));
  const jsonData = JSON.stringify({
    project: project.project?.short_id || 'unknown',
    page: pageName,
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeName}</title>
</head>
<body>
  <div id="App">
    <h1>${safeName}</h1>
    <p>Params: ${safeParams}</p>
    <p>SSR rendering not yet implemented</p>
  </div>
  <script type="application/json" id="layr-data">
    ${jsonData}
  </script>
</body>
</html>`;
}
