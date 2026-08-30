// Dev-only fake backend. Reached exclusively from client.ts's IS_MOCK branch,
// which is itself gated behind __DEV__ — this module must never be imported,
// let alone executed, in a release build. See client.ts for the guard.
import {
  mockDiagnosticResult,
  mockDiagnosticTasks,
  mockLearners,
  mockLesson,
  mockParent,
  mockPlan,
  mockProgress,
  mockSkills,
  MOCK_TOKEN,
} from '@/src/lib/mockData';
import type { Envelope } from '@/src/api/envelope';

const MOCK_LATENCY_MS = 400;

// Tracks each mock diagnostic session's progress through mockDiagnosticTasks.
const mockDiagnosticSessions = new Map<string, number>();

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function mockFetch<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<{ status: number; json: Envelope<T> }> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const method = options.method ?? 'GET';
  const body = (options.body ?? {}) as Record<string, unknown>;

  if (path === '/auth/register' && method === 'POST') {
    return {
      status: 201,
      json: {
        success: true,
        data: {
          id: mockParent.id,
          email: body.email as string,
          name: body.name as string,
          token: MOCK_TOKEN,
        } as T,
      },
    };
  }

  if (path === '/auth/login' && method === 'POST') {
    return {
      status: 200,
      json: {
        success: true,
        data: {
          id: mockParent.id,
          email: (body.email as string) ?? mockParent.email,
          name: mockParent.name,
          token: MOCK_TOKEN,
        } as T,
      },
    };
  }

  if (path === '/auth/logout' && method === 'POST') {
    return { status: 200, json: { success: true, data: { ok: true } as T } };
  }

  if (path === '/auth/me' && method === 'GET') {
    if (!token) {
      return {
        status: 401,
        json: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing auth token' },
        },
      };
    }
    return { status: 200, json: { success: true, data: mockParent as T } };
  }

  if (path === '/learner' && method === 'GET') {
    return { status: 200, json: { success: true, data: { learners: mockLearners } as T } };
  }

  if (path === '/learner' && method === 'POST') {
    const grade = Number(body.grade);
    const newLearner = {
      id: `mock-learner-${Date.now()}`,
      name: body.name as string,
      grade,
      variant: grade <= 2 ? 'A' : 'B',
      daily_minutes: typeof body.daily_minutes === 'number' ? body.daily_minutes : 10,
    } as const;
    mockLearners.push(newLearner);
    return { status: 201, json: { success: true, data: newLearner as T } };
  }

  const learnerDetailMatch = /^\/learner\/(.+)$/.exec(path);
  if (learnerDetailMatch && method === 'GET') {
    const found = mockLearners.find((learner) => learner.id === learnerDetailMatch[1]);
    if (!found) {
      return {
        status: 404,
        json: { success: false, error: { code: 'NOT_FOUND', message: 'Learner not found' } },
      };
    }
    return { status: 200, json: { success: true, data: found as T } };
  }

  if (path.startsWith('/lesson/today') && method === 'GET') {
    return { status: 200, json: { success: true, data: { lesson: mockLesson } as T } };
  }

  if (path === '/lesson/attempt' && method === 'POST') {
    const taskId = body.task_id as string;
    const inputText = typeof body.input_text === 'string' ? body.input_text : '';
    const task = mockLesson.tasks.find((t) => t.id === taskId);
    const isCorrect = task ? inputText.trim() === task.correct_answer : false;
    return {
      status: 200,
      json: {
        success: true,
        data: {
          score: isCorrect ? 1 : 0,
          is_correct: isCorrect,
          feedback: task ? (isCorrect ? task.feedback_correct : task.feedback_wrong) : null,
        } as T,
      },
    };
  }

  const lessonCompleteMatch = /^\/lesson\/(.+)\/complete$/.exec(path);
  if (lessonCompleteMatch && method === 'POST') {
    return {
      status: 200,
      json: {
        success: true,
        data: {
          completed: true,
          lesson_id: lessonCompleteMatch[1],
          completed_at: new Date().toISOString(),
        } as T,
      },
    };
  }

  if (path === '/diagnostic/start' && method === 'POST') {
    const sessionId = `mock-diag-session-${Date.now()}`;
    mockDiagnosticSessions.set(sessionId, 0);
    return {
      status: 200,
      json: {
        success: true,
        data: { session_id: sessionId, task: mockDiagnosticTasks[0], item_number: 1 } as T,
      },
    };
  }

  if (path === '/diagnostic/submit' && method === 'POST') {
    const sessionId = body.session_id as string;
    const taskId = body.task_id as string;
    const inputText = typeof body.input_text === 'string' ? body.input_text : '';
    const index = mockDiagnosticSessions.get(sessionId) ?? 0;
    const task = mockDiagnosticTasks.find((t) => t.id === taskId) ?? mockDiagnosticTasks[index];
    const isCorrect = task ? inputText.trim() === task.correct_answer : false;
    const nextIndex = index + 1;

    if (nextIndex < mockDiagnosticTasks.length) {
      mockDiagnosticSessions.set(sessionId, nextIndex);
      return {
        status: 200,
        json: {
          success: true,
          data: {
            completed: false,
            score: isCorrect ? 1 : 0,
            is_correct: isCorrect,
            error_codes: [],
            feedback: task ? (isCorrect ? task.feedback_correct : task.feedback_wrong) : null,
            next_task: mockDiagnosticTasks[nextIndex],
            item_number: nextIndex + 1,
          } as T,
        },
      };
    }

    mockDiagnosticSessions.delete(sessionId);
    return {
      status: 200,
      json: {
        success: true,
        data: {
          completed: true,
          score: isCorrect ? 1 : 0,
          is_correct: isCorrect,
          error_codes: [],
          feedback: task ? (isCorrect ? task.feedback_correct : task.feedback_wrong) : null,
          result: mockDiagnosticResult,
          plan_id: mockPlan.id,
          lessons_generated: true,
        } as T,
      },
    };
  }

  const diagnosticResultMatch = /^\/diagnostic\/result\/(.+)$/.exec(path);
  if (diagnosticResultMatch && method === 'GET') {
    return { status: 200, json: { success: true, data: { result: mockDiagnosticResult } as T } };
  }

  if (path.startsWith('/dashboard/skills') && method === 'GET') {
    return { status: 200, json: { success: true, data: { skills: mockSkills } as T } };
  }

  if (path.startsWith('/dashboard/progress') && method === 'GET') {
    return { status: 200, json: { success: true, data: mockProgress as T } };
  }

  if (path.startsWith('/plan/current') && method === 'GET') {
    return { status: 200, json: { success: true, data: { plan: mockPlan } as T } };
  }

  return {
    status: 404,
    json: {
      success: false,
      error: { code: 'NOT_FOUND', message: `No mock handler for ${method} ${path}` },
    },
  };
}
