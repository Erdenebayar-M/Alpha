import { Config } from './config';
import { Client, ApiError } from './client';
import { Metrics } from './metrics';
import { deriveAnswer } from './answers';
import { randomParentName, randomLearnerName, randomGrade, randomDailyMinutes } from './names';

// ─── API response shapes (minimal — only fields we actually use) ──────────────

interface AuthData { token: string; id: string }
interface LearnerData { id: string; variant: string }
interface DiagnosticStartData { session_id: string; tasks: Task[] }
interface DiagnosticSubmitData { score: number; phase_progress: { completed: number; total: number } }
interface NextPhaseData {
  completed?: boolean;
  phase?: string;
  tasks?: Task[];
  plan_id?: string;
  result?: unknown;
}
interface PlanData { plan: { id: string; lessons: LessonRef[] } }
interface LessonRef { id: string; day_number: number; status: string; scheduled_date: string }
interface LessonData { lesson: { id: string; tasks: Task[]; total_tasks: number; status: string } }
interface AttemptData { score: number; lesson_progress: { completed: number; total: number } }
interface CheckpointQueryData { checkpoint?: { id: string; tasks: Task[] } }

interface Task {
  id: string;
  task_type: string;
  options: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function think([min, max]: [number, number]): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, ms));
}

function randomTime(): number {
  return Math.floor(20 + Math.random() * 70); // 20–90 seconds
}

function shouldBeCorrect(accuracy: number): boolean {
  return Math.random() < accuracy;
}

// ─── Journey steps ────────────────────────────────────────────────────────────

export interface JourneyResult {
  botId: string;
  ok: boolean;
  failedStep?: string;
  error?: string;
  durationMs: number;
}

export async function runBot(
  botId: string,
  cfg: Config,
  metrics: Metrics,
): Promise<JourneyResult> {
  const client = new Client(cfg.baseUrl, metrics);
  const t0 = Date.now();
  metrics.journeyStart();

  async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof ApiError
        ? `${e.status} ${e.code}: ${e.message}`
        : String(e);
      throw Object.assign(new Error(msg), { step: name });
    }
  }

  try {
    // 1. Register
    const email = `loadbot+${cfg.runId}-${botId}@loadtest.local`;
    const auth = await step('register', () =>
      client.post<AuthData>('/api/auth/register', {
        email,
        name: randomParentName(),
        password: 'Loadtest123!',
      }),
    );
    client.setToken(auth.token);
    await think(cfg.thinkMs);

    // 2. Create learner
    const grade = randomGrade();
    const learner = await step('create-learner', () =>
      client.post<LearnerData>('/api/learner', {
        name: randomLearnerName(),
        grade,
        daily_minutes: randomDailyMinutes(),
      }),
    );
    await think(cfg.thinkMs);

    const learnerId = learner.id;

    // 3. Diagnostic
    const diagStart = await step('diagnostic-start', () =>
      client.post<DiagnosticStartData>('/api/diagnostic/start', { learner_id: learnerId }),
    );
    await think(cfg.thinkMs);

    let sessionId = diagStart.session_id;
    let currentTasks: Task[] = diagStart.tasks;

    // Phase A
    for (const task of currentTasks) {
      await step('diagnostic-submit', () =>
        client.post<DiagnosticSubmitData>('/api/diagnostic/submit', {
          session_id: sessionId,
          task_id: task.id,
          input_text: deriveAnswer(task, shouldBeCorrect(cfg.accuracy)),
          time_seconds: randomTime(),
        }),
      );
      await think(cfg.thinkMs);
    }

    // Phase B
    const phaseB = await step('diagnostic-next-phase-B', () =>
      client.post<NextPhaseData>('/api/diagnostic/next-phase', { session_id: sessionId }),
    );
    await think(cfg.thinkMs);

    if (!phaseB.completed && phaseB.tasks) {
      for (const task of phaseB.tasks) {
        await step('diagnostic-submit', () =>
          client.post<DiagnosticSubmitData>('/api/diagnostic/submit', {
            session_id: sessionId,
            task_id: task.id,
            input_text: deriveAnswer(task, shouldBeCorrect(cfg.accuracy)),
            time_seconds: randomTime(),
          }),
        );
        await think(cfg.thinkMs);
      }

      // Phase C
      const phaseC = await step('diagnostic-next-phase-C', () =>
        client.post<NextPhaseData>('/api/diagnostic/next-phase', { session_id: sessionId }),
      );
      await think(cfg.thinkMs);

      if (!phaseC.completed && phaseC.tasks) {
        for (const task of phaseC.tasks) {
          await step('diagnostic-submit', () =>
            client.post<DiagnosticSubmitData>('/api/diagnostic/submit', {
              session_id: sessionId,
              task_id: task.id,
              input_text: deriveAnswer(task, shouldBeCorrect(cfg.accuracy)),
              time_seconds: randomTime(),
            }),
          );
          await think(cfg.thinkMs);
        }

        // Complete diagnostic
        await step('diagnostic-complete', () =>
          client.post<NextPhaseData>('/api/diagnostic/next-phase', { session_id: sessionId }),
        );
        await think(cfg.thinkMs);
      }
    }

    if (cfg.journey === 'diagnostic') {
      metrics.journeyDone();
      return { botId, ok: true, durationMs: Date.now() - t0 };
    }

    // 4. Fetch today's lesson (plan was auto-created after diagnostic)
    const lessonRes = await step('lesson-today', () =>
      client.get<LessonData>('/api/lesson/today', { learner_id: learnerId }),
    );
    await think(cfg.thinkMs);

    const lesson = lessonRes.lesson;

    // 5. Submit each lesson task
    for (const task of lesson.tasks) {
      await step('lesson-attempt', () =>
        client.post<AttemptData>('/api/lesson/attempt', {
          lesson_id: lesson.id,
          task_id: task.id,
          input_text: deriveAnswer(task, shouldBeCorrect(cfg.accuracy)),
          time_seconds: randomTime(),
        }),
      );
      await think(cfg.thinkMs);
    }

    // 6. Complete lesson
    await step('lesson-complete', () =>
      client.post<unknown>(`/api/lesson/${lesson.id}/complete`, {}),
    );
    await think(cfg.thinkMs);

    // 7. Dashboard
    await step('dashboard-skills', () =>
      client.get<unknown>('/api/dashboard/skills', { learner_id: learnerId }),
    );
    await step('dashboard-progress', () =>
      client.get<unknown>('/api/dashboard/progress', { learner_id: learnerId }),
    );
    await think(cfg.thinkMs);

    if (cfg.journey === 'lesson-loop') {
      metrics.journeyDone();
      return { botId, ok: true, durationMs: Date.now() - t0 };
    }

    // 8. Checkpoint (if available)
    const cpRes = await step('checkpoint-query', () =>
      client.get<CheckpointQueryData>('/api/checkpoint', { learner_id: learnerId }),
    );
    await think(cfg.thinkMs);

    if (cpRes.checkpoint && cpRes.checkpoint.tasks?.length) {
      const cp = cpRes.checkpoint;
      await step('checkpoint-submit', () =>
        client.post<unknown>('/api/checkpoint/submit', {
          checkpoint_id: cp.id,
          answers: cp.tasks.map((t) => ({
            task_id: t.id,
            input_text: deriveAnswer(t, shouldBeCorrect(cfg.accuracy)),
            time_seconds: randomTime(),
          })),
        }),
      );
    }

    metrics.journeyDone();
    return { botId, ok: true, durationMs: Date.now() - t0 };

  } catch (e: unknown) {
    const typed = e as Error & { step?: string };
    metrics.journeyFail();
    return {
      botId,
      ok: false,
      failedStep: typed.step ?? 'unknown',
      error: typed.message,
      durationMs: Date.now() - t0,
    };
  }
}
