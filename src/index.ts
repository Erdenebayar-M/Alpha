import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import auth from './routes/auth';
import learner from './routes/learner';
import diagnostic from './routes/diagnostic';
import lesson from './routes/lesson';
import plan from './routes/plan';
import checkpoint from './routes/checkpoint';
import dashboard from './routes/dashboard';

const app = new Hono();

app.route('/api/auth', auth);
app.route('/api/learner', learner);
app.route('/api/diagnostic', diagnostic);
app.route('/api/lesson', lesson);
app.route('/api/plan', plan);
app.route('/api/checkpoint', checkpoint);
app.route('/api/dashboard', dashboard);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
