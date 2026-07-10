# CLAUDE.md — content-pipeline/

Content authoring, validation, and LLM generation tooling. Read this alongside the root CLAUDE.md.

Scripts that need DB access import the Prisma client from `../../backend/generated/prisma`.

## Pipeline Workflow

Tasks move through stages in order. Never skip a stage or auto-promote without the step described.

```
1. npm run pipeline:generate     → raw drafts land in stage1/
2. npm run pipeline:review       → validated drafts move to stage2/
3. Human review                  → approve → validated/  |  reject → rejected/  |  needs work → flagged/
4. npm run pipeline:import       → imports stage1/stage2/flagged/needs_revision JSON into the task_drafts review queue (runs importDrafts.ts; validated/ tasks graduate to the live Task table separately, via the admin API's /approve endpoint — never by re-importing the folder)
5. npm run pipeline:images       → generate images for imported tasks
6. npm run pipeline:tts          → generate TTS audio
7. npm run pipeline:upload-images → upload images to R2
8. npm run pipeline:upload-audio  → upload audio to R2
```

**Step 3 (human review) is a hard gate — never automate it.** Do not move files from `stage2/` → `validated/` programmatically.

If a task has issues after human review: move to `flagged/` with a note, not `rejected/`. `rejected/` is permanent.

## Folder Purposes

| Folder        | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `stage1/`     | Raw LLM-generated drafts before any validation                             |
| `stage2/`     | Passed schema validation, awaiting human review                            |
| `validated/`  | Human-approved tasks ready for DB import                                   |
| `flagged/`    | Issues found by validator or reviewer — needs rework before re-submitting  |
| `rejected/`   | Permanently rejected (kept for audit trail — never delete)                 |
| `schemas/`    | JSON Schema + reference docs (`task.schema.json`, `error-codes.md`)        |
| `scripts/`    | Pipeline automation scripts (TypeScript)                                   |
| `scripts/validators/` | Schema and content validators                                      |
| `scripts/prompts/`    | LLM prompt templates for task generation                           |
| `tests/fixtures/`     | Test fixture tasks for validator unit tests                        |
| `audio/`      | Audio assets (`human-recording-script.csv`, `tts-queue.csv`, logs)         |
| `images/`     | Image assets and generation logs                                           |
| `generated/`  | Intermediate generated outputs                                             |

## Task ID Format

`G{band}-{num}-v{n}`

- `band`: `12` (Grades 1–2) or `24` (Grades 2–4)
- `num`: zero-padded 3-digit sequence, e.g. `001`
- `v{n}`: version suffix for revised tasks (omit on first version)
- Examples: `G12-001`, `G24-015-v2`

## Skill Codes

| Code | Mongolian description |
|------|-----------------------|
| S1 | Үсэг авиаг зөв таних |
| S2 | Үгийг зөв бичих |
| S3 | Урт богино Балархай эгшгийг зөв ялгах |
| S4 | Гийгүүлэгчийг зөв ялгах |
| S5 | Залгаварыг зөв залгах |
| S6 | Өгүүлбэрийн тэмдэглэгээг зөв хийх |
| S7 | Сонсоод зөв буулгах |
| S8 | Алдаагаа зөв таних |

**Error → skill map:** `backend/src/lib/error-engine/error-skill-map.ts` (`ERROR_SKILL_MAP`, `skillsForError`, `skillsFromErrors`)

## Error Taxonomy (38 codes)

Full definitions in `schemas/error-codes.md`. All 38 codes are locked — never add, rename, or redefine without explicit approval.

- Auto-classified (word-level): C1 → C2 → C4 → C5 → D3 → C3 → E1 → E2 → E3 → E7 → B3 → B1 → B2
- Auto-classified (sentence-level): G1 → G2 → G3 → G4 → G5 → H4 (self-check only)
- Metric-derived: H2 (speed), H3 (attention variability) via `detectMetricErrors()`
- Context-assigned via `task.error_targets`: A1–A3, D1, D2, D4, D5, F1–F4, H1

## Task Types (43)

Defined in `shared/src/validators/task.ts:135–179`. Option shapes in `schemas/task.schema.json`.

| Type | Options shape | Mongolian description |
|------|---------------|-----------------------|
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

## Hard Rules

- **Never invent vocabulary.** All words must come from the master content bank or be explicitly approved.
- **Never change error code definitions without asking.** All 38 codes are locked.
- **Never write to `seed-data/`.** It is read-only reference — scripts may read, never modify.
- **Rejected tasks stay.** Move to `rejected/` with a rejection note — never delete.
- **Never auto-promote `stage2/` → `validated/`.** Human review is required at that gate.
