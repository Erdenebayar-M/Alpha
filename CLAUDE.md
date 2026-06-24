# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phase 2 of a Mongolian Spelling & Dictation Learning Application — adaptive educational system for Grades 1–4. The repo is now an **npm workspaces monorepo** with three packages:

| Workspace   | Purpose                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/`  | Hono + Prisma API on Postgres. Phase 1 routes (auth, learner, diagnostic, lesson, plan, checkpoint, dashboard) and seed scripts.              |
| `frontend/` | Next.js 16 (App Router, React 19, Turbopack). UI for parent dashboard, diagnostic, and daily lesson flows.                                    |
| `shared/`   | `@app/shared` — Zod schemas and shared TS types imported by both backend and frontend. Single source of truth for request/response contracts. |

`content-pipeline/` stays at the repo root and is **not** a workspace; it shares backend's Prisma client via a relative import.

## Environment Setup

Requires PostgreSQL 18+ on port **5433**, database `mongolian_app`.

`backend/.env` (not committed):

```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5433/mongolian_app?schema=public"
JWT_SECRET="<at least 64 chars>"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

`frontend/.env.local` (not committed):

```
API_URL=http://localhost:3001
```

Setup sequence:

```bash
npm install                              # installs all workspaces
npm --workspace=@app/backend run db:generate
npm --workspace=@app/backend run db:migrate
npm --workspace=@app/backend run seed
```

Run dev servers in two terminals:

```bash
npm run dev:backend     # Hono on :3001
npm run dev:frontend    # Next.js on :3000 (proxies /api/* to backend)
```

## Key Commands (run from repo root unless noted)

| Command                                      | Purpose                      |
| -------------------------------------------- | ---------------------------- |
| `npm run dev:backend`                        | Start Hono backend           |
| `npm run dev:frontend`                       | Start Next.js dev server     |
| `npm run test:backend`                       | Jest suite (583 tests)       |
| `npm run seed`                               | Seed Word and Task tables    |
| `npm run db:migrate`                         | Apply pending migrations     |
| `npm run db:generate`                        | Regenerate Prisma client     |
| `npm --workspace=@app/frontend run build`    | Production build of frontend |
| `npm --workspace=@app/backend run db:studio` | Browse database              |

## Architecture

### Backend conventions

**Response envelope** — always use the helpers in `backend/src/lib/response.ts`; never call `c.json()` directly:

- Success: `ok(c, data, meta?)` → `{ success: true, data, meta? }`
- Error: `fail(c, code, message, details?, status)` → `{ success: false, error: { code, message, details? } }`

**Error factory** — use `ERRORS.*` from `backend/src/lib/errors.ts` for all error responses. Ownership failures return `NOT_FOUND` (not `FORBIDDEN`) to avoid leaking resource existence.

**Request validation** — every route with a body or query string must parse it with a Zod schema from `@app/shared` via `safeParse`, then flatten field errors into `ERRORS.VALIDATION_ERROR`.

**Auth** — `withAuth` (cookie-first, Bearer fallback) sets `parent_id` in context. Every learner-scoped handler must re-verify `learner.parent_id === parent_id`. Admin routes use `withAdmin`, which requires `ADMIN_SECRET` (mandatory env var, 32+ chars, constant-time comparison).

**Middleware order** in `backend/src/index.ts`: `secureHeaders → cors → requestId → requestLogger → timeout(/api/*, 15 s) → routes`, with `app.onError` as the global fallback.

**Observability** — structured JSON logs include `request_id` (set by `hono/request-id`). Unhandled errors log `{ ts, request_id, method, path, error, stack }` to stderr and include `request_id` in the 500 response `details` for traceability.

---

### Auth model

JWT carried in an **HttpOnly + SameSite=Strict cookie** (`auth_token`). Set by `POST /api/auth/login` and `POST /api/auth/register`, cleared by `POST /api/auth/logout`, profile fetched via `GET /api/auth/me`. The `withAuth` middleware reads the cookie first; a `Bearer` header is accepted as a fallback for tests/legacy callers. **Never** expose the token to JS — frontend Zustand store holds only the parent profile.

### Security Architecture

The codebase applies these principles consistently. New routes and features must follow the same patterns.

**1. Defense in Depth** — multiple independent layers; no single point of failure.

- Cookie (`HttpOnly + SameSite=Strict`) + JWT signature validation
- `withAuth` middleware + per-route `learner.parent_id === parent_id` ownership check
- `secureHeaders()` (Hono) + security headers in `frontend/next.config.ts` (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)

**2. Least Privilege** — grant only what the caller needs.

- `GET /auth/me` returns only `{ id, email, name }` — never `password_hash`
- Prisma queries for ownership checks use `select: { parent_id: true }`, not full row fetches
- Admin routes require a separate `ADMIN_SECRET`; a valid parent JWT cannot access them

**3. Fail Secure** — deny on any ambiguity; never default to open.

- `withAuth` returns 401 for missing, expired, or malformed tokens
- `env.ts` calls `process.exit(1)` on invalid/missing env vars — server won't start misconfigured
- `assetUrlSchema` (content.ts) rejects by default; only `/content/` paths and the R2 CDN origin pass

**4. Don't Leak Information** — errors reveal as little as possible.

- Login returns `"Invalid email or password"` regardless of whether the email exists (no enumeration)
- IDOR failures return `NOT_FOUND`, not `FORBIDDEN` — resource existence is not revealed
- 500 responses return only a `request_id`; stack traces go to stderr only

**5. Timing-Safe Comparisons** — constant-time for all secret comparisons.

- `bcrypt.compare()` for passwords
- SHA-256 digest + `timingSafeEqual` for `ADMIN_SECRET` (`adminMiddleware.ts`)

**6. Input Validation at Every Boundary** — parse and reject before any business logic.

- Every route with a body or query uses Zod `safeParse`; field errors flatten into `ERRORS.VALIDATION_ERROR`
- No `$queryRaw` / `$executeRaw` — all DB access through Prisma's type-safe client
- Asset URLs validated against an allowlist (`assetUrlSchema`) before storage

**7. Rate Limiting** — make brute-force and cost-abuse expensive.

- `loginLimiter`: 5 attempts / 15 min (`routes/auth.ts`)
- `registerLimiter`: 10 / hour (`routes/auth.ts`)
- `adminGenerateLimiter`: 5 / min on paid LLM endpoints (`routes/content.ts`: `/generate`, `/generate-image`, `/generate-audio`)
- All limiters defined in `backend/src/lib/auth/rateLimit.ts`

**8. Secure Defaults** — the safe option requires no extra configuration.

- Auth cookie: `HttpOnly: true`, `SameSite: Strict`, `Secure: NODE_ENV !== 'test'`
- JWT: HS256 algorithm pinned; `iss: 'mongolian-app'`, `aud: 'parent-api'` enforced on verify
- `CORS_ORIGIN` must be explicitly set — no wildcard fallback

**9. Privilege Separation** — user plane and admin plane are isolated.

- `withAuth` (JWT cookie) for all parent/learner routes
- `withAdmin` (static bearer secret, SHA-256 timed comparison) for `/api/admin/*`
- Different mechanisms, different attack surfaces

**10. Audit Trail** — know when and what went wrong.

- Structured JSON logs with `request_id` on every unhandled error (`index.ts` `onError`)
- `TaskDraftAuditLog` table records every approve/reject with timestamp and actor

#### Rules for new routes

- **Always** use `ERRORS.*` from `errors.ts` — never call `c.json()` directly
- **Always** Zod `safeParse` any body or query params before use
- **Always** re-verify ownership (`learner.parent_id === parent_id`) in every learner-scoped handler
- **Never** return a full Prisma model — select only the fields the caller needs
- **Never** add a fallback default for a required secret — fail fast in `env.ts` instead
- **Never** store user-supplied URLs without validating them against the `assetUrlSchema` allowlist

#### Known intentional gaps (do not re-investigate)

- **JWT revocation**: tokens remain valid for up to 7 days after logout. Mitigated by short-lived sessions and `SameSite=Strict` cookie. A Redis blacklist is the right fix if multi-device logout becomes a requirement.
- **Aggregate LLM cost limits**: per-request `max_cost` cap exists in the `/generate` endpoint. Session- or day-level budget tracking is deferred until usage data warrants it.
- **Secret rotation**: `JWT_SECRET`, `ADMIN_SECRET`, and API keys are rotated manually. No automated rotation mechanism is in place — this is an operational concern.

---

### Frontend ↔ Backend wiring

Same-origin via Next.js rewrites: `/api/:path*` → `http://localhost:3001/api/:path*`. Cookies "just work" without CORS contortions. Server Components forward incoming cookies via `lib/api/server.ts` (`cookies()` from `next/headers`); browser fetches use `lib/api/client.ts` with `credentials: 'include'`.

### Data Model (3-tier structure in `backend/prisma/schema.prisma`)

**User tier**: `Parent` → `Learner` → `LearnerSkillState`

- Learners have a `variant` (A = Grades 1–2, gamified, 5–8 min; B = Grades 2–4, structured, 10–15 min)
- `LearnerSkillState` tracks mastery (`M0`–`M5`) and **per-skill** confidence (`LOW/MEDIUM/HIGH`) for 8 skills (`S1`–`S8`)
  - Confidence is computed from item count per skill: `<3 → LOW`, `3–5 → MEDIUM`, `6+ → HIGH` (v3 spec)

**Content bank**: `Word` + `Task`

- `Word`: vocabulary with image/audio asset references
- `Task`: 42 types (39 original `TT_*` + 3 new v3 interaction forms): `TT_MATCH_PAIRS` (Холбож тааруулах), `TT_ASSEMBLE_WORD` (Угсрах), `TT_TAP_FIND_ERROR` (Алдаа олж товших)
- `Task.interaction_form`: optional `InteractionForm` enum (CHOOSE/MATCH/FILL/ASSEMBLE/TRANSCRIBE/CORRECT/TAP) for admin/UI clarity

**Learning path**: `DiagnosticSession` → `Plan` → `Lesson` → `Checkpoint`

- Diagnostic: 3-phase adaptive assessment (PHASE_A: 8 tasks, PHASE_B: 8 adaptive, PHASE_C: 4 boundary)
- Plan: 7–14 day personalized plan (`BALANCED/INTENSIVE/STABILIZATION`)
- Checkpoint: mid-plan assessment with decisions (`CONTINUE_PLAN / NEW_PLAN / LEVEL_UP`)

**Execution**: `Attempt` + `ErrorLog`

- Attempts scored: `0 / 0.25 / 0.5 / 0.75 / 1.0`
- Full v3 error taxonomy (38 codes): `A1–A3`, `B1–B4`, `C1–C6`, `D1–D5`, `E1–E7`, `F1–F4`, `G1–G5`, `H1–H4`
  - Auto-classified from diff: C1, C2, C3, C4, C5, D3, E1, E2, E3, E7, B3, B1, B2, G1–G5, H4
  - Metric-derived (not from diff): H2 (speed), H3 (attention variability)
  - Context-assigned via `task.error_targets`: A1–A3, D1, D2, D4, D5, F1–F4, H1

### Prisma Client

Auto-generated into `backend/generated/prisma/` (gitignored). Always run `npm run db:generate` after schema changes. Import from `"../generated/prisma"` (relative to `backend/src/...`) inside backend code. **Do not import the Prisma client from frontend** — frontend communicates via the API only and pulls types from `@app/shared`.

### Shared Zod schemas

`shared/src/validators/*` define request schemas (`registerSchema`, `loginSchema`, `createLearnerSchema`, etc.). Both sides import them as:

```ts
import { createLearnerSchema } from "@app/shared";
```

TS path aliases are wired in both `backend/tsconfig.json` and `frontend/tsconfig.json`. **Don't duplicate schemas** — change them once in `shared/`.

**Task schema (`shared/src/validators/task.ts`)** is the **single source of truth for all task-creation paths**:

- `POST /api/admin/content/tasks` (create by hand) uses `createTaskSchema`
- `POST /api/admin/content/generate` (AI pipeline) validates variants via `taskContentSchema`
- `content-pipeline/scripts/ingest.ts` calls `validateTaskContent` from `@app/shared`
- `content-pipeline/scripts/validators/schemaValidator.ts` delegates to `validateTaskContent`

The `TaskSource` Prisma enum (`HUMAN` | `AI`) is set automatically: hand-created tasks and pipeline imports get `HUMAN`; only the LLM generator writes `AI`. The `source` column exists on both `Task` and `TaskDraft` tables and is propagated through `/approve`.

### TypeScript Config

- Backend: strict, CommonJS, target ES2022, `ts-node` for runtime
- Frontend: Next.js defaults (ESM, bundler resolution, JSX preserve)
- Shared: emits `.d.ts` so editor tooling resolves types in both consumers

## Reference Documentation

Detailed specs live in `/docs/`:

- `Mongolian_Writing_App_Product_Requirements_Master_updated.docx` — Full PRD
- `0. Агуулгын бүтэц, тохиргоо.xlsx` — Source content bank (basis for seed data)
- `1. Оношилгооны дасгалууд_матриц.xlsx` — Diagnostic task matrix

## Content Pipeline (Phase 4)

### Pipeline location: `content-pipeline/`

All content authoring, validation, and LLM generation tooling lives here, separate from `backend/` and `frontend/`. Scripts that need DB access import the Prisma client from `../../backend/generated/prisma`.

### Folder purposes

| Folder                                 | Purpose                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `content-pipeline/seed-data/`          | **Read-only** reference exports from master spreadsheets (never edit directly) |
| `content-pipeline/stage1/`             | Raw LLM-generated task drafts before any validation                            |
| `content-pipeline/stage2/`             | Tasks that passed schema validation, awaiting human review                     |
| `content-pipeline/validated/`          | Human-approved tasks ready for DB import                                       |
| `content-pipeline/flagged/`            | Tasks with issues flagged by validator or reviewer — needs rework              |
| `content-pipeline/rejected/`           | Permanently rejected tasks (kept for audit trail)                              |
| `content-pipeline/scripts/`            | Pipeline automation scripts (TypeScript)                                       |
| `content-pipeline/scripts/validators/` | Schema and content validators                                                  |
| `content-pipeline/scripts/prompts/`    | LLM prompt templates for task generation                                       |
| `content-pipeline/schemas/`            | JSON Schema and reference docs (task.schema.json, error-codes.md)              |
| `content-pipeline/tests/fixtures/`     | Test fixture tasks for validator unit tests                                    |
| `content-pipeline/audio/human/`        | Human-recorded audio assets                                                    |
| `content-pipeline/audio/tts/`          | TTS-generated audio assets                                                     |

### Conventions

**Task ID format:** `G{band}-{num}-v{n}`

- `band`: `12` (Grades 1–2) or `24` (Grades 2–4)
- `num`: zero-padded 3-digit sequence, e.g. `001`
- `v{n}`: version suffix for revised tasks, e.g. `v2`
- Examples: `G12-001`, `G24-015-v2`

**Skill codes:** `S1`–`S8`

- S1=Үсэг авиаг зөв таних, S2=Үгийг зөв бичих, S3=Урт богино Балархай эгшгийг зөв ялгах
- S4=Гийгүүлэгчийг зөв ялгах, S5=Залгаварыг зөв залгах, S6=Өгүүлбэрийн тэмдэглэгээг зөв хийх
- S7=Сонсоод зөв буулгах, S8=Алдаагаа зөв таних

**Error→skill map:** `backend/src/lib/error-engine/error-skill-map.ts` (`ERROR_SKILL_MAP`, `skillsForError`, `skillsFromErrors`)

**Full error taxonomy (38 codes):** Full definitions in `content-pipeline/schemas/error-codes.md`

- Auto-classified (word-level): C1 → C2 → C4 → C5 → D3 → C3 → E1 → E2 → E3 → E7 → B3 → B1 → B2
- Auto-classified (sentence-level): G1 → G2 → G3 → G4 → G5 → H4 (self-check only)
- Metric-derived: H2 (speed), H3 (attention) via `detectMetricErrors()`
- Context-assigned (via task.error_targets): A1–A3, D1, D2, D4, D5, F1–F4, H1

**Task types (43):** `TT_*` naming convention. Option shapes in `content-pipeline/schemas/task.schema.json`. Defined in `shared/src/validators/task.ts:137–179`.

| Type | Options shape | Mongolian description |
|------|--------------|----------------------|
| `TT_1_1` | choiceOptions | Авиа сонсоод үсэг сонгох |
| `TT_1_2` | choiceOptions | Зурагт юу зурсныг үсгээр таних |
| `TT_1_3` | matchPairsOptions | Үсгүүдийг тохирох зургуудтай холбох |
| `TT_1_4` | assembleWordOptions | Үг угсрах |
| `TT_1_5` | choiceOptions | Төсөөтэй үсгүүдийг ялгах |
| `TT_2_1` | fillOptions | Зураг харж дутуу үсэг нөхөх |
| `TT_2_2` | assembleWordOptions | Үсэг угсарч үг болгох |
| `TT_2_3` | choiceOptions | Зөв бичлэгийг сонгох |
| `TT_2_4` | fillOptions | Сонсоод үгт дутуу байгаа үсгийг нөхөх |
| `TT_2_5` | correctionOptions | Нийлмэл үг зөв бичих |
| `TT_2_6` | correctionOptions | Үгийн хэлбэр/бүтэц засах |
| `TT_3_1` | choiceOptions | Урт/богино эгшиг сонсоод сонгох |
| `TT_3_2` | fillOptions | Балархай эгшиг нөхөх |
| `TT_3_3` | matchPairsOptions | Зургуудийг тохирох үгтэй нь холбох |
| `TT_3_4` | choiceOptions | Эгшгийн зохицол шалгах |
| `TT_3_5` | correctionOptions | Илүү эгшиг олж засах |
| `TT_4_1` | choiceOptions | Төстэй сонсогддог гийгүүлэгчүүдийг ялгах |
| `TT_4_2` | choiceOptions | Үгийн төгсгөлийн гийгүүлэгч сонгох |
| `TT_4_3` | fillOptions | Дараалж орох гийгүүлэгчийг нөхөх |
| `TT_4_4` | fillOptions | Орхигдсон гийгүүлэгч нөхөх |
| `TT_4_5` | correctionOptions | Илүү гийгүүлэгч олж засах |
| `TT_5_1` | choiceOptions | Зөв нөхцлийг сонгох |
| `TT_5_2` | sentenceFillOptions | Чиглэлийн нөхцөл нөхөх |
| `TT_5_3` | matchPairsOptions | Үгийн зөв залгаврыг холбох |
| `TT_5_4` | choiceOptions | Үйл үгийн цаг сонгох |
| `TT_5_5` | fillOptions | Тохирох залгаврыг нөхөх |
| `TT_5_6` | choiceOptions | Олон тоо/харьяалал сонгох |
| `TT_5_7` | choiceOptions | Залгаврын зөв бичлэг сонгох |
| `TT_6_1` | choiceOptions | Өгүүлбэрийн эхэнд орох зөв хариулт сонгох |
| `TT_6_2` | choiceOptions | Өгүүлбэрийн төгсгөлийн тэмдэг сонгох |
| `TT_6_3` | correctionOptions | Өгүүлбэрийн төгсгөлийг олох |
| `TT_6_4` | correctionOptions | Таслал нэмэх |
| `TT_7_1` | copyOptions | Хуулж бичих |
| `TT_7_2` | visualMemoryOptions | Харж тогтоон бичих |
| `TT_7_3` | dictationOptions | Сонсож бичих — үг |
| `TT_7_4` | dictationOptions | Сонсож бичих — өгүүлбэр |
| `TT_7_5` | sentenceFillOptions | Нөхөж бичих цээж бичиг |
| `TT_7_6` | miniTextOptions | Сонсож бичих — мини эх |
| `TT_7_7` | choiceOptions | Сонсоод зөв хувилбар сонгох |
| `TT_8_1` | tapFindErrorOptions | Алдаа олж засах (олох) |
| `TT_8_2` | correctionOptions | Алдаа олж засах (засах) |
| `TT_8_3` | choiceOptions | Зөв/буруу өгүүлбэр сонгох |
| `TT_8_4` | selfCheckOptions | Өөрийн хариуг дахин шалгах |

## Frontend conventions

- **Next.js 16, not 14/15.** The `middleware.ts` file convention has been renamed to `proxy.ts` (export `proxy()` not `middleware()`). When in doubt, read `frontend/node_modules/next/dist/docs/` before writing — the AGENTS.md inside `frontend/` enforces this.
- **Locale:** `<html lang="mn">`. Body copy is Mongolian (Cyrillic).
- **State:**
  - Server data → React Query (`@tanstack/react-query`).
  - URL-shareable state → search params, never `useState`.
  - Form state → `react-hook-form` + Zod resolver against `@app/shared` schemas.
  - Auth profile (no token) → Zustand store in `lib/stores/authStore.ts`.
- **API access:**
  - Server Components: `lib/api/server.ts` (forwards cookies via `next/headers`).
  - Client Components: `lib/api/client.ts` (uses `credentials: 'include'`, same-origin via rewrite).
  - Both throw a typed `ApiError` / `UnauthorizedError` on `success: false`.
- **Diagnostic / lesson state:** server-side only (`DiagnosticSession`, `Lesson` rows). **Do not** mirror progress into `sessionStorage` or localStorage.

## Hard rules

1. **Never invent seed words.** All vocabulary must come from the master content bank (`docs/0. Агуулгын бүтэц, тохиргоо.xlsx`) or be explicitly approved by a human reviewer.
2. **Never change error code definitions without asking.** The 12 MVP error codes are locked. Adding, renaming, or redefining a code requires explicit user approval and a schema version bump.
3. **Never write directly to `seed-data/`.** That folder is read-only reference. Scripts may read from it but must never modify or overwrite its files.
4. **Rejected tasks stay.** Move to `rejected/` with a rejection note — do not delete, as they form the audit trail.
