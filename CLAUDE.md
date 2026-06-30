# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phase 2 of a Mongolian Spelling & Dictation Learning Application — adaptive educational system for Grades 1–4. The repo is an **npm workspaces monorepo** with three packages:

| Workspace    | Purpose                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `backend/`   | Hono + Prisma API on Postgres. Routes: auth, learner, diagnostic, lesson, plan, checkpoint, dashboard, admin |
| `shared/`    | `@app/shared` — Zod schemas and shared TS types. Single source of truth for request/response contracts       |

`content-pipeline/` is at the repo root and is **not** a workspace; it imports the Prisma client from `../../backend/generated/prisma`.

## Environment Setup

Requires PostgreSQL 18+ on port **5433**, database `mongolian_app`.

`backend/.env` (not committed):

```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5433/mongolian_app?schema=public"
JWT_SECRET="<at least 64 chars>"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

Setup sequence:

```bash
npm install
npm --workspace=@app/backend run db:generate
npm --workspace=@app/backend run db:migrate
npm --workspace=@app/backend run seed
```

Start the dev server:

```bash
npm run dev:backend     # Hono on :3001
```

## Key Commands (run from repo root unless noted)

| Command                                      | Purpose                           |
| -------------------------------------------- | --------------------------------- |
| `npm run dev:backend`                        | Start Hono backend                |
| `npm run test:backend`                       | Jest suite                        |
| `npm run seed`                               | Seed Word and Task tables         |
| `npm run db:migrate`                         | Apply pending migrations          |
| `npm run db:generate`                        | Regenerate Prisma client          |
| `npm --workspace=@app/backend run db:studio` | Browse database                   |
| `npm run pipeline:generate`                  | LLM task generation → `stage1/`   |
| `npm run pipeline:review`                    | LLM review pass → `stage2/`       |
| `npm run pipeline:import`                    | Import validated tasks to DB      |
| `npm run pipeline:tts`                       | Generate TTS audio                |
| `npm run pipeline:images`                    | Generate images                   |
| `npm run pipeline:upload-audio`              | Upload audio assets to R2         |
| `npm run pipeline:upload-images`             | Upload image assets to R2         |

## Session Workflow

### Before writing any code

A change is **complex** if it touches any of:
- A new or modified backend route
- `backend/prisma/schema.prisma`
- Anything inside `shared/` (cross-workspace impact)
- Error codes or skill mappings (`error-skill-map.ts`, `error-codes.md`)
- Content pipeline scripts or stage logic
- Security-touching code (auth, middleware, rate limiting)

For complex changes, follow this sequence before writing a single line:

1. **Establish a baseline** — run `npm run test:backend`. If tests are already failing, stop and report before touching anything.
2. **Blast radius check** — identify every file that will change and which workspaces are affected. State this explicitly.
3. **Flag critical chains:**
   - `schema.prisma` touched → sequence is `db:generate` → `db:migrate` → update `seed.ts` if needed. Do not skip steps.
   - `shared/` touched → changes land in both backend and frontend simultaneously. Check both sides.
   - Error codes touched → also requires `error-skill-map.ts`, `error-codes.md`, and any affected `error_targets` on existing tasks.
4. **State the plan** — describe what you will do and which files you will change. Wait for confirmation before proceeding.

### After writing code

1. Run `npm run test:backend` — report pass/fail and any new failures.
2. Run `npx tsc --noEmit` inside the affected workspace if any types were touched.
3. **Never** move files from `content-pipeline/stage2/` → `validated/` autonomously — that step requires human review.

---

## Shared Zod Schemas

`shared/src/validators/*` define request schemas (`registerSchema`, `loginSchema`, `createLearnerSchema`, etc.). Both backend and frontend import them as:

```ts
import { createLearnerSchema } from "@app/shared";
```

TS path aliases are wired in `backend/tsconfig.json`. **Don't duplicate schemas** — change them once in `shared/`.

**Task schema (`shared/src/validators/task.ts`)** is the **single source of truth for all task-creation paths**:

- `POST /api/admin/content/tasks` (create by hand) uses `createTaskSchema`
- `POST /api/admin/content/generate` (AI pipeline) validates variants via `taskContentSchema`
- `content-pipeline/scripts/ingest.ts` calls `validateTaskContent` from `@app/shared`
- `content-pipeline/scripts/validators/schemaValidator.ts` delegates to `validateTaskContent`

The `TaskSource` enum (`HUMAN` | `AI`) is set automatically: hand-created and pipeline imports get `HUMAN`; only the LLM generator writes `AI`. The `source` column exists on both `Task` and `TaskDraft` tables and is propagated through `/approve`.

## TypeScript Config

- Backend: strict, CommonJS, target ES2022, `ts-node` for runtime
- Shared: emits `.d.ts` so editor tooling resolves types in backend


## Hard Rules

1. **Never invent seed words.** All vocabulary must come from the master content bank (`docs/0. Агуулгын бүтэц, тохиргоо.xlsx`) or be explicitly approved by a human reviewer.
2. **Never change error code definitions without asking.** All 38 error codes are locked. Adding, renaming, or redefining a code requires explicit user approval and a schema version bump.
3. **Never write directly to `seed-data/`.** That folder is read-only reference. Scripts may read from it but must never modify or overwrite its files.
4. **Rejected tasks stay.** Move to `rejected/` with a rejection note — do not delete, as they form the audit trail.
