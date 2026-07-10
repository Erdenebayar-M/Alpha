import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { learnerIdQuerySchema } from '@app/shared';

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

  const learner = await prisma.learner.findUnique({
    where: { id: learner_id },
    select: { parent_id: true },
  });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const state = await prisma.learnerSkillState.findUnique({
    where: { learner_id },
    select: {
      general_level: true,
      s1_score: true, s1_level: true, s1_confidence: true,
      s2_score: true, s2_level: true, s2_confidence: true,
      s3_score: true, s3_level: true, s3_confidence: true,
      s4_score: true, s4_level: true, s4_confidence: true,
      s5_score: true, s5_level: true, s5_confidence: true,
      s6_score: true, s6_level: true, s6_confidence: true,
      s7_score: true, s7_level: true, s7_confidence: true,
      s8_score: true, s8_level: true, s8_confidence: true,
      weak_skills: true,
      top_error_codes: true,
      current_streak: true,
      longest_streak: true,
      updated_at: true,
    },
  });
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

  const learner = await prisma.learner.findUnique({
    where: { id: learner_id },
    select: { parent_id: true },
  });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

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
