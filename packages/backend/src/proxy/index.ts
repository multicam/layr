import type { Context } from 'hono';

export interface ProxyConfig {
  target: string;
  changeOrigin?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
}

const SAFE_FORWARD_HEADERS = new Set([
  'accept', 'accept-language', 'accept-encoding', 'content-type', 'content-length',
  'user-agent', 'if-none-match', 'if-modified-since', 'range',
]);

export function createProxy(config: ProxyConfig) {
  const { target, changeOrigin = true, headers = {}, timeout = 30000 } = config;

  return async (ctx: Context) => {
    const reqUrl = new URL(ctx.req.url);
    const url = new URL(reqUrl.pathname + reqUrl.search, target);
    const proxyHeaders: Record<string, string> = { ...headers };
    if (changeOrigin) proxyHeaders['Host'] = new URL(target).host;

    ctx.req.raw.headers.forEach((value, key) => {
      if (SAFE_FORWARD_HEADERS.has(key.toLowerCase())) {
        proxyHeaders[key] = value;
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: ctx.req.method,
        headers: proxyHeaders,
        body: ['GET','HEAD'].includes(ctx.req.method) ? undefined : await ctx.req.text(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return new Response(response.body, { status: response.status, headers: response.headers });
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') return ctx.text('Gateway Timeout', 504);
      return ctx.text('Bad Gateway', 502);
    }
  };
}

export function fontProxy() {
  return createProxy({ target: 'https://fonts.googleapis.com', changeOrigin: true });
}

export function fontStaticProxy() {
  return createProxy({ target: 'https://fonts.gstatic.com', changeOrigin: true });
}
