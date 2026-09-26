# Parent session on the web origin, behind route handlers

Parents sign in on the marketing site (`/signin`) and later reach account pages from it, so the web app needs its own notion of a signed-in **Parent account**. Three decisions:

**The parent session lives on the web origin, behind web route handlers.** The browser never talks to the backend's auth routes and never holds the backend token. `app/api/auth/signin/route.ts` calls the backend's `POST /api/auth/login`, stores the returned token in an httpOnly cookie (`orto_session`, `SameSite=Lax`, `Secure` in production, 7 days — the backend's own token lifetime) and answers the page with only `{ redirectTo }`. Page scripts therefore can't read the token, and the backend's own `SameSite=Strict` cookie (set on the backend's origin, irrelevant here) is ignored. `Lax` rather than `Strict` so a parent following a link from an email or another site arrives signed in. `next` is followed only when it is a same-site relative path (`lib/auth/safeNext.ts`), so the flow isn't an open redirect.

**The backend alone holds the Google client secret.** Google sign-in's code exchange happens in the backend; web starts the flow and receives the result through a route handler, but never sees the secret. Web's env carries no Google credentials.

**A Password reset bumps `token_version`, signing out every session.** Session tokens are stateless JWTs and can't be listed or revoked one by one; the backend puts a `token_version` on the Parent account and rejects tokens carrying an older one. Resetting the password increments it, which ends the sessions on every device — including any web cookie — without web having to track them.

The web sign-in handler forwards the client's `X-Forwarded-For` to the backend, because the backend's login rate limit is keyed on it; otherwise every parent would share the web server's bucket.

**Deployment assumption:** web must be deployed behind a proxy that overwrites `X-Forwarded-For`; otherwise the sign-in rate limit can be bypassed. Next's route handlers don't expose the raw connection IP, so this header is the only per-parent key available, and dropping it would put every parent in one shared bucket that a single attacker could exhaust to lock everyone out. Vercel, or nginx with `proxy_set_header X-Forwarded-For $remote_addr;`, overwrite it.

## Considered options

- **Call the backend directly from the browser, keep its cookie.** Rejected: the backend is on another origin, its cookie is `SameSite=Strict`, and the token would be in reach of scripts if it were ever returned in a body the page reads.
- **Store the token in `localStorage`.** Rejected: readable by any script on the page.
