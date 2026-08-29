export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

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

/** True only for a body shaped like our {success, ...} envelope. Guards against
 *  a proxy/LB error page or an unrelated JSON body being trusted as ours. */
export function isEnvelope(value: unknown): value is Envelope<unknown> {
  if (typeof value !== 'object' || value === null || !('success' in value)) return false;
  const v = value as { success: unknown };
  if (v.success === true) return 'data' in value;
  if (v.success === false) {
    const err = (value as { error?: unknown }).error;
    return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
  }
  return false;
}
