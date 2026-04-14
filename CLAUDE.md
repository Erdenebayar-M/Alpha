# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Phase 1** of a Mongolian Spelling & Dictation Learning Application — a database-first backend for an adaptive educational system targeting Grades 1–4. The current codebase is schema + seeding infrastructure only; no API or frontend exists yet.

## Environment Setup

Requires PostgreSQL 18+ running on port **5433** with database `mongolian_app`.

`.env` file (not committed):
```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5433/mongolian_app?schema=public"
```

Setup sequence:
```bash
npm install
npx prisma migrate deploy   # apply schema migrations
npm run seed                # populate Word and Task tables
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run seed` | Seed database (`ts-node prisma/seed.ts`) |
| `npx prisma migrate dev --name <name>` | Create a new migration from schema changes |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma studio` | Browse database in browser UI |

> **Note**: `npm test` is not yet configured — it exits with an error.

## Architecture

### Data Model (3-tier structure in `prisma/schema.prisma`)

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

Auto-generated into `/generated/prisma/` (gitignored). Always run `npx prisma generate` after schema changes. Import from `"../generated/prisma"` in TypeScript files.

### TypeScript Config

- Strict mode enabled, CommonJS output, target ES2020
- `ts-node` used for running `.ts` scripts directly (seeding)
- `prisma.config.ts` loads `DATABASE_URL` from `.env` via `dotenv`

## Reference Documentation

Detailed specs live in `/docs/`:
- `Pre_Coding_Design_Document.docx` — Phase 1 technical design
- `Mongolian_Writing_App_Product_Requirements_Master_updated.docx` — Full PRD
- `Task_Bank_Blueprint_Grades_1_2.docx` / `Task_Bank_Blueprint_Grades_2_4.docx` — Task type specs
- `Phase1_Schema_Review.docx` — Schema design rationale
- `0. Агуулгын бүтэц, тохиргоо.xlsx` — Source content bank (basis for seed data)
- `1. Оношилгооны дасгалууд_матриц.xlsx` — Diagnostic task matrix
