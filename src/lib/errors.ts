// Standard API error response builder.
// Every error from the API returns:
// { "error": { "code": "...", "message": "...", "details": {} } }

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): Response {
  const body: ErrorBody = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const ERRORS = {
  VALIDATION_ERROR: (message: string, details?: unknown) =>
    apiError('VALIDATION_ERROR', message, 400, details),

  UNAUTHORIZED: (message = 'Unauthorized') =>
    apiError('UNAUTHORIZED', message, 401),

  NOT_FOUND: (message: string) =>
    apiError('NOT_FOUND', message, 404),

  FORBIDDEN: (message = 'Forbidden') =>
    apiError('FORBIDDEN', message, 403),

  CONFLICT: (message: string) =>
    apiError('CONFLICT', message, 409),

  UNPROCESSABLE: (message: string, details?: unknown) =>
    apiError('UNPROCESSABLE', message, 422, details),
};
