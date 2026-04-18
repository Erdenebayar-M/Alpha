#!/usr/bin/env tsx
/**
 * Ingest Mongolian content from Excel files into JSON.
 * Usage: npx tsx content-pipeline/scripts/ingest.ts
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const DOCS_DIR = path.join(__dirname, '../../docs');
const OUT_DIR  = path.join(__dirname, '../generated');
const MAIN_XL  = path.join(DOCS_DIR, '0. Агуулгын бүтэц, тохиргоо.xlsx');
const CONF_XL  = path.join(DOCS_DIR, 'M0-M1 түвшний эргэлзээтэй үгсийн жагсаалт.xlsx');

// ── Zod validation schemas ──────────────────────────────────────────────────

const SkillCodeEnum = ['S1','S2','S3','S4','S5','S6','S7','S8'] as const;
const SkillCode = z.enum(SkillCodeEnum);

const TaskBaseSchema = z.object({
  id:                      z.string().min(1),
  task_type:               z.enum(['TT1_CHOICE','TT2_FILL','TT3_CORRECTION','TT4_DICTATION','TT5_MINI_TEXT','TT6_SELF_CHECK']),
  title:                   z.string().min(1),
  prompt_text:             z.string().min(1),
  correct_answer:          z.string().min(1),
  primary_skill:           SkillCode,
  level_target:            z.string().min(1),
  error_targets:           z.array(z.string()),
  grade_band:              z.array(z.enum(['G1','G2','G3','G4'])).min(1),
  difficulty:              z.number().min(1).max(5),
  estimated_time_seconds:  z.number().min(1),
  review_after_days:       z.array(z.number()),
  lesson_slot_fit:         z.enum(['WARM_UP','CORE','MIXED','END']),
  feedback_text:           z.string().min(1),
});

const OptionsSchemas: Record<string, z.ZodType> = {
  TT1_CHOICE: z.object({
    choices:       z.array(z.object({ text: z.string(), is_correct: z.boolean() })).min(2).max(4),
    audio_trigger: z.boolean(),
  }),
  TT2_FILL: z.object({
    display_text:   z.string(),
    blank_position: z.number().min(0),
    blank_answer:   z.string(),
    context_word:   z.string(),
  }),
  TT3_CORRECTION: z.object({
    incorrect_text: z.string(),
    correct_text:   z.string(),
    error_type:     z.string(),
    hint:           z.string(),
  }),
  TT4_DICTATION: z.object({
    audio_text:       z.string(),
    word_count:       z.number().min(1),
    expected_answers: z.array(z.string()),
    allow_partial:    z.boolean(),
  }),
  TT5_MINI_TEXT: z.object({
    audio_text:       z.string(),
    sentence_count:   z.number().min(1),
    expected_answers: z.array(z.string()),
  }),
  TT6_SELF_CHECK: z.object({
    original_attempt: z.string(),
    model_answer:     z.string(),
    comparison_mode:  z.enum(['side_by_side','highlight_diff']),
  }),
};

function validateTask(task: unknown): { ok: boolean; errors: string[] } {
  const errs: string[] = [];
  const base = TaskBaseSchema.safeParse(task);
  if (!base.success) {
    errs.push(...base.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`));
  }
  const t = task as Record<string, unknown>;
  const optSchema = OptionsSchemas[String(t.task_type ?? '')];
  if (optSchema) {
    const opt = optSchema.safeParse(t.options);
    if (!opt.success) {
      errs.push(...opt.error.issues.map(i => `options.${i.path.join('.') || 'root'}: ${i.message}`));
    }
  }
  return { ok: errs.length === 0, errors: errs };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function splitList(val: unknown, sep = ','): string[] {
  if (!val || typeof val !== 'string') return [];
  return val.split(sep).map(s => s.trim()).filter(Boolean);
}

function levelToDifficulty(level: string): number {
  if (level.startsWith('M0')) return 1;
  if (level.startsWith('M1')) return 2;
  if (level.startsWith('M2')) return 3;
  if (level.startsWith('M3')) return 4;
  return 5;
}

function getGradeBand(taskId: string): string[] {
  if (taskId.startsWith('G12')) return ['G1','G2'];
  if (taskId.startsWith('G24')) return ['G2','G3','G4'];
  return ['G1'];
}

// ── 1. Seed words ───────────────────────────────────────────────────────────

function ingestWords(wb: XLSX.WorkBook) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Master_Asset_Bank'], { header: 1 });
  const words = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !String(r[0]).startsWith('W')) continue;

    words.push({
      id:               String(r[0]),
      word:             String(r[1] ?? '').trim(),
      category:         String(r[2] ?? '').trim(),
      grade_band:       String(r[3] ?? '').trim(),
      letter_count:     Number(r[4]) || 0,
      word_count:       Number(r[5]) || 1,
      skills:           splitList(r[6]),
      errors:           splitList(r[7]),
      image_ok:         r[8] === true || String(r[8]).toLowerCase() === 'true',
      audio_ok:         r[9] === true || String(r[9]).toLowerCase() === 'true',
      image_prompt:     String(r[10] ?? '').trim(),
      audio_text:       String(r[11] ?? '').trim(),
      sentence:         String(r[12] ?? '').trim(),
      distractors:      String(r[13] ?? '').split(/[;,]/).map((s: string) => s.trim()).filter(Boolean),
      blank_template:   String(r[14] ?? '').trim(),
      correct_spelling: String(r[15] ?? '').trim(),
      review_status:    String(r[16] ?? '').trim(),
    });
  }
  return words;
}

// ── 2. Content spec (lookup + full export) ───────────────────────────────────

interface SpecLookup { skill: string | null; level: string; error: string }

function buildSpecMap(wb: XLSX.WorkBook): Map<string, SpecLookup> {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Content_Spec_Table'], { header: 1 });
  const map = new Map<string, SpecLookup>();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !String(r[0]).startsWith('G')) continue;
    map.set(String(r[0]).trim(), {
      skill: r[2] ? String(r[2]).trim() : null,
      level: String(r[3] ?? 'M1').trim(),
      error: String(r[4] ?? 'B1').trim(),
    });
  }
  return map;
}

function ingestSpecsFull(wb: XLSX.WorkBook) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Content_Spec_Table'], { header: 1 });
  const headers = (rows[2] as string[]) ?? [];
  const specs = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !String(r[0]).startsWith('G')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? null; });
    specs.push(obj);
  }
  return specs;
}

// ── 3. Sample tasks ─────────────────────────────────────────────────────────

const MN_TYPE_MAP: Record<string, string> = {
  'Сонсож сонгох':      'TT1_CHOICE',
  'Зураг-үг тааруулах': 'TT1_CHOICE',
  'Зөвийг сонгох':      'TT1_CHOICE',
  'Энгийн залгавар':    'TT1_CHOICE',
  'Үсэг нөхөх':         'TT2_FILL',
  'Нөхөж бичих':        'TT2_FILL',
  'Дутуу үсэг':         'TT2_FILL',
  'Хуулж бичих':        'TT2_FILL',
  'Үгийн төгсгөл':      'TT2_FILL',
  'Алдаа олох':         'TT3_CORRECTION',
  'Том үсэг, цэг':      'TT3_CORRECTION',
  'Үгийн багц диктант': 'TT4_DICTATION',
  '2 үгийн диктант':    'TT4_DICTATION',
  'Өөрийгөө шалгах':    'TT6_SELF_CHECK',
};

const TYPE_DEFAULT_SKILL: Record<string, string> = {
  TT1_CHOICE:     'S1',
  TT2_FILL:       'S2',
  TT3_CORRECTION: 'S8',
  TT4_DICTATION:  'S7',
  TT5_MINI_TEXT:  'S7',
  TT6_SELF_CHECK: 'S8',
};

const TYPE_SLOT: Record<string, string> = {
  TT1_CHOICE:     'WARM_UP',
  TT2_FILL:       'CORE',
  TT3_CORRECTION: 'CORE',
  TT4_DICTATION:  'CORE',
  TT5_MINI_TEXT:  'END',
  TT6_SELF_CHECK: 'END',
};

const TYPE_TIME: Record<string, number> = {
  TT1_CHOICE:     30,
  TT2_FILL:       45,
  TT3_CORRECTION: 60,
  TT4_DICTATION:  90,
  TT5_MINI_TEXT:  180,
  TT6_SELF_CHECK: 60,
};

function buildOptions(taskType: string, r: unknown[], spec: SpecLookup | undefined): unknown {
  const prompt        = String(r[2] ?? '').trim();
  const optionsRaw    = String(r[3] ?? '').trim();
  const correctAnswer = String(r[4] ?? '').trim();
  const audioYes      = String(r[7] ?? '').toLowerCase() === 'yes';
  const feedbackText  = String(r[8] ?? '').trim();

  switch (taskType) {
    case 'TT1_CHOICE': {
      const parts = optionsRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      const choices = parts.map(text => ({ text, is_correct: text === correctAnswer }));
      if (!choices.some(c => c.is_correct) && choices.length > 0) {
        choices[0].is_correct = true;
      }
      return { choices, audio_trigger: audioYes };
    }

    case 'TT2_FILL': {
      const display = prompt.replace(/^(Аудио\+текст|Аудио)\s*:\s*/i, '').trim();
      const blankIdx = display.indexOf('_');
      return {
        display_text:   display,
        blank_position: blankIdx >= 0 ? blankIdx : 0,
        blank_answer:   correctAnswer,
        context_word:   blankIdx >= 0 ? display.replace('_', correctAnswer) : correctAnswer,
      };
    }

    case 'TT3_CORRECTION': {
      const errorType = spec?.error?.split('/')[0]?.trim() ?? 'G1';
      return {
        incorrect_text: prompt,
        correct_text:   correctAnswer,
        error_type:     errorType,
        hint:           feedbackText,
      };
    }

    case 'TT4_DICTATION': {
      const audioText      = prompt.replace(/^Аудио\s*:\s*/i, '').trim();
      const expectedAnswers = correctAnswer.split(';').map(s => s.trim()).filter(Boolean);
      return {
        audio_text:       audioText,
        word_count:       expectedAnswers.length,
        expected_answers: expectedAnswers,
        allow_partial:    expectedAnswers.length > 2,
      };
    }

    case 'TT6_SELF_CHECK': {
      const mOrig  = prompt.match(/Чи бичсэн:\s*([^\s/]+)/);
      const mModel = prompt.match(/Загвар:\s*(\S+)/);
      return {
        original_attempt: mOrig  ? mOrig[1].trim()  : '',
        model_answer:     mModel ? mModel[1].trim() : correctAnswer,
        comparison_mode:  'side_by_side' as const,
      };
    }

    default:
      return {};
  }
}

function ingestTasks(wb: XLSX.WorkBook, specMap: Map<string, SpecLookup>) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Sample_Assembled_Tasks'], { header: 1 });

  // Count occurrences per base ID to detect duplicates
  const idCount = new Map<string, number>();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !String(r[0]).startsWith('G')) continue;
    const bid = String(r[0]).trim();
    idCount.set(bid, (idCount.get(bid) ?? 0) + 1);
  }

  const idCursor = new Map<string, number>();
  const tasks = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || !String(r[0]).startsWith('G')) continue;

    const baseId    = String(r[0]).trim();
    const typeMn    = String(r[1] ?? '').trim();
    const taskType  = MN_TYPE_MAP[typeMn] ?? 'TT2_FILL';

    // Assign unique ID: single occurrence → keep as-is; duplicates → append -a, -b, …
    const cursor = idCursor.get(baseId) ?? 0;
    idCursor.set(baseId, cursor + 1);
    const isDuplicated = (idCount.get(baseId) ?? 1) > 1;
    const taskId = isDuplicated
      ? `${baseId}-${String.fromCharCode(97 + cursor)}`
      : baseId;

    const spec  = specMap.get(baseId);
    const rawSkill = spec?.skill ?? null;
    const primarySkill = (rawSkill && (SkillCodeEnum as readonly string[]).includes(rawSkill))
      ? rawSkill
      : TYPE_DEFAULT_SKILL[taskType] ?? 'S2';

    const level        = spec?.level ?? 'M1';
    const errorTargets = (spec?.error ?? 'B1').split('/').map(s => s.trim()).filter(Boolean);

    tasks.push({
      id:                     taskId,
      task_type:              taskType,
      title:                  typeMn,
      prompt_text:            String(r[2] ?? '').trim(),
      correct_answer:         String(r[4] ?? '').trim(),
      options:                buildOptions(taskType, r, spec),
      audio_url:              null,
      image_url:              null,
      primary_skill:          primarySkill,
      secondary_skill:        null,
      level_target:           level,
      error_targets:          errorTargets,
      grade_band:             getGradeBand(baseId),
      difficulty:             levelToDifficulty(level),
      estimated_time_seconds: TYPE_TIME[taskType] ?? 45,
      review_after_days:      [1, 3, 7],
      lesson_slot_fit:        TYPE_SLOT[taskType] ?? 'CORE',
      feedback_text:          String(r[8] ?? '').trim(),
    });
  }
  return tasks;
}

// ── 4. Confusing words ───────────────────────────────────────────────────────

function ingestConfusingWords(wb: XLSX.WorkBook) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1 });
  const result: Record<string, Array<{ correct: string; misspelling: string; task: string }>> = {};
  let level = '';

  for (const r of rows) {
    if (!r || r.length === 0) continue;
    const cell0 = String(r[0] ?? '').trim();
    if (!cell0) continue;

    const lvlMatch = cell0.match(/^(M\d+)\s*[—\-]/);
    if (lvlMatch) {
      level = lvlMatch[1];
      if (!result[level]) result[level] = [];
      continue;
    }
    if (cell0 === 'Зөв үг') continue;

    if (level && r[1]) {
      result[level].push({
        correct:     cell0,
        misspelling: String(r[1]).trim(),
        task:        String(r[2] ?? '').trim(),
      });
    }
  }
  return result;
}

// ── main ─────────────────────────────────────────────────────────────────────

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const mainWb = XLSX.readFile(MAIN_XL);
  const confWb = XLSX.readFile(CONF_XL);

  // 1. Seed words
  const words = ingestWords(mainWb);
  writeJson(path.join(OUT_DIR, 'seed-words.json'), { count: words.length, words });

  // 2. Content specs
  const specMap   = buildSpecMap(mainWb);
  const fullSpecs = ingestSpecsFull(mainWb);
  writeJson(path.join(OUT_DIR, 'content-spec.json'), { count: fullSpecs.length, specs: fullSpecs });

  // 3. Sample tasks
  const tasks = ingestTasks(mainWb, specMap);
  writeJson(path.join(OUT_DIR, 'sample-tasks.json'), { count: tasks.length, tasks });

  // 4. Confusing words
  const confusing = ingestConfusingWords(confWb);
  const totalConfusing = Object.values(confusing).reduce((s, a) => s + a.length, 0);
  const levelCount     = Object.keys(confusing).length;
  writeJson(path.join(OUT_DIR, 'confusing-words.json'), confusing);

  // 5. Validate sample tasks
  let passed = 0, failed = 0;
  const failures: Array<{ id: string; errors: string[] }> = [];

  for (const task of tasks) {
    const { ok, errors } = validateTask(task);
    if (ok) { passed++; }
    else    { failed++; failures.push({ id: String((task as Record<string,unknown>).id ?? '?'), errors }); }
  }

  // Summary
  console.log(`Seed words: ${words.length}`);
  console.log(`Sample tasks: ${tasks.length} (${passed} passed schema, ${failed} failed)`);
  console.log(`Confusing words: ${totalConfusing} across ${levelCount} M levels`);
  console.log(`Content specs: ${fullSpecs.length}`);

  if (failures.length > 0) {
    console.log('\nFailed tasks:');
    for (const f of failures) {
      console.log(`  ${f.id}:`);
      for (const e of f.errors) console.log(`    - ${e}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
