import { Hono } from 'hono';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ok } from '../lib/response';
import { ERRORS } from '../lib/errors';
import { prisma } from '../lib/db/client';

const adminLearners = new Hono();
adminLearners.use('/*', withAdmin);

// ─── GET /api/admin/learners ──────────────────────────────────────────────────

adminLearners.get('/', async (c) => {
  const raw = c.req.query();
  const page     = Math.max(1, parseInt(raw.page     ?? '1',  10) || 1);
  const per_page = Math.min(100, Math.max(1, parseInt(raw.per_page ?? '50', 10) || 50));
  const search   = (raw.search ?? '').trim();

  const where = search
    ? {
        OR: [
          { name:   { contains: search, mode: 'insensitive' as const } },
          { parent: { email: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.learner.count({ where }),
    prisma.learner.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * per_page,
      take: per_page,
      select: {
        id: true,
        name: true,
        grade: true,
        variant: true,
        daily_minutes: true,
        created_at: true,
        parent: { select: { email: true } },
        skill_state: {
          select: {
            general_level: true,
            current_streak: true,
            longest_streak: true,
            weak_skills: true,
            top_error_codes: true,
          },
        },
        _count: { select: { attempts: true, lessons: true } },
      },
    }),
  ]);

  return ok(c, {
    learners: rows.map((l) => ({
      id: l.id,
      name: l.name,
      grade: l.grade,
      variant: l.variant,
      daily_minutes: l.daily_minutes,
      created_at: l.created_at,
      parent_email: l.parent.email,
      general_level: l.skill_state?.general_level ?? 'M0',
      current_streak: l.skill_state?.current_streak ?? 0,
      longest_streak: l.skill_state?.longest_streak ?? 0,
      weak_skills: l.skill_state?.weak_skills ?? [],
      top_error_codes: l.skill_state?.top_error_codes ?? [],
      attempt_count: l._count.attempts,
      lesson_count: l._count.lessons,
    })),
    meta: { page, per_page, total, has_next: page * per_page < total },
  });
});

// ─── GET /api/admin/learners/:id ──────────────────────────────────────────────

adminLearners.get('/:id', async (c) => {
  const id = c.req.param('id');

  const found = await prisma.learner.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      grade: true,
      variant: true,
      daily_minutes: true,
      created_at: true,
      parent: { select: { email: true } },
      skill_state: true,
    },
  });

  if (!found) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const [activePlan, recentLessons, diagnostic] = await Promise.all([
    prisma.plan.findFirst({
      where: { learner_id: id, is_active: true },
      select: {
        template: true,
        status: true,
        priority_skills: true,
        target_errors: true,
        duration_days: true,
        daily_minutes: true,
        source: true,
        started_at: true,
        ended_at: true,
        lessons: {
          select: {
            id: true,
            day_number: true,
            status: true,
            accuracy: true,
            primary_skill: true,
            scheduled_date: true,
            completed_at: true,
          },
          orderBy: { day_number: 'asc' },
        },
        checkpoints: {
          select: {
            status: true,
            decision: true,
            scheduled_date: true,
            completed_at: true,
            result: true,
          },
          orderBy: { scheduled_date: 'asc' },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { learner_id: id, status: 'COMPLETED' },
      orderBy: { completed_at: 'desc' },
      take: 7,
      select: { id: true, day_number: true, accuracy: true, completed_at: true, primary_skill: true },
    }),
    prisma.diagnosticSession.findFirst({
      where: { learner_id: id },
      orderBy: { started_at: 'desc' },
      select: {
        status: true,
        current_phase: true,
        phase_a_completed: true,
        phase_b_completed: true,
        weak_skills_detected: true,
        result: true,
        started_at: true,
        completed_at: true,
        _count: { select: { attempts: true } },
      },
    }),
  ]);

  const s = found.skill_state;

  return ok(c, {
    id: found.id,
    name: found.name,
    grade: found.grade,
    variant: found.variant,
    daily_minutes: found.daily_minutes,
    created_at: found.created_at,
    parent_email: found.parent.email,
    skill_state: s
      ? {
          general_level: s.general_level,
          s1_score: s.s1_score, s2_score: s.s2_score, s3_score: s.s3_score, s4_score: s.s4_score,
          s5_score: s.s5_score, s6_score: s.s6_score, s7_score: s.s7_score, s8_score: s.s8_score,
          s1_level: s.s1_level, s2_level: s.s2_level, s3_level: s.s3_level, s4_level: s.s4_level,
          s5_level: s.s5_level, s6_level: s.s6_level, s7_level: s.s7_level, s8_level: s.s8_level,
          s1_confidence: s.s1_confidence, s2_confidence: s.s2_confidence,
          s3_confidence: s.s3_confidence, s4_confidence: s.s4_confidence,
          s5_confidence: s.s5_confidence, s6_confidence: s.s6_confidence,
          s7_confidence: s.s7_confidence, s8_confidence: s.s8_confidence,
          top_error_codes: s.top_error_codes,
          weak_skills: s.weak_skills,
          recent_error_codes: s.recent_error_codes,
          preferred_session_length: s.preferred_session_length,
          current_streak: s.current_streak,
          longest_streak: s.longest_streak,
          updated_at: s.updated_at,
        }
      : null,
    active_plan: activePlan
      ? (() => {
          const nonPending = activePlan.lessons.filter((l) => l.status !== 'PENDING');
          const current_day = nonPending.length > 0
            ? Math.max(...nonPending.map((l) => l.day_number))
            : 0;
          const lesson_counts = {
            total: activePlan.lessons.length,
            completed: activePlan.lessons.filter((l) => l.status === 'COMPLETED').length,
            in_progress: activePlan.lessons.filter((l) => l.status === 'IN_PROGRESS').length,
            pending: activePlan.lessons.filter((l) => l.status === 'PENDING').length,
          };
          return {
            template: activePlan.template,
            status: activePlan.status,
            source: activePlan.source,
            priority_skills: activePlan.priority_skills,
            target_errors: activePlan.target_errors,
            current_day,
            total_days: activePlan.duration_days,
            daily_minutes: activePlan.daily_minutes,
            started_at: activePlan.started_at,
            ended_at: activePlan.ended_at,
            lesson_counts,
            schedule: activePlan.lessons,
            checkpoints: activePlan.checkpoints,
          };
        })()
      : null,
    recent_lessons: recentLessons,
    diagnostic: diagnostic
      ? (() => {
          const counts = (diagnostic.result as Record<string, any> | null)?._counts ?? {};
          const bExpected: number = counts.b ?? 0;
          return {
          status: diagnostic.status,
          current_phase: diagnostic.current_phase,
          phase_a_completed: diagnostic.phase_a_completed,
          phase_b_completed: diagnostic.phase_b_completed,
          phase_c_completed: diagnostic.status === 'COMPLETED',
          phase_counts: {
            a_expected: counts.a ?? 8,
            b_expected: bExpected > 0 ? bExpected : null,
            c_expected: counts.c ?? 4,
          },
          weak_skills_detected: diagnostic.weak_skills_detected,
          result: diagnostic.result as {
            general_level?: string;
            skill_levels?: Record<string, string>;
            top_errors?: string[];
            priority_skills?: string[];
          } | null,
          started_at: diagnostic.started_at,
          completed_at: diagnostic.completed_at,
          attempt_count: diagnostic._count.attempts,
        };
        })()
      : null,
  });
});

export default adminLearners;
