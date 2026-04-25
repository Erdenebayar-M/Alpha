import type { MiddlewareHandler } from 'hono';

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const duration_ms = Date.now() - start;

  const line = {
    ts: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms,
    parent_id: (c.get('parent_id') as string | undefined) ?? null,
  };

  const sink = c.res.status >= 500 ? console.error : console.log;
  sink(JSON.stringify(line));
};
