import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from 'hono/request-id';
import { timeout } from 'hono/timeout';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './config/env';
import { fail } from './lib/response';
import { requestLogger } from './lib/logger';
import auth from './routes/auth';
import learner from './routes/learner';
import diagnostic from './routes/diagnostic';
import lesson from './routes/lesson';
import plan from './routes/plan';
import checkpoint from './routes/checkpoint';
import dashboard from './routes/dashboard';
import content from './routes/content';
import adminStats from './routes/adminStats';
import adminLearners from './routes/adminLearners';

const app = new Hono();

app.use('*', secureHeaders());
const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use('*', cors({ origin: corsOrigins, credentials: true }));
app.use('*', requestId());
if (env.NODE_ENV !== 'test') app.use('*', requestLogger);
// LLM-backed endpoints make sequential model calls and routinely exceed 15s;
// give them a long timeout while keeping the strict default for everything else.
const LLM_PATHS = [
  '/api/admin/content/generate',
  '/api/admin/content/generate-image',
  '/api/admin/content/generate-audio',
];
app.use('/api/*', (c, next) => {
  const isLLM = LLM_PATHS.some((p) => c.req.path.startsWith(p));
  return timeout(isLLM ? 600_000 : 15_000)(c, next);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return fail(
      c,
      'HTTP_ERROR',
      err.message,
      undefined,
      err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    );
  }
  const reqId = (c.get('requestId') as string | undefined) ?? null;
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    request_id: reqId,
    method: c.req.method,
    path: c.req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));
  return fail(c, 'INTERNAL_ERROR', 'Дотоод алдаа гарлаа', { request_id: reqId }, 500);
});

// Serve generated assets from the content pipeline
app.use('/content/images/*', serveStatic({ root: '../content-pipeline/images' }));
app.use('/content/audio/*', serveStatic({ root: '../content-pipeline/audio' }));

app.route('/api/auth', auth);
app.route('/api/learner', learner);
app.route('/api/diagnostic', diagnostic);
app.route('/api/lesson', lesson);
app.route('/api/plan', plan);
app.route('/api/checkpoint', checkpoint);
app.route('/api/dashboard', dashboard);
app.route('/api/admin/content', content);
app.route('/api/admin/stats', adminStats);
app.route('/api/admin/learners', adminLearners);

if (require.main === module) {
  serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, () => {
    console.log(`Server running on http://0.0.0.0:${env.PORT}`);
  });
}

export default app;
