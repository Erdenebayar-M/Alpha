# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phase 2 of a Mongolian Spelling & Dictation Learning Application — adaptive educational system for Grades 1–4. The repo is now an **npm workspaces monorepo** with three packages:

| Workspace | Purpose |
|-----------|---------|
| `backend/` | Hono + Prisma API on Postgres. Phase 1 routes (auth, learner, diagnostic, lesson, plan, checkpoint, dashboard) and seed scripts. |
| `frontend/` | Next.js 16 (App Router, React 19, Turbopack). UI for parent dashboard, diagnostic, and daily lesson flows. |
| `shared/` | `@app/shared` — Zod schemas and shared TS types imported by both backend and frontend. Single source of truth for request/response contracts. |

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

| Command | Purpose |
|---------|---------|
| `npm run dev:backend` | Start Hono backend |
| `npm run dev:frontend` | Start Next.js dev server |
| `npm run test:backend` | Jest suite (583 tests) |
| `npm run seed` | Seed Word and Task tables |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm --workspace=@app/frontend run build` | Production build of frontend |
| `npm --workspace=@app/backend run db:studio` | Browse database |

## Architecture

### Auth model
JWT carried in an **HttpOnly + SameSite=Strict cookie** (`auth_token`). Set by `POST /api/auth/login` and `POST /api/auth/register`, cleared by `POST /api/auth/logout`, profile fetched via `GET /api/auth/me`. The `withAuth` middleware reads the cookie first; a `Bearer` header is accepted as a fallback for tests/legacy callers. **Never** expose the token to JS — frontend Zustand store holds only the parent profile.

### Frontend ↔ Backend wiring
Same-origin via Next.js rewrites: `/api/:path*` → `http://localhost:3001/api/:path*`. Cookies "just work" without CORS contortions. Server Components forward incoming cookies via `lib/api/server.ts` (`cookies()` from `next/headers`); browser fetches use `lib/api/client.ts` with `credentials: 'include'`.

### Data Model (3-tier structure in `backend/prisma/schema.prisma`)

**User tier**: `Parent` → `Learner` → `LearnerSkillState`
- Learners have a `variant` (A = Grades 1–2, gamified, 5–8 min; B = Grades 2–4, structured, 10–15 min)
- `LearnerSkillState` tracks mastery (`M0`–`M5`) and confidence (`LOW/MEDIUM/HIGH`) for 8 skills (`S1`–`S8`)

**Content bank**: `Word` + `Task`
- `Word`: vocabulary with image/audio asset references
- `Task`: 6 types — `choice`, `fill_in`, `correction`, `dictation`, `mini_text`, `self_check`

**Learning path**: `DiagnosticSession` → `Plan` → `Lesson` → `Checkpoint`
- Diagnostic: 3-phase adaptive assessment (PHASE_A: 8 tasks, PHASE_B: 8 adaptive, PHASE_C: 4 boundary)
- Plan: 7–14 day personalized plan (`BALANCED/INTENSIVE/STABILIZATION`)
- Checkpoint: mid-plan assessment with decisions (`CONTINUE_PLAN / NEW_PLAN / LEVEL_UP`)

**Execution**: `Attempt` + `ErrorLog`
- Attempts scored: `0 / 0.25 / 0.5 / 0.75 / 1.0`
- 21 Mongolian spelling error codes: `A1–A3`, `B1–B4`, `C1–C6`, `D3`, `D5`, `E1–E2`, `E7`, `G1–G2`, `H1`, `H4`

### Prisma Client

Auto-generated into `backend/generated/prisma/` (gitignored). Always run `npm run db:generate` after schema changes. Import from `"../generated/prisma"` (relative to `backend/src/...`) inside backend code. **Do not import the Prisma client from frontend** — frontend communicates via the API only and pulls types from `@app/shared`.

### Shared Zod schemas

`shared/src/validators/*` define request schemas (`registerSchema`, `loginSchema`, `createLearnerSchema`, etc.). Both sides import them as:
```ts
import { createLearnerSchema } from '@app/shared';
```
TS path aliases are wired in both `backend/tsconfig.json` and `frontend/tsconfig.json`. **Don't duplicate schemas** — change them once in `shared/`.

### TypeScript Config

- Backend: strict, CommonJS, target ES2022, `ts-node` for runtime
- Frontend: Next.js defaults (ESM, bundler resolution, JSX preserve)
- Shared: emits `.d.ts` so editor tooling resolves types in both consumers

## Reference Documentation

Detailed specs live in `/docs/`:
- `Pre_Coding_Design_Document.docx` — Phase 1 technical design
- `Mongolian_Writing_App_Product_Requirements_Master_updated.docx` — Full PRD
- `Task_Bank_Blueprint_Grades_1_2.docx` / `Task_Bank_Blueprint_Grades_2_4.docx` — Task type specs
- `Phase1_Schema_Review.docx` — Schema design rationale
- `0. Агуулгын бүтэц, тохиргоо.xlsx` — Source content bank (basis for seed data)
- `1. Оношилгооны дасгалууд_матриц.xlsx` — Diagnostic task matrix

## Content Pipeline (Phase 4)

### Pipeline location: `content-pipeline/`

All content authoring, validation, and LLM generation tooling lives here, separate from `backend/` and `frontend/`. Scripts that need DB access import the Prisma client from `../../backend/generated/prisma`.

### Folder purposes

| Folder | Purpose |
|--------|---------|
| `content-pipeline/seed-data/` | **Read-only** reference exports from master spreadsheets (never edit directly) |
| `content-pipeline/stage1/` | Raw LLM-generated task drafts before any validation |
| `content-pipeline/stage2/` | Tasks that passed schema validation, awaiting human review |
| `content-pipeline/validated/` | Human-approved tasks ready for DB import |
| `content-pipeline/flagged/` | Tasks with issues flagged by validator or reviewer — needs rework |
| `content-pipeline/rejected/` | Permanently rejected tasks (kept for audit trail) |
| `content-pipeline/scripts/` | Pipeline automation scripts (TypeScript) |
| `content-pipeline/scripts/validators/` | Schema and content validators |
| `content-pipeline/scripts/prompts/` | LLM prompt templates for task generation |
| `content-pipeline/schemas/` | JSON Schema and reference docs (task.schema.json, error-codes.md) |
| `content-pipeline/tests/fixtures/` | Test fixture tasks for validator unit tests |
| `content-pipeline/audio/human/` | Human-recorded audio assets |
| `content-pipeline/audio/tts/` | TTS-generated audio assets |

### Conventions

**Task ID format:** `G{band}-{num}-v{n}`
- `band`: `12` (Grades 1–2) or `24` (Grades 2–4)
- `num`: zero-padded 3-digit sequence, e.g. `001`
- `v{n}`: version suffix for revised tasks, e.g. `v2`
- Examples: `G12-001`, `G24-015-v2`

**Skill codes:** `S1`–`S8`
- S1=Үсэг-авиа ялгалт, S2=Үгийн зөв бичлэг, S3=Урт/богино эгшиг
- S4=Балархай эгшиг, S5=Залгавар/нөхцөл, S6=Өгүүлбэрийн тэмдэглэгээ
- S7=Сонсголоор буулгах, S8=Алдаа засах

**MVP error codes (12):** `B1`, `B3`, `C1`, `C2`, `C4`, `D3`, `E1`, `E2`, `E7`, `G1`, `G2`, `H4`
- Full definitions and examples: `content-pipeline/schemas/error-codes.md`
- Classification priority order: C1 → C2 → C4 → D3 → E1 → E2 → E7 → B3 → B1 → G1 → G2 → H4

**Task types (6):** `TT1_CHOICE`, `TT2_FILL`, `TT3_CORRECTION`, `TT4_DICTATION`, `TT5_MINI_TEXT`, `TT6_SELF_CHECK`
- Full JSONB shape for each type: `content-pipeline/schemas/task.schema.json`

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
