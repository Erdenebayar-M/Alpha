import { Metrics } from './metrics';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export class Client {
  private token: string | null = null;

  constructor(private baseUrl: string, private metrics: Metrics) {}

  setToken(t: string): void { this.token = t; }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    return this.request<T>('GET', path + qs);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const group = this.endpointGroup(method, path);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const t0 = Date.now();
    let status = 0;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      const ms = Date.now() - t0;
      this.metrics.record({ group, status, ms });

      const json = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } };
      if (!json.success) {
        const err = json.error ?? { code: 'UNKNOWN', message: 'Request failed' };
        throw new ApiError(status, err.code, err.message);
      }
      return json.data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      const ms = Date.now() - t0;
      this.metrics.record({ group, status: status || 0, ms });
      throw e;
    }
  }

  private endpointGroup(method: string, path: string): string {
    const clean = path.split('?')[0];
    // Collapse UUIDs only (the only dynamic path segments) so grouping is stable
    const normalized = clean.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    );
    return `${method} ${normalized}`;
  }
}
