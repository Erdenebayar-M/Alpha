import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { learnerIdQuerySchema } from '../lib/validators/common';

const dashboard = new Hono<AuthEnv>();

dashboard.use('/*', withAuth);

// ─── GET /api/dashboard/skills ────────────────────────────────────────────────

dashboard.get('/skills', async (c) => {
  const parsedQuery = learnerIdQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query parameters', parsedQuery.error.flatten().fieldErrors);
  }
  const { learner_id } = parsedQuery.data;
  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.FORBIDDEN(c);

  const state = await prisma.learnerSkillState.findUnique({ where: { learner_id } });
  if (!state) return ERRORS.NOT_FOUND(c, 'Skill state not found');

  return ok(c, { skills: state });
});

// ─── GET /api/dashboard/progress ─────────────────────────────────────────────

dashboard.get('/progress', async (c) => {
  const parsedQuery = learnerIdQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query parameters', parsedQuery.error.flatten().fieldErrors);
  }
  const { learner_id } = parsedQuery.data;
  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.FORBIDDEN(c);

  const state = await prisma.learnerSkillState.findUnique({
    where: { learner_id },
    select: { current_streak: true, longest_streak: true },
  });

  const recentLessons = await prisma.lesson.findMany({
    where: { learner_id, status: 'COMPLETED' },
    orderBy: { completed_at: 'desc' },
    take: 7,
    select: { id: true, day_number: true, accuracy: true, completed_at: true },
  });

  return ok(c, {
    current_streak: state?.current_streak ?? 0,
    longest_streak: state?.longest_streak ?? 0,
    recent_lessons: recentLessons,
  });
});

export default dashboard;
