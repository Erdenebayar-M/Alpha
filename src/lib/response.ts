import type { Context } from 'hono';

interface Meta {
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
}

export function ok<T>(c: Context, data: T, meta?: Meta, status: 200 | 201 = 200) {
  return c.json({ success: true as const, data, ...(meta && { meta }) }, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  details?: unknown,
  statusCode: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400,
) {
  return c.json(
    {
      success: false as const,
      error: { code, message, ...(details !== undefined && { details }) },
    },
    statusCode,
  );
}
