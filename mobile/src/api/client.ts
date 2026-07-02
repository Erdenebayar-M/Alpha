import { mockLearners, mockLesson, mockParent, MOCK_TOKEN } from '@/src/lib/mockData';
import { clearToken, getToken } from '@/src/lib/secureStore';

// Flip to false once EXPO_PUBLIC_API_URL points at a deployed backend.
const IS_MOCK = true;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const MOCK_LATENCY_MS = 400;

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken();

  const { status, json } = IS_MOCK
    ? await mockFetch<T>(path, options, token)
    : await realFetch<T>(path, options, token);

  if (!json.success) {
    if (status === 401) {
      await clearToken();
    }
    throw new ApiError(json.error.code, json.error.message, status, json.error.details);
  }

  return json.data;
}

async function realFetch<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<{ status: number; json: Envelope<T> }> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json()) as Envelope<T>;
  return { status: response.status, json };
}

async function mockFetch<T>(
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
      id: `mock-learner-${mockLearners.length + 1}`,
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

  return {
    status: 404,
    json: {
      success: false,
      error: { code: 'NOT_FOUND', message: `No mock handler for ${method} ${path}` },
    },
  };
}
