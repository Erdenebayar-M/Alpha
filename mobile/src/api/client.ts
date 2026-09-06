import { clearToken, getToken } from '@/src/lib/secureStore';
import { emitUnauthorized } from '@/src/lib/authEvents';
import { ApiError, isEnvelope, type Envelope } from '@/src/api/envelope';
import type { RequestOptions } from '@/src/api/mockClient';

export { ApiError };

// Fallback copy for a caught error that isn't an ApiError (so has no server-provided
// message) — shared by every screen that calls apiRequest directly in a try/catch.
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Mock mode is a dev convenience only — it must never be reachable from a
// release build, even if EXPO_PUBLIC_API_URL is somehow unset there (e.g. a
// misconfigured EAS profile). See the module-load check below: a release
// build with no configured API URL fails at startup instead of silently
// falling back to a fake backend that accepts any password.
export const IS_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === '1';
const REQUEST_TIMEOUT_MS = 20_000;

// Fail at module load, not at the first tap — a release build with no
// configured backend (or a plaintext one) must never quietly work.
if (!__DEV__) {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set in this release build. Set it in the ' +
        'EAS build profile (see eas.json) before shipping.',
    );
  }
  if (!API_BASE_URL.startsWith('https://')) {
    throw new Error(
      `EXPO_PUBLIC_API_URL must use https:// in a release build (got "${API_BASE_URL}"); ` +
        'a plaintext http:// origin would send auth tokens in cleartext.',
    );
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken();

  const { status, json } = IS_MOCK
    ? await (await loadMockFetch())<T>(path, options, token)
    : await realFetch<T>(path, options, token);

  if (!json.success) {
    if (status === 401) {
      await clearToken();
      emitUnauthorized();
    }
    if (status === 429) {
      throw new ApiError(
        json.error.code || 'RATE_LIMITED',
        json.error.message || 'Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.',
        status,
        json.error.details,
      );
    }
    throw new ApiError(json.error.code, json.error.message, status, json.error.details);
  }

  return json.data;
}

// Dynamic import so the mock router (and the 1200+ line fixture file it
// imports) is only ever pulled into memory when IS_MOCK is true, which is
// itself gated behind __DEV__ above — this branch is unreachable in a
// release build.
async function loadMockFetch(): Promise<typeof import('@/src/api/mockClient').mockFetch> {
  const mod = await import('@/src/api/mockClient');
  return mod.mockFetch;
}

async function realFetch<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<{ status: number; json: Envelope<T> }> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. The app has no backend to talk to — ' +
        'set it in mobile/.env (dev) or the EAS build profile (release).',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Сервертэй холбогдоход хэт удаж байна. Дахин оролдоно уу.', 0);
    }
    throw new ApiError('NETWORK_ERROR', 'Сүлжээний алдаа гарлаа. Холболтоо шалгана уу.', 0);
  } finally {
    clearTimeout(timeout);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      'INVALID_RESPONSE',
      'Серверээс буруу хариу ирлээ. Дахин оролдоно уу.',
      response.status,
    );
  }

  if (!isEnvelope(body)) {
    throw new ApiError(
      'INVALID_RESPONSE',
      'Серверээс буруу хариу ирлээ. Дахин оролдоно уу.',
      response.status,
    );
  }

  return { status: response.status, json: body as Envelope<T> };
}
