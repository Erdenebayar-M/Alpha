# CLAUDE.md — backend/

Backend-specific conventions for the Hono + Prisma API. Read this alongside the root CLAUDE.md.

## Response Envelope

Always use the helpers in `src/lib/response.ts`. **Never** call `c.json()` directly.

- Success: `ok(c, data, meta?)` → `{ success: true, data, meta? }`
- Error: `fail(c, code, message, details?, status)` → `{ success: false, error: { code, message, details? } }`

## Error Factory

Use `ERRORS.*` from `src/lib/errors.ts` for all error responses. **Never** construct error objects by hand.

Ownership failures must return `NOT_FOUND` (not `FORBIDDEN`) — do not reveal that the resource exists.

## Request Validation

Every route with a body or query string must:
1. Parse with a Zod schema from `@app/shared` via `safeParse`
2. On failure, flatten field errors into `ERRORS.VALIDATION_ERROR`

Never access `c.req.json()` without validating first.

## Auth Middleware

- `withAuth` — cookie-first (`auth_token`), Bearer fallback. Sets `parent_id` in context.
- `withAdmin` — static bearer secret (`ADMIN_SECRET`), SHA-256 + `timingSafeEqual` comparison. Required on all `/api/admin/*` routes.

Every learner-scoped handler must re-verify ownership: `learner.parent_id === parent_id`. Do not skip this even if `withAuth` already ran.

## Middleware Order

Defined in `src/index.ts`:

```
secureHeaders → cors → requestId → requestLogger → timeout → routes
```

- `requestLogger` is skipped in `NODE_ENV=test`
- Timeout: 15 s for all `/api/*` routes; **600 s** for the three LLM endpoints (`/generate`, `/generate-image`, `/generate-audio`)
- `app.onError` is the global fallback — do not add per-route catch-all handlers

## Observability

Structured JSON logs include `request_id` (from `hono/request-id`). Unhandled errors log `{ ts, request_id, method, path, error, stack }` to stderr and return `request_id` in the 500 response `details`. Never log passwords, tokens, or PII.

## Auth Model

JWT carried in an **HttpOnly + SameSite=Strict cookie** (`auth_token`):
- Set by `POST /api/auth/login` and `POST /api/auth/register`
- Cleared by `POST /api/auth/logout`
- Profile fetched via `GET /api/auth/me` — returns only `{ id, email, name }`, never `password_hash`

JWT is HS256, with `iss: 'mongolian-app'` and `aud: 'parent-api'` enforced on verify. The frontend Zustand store holds only the parent profile — **never** the token itself.

## Security Architecture

The codebase applies these principles consistently. New routes and features must follow the same patterns.

**1. Defense in Depth** — multiple independent layers.
- Cookie (`HttpOnly + SameSite=Strict`) + JWT signature validation
- `withAuth` middleware + per-route `learner.parent_id === parent_id` ownership check
- `secureHeaders()` (Hono) + security headers in `frontend/next.config.ts`

**2. Least Privilege** — return only what the caller needs.
- `GET /auth/me` returns only `{ id, email, name }`
- Prisma ownership checks use `select: { parent_id: true }`, not full row fetches
- Admin routes require `ADMIN_SECRET`; a valid parent JWT cannot access them

**3. Fail Secure** — deny on ambiguity.
- `withAuth` returns 401 for missing, expired, or malformed tokens
- `env.ts` calls `process.exit(1)` on invalid/missing env vars
- `assetUrlSchema` rejects by default; only `/content/` paths and the R2 CDN origin pass

**4. Don't Leak Information**
- Login returns `"Invalid email or password"` regardless of whether the email exists
- IDOR failures return `NOT_FOUND`, not `FORBIDDEN`
- 500 responses return only a `request_id`; stack traces go to stderr only

**5. Timing-Safe Comparisons**
- `bcrypt.compare()` for passwords
- SHA-256 digest + `timingSafeEqual` for `ADMIN_SECRET` (`src/lib/auth/adminMiddleware.ts`)

**6. Input Validation at Every Boundary**
- All routes use Zod `safeParse`; errors flatten into `ERRORS.VALIDATION_ERROR`
- No `$queryRaw` / `$executeRaw` — all DB access through Prisma's type-safe client
- Asset URLs validated against `assetUrlSchema` allowlist before storage

**7. Rate Limiting** — defined in `src/lib/auth/rateLimit.ts`
- `loginLimiter`: 5 attempts / 15 min
- `registerLimiter`: 10 / hour
- `adminGenerateLimiter`: 5 / min on LLM endpoints

**8. Secure Defaults**
- Auth cookie: `HttpOnly: true`, `SameSite: Strict`, `Secure: NODE_ENV !== 'test'`
- JWT: HS256 algorithm pinned; `iss` and `aud` enforced on verify
- `CORS_ORIGIN` must be explicitly set — no wildcard fallback

**9. Privilege Separation**
- `withAuth` (JWT cookie) for all parent/learner routes
- `withAdmin` (static bearer secret) for `/api/admin/*`

**10. Audit Trail**
- Structured JSON logs with `request_id` on every unhandled error
- `TaskDraftAuditLog` table records every approve/reject with timestamp and actor

### Rules for new routes

- **Always** use `ERRORS.*` from `errors.ts` — never `c.json()` directly
- **Always** Zod `safeParse` any body or query params before use
- **Always** re-verify ownership (`learner.parent_id === parent_id`) in every learner-scoped handler
- **Never** return a full Prisma model — select only the fields the caller needs
- **Never** add a fallback default for a required secret — fail fast in `env.ts`
- **Never** store user-supplied URLs without validating against the `assetUrlSchema` allowlist

### Known intentional gaps (do not re-investigate)

- **JWT revocation**: tokens remain valid up to 7 days after logout. Mitigated by `SameSite=Strict`. Redis blacklist is the right fix if needed.
- **Aggregate LLM cost limits**: per-request `max_cost` cap exists. Session/day-level tracking is deferred.
- **Secret rotation**: `JWT_SECRET`, `ADMIN_SECRET`, and API keys are rotated manually.

## Data Model

Defined in `prisma/schema.prisma`. Full 3-tier structure:

**User tier**: `Parent` → `Learner` → `LearnerSkillState`
- `variant`: A = Grades 1–2 (gamified, 5–8 min), B = Grades 2–4 (structured, 10–15 min)
- `LearnerSkillState`: mastery `M0`–`M5`, confidence `LOW/MEDIUM/HIGH` per skill
  - Confidence computed from item count: `<3 → LOW`, `3–5 → MEDIUM`, `6+ → HIGH`

**Content bank**: `Word` + `Task`
- `Word`: vocabulary with image/audio asset references
- `Task`: 43 types (`TT_1_1`–`TT_8_4`), optional `InteractionForm` enum (CHOOSE/MATCH/FILL/ASSEMBLE/TRANSCRIBE/CORRECT/TAP)

**Learning path**: `DiagnosticSession` → `Plan` → `Lesson` → `Checkpoint`
- Diagnostic: 3-phase adaptive (PHASE_A: 8 tasks, PHASE_B: 8 adaptive, PHASE_C: 4 boundary)
- Plan: 7–14 day (`BALANCED/INTENSIVE/STABILIZATION`)
- Checkpoint: decisions `CONTINUE_PLAN / NEW_PLAN / LEVEL_UP`

**Execution**: `Attempt` + `ErrorLog`
- Attempts scored: `0 / 0.25 / 0.5 / 0.75 / 1.0`
- 38 error codes: `A1–A3`, `B1–B4`, `C1–C6`, `D1–D5`, `E1–E7`, `F1–F4`, `G1–G5`, `H1–H4`

## Prisma Client

Auto-generated into `generated/prisma/` (gitignored). Always run `npm run db:generate` after schema changes.

Import path inside `backend/src/...`:
```ts
import { PrismaClient } from "../generated/prisma";
```

**Never** expose Prisma types directly — callers get only what the API response selects.

