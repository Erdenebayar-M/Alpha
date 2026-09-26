/**
 * The site's public origin: WEB_ORIGIN when set, as it must be behind a proxy
 * or TLS terminator, where `request.url` can carry an internal host or
 * `http:`. Falls back to the request's own origin for local dev and e2e.
 */
export function publicOrigin(request: Request): string {
  return process.env.WEB_ORIGIN || new URL(request.url).origin;
}
