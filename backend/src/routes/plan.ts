import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok, fail } from '../lib/response';
import { learnerIdQuerySchema } from '@app/shared';

const plan = new Hono<AuthEnv>();

plan.use('/*', withAuth);

// ─── GET /api/plan/current?learner_id=<id> ────────────────────────────────────

plan.get('/current', async (c) => {
  const parsedQuery = learnerIdQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query parameters', parsedQuery.error.flatten().fieldErrors);
  }
  const { learner_id } = parsedQuery.data;
  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({
    where: { id: learner_id },
    select: { parent_id: true },
  });
  if (!learner || learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const activePlan = await prisma.plan.findFirst({
    where: { learner_id, status: 'ACTIVE' },
    select: {
      id: true,
      template: true,
      status: true,
      priority_skills: true,
      target_errors: true,
      daily_minutes: true,
      duration_days: true,
      source: true,
      started_at: true,
      ended_at: true,
      lessons: {
        select: {
          id: true,
          day_number: true,
          status: true,
          scheduled_date: true,
          primary_skill: true,
          total_tasks: true,
          completed_tasks: true,
        },
        orderBy: { day_number: 'asc' },
      },
      checkpoints: {
        select: {
          id: true,
          scheduled_date: true,
          status: true,
        },
        orderBy: { scheduled_date: 'asc' },
      },
    },
  });

  if (!activePlan) return fail(c, 'NO_ACTIVE_PLAN', 'No active plan found', undefined, 404);

  return ok(c, { plan: activePlan });
});

export default plan;
