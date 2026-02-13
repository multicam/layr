import type { Context, Next } from 'hono';

export type Middleware = (ctx: Context, next: Next) => Promise<void> | void;

export function compose(middleware: Middleware[]): Middleware {
  return async (ctx, next) => {
    let index = -1;
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      const fn = middleware[i];
      if (!fn) return next();
      await fn(ctx, () => dispatch(i + 1));
    };
    await dispatch(0);
  };
}

export function corsMiddleware(options: {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
} = {}): Middleware {
  const { origin = '*', methods = ['GET','POST','PUT','DELETE','OPTIONS'], headers = ['Content-Type','Authorization'], credentials = false } = options;

  return async (ctx, next) => {
    const requestOrigin = ctx.req.header('Origin') || '*';
    let allowOrigin: string;
    if (Array.isArray(origin)) {
      allowOrigin = origin.includes(requestOrigin) ? requestOrigin : origin[0] || '*';
      if (origin.includes(requestOrigin)) {
        ctx.header('Vary', 'Origin');
      }
    } else {
      allowOrigin = origin;
    }

    ctx.header('Access-Control-Allow-Origin', allowOrigin);
    ctx.header('Access-Control-Allow-Methods', methods.join(', '));
    ctx.header('Access-Control-Allow-Headers', headers.join(', '));
    if (credentials) ctx.header('Access-Control-Allow-Credentials', 'true');

    if (ctx.req.method === 'OPTIONS') return ctx.text('', 204);
    await next();
  };
}

export function loggerMiddleware(): Middleware {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.req.method} ${ctx.req.path} ${ctx.res.status} ${Date.now() - start}ms`);
  };
}

export function errorHandlerMiddleware(): Middleware {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Error:', error);
      const isDev = process.env.NODE_ENV !== 'production';
      const message = isDev && error instanceof Error ? error.message : 'Internal Server Error';
      return ctx.json({ error: message }, 500);
    }
  };
}

export function requestIdMiddleware(): Middleware {
  return async (ctx, next) => {
    const id = crypto.randomUUID();
    ctx.set('requestId', id);
    ctx.header('X-Request-ID', id);
    await next();
  };
}
