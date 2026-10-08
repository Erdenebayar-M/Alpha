/**
 * A fixed-window count per key, held in this server instance's memory. On
 * Vercel each instance keeps its own count, so the real ceiling is a multiple
 * of `limit`; that is enough for a route that already sits behind the dev
 * site's password gate (docs/adr/0009-dev-feedback-widget.md).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { startedAt: number; count: number }>();

  /** Counts one hit for `key`; `false` once it has had `limit` in this window. */
  return function allow(key: string, now = Date.now()): boolean {
    const current = windows.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      // Expired windows are only dropped here, so sweep them before adding a key.
      for (const [k, w] of windows) if (now - w.startedAt >= windowMs) windows.delete(k);
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= limit) return false;
    current.count++;
    return true;
  };
}
