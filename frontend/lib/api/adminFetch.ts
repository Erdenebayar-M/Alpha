import 'server-only';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET is not set in frontend environment');

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      ...init.headers,
    },
    cache: 'no-store',
  });

  const body = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: { message: string };
  };

  if (!body.success) {
    throw new Error(body.error?.message ?? `Admin API error (${res.status})`);
  }

  return body.data as T;
}
