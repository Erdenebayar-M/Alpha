/** The caller's address, forwarded so the backend's auth rate limits (keyed on X-Forwarded-For) see the parent, not this server. */
export function clientIpFrom(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
