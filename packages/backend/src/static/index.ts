import type { Context } from 'hono';
import { stat, readFile } from 'fs/promises';
import { join, extname, resolve } from 'path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
};

export async function serveStatic(root: string, ctx: Context): Promise<Response | null> {
  let path = ctx.req.path;
  if (path.endsWith('/')) path += 'index.html';
  
  const resolvedRoot = resolve(root);
  const filePath = resolve(join(root, path));

  // Prevent directory traversal
  if (!filePath.startsWith(resolvedRoot + '/') && filePath !== resolvedRoot) {
    return null;
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return null;
    
    const content = await readFile(filePath);
    const mimeType = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
    
    return new Response(content, {
      headers: { 'Content-Type': mimeType, 'Content-Length': String(content.length) }
    });
  } catch (e: any) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export function staticMiddleware(root: string) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const response = await serveStatic(root, ctx);
    return response || next();
  };
}
