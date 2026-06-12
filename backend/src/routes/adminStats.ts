import { Hono } from 'hono';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ok } from '../lib/response';
import { prisma } from '../lib/db/client';

/**
 * Admin user-activity stats.
 *
 * Distinct from /api/admin/content/stats (which reports the content pipeline).
 * This endpoint aggregates *learner activity* — the data produced when real
 * users (or the load-test bots) move through diagnostics, plans, and lessons.
 */
const adminStats = new Hono();
adminStats.use('/*', withAdmin);

/** Convert a Prisma groupBy result into a plain { key: count } record. */
function tally<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = String(row[key]);
    const count = (row as { _count?: { id?: number } })._count?.id ?? 0;
    out[k] = count;
  }
  return out;
}

// ─── GET /api/admin/stats ────────────────────────────────────────────────────

adminStats.get('/', async (c) => {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    parents,
    learners,
    diagnosticTotal,
    plansTotal,
    lessonsTotal,
    attemptsTotal,
    errorLogsTotal,
    checkpointsTotal,
    learnersByVariant,
    learnersByGrade,
    diagnosticByStatus,
    plansByTemplate,
    lessonsByStatus,
    levelDistribution,
    scoreDistribution,
    topErrorCodes,
    lessonAccuracy,
    attemptAvgs,
    attemptsLastHour,
    lastAttempt,
    streaks,
  ] = await Promise.all([
    prisma.parent.count(),
    prisma.learner.count(),
    prisma.diagnosticSession.count(),
    prisma.plan.count(),
    prisma.lesson.count(),
    prisma.attempt.count(),
    prisma.errorLog.count(),
    prisma.checkpoint.count(),

    prisma.learner.groupBy({ by: ['variant'], _count: { id: true } }),
    prisma.learner.groupBy({ by: ['grade'], _count: { id: true }, orderBy: { grade: 'asc' } }),
    prisma.diagnosticSession.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.plan.groupBy({ by: ['template'], _count: { id: true } }),
    prisma.lesson.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.learnerSkillState.groupBy({ by: ['general_level'], _count: { id: true } }),
    prisma.attempt.groupBy({ by: ['score'], _count: { id: true }, orderBy: { score: 'asc' } }),
    prisma.errorLog.groupBy({
      by: ['error_code'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    }),

    prisma.lesson.aggregate({ _avg: { accuracy: true }, where: { accuracy: { not: null } } }),
    prisma.attempt.aggregate({ _avg: { score: true, time_seconds: true } }),
    prisma.attempt.count({ where: { created_at: { gte: hourAgo } } }),
    prisma.attempt.findFirst({ orderBy: { created_at: 'desc' }, select: { created_at: true } }),
    prisma.learnerSkillState.aggregate({ _max: { longest_streak: true }, _avg: { current_streak: true } }),
  ]);

  return ok(c, {
    totals: {
      parents,
      learners,
      diagnostic_sessions: diagnosticTotal,
      plans: plansTotal,
      lessons: lessonsTotal,
      attempts: attemptsTotal,
      error_logs: errorLogsTotal,
      checkpoints: checkpointsTotal,
    },
    learners_by_variant: tally(learnersByVariant, 'variant'),
    learners_by_grade: tally(learnersByGrade, 'grade'),
    diagnostic_by_status: tally(diagnosticByStatus, 'status'),
    plans_by_template: tally(plansByTemplate, 'template'),
    lessons_by_status: tally(lessonsByStatus, 'status'),
    level_distribution: tally(levelDistribution, 'general_level'),
    score_distribution: tally(scoreDistribution, 'score'),
    top_error_codes: topErrorCodes.map((r) => ({
      code: r.error_code,
      count: r._count.id,
    })),
    averages: {
      lesson_accuracy: lessonAccuracy._avg.accuracy,
      attempt_score: attemptAvgs._avg.score,
      attempt_time_seconds: attemptAvgs._avg.time_seconds,
      current_streak: streaks._avg.current_streak,
    },
    longest_streak: streaks._max.longest_streak ?? 0,
    activity: {
      attempts_last_hour: attemptsLastHour,
      last_attempt_at: lastAttempt?.created_at ?? null,
    },
  });
});

export default adminStats;
