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

## Content Pipeline (Phase 4)

### Pipeline location: `content-pipeline/`

All content authoring, validation, and LLM generation tooling lives here, separate from `src/` and `prisma/`.

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

### Hard rules

1. **Never invent seed words.** All vocabulary must come from the master content bank (`docs/0. Агуулгын бүтэц, тохиргоо.xlsx`) or be explicitly approved by a human reviewer.
2. **Never change error code definitions without asking.** The 12 MVP error codes are locked. Adding, renaming, or redefining a code requires explicit user approval and a schema version bump.
3. **Never write directly to `seed-data/`.** That folder is read-only reference. Scripts may read from it but must never modify or overwrite its files.
4. **Rejected tasks stay.** Move to `rejected/` with a rejection note — do not delete, as they form the audit trail.
