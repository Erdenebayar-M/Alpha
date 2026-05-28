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
  task_type:               z.enum(['TT_LISTEN_CHOOSE','TT_IMAGE_WORD_MATCH','TT_CHOOSE_CORRECT','TT_SIMPLE_SUFFIX','TT_WORD_FORM_CHOOSE','TT_SUFFIX_CHOOSE','TT_CONSONANT_CONFUSION','TT_LONG_VOWEL_CHALLENGE','TT_CASE_SUFFIX','TT_MIXED_REVIEW','TT_MIXED_WORD_SET','TT_MIXED_CHECKPOINT','TT_LETTER_FILL','TT_COPY_WRITE','TT_FILL_WRITE','TT_MISSING_LETTER','TT_WORD_ENDING','TT_LONG_VOWEL_FILL','TT_REDUCED_VOWEL','TT_SUFFIX_WRITE','TT_SENTENCE_FILL','TT_LONG_VOWEL_IN_SENTENCE','TT_REDUCED_VOWEL_IN_SENTENCE','TT_CAPITAL_PUNCTUATION','TT_FIND_ERROR','TT_FIX_ERROR','TT_WORD_FORM_FIX','TT_FIND_OMITTED_LETTER','TT_SENTENCE_BOUNDARY','TT_BASIC_COMMA','TT_EXPLAINED_CORRECTION','TT_WORD_SET_DICTATION','TT_TWO_WORD_DICTATION','TT_SHORT_SENTENCE_DICTATION','TT_TWO_SENTENCE_DICTATION','TT_MINI_TEXT_DICTATION','TT_SELF_CHECK','TT_OWN_WRITING_CORRECTION','TT_COMPOUND_SUFFIX']),
  title:                   z.string().min(1),
  prompt_text:             z.string().min(1),
  correct_answer:          z.string().min(1),
  primary_skill:           SkillCode,
  level_target:            z.string().min(1),
  error_targets:           z.array(z.string()),
  grade_band:              z.array(z.enum(['G1','G2','G3','G4'])).min(1),
  difficulty:              z.number().min(1).max(5),
  estimated_time_seconds:  z.number().min(1),
  lesson_slot_fit:         z.enum(['WARM_UP','CORE','MIXED','END']),
  feedback_text:           z.string().min(1),
});

const CHOICE_OPTS = z.object({
  choices:       z.array(z.object({ text: z.string(), is_correct: z.boolean() })).min(2).max(4),
  audio_trigger: z.boolean(),
});
const FILL_OPTS = z.object({
  display_text:   z.string(),
  blank_position: z.number().min(0),
  blank_answer:   z.string(),
  context_word:   z.string(),
});
const CORRECTION_OPTS = z.object({
  incorrect_text: z.string(),
  correct_text:   z.string(),
  error_type:     z.string(),
  hint:           z.string(),
});
const DICTATION_OPTS = z.object({
  audio_text:       z.string(),
  word_count:       z.number().min(1),
  expected_answers: z.array(z.string()),
  allow_partial:    z.boolean(),
});
const MINI_TEXT_OPTS = z.object({
  audio_text:       z.string(),
  sentence_count:   z.number().min(1),
  expected_answers: z.array(z.string()),
});
const SELF_CHECK_OPTS = z.object({
  original_attempt: z.string(),
  model_answer:     z.string(),
  comparison_mode:  z.enum(['side_by_side','highlight_diff']),
});

const OptionsSchemas: Record<string, z.ZodType> = {
  // Choice tasks
  TT_LISTEN_CHOOSE: CHOICE_OPTS, TT_IMAGE_WORD_MATCH: CHOICE_OPTS,
  TT_CHOOSE_CORRECT: CHOICE_OPTS, TT_SIMPLE_SUFFIX: CHOICE_OPTS,
  TT_WORD_FORM_CHOOSE: CHOICE_OPTS, TT_SUFFIX_CHOOSE: CHOICE_OPTS,
  TT_CONSONANT_CONFUSION: CHOICE_OPTS, TT_LONG_VOWEL_CHALLENGE: CHOICE_OPTS,
  TT_CASE_SUFFIX: CHOICE_OPTS, TT_MIXED_REVIEW: CHOICE_OPTS,
  TT_MIXED_WORD_SET: CHOICE_OPTS, TT_MIXED_CHECKPOINT: CHOICE_OPTS,
  // Fill tasks
  TT_LETTER_FILL: FILL_OPTS, TT_COPY_WRITE: FILL_OPTS,
  TT_FILL_WRITE: FILL_OPTS, TT_MISSING_LETTER: FILL_OPTS,
  TT_WORD_ENDING: FILL_OPTS, TT_LONG_VOWEL_FILL: FILL_OPTS,
  TT_REDUCED_VOWEL: FILL_OPTS, TT_SUFFIX_WRITE: FILL_OPTS,
  TT_COMPOUND_SUFFIX: FILL_OPTS, TT_SENTENCE_FILL: FILL_OPTS,
  TT_LONG_VOWEL_IN_SENTENCE: FILL_OPTS, TT_REDUCED_VOWEL_IN_SENTENCE: FILL_OPTS,
  // Correction tasks
  TT_CAPITAL_PUNCTUATION: CORRECTION_OPTS, TT_FIND_ERROR: CORRECTION_OPTS,
  TT_FIX_ERROR: CORRECTION_OPTS, TT_WORD_FORM_FIX: CORRECTION_OPTS,
  TT_FIND_OMITTED_LETTER: CORRECTION_OPTS, TT_SENTENCE_BOUNDARY: CORRECTION_OPTS,
  TT_BASIC_COMMA: CORRECTION_OPTS, TT_EXPLAINED_CORRECTION: CORRECTION_OPTS,
  // Dictation tasks
  TT_WORD_SET_DICTATION: DICTATION_OPTS, TT_TWO_WORD_DICTATION: DICTATION_OPTS,
  TT_SHORT_SENTENCE_DICTATION: DICTATION_OPTS, TT_TWO_SENTENCE_DICTATION: DICTATION_OPTS,
  // Mini-text
  TT_MINI_TEXT_DICTATION: MINI_TEXT_OPTS,
  // Self-check
  TT_SELF_CHECK: SELF_CHECK_OPTS, TT_OWN_WRITING_CORRECTION: SELF_CHECK_OPTS,
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
  'Сонсож сонгох':      'TT_LISTEN_CHOOSE',
  'Зураг-үг тааруулах': 'TT_IMAGE_WORD_MATCH',
  'Зөвийг сонгох':      'TT_CHOOSE_CORRECT',
  'Энгийн залгавар':    'TT_SIMPLE_SUFFIX',
  'Үсэг нөхөх':         'TT_LETTER_FILL',
  'Нөхөж бичих':        'TT_FILL_WRITE',
  'Дутуу үсэг':         'TT_MISSING_LETTER',
  'Хуулж бичих':        'TT_COPY_WRITE',
  'Үгийн төгсгөл':      'TT_WORD_ENDING',
  'Алдаа олох':         'TT_FIND_ERROR',
  'Том үсэг, цэг':      'TT_CAPITAL_PUNCTUATION',
  'Үгийн багц диктант': 'TT_WORD_SET_DICTATION',
  '2 үгийн диктант':    'TT_TWO_WORD_DICTATION',
  'Өөрийгөө шалгах':    'TT_SELF_CHECK',
};

const TYPE_DEFAULT_SKILL: Record<string, string> = {
  TT_LISTEN_CHOOSE: 'S1', TT_IMAGE_WORD_MATCH: 'S2', TT_CHOOSE_CORRECT: 'S3',
  TT_SIMPLE_SUFFIX: 'S5', TT_WORD_FORM_CHOOSE: 'S2', TT_SUFFIX_CHOOSE: 'S5',
  TT_CONSONANT_CONFUSION: 'S3', TT_LONG_VOWEL_CHALLENGE: 'S3', TT_CASE_SUFFIX: 'S5',
  TT_MIXED_REVIEW: 'S1', TT_MIXED_WORD_SET: 'S1', TT_MIXED_CHECKPOINT: 'S1',
  TT_LETTER_FILL: 'S1', TT_COPY_WRITE: 'S2', TT_FILL_WRITE: 'S3',
  TT_MISSING_LETTER: 'S4', TT_WORD_ENDING: 'S2', TT_LONG_VOWEL_FILL: 'S3',
  TT_REDUCED_VOWEL: 'S4', TT_SUFFIX_WRITE: 'S5', TT_COMPOUND_SUFFIX: 'S5',
  TT_SENTENCE_FILL: 'S2', TT_LONG_VOWEL_IN_SENTENCE: 'S3', TT_REDUCED_VOWEL_IN_SENTENCE: 'S4',
  TT_CAPITAL_PUNCTUATION: 'S6', TT_FIND_ERROR: 'S8', TT_FIX_ERROR: 'S8',
  TT_WORD_FORM_FIX: 'S2', TT_FIND_OMITTED_LETTER: 'S8', TT_SENTENCE_BOUNDARY: 'S6',
  TT_BASIC_COMMA: 'S6', TT_EXPLAINED_CORRECTION: 'S8',
  TT_WORD_SET_DICTATION: 'S7', TT_TWO_WORD_DICTATION: 'S7',
  TT_SHORT_SENTENCE_DICTATION: 'S7', TT_TWO_SENTENCE_DICTATION: 'S7',
  TT_MINI_TEXT_DICTATION: 'S7',
  TT_SELF_CHECK: 'S8', TT_OWN_WRITING_CORRECTION: 'S8',
};

const TYPE_SLOT: Record<string, string> = {
  TT_LISTEN_CHOOSE: 'WARM_UP', TT_IMAGE_WORD_MATCH: 'WARM_UP', TT_CHOOSE_CORRECT: 'WARM_UP',
  TT_SIMPLE_SUFFIX: 'WARM_UP', TT_WORD_FORM_CHOOSE: 'WARM_UP', TT_SUFFIX_CHOOSE: 'WARM_UP',
  TT_CONSONANT_CONFUSION: 'WARM_UP', TT_LONG_VOWEL_CHALLENGE: 'WARM_UP',
  TT_CASE_SUFFIX: 'WARM_UP', TT_MIXED_REVIEW: 'WARM_UP',
  TT_MIXED_WORD_SET: 'WARM_UP', TT_MIXED_CHECKPOINT: 'WARM_UP',
  TT_LETTER_FILL: 'CORE', TT_COPY_WRITE: 'CORE', TT_FILL_WRITE: 'CORE',
  TT_MISSING_LETTER: 'CORE', TT_WORD_ENDING: 'CORE', TT_LONG_VOWEL_FILL: 'CORE',
  TT_REDUCED_VOWEL: 'CORE', TT_SUFFIX_WRITE: 'CORE', TT_COMPOUND_SUFFIX: 'CORE',
  TT_SENTENCE_FILL: 'CORE', TT_LONG_VOWEL_IN_SENTENCE: 'CORE', TT_REDUCED_VOWEL_IN_SENTENCE: 'CORE',
  TT_CAPITAL_PUNCTUATION: 'CORE', TT_FIND_ERROR: 'CORE', TT_FIX_ERROR: 'CORE',
  TT_WORD_FORM_FIX: 'CORE', TT_FIND_OMITTED_LETTER: 'CORE', TT_SENTENCE_BOUNDARY: 'CORE',
  TT_BASIC_COMMA: 'CORE', TT_EXPLAINED_CORRECTION: 'CORE',
  TT_WORD_SET_DICTATION: 'CORE', TT_TWO_WORD_DICTATION: 'CORE',
  TT_SHORT_SENTENCE_DICTATION: 'CORE', TT_TWO_SENTENCE_DICTATION: 'CORE',
  TT_MINI_TEXT_DICTATION: 'END',
  TT_SELF_CHECK: 'END', TT_OWN_WRITING_CORRECTION: 'END',
};

const TYPE_TIME: Record<string, number> = {
  TT_LISTEN_CHOOSE: 30, TT_IMAGE_WORD_MATCH: 30, TT_CHOOSE_CORRECT: 30,
  TT_SIMPLE_SUFFIX: 30, TT_WORD_FORM_CHOOSE: 30, TT_SUFFIX_CHOOSE: 30,
  TT_CONSONANT_CONFUSION: 30, TT_LONG_VOWEL_CHALLENGE: 30,
  TT_CASE_SUFFIX: 30, TT_MIXED_REVIEW: 30, TT_MIXED_WORD_SET: 30, TT_MIXED_CHECKPOINT: 30,
  TT_LETTER_FILL: 45, TT_COPY_WRITE: 45, TT_FILL_WRITE: 45,
  TT_MISSING_LETTER: 45, TT_WORD_ENDING: 45, TT_LONG_VOWEL_FILL: 45,
  TT_REDUCED_VOWEL: 45, TT_SUFFIX_WRITE: 45, TT_COMPOUND_SUFFIX: 45,
  TT_SENTENCE_FILL: 45, TT_LONG_VOWEL_IN_SENTENCE: 45, TT_REDUCED_VOWEL_IN_SENTENCE: 45,
  TT_CAPITAL_PUNCTUATION: 60, TT_FIND_ERROR: 60, TT_FIX_ERROR: 60,
  TT_WORD_FORM_FIX: 60, TT_FIND_OMITTED_LETTER: 60, TT_SENTENCE_BOUNDARY: 60,
  TT_BASIC_COMMA: 60, TT_EXPLAINED_CORRECTION: 60,
  TT_WORD_SET_DICTATION: 90, TT_TWO_WORD_DICTATION: 90,
  TT_SHORT_SENTENCE_DICTATION: 90, TT_TWO_SENTENCE_DICTATION: 90,
  TT_MINI_TEXT_DICTATION: 180,
  TT_SELF_CHECK: 60, TT_OWN_WRITING_CORRECTION: 60,
};

function buildOptions(taskType: string, r: unknown[], spec: SpecLookup | undefined): unknown {
  const prompt        = String(r[2] ?? '').trim();
  const optionsRaw    = String(r[3] ?? '').trim();
  const correctAnswer = String(r[4] ?? '').trim();
  const audioYes      = String(r[7] ?? '').toLowerCase() === 'yes';
  const feedbackText  = String(r[8] ?? '').trim();

  const BUILDER_TYPE: Record<string, string> = {
    TT_LISTEN_CHOOSE: 'CHOICE', TT_IMAGE_WORD_MATCH: 'CHOICE', TT_CHOOSE_CORRECT: 'CHOICE',
    TT_SIMPLE_SUFFIX: 'CHOICE', TT_WORD_FORM_CHOOSE: 'CHOICE', TT_SUFFIX_CHOOSE: 'CHOICE',
    TT_CONSONANT_CONFUSION: 'CHOICE', TT_LONG_VOWEL_CHALLENGE: 'CHOICE',
    TT_CASE_SUFFIX: 'CHOICE', TT_MIXED_REVIEW: 'CHOICE', TT_MIXED_WORD_SET: 'CHOICE', TT_MIXED_CHECKPOINT: 'CHOICE',
    TT_LETTER_FILL: 'FILL', TT_COPY_WRITE: 'FILL', TT_FILL_WRITE: 'FILL',
    TT_MISSING_LETTER: 'FILL', TT_WORD_ENDING: 'FILL', TT_LONG_VOWEL_FILL: 'FILL',
    TT_REDUCED_VOWEL: 'FILL', TT_SUFFIX_WRITE: 'FILL', TT_COMPOUND_SUFFIX: 'FILL',
    TT_SENTENCE_FILL: 'FILL', TT_LONG_VOWEL_IN_SENTENCE: 'FILL', TT_REDUCED_VOWEL_IN_SENTENCE: 'FILL',
    TT_CAPITAL_PUNCTUATION: 'CORRECTION', TT_FIND_ERROR: 'CORRECTION', TT_FIX_ERROR: 'CORRECTION',
    TT_WORD_FORM_FIX: 'CORRECTION', TT_FIND_OMITTED_LETTER: 'CORRECTION',
    TT_SENTENCE_BOUNDARY: 'CORRECTION', TT_BASIC_COMMA: 'CORRECTION', TT_EXPLAINED_CORRECTION: 'CORRECTION',
    TT_WORD_SET_DICTATION: 'DICTATION', TT_TWO_WORD_DICTATION: 'DICTATION',
    TT_SHORT_SENTENCE_DICTATION: 'DICTATION', TT_TWO_SENTENCE_DICTATION: 'DICTATION',
    TT_MINI_TEXT_DICTATION: 'MINI_TEXT',
    TT_SELF_CHECK: 'SELF_CHECK', TT_OWN_WRITING_CORRECTION: 'SELF_CHECK',
  };
  switch (BUILDER_TYPE[taskType] ?? taskType) {
    case 'CHOICE': {
      const parts = optionsRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      const choices = parts.map(text => ({ text, is_correct: text === correctAnswer }));
      if (!choices.some(c => c.is_correct) && choices.length > 0) {
        choices[0].is_correct = true;
      }
      return { choices, audio_trigger: audioYes };
    }

    case 'FILL': {
      const display = prompt.replace(/^(Аудио\+текст|Аудио)\s*:\s*/i, '').trim();
      const blankIdx = display.indexOf('_');
      return {
        display_text:   display,
        blank_position: blankIdx >= 0 ? blankIdx : 0,
        blank_answer:   correctAnswer,
        context_word:   blankIdx >= 0 ? display.replace('_', correctAnswer) : correctAnswer,
      };
    }

    case 'CORRECTION': {
      const errorType = spec?.error?.split('/')[0]?.trim() ?? 'G1';
      return {
        incorrect_text: prompt,
        correct_text:   correctAnswer,
        error_type:     errorType,
        hint:           feedbackText,
      };
    }

    case 'DICTATION': {
      const audioText      = prompt.replace(/^Аудио\s*:\s*/i, '').trim();
      const expectedAnswers = correctAnswer.split(';').map(s => s.trim()).filter(Boolean);
      return {
        audio_text:       audioText,
        word_count:       expectedAnswers.length,
        expected_answers: expectedAnswers,
        allow_partial:    expectedAnswers.length > 2,
      };
    }

    case 'SELF_CHECK': {
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
    const taskType  = MN_TYPE_MAP[typeMn] ?? 'TT_LETTER_FILL';

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
