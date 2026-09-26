/**
 * Where to send a parent after signing in: `next` when it is a same-site
 * relative page path, `/` otherwise. Absolute URLs, protocol-relative `//host`
 * and backslash tricks (`/\host`, which browsers read as `//host`) are all
 * ignored, so the sign-in flow can't be used as an open redirect.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  // Control characters (tab/newline are stripped by URL parsers, which can turn
  // "/\t/host" into "//host").
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  // Not the sign-in page itself (it would bounce) nor a JSON API route.
  if (/^\/(signin|api)(?:[/?#]|$)/.test(next)) return "/";
  return next;
}

/** A link to another auth page that keeps `next` along (the target decides whether it is safe to follow). */
export function withNext(path: string, next: string | undefined): string {
  return next ? `${path}?${new URLSearchParams({ next })}` : path;
}
