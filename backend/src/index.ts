import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
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

const app = new Hono();

app.use('*', secureHeaders());
const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use('*', cors({ origin: corsOrigins, credentials: true }));
if (env.NODE_ENV !== 'test') app.use('*', requestLogger);

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
  console.error('[unhandled]', err);
  return fail(c, 'INTERNAL_ERROR', 'Дотоод алдаа гарлаа', undefined, 500);
});

app.route('/api/auth', auth);
app.route('/api/learner', learner);
app.route('/api/diagnostic', diagnostic);
app.route('/api/lesson', lesson);
app.route('/api/plan', plan);
app.route('/api/checkpoint', checkpoint);
app.route('/api/dashboard', dashboard);
app.route('/api/admin/content', content);

if (require.main === module) {
  serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

export default app;
