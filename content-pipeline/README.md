# content-pipeline

Content authoring and validation pipeline for the Mongolian Spelling & Dictation app.

This folder is separate from the application source (`src/`) and seed infrastructure (`prisma/`). It holds the schemas, tooling, and source data needed to author, validate, and import new tasks and words into the database.

---

## 8-Session Pipeline Overview

```
Session 0 — Setup
Session 1 — Ingest
Session 2 — Validators
Session 3 — Assembler
Session 4 — LLM Generation
Session 5 — Human Review
Session 6 — Audio
Session 7 — DB Seed
```

### Session 0 — Setup
- Confirm folder structure exists (all subdirs under `content-pipeline/`)
- Verify `content-pipeline/schemas/task.schema.json` is current
- Confirm error codes in `content-pipeline/schemas/error-codes.md` match `src/lib/error-engine/error-classifier.ts`
- Export master spreadsheets to `content-pipeline/seed-data/` (read-only — never edit)

### Session 1 — Ingest
- Parse `seed-data/words.csv` and `seed-data/tasks_g12.csv` / `seed-data/tasks_g24.csv`
- Cross-reference against existing DB records to find gaps
- Produce an ingest report: how many words, how many tasks per type, coverage by skill/grade

### Session 2 — Validators
- Run `scripts/validators/` against every task in `stage1/`
- Schema validation: must pass `task.schema.json`
- Content rules: task ID format, required Mongolian text, valid enum values, error code existence
- Move passing tasks to `stage2/`, failing tasks to `flagged/` with error annotations

### Session 3 — Assembler
- Assemble validated tasks from `stage2/` into batch JSON files grouped by grade band and skill
- Check for duplicate IDs and sequence gaps
- Output ready-to-generate specs to `scripts/prompts/` for LLM generation

### Session 4 — LLM Generation
- Use prompt templates in `scripts/prompts/` to generate new task drafts via LLM
- Output raw drafts to `stage1/`
- Run Session 2 validators immediately; move results to `stage2/` or `flagged/`

### Session 5 — Human Review
- Reviewer inspects all tasks in `stage2/`
- Approve → move to `validated/`
- Flag for rework → move back to `flagged/` with notes
- Reject permanently → move to `rejected/` with rejection reason

### Session 6 — Audio
- For tasks in `validated/` that require audio (`TT4_DICTATION`, `TT5_MINI_TEXT`, audio-trigger `TT1_CHOICE`):
  - TTS audio → `audio/tts/`
  - Human-recorded audio → `audio/human/`
- Update `audio_url` fields in task records

### Session 7 — DB Seed
- Import all tasks from `validated/` into the database via `prisma/seed.ts` or a dedicated import script
- Run post-import checks: count by type, skill coverage, grade band distribution
- Archive imported batch files with a datestamp

---

## Folder structure

```
content-pipeline/
├── README.md                    ← this file
├── schemas/
│   ├── task.schema.json         ← JSON Schema (draft-07) for a single Task record
│   └── error-codes.md           ← Definitions for all 12 MVP error codes
├── seed-data/                   ← READ-ONLY exports from master content bank
├── stage1/                      ← Raw LLM-generated drafts (pre-validation)
├── stage2/                      ← Schema-valid tasks awaiting human review
├── validated/                   ← Human-approved, ready for DB import
├── flagged/                     ← Tasks with issues — needs rework
├── rejected/                    ← Permanently rejected (audit trail)
├── scripts/
│   ├── validators/              ← Schema + content validation scripts
│   └── prompts/                 ← LLM prompt templates for task generation
├── tests/
│   └── fixtures/                ← Test fixture tasks for validator unit tests
└── audio/
    ├── human/                   ← Human-recorded audio assets
    └── tts/                     ← TTS-generated audio assets
```

---

## Schemas

### `schemas/task.schema.json`

JSON Schema covering all six task types (`TT1_CHOICE` through `TT6_SELF_CHECK`).
The `options` field is a discriminated union — each task type has its own shape:

| Task type | Description | Key `options` fields |
|---|---|---|
| `TT1_CHOICE` | Pick the correct word/spelling | `choices[]`, `audio_trigger` |
| `TT2_FILL` | Fill in the missing character(s) | `display_text`, `blank_position`, `blank_answer`, `context_word` |
| `TT3_CORRECTION` | Find and fix the error | `incorrect_text`, `correct_text`, `error_type`, `hint` |
| `TT4_DICTATION` | Listen and transcribe words | `audio_text`, `word_count`, `expected_answers`, `allow_partial` |
| `TT5_MINI_TEXT` | Listen and transcribe a short passage | `audio_text`, `sentence_count`, `expected_answers` |
| `TT6_SELF_CHECK` | Compare own answer to model answer | `original_attempt`, `model_answer`, `comparison_mode` |

### `schemas/error-codes.md`

Definitions for the 12 MVP error codes classified by `src/lib/error-engine/error-classifier.ts`, grouped by family:

| Family | Codes | Topic |
|---|---|---|
| B | B1, B3 | Letter omission / transposition |
| C | C1, C2, C4 | Vowel length and reduced-vowel errors |
| D | D3 | Consonant / near-vowel confusion |
| E | E1, E2, E7 | Suffix errors |
| G | G1, G2 | Capitalization and end-punctuation |
| H | H4 | Self-check failure (TT6 only) |

Classification priority order: **C1 → C2 → C4 → D3 → E1 → E2 → E7 → B3 → B1 → G1 → G2 → H4**

---

## Conventions

**Task ID format:** `G{band}-{num}-v{n}`
- `band`: `12` = Grades 1–2, `24` = Grades 2–4
- `num`: zero-padded 3-digit sequence (e.g. `001`)
- `v{n}`: optional version suffix for revisions (e.g. `-v2`)
- Examples: `G12-001`, `G24-015-v2`

**Skill codes:** `S1`–`S8` (see `CLAUDE.md` for full names)

**Hard rules:**
1. Never invent seed words — all vocabulary from master content bank only
2. Never change error code definitions without explicit approval
3. `seed-data/` is read-only — scripts may read, never write
4. Rejected tasks go to `rejected/` with notes — never delete

---

## Related files

| Path | Purpose |
|---|---|
| `prisma/seed.ts` | Current seed script — hard-coded words/tasks until CSV pipeline is ready |
| `prisma/schema.prisma` | DB schema — canonical source for enum values |
| `src/lib/error-engine/error-classifier.ts` | Runtime classifier — must match error-codes.md |
| `docs/` | Source design documents and content spreadsheets |
| `docs/0. Агуулгын бүтэц, тохиргоо.xlsx` | Master content bank (source for seed-data/) |
| `docs/Task_Bank_Blueprint_Grades_1_2.docx` | Task specs for Grades 1–2 |
| `docs/Task_Bank_Blueprint_Grades_2_4.docx` | Task specs for Grades 2–4 |
