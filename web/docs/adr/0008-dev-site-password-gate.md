# The dev site's password gate lives in the app, behind a long random password

The dev deploy (the `dev` branch and every PR preview on Vercel, issue #156) points at the dev backend and is where the product owner checks updates. It has to stay private and out of search results, and the product owner, who has no Vercel account, has to get in with nothing more than a password.

**`proxy.ts` gates every route when `DEV_SITE_PASSWORD` is set** (Vercel Preview env only, never Production). Until the visitor enters it, a page gets a password form served from the proxy itself (`lib/devGate.ts`, not an app route, so production has no such page), and an API call gets a 401. The right password sets a 30-day httpOnly cookie holding a SHA-256 hash of the password, so changing the password signs everyone out. Every response on a gated deploy carries `X-Robots-Tag: noindex, nofollow`. Unset, there is no gate and no noindex.

**The proxy now runs on every page in production too.** A matcher must be a constant, so it can't depend on the env var; with the var unset the proxy only checks it and passes the request on, or runs the session redirects (ADR 0006) on their four pages, which `isSessionRedirectPath` now picks out instead of the matcher. Files under `/_next/` and static-asset extensions skip the proxy, so they are not gated on dev; they are the same files production serves.

**The password carries the security, not the code.** There is no attempt limit, and the cookie is an unkeyed hash, so someone holding a leaked cookie could test guesses offline. Both are harmless against 24+ random characters, kept in a password manager, which is cheaper than a rate limiter and a second secret for a site that holds no production data.

## Considered options

- **Vercel Deployment Protection.** It would cover every path, assets included, with no app code and no proxy run on production pages. Rejected for now: Vercel Authentication makes every visitor sign in with a Vercel account on the team, and the shared-password option is a paid add-on. Revisit if proxy invocations show up on the production bill.
- **A rate limit on attempts, and an HMAC cookie keyed by its own secret.** Rejected: a long random password already defeats guessing, online or offline.
