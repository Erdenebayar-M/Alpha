import { Hono } from 'hono';
import { Variant } from '../../generated/prisma';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { createLearnerSchema } from '../lib/validators/learner';

const learner = new Hono<AuthEnv>();

learner.use('/*', withAuth);

// ─── POST /api/learner ────────────────────────────────────────────────────────

learner.post('/', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = createLearnerSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR('Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { name, grade, daily_minutes } = parsed.data;
  const parent_id = c.get('parent_id');
  const variant: Variant = grade <= 2 ? Variant.A : Variant.B;

  const newLearner = await prisma.$transaction(async (tx) => {
    const created = await tx.learner.create({
      data: { parent_id, name, grade, daily_minutes, variant },
    });

    await tx.learnerSkillState.create({
      data: {
        learner_id: created.id,
        top_error_codes: [],
        weak_skills: [],
        recent_error_codes: [],
        recent_task_ids: [],
        preferred_session_length: daily_minutes,
      },
    });

    return created;
  });

  return c.json(
    {
      id: newLearner.id,
      name: newLearner.name,
      grade: newLearner.grade,
      daily_minutes: newLearner.daily_minutes,
      variant: newLearner.variant,
    },
    201,
  );
});

// ─── GET /api/learner/:id ─────────────────────────────────────────────────────

learner.get('/:id', async (c) => {
  const id = c.req.param('id');
  const parent_id = c.get('parent_id');

  const found = await prisma.learner.findUnique({
    where: { id },
    include: { skill_state: true },
  });

  if (!found) {
    return ERRORS.NOT_FOUND('Learner not found');
  }

  if (found.parent_id !== parent_id) {
    return ERRORS.FORBIDDEN('Access denied');
  }

  const s = found.skill_state;

  return c.json({
    id: found.id,
    name: found.name,
    grade: found.grade,
    variant: found.variant,
    daily_minutes: found.daily_minutes,
    skill_state: s
      ? {
          general_level: s.general_level,
          s1_score: s.s1_score,
          s2_score: s.s2_score,
          s3_score: s.s3_score,
          s4_score: s.s4_score,
          s5_score: s.s5_score,
          s6_score: s.s6_score,
          s7_score: s.s7_score,
          s8_score: s.s8_score,
          s1_level: s.s1_level,
          s2_level: s.s2_level,
          s3_level: s.s3_level,
          s4_level: s.s4_level,
          s5_level: s.s5_level,
          s6_level: s.s6_level,
          s7_level: s.s7_level,
          s8_level: s.s8_level,
          top_error_codes: s.top_error_codes,
          weak_skills: s.weak_skills,
          current_streak: s.current_streak,
          longest_streak: s.longest_streak,
        }
      : null,
  });
});

export default learner;
