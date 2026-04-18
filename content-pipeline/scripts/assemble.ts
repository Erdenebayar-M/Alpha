/**
 * Deterministic task assembler — no LLM calls.
 * Generates ~30 task variants from seed words, validates each, writes to
 * stage1/ (pass) or rejected/stage1/ (fail).
 */

import * as fs   from 'fs';
import * as path from 'path';

import { validateTask }        from './validators/schemaValidator';
import { validateDistractors } from './validators/distractor';
import { findDuplicates }      from './validators/uniqueness';
import { isValidWord }         from './validators/orthography';
import {
  applyErrorRule,
  findLongVowelPairIndex,
  ErrorCode,
} from './validators/errorRules';

import seedRaw      from '../generated/seed-words.json';
import confusingRaw from '../generated/confusing-words.json';

// ─── Types ────────────────────────────────────────────────────────────────

interface SeedWord {
  id: string; word: string; category: string; grade_band: string;
  letter_count: number; word_count: number; skills: string[];
  errors: string[]; image_ok: boolean; audio_ok: boolean;
  image_prompt: string; audio_text: string; sentence: string;
  distractors: string[]; blank_template: string; correct_spelling: string;
  review_status: string;
}

interface ConfusingEntry { correct: string; misspelling: string; task: string; }

type TaskRecord = Record<string, unknown>;

// ─── Data ─────────────────────────────────────────────────────────────────

const words: SeedWord[] = seedRaw.words as SeedWord[];
const confusing = confusingRaw as Record<string, ConfusingEntry[]>;

// ─── Constants ────────────────────────────────────────────────────────────

const MVP_CODES: ErrorCode[] = [
  'B1','C1','C2','C4','D3','B3','E1','E2','E7','G1','G2','H4',
];
const GRADE_BAND = ['G1', 'G2'];
const TARGET     = 3;

// ─── Seeded RNG (LCG — pure determinism, no external packages) ────────────

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// Exported for reproducibility; currently used only if shuffle is needed.
const _rng = makeLcg(0xdeadbeef);

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Generate up to n distractors by applying MVP error codes in priority order. */
function makeDistractors(
  word: string, n = 2,
): { texts: string[]; codes: ErrorCode[] } {
  const texts: string[] = [];
  const codes: ErrorCode[] = [];
  const seen  = new Set([word]);
  for (const code of MVP_CODES) {
    if (texts.length >= n) break;
    const d = applyErrorRule(word, code);
    if (d !== null && d !== word && !seen.has(d)) {
      texts.push(d); codes.push(code); seen.add(d);
    }
  }
  return { texts, codes };
}

/** Position in `correct` where `misspelling` is missing one character. */
function findMissingPos(correct: string, misspelling: string): number {
  for (let i = 0; i < misspelling.length; i++) {
    if (correct[i] !== misspelling[i]) return i;
  }
  return misspelling.length;
}

/** Build the shared fields for any task record. */
function base(
  id: string, taskType: string, title: string, prompt: string,
  correctAnswer: string, options: Record<string, unknown>,
  skill: string, level: string, errorTargets: string[],
  difficulty: number, slot: string, feedback: string,
): TaskRecord {
  return {
    id, task_type: taskType, title, prompt_text: prompt,
    correct_answer: correctAnswer, options,
    audio_url: null, image_url: null,
    primary_skill: skill, secondary_skill: null,
    level_target: level, error_targets: errorTargets,
    grade_band: GRADE_BAND, difficulty,
    estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: slot, feedback_text: feedback,
  };
}

// ─── Output directories ───────────────────────────────────────────────────

const STAGE1   = path.resolve(__dirname, '../stage1');
const REJECTED = path.resolve(__dirname, '../rejected/stage1');
fs.mkdirSync(STAGE1,   { recursive: true });
fs.mkdirSync(REJECTED, { recursive: true });

// ─── Validation pipeline ─────────────────────────────────────────────────

function runValidators(task: TaskRecord): string[] {
  const reasons: string[] = [];

  // 1. Schema
  const sv = validateTask(task);
  if (!sv.ok) reasons.push(...sv.errors.map(e => `schema: ${e}`));

  // 2. Orthography — check each token in correct_answer
  const ca = String(task.correct_answer ?? '');
  for (const tok of ca.split(';')) {
    const t = tok.trim();
    if (t && !isValidWord(t)) {
      reasons.push(`orthography: "${t}" not valid Mongolian`);
    }
  }

  // 3. Distractor (TT1_CHOICE only)
  if (task.task_type === 'TT1_CHOICE') {
    const dv = validateDistractors(task as any);
    if (!dv.ok) reasons.push(...dv.reasons.map(r => `distractor: ${r}`));
  }

  return reasons; // uniqueness checked globally after all tasks collected
}

// ─── Candidate generators (one per task-ID template) ─────────────────────

// G12-001: TT1_CHOICE, S1 skill, audio_trigger=true, 2 programmatic distractors
function genG12001(): TaskRecord[] {
  return words
    .filter(w => w.skills.includes('S1'))
    .flatMap(w => {
      const { texts, codes } = makeDistractors(w.correct_spelling);
      if (texts.length < 2) return [];
      return [base(
        '', 'TT1_CHOICE',
        'Сонсоод зөв үгийг олоорой',
        'Аудио сонсоод зөв үгийг сонгоорой.',
        w.correct_spelling,
        {
          choices: [
            { text: w.correct_spelling, is_correct: true },
            ...texts.map(t => ({ text: t, is_correct: false })),
          ],
          audio_trigger: true,
        },
        'S1', 'M0', codes, 1, 'WARM_UP',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-002: TT2_FILL, S1 skill, blank from blank_template
function genG12002(): TaskRecord[] {
  return words
    .filter(w => w.skills.includes('S1') && w.blank_template.includes('_'))
    .flatMap(w => {
      const idx = w.blank_template.indexOf('_');
      if (idx < 0 || idx >= w.correct_spelling.length) return [];
      return [base(
        '', 'TT2_FILL',
        'Дутуу үсгийг нөхөөрэй',
        'Дутуу үсгийг нөхөж бичээрэй.',
        w.correct_spelling,
        {
          display_text:   w.blank_template,
          blank_position: idx,
          blank_answer:   w.correct_spelling[idx],
          context_word:   w.correct_spelling,
        },
        'S1', 'M0', ['B1'], 1, 'WARM_UP',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-003: TT1_CHOICE, S2 primary, image_ok=true, audio_trigger=false
function genG12003(): TaskRecord[] {
  return words
    .filter(w => w.image_ok && w.skills[0] === 'S2')
    .flatMap(w => {
      const { texts, codes } = makeDistractors(w.correct_spelling);
      if (texts.length < 2) return [];
      return [base(
        '', 'TT1_CHOICE',
        'Зурагт тохирох үгийг сонгоорой',
        'Зургийг харж тохирох үгийг сонгоорой.',
        w.correct_spelling,
        {
          choices: [
            { text: w.correct_spelling, is_correct: true },
            ...texts.map(t => ({ text: t, is_correct: false })),
          ],
          audio_trigger: false,
        },
        'S2', 'M0', codes, 1, 'WARM_UP',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-004: TT2_FILL, S2 primary, sentence shown in prompt (copy-write)
function genG12004(): TaskRecord[] {
  return words
    .filter(w => w.skills[0] === 'S2' && w.sentence && w.blank_template.includes('_'))
    .flatMap(w => {
      const idx = w.blank_template.indexOf('_');
      if (idx < 0 || idx >= w.correct_spelling.length) return [];
      return [base(
        '', 'TT2_FILL',
        'Үгийг хуулж бичээрэй',
        `"${w.sentence}" — дутуу үсгийг нөхөж бичээрэй.`,
        w.correct_spelling,
        {
          display_text:   w.blank_template,
          blank_position: idx,
          blank_answer:   w.correct_spelling[idx],
          context_word:   w.correct_spelling,
        },
        'S2', 'M0', ['B3'], 1, 'WARM_UP',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-005: TT1_CHOICE, S3 skill, choices = [correct, C1-derived, C2-derived]
// Only words where BOTH C1 and C2 return non-null and distinct values.
function genG12005(): TaskRecord[] {
  return words
    .filter(w => w.skills.includes('S3'))
    .flatMap(w => {
      const c1 = applyErrorRule(w.correct_spelling, 'C1');
      const c2 = applyErrorRule(w.correct_spelling, 'C2');
      if (!c1 || !c2) return [];
      if (c1 === w.correct_spelling || c2 === w.correct_spelling) return [];
      if (c1 === c2) return [];
      return [base(
        '', 'TT1_CHOICE',
        'Зөв үгийг сонгоорой',
        'Урт болон богино эгшгийг анхаарч зөв хэлбэрийг сонгоорой.',
        w.correct_spelling,
        {
          choices: [
            { text: w.correct_spelling, is_correct: true },
            { text: c1, is_correct: false },
            { text: c2, is_correct: false },
          ],
          audio_trigger: false,
        },
        'S3', 'M1', ['C1', 'C2'], 2, 'CORE',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-006: TT2_FILL, S3 skill, blank placed at first long-vowel character
function genG12006(): TaskRecord[] {
  return words
    .filter(w => w.skills.includes('S3'))
    .flatMap(w => {
      const idx = findLongVowelPairIndex(w.correct_spelling);
      if (idx === -1) return [];
      const display = w.correct_spelling.slice(0, idx) + '_'
                    + w.correct_spelling.slice(idx + 1);
      return [base(
        '', 'TT2_FILL',
        'Урт эгшгийг нөхөөрэй',
        'Урт эгшгийн дутуу хэсгийг нөхөж бичээрэй.',
        w.correct_spelling,
        {
          display_text:   display,
          blank_position: idx,
          blank_answer:   w.correct_spelling[idx],
          context_word:   w.correct_spelling,
        },
        'S3', 'M1', ['C1'], 2, 'CORE',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// G12-007: TT2_FILL, S4 skill, from confusing-words M0+M1, missing-vowel hint
function genG12007(): TaskRecord[] {
  const entries: ConfusingEntry[] = [
    ...(confusing['M0'] ?? []),
    ...(confusing['M1'] ?? []),
  ];
  return entries.flatMap(e => {
    const pos = findMissingPos(e.correct, e.misspelling);
    if (pos >= e.correct.length) return [];
    const answer  = e.correct[pos];
    const display = e.correct.slice(0, pos) + '_' + e.correct.slice(pos + 1);
    return [base(
      '', 'TT2_FILL',
      'Балархай эгшгийг нөхөөрэй',
      'Дутуу балархай эгшгийг нөхөж бичээрэй.',
      e.correct,
      {
        display_text:   display,
        blank_position: pos,
        blank_answer:   answer,
        context_word:   e.correct,
      },
      'S4', 'M1', ['C4'], 2, 'CORE',
      `Зөв хариу: ${e.correct}`,
    )];
  });
}

// G12-011: TT3_CORRECTION, S8 skill, incorrect = applyErrorRule(word, first MVP code)
function genG12011(): TaskRecord[] {
  const mvpSet = new Set<string>(MVP_CODES);
  return words.flatMap(w => {
    const code = w.errors.find(e => mvpSet.has(e)) as ErrorCode | undefined;
    if (!code) return [];
    const incorrect = applyErrorRule(w.correct_spelling, code);
    if (!incorrect || incorrect === w.correct_spelling) return [];
    return [base(
      '', 'TT3_CORRECTION',
      'Алдааг засаарай',
      'Дараах үгэнд алдаа байна. Зөв засаарай.',
      w.correct_spelling,
      {
        incorrect_text: incorrect,
        correct_text:   w.correct_spelling,
        error_type:     code,
        hint: `"${incorrect}" гэж бичсэн нь буруу — "${w.correct_spelling}" гэж засаарай.`,
      },
      'S8', 'M1', [code], 2, 'CORE',
      `Зөв хариу: ${w.correct_spelling}`,
    )];
  });
}

// G12-013: TT4_DICTATION, pair 2 seeds sharing the same primary skill
function genG12013(): TaskRecord[] {
  const bySkill = new Map<string, SeedWord[]>();
  for (const w of words) {
    const sk = w.skills[0];
    if (!bySkill.has(sk)) bySkill.set(sk, []);
    bySkill.get(sk)!.push(w);
  }
  const results: TaskRecord[] = [];
  for (const [, group] of bySkill) {
    for (let i = 0; i + 1 < group.length; i += 2) {
      const w1 = group[i], w2 = group[i + 1];
      results.push(base(
        '', 'TT4_DICTATION',
        '2 үгийн диктант',
        'Аудио сонсоод хоёр үгийг нэг нэгээр нь бичээрэй.',
        `${w1.correct_spelling};${w2.correct_spelling}`,
        {
          audio_text:       `${w1.correct_spelling}, ${w2.correct_spelling}`,
          word_count:       2,
          expected_answers: [w1.correct_spelling, w2.correct_spelling],
          allow_partial:    true,
        },
        'S7', 'M1', ['H1'], 2, 'CORE',
        `Зөв хариу: ${w1.correct_spelling}, ${w2.correct_spelling}`,
      ));
    }
  }
  return results;
}

// G12-014: TT2_FILL, blank at FINAL character of word
function genG12014(): TaskRecord[] {
  return words
    .filter(w => {
      const tmpl = w.blank_template;
      const word = w.correct_spelling;
      const idx  = tmpl.indexOf('_');
      return idx !== -1 && tmpl.length === word.length && idx === word.length - 1;
    })
    .flatMap(w => {
      const idx = w.blank_template.indexOf('_');
      return [base(
        '', 'TT2_FILL',
        'Сүүлийн үсгийг нөхөөрэй',
        'Үгийн сүүлийн үсгийг нөхөж бичээрэй.',
        w.correct_spelling,
        {
          display_text:   w.blank_template,
          blank_position: idx,
          blank_answer:   w.correct_spelling[idx],
          context_word:   w.correct_spelling,
        },
        'S8', 'M1', ['D5'], 2, 'CORE',
        `Зөв хариу: ${w.correct_spelling}`,
      )];
    });
}

// ─── Task-ID → generator map ──────────────────────────────────────────────

const TASK_IDS = [
  'G12-001','G12-002','G12-003','G12-004','G12-005',
  'G12-006','G12-007','G12-011','G12-013','G12-014',
];

const generators: Record<string, () => TaskRecord[]> = {
  'G12-001': genG12001, 'G12-002': genG12002,
  'G12-003': genG12003, 'G12-004': genG12004,
  'G12-005': genG12005, 'G12-006': genG12006,
  'G12-007': genG12007, 'G12-011': genG12011,
  'G12-013': genG12013, 'G12-014': genG12014,
};

// ─── Main assembly loop ───────────────────────────────────────────────────

const allPassing: TaskRecord[] = [];

const report: Array<{
  task_id: string; target: number;
  generated: number; passed: number; rejected: number;
}> = [];

for (const taskId of TASK_IDS) {
  const candidates = generators[taskId]();
  let passCount = 0, rejCount = 0;

  const passingVariants: TaskRecord[] = [];

  for (const cand of candidates) {
    const reasons = runValidators(cand);

    if (reasons.length === 0 && passCount < TARGET) {
      passCount++;
      const versioned = { ...cand, id: `${taskId}-v${passCount}` };
      passingVariants.push(versioned);
      allPassing.push(versioned);
    } else {
      rejCount++;
      const versionedRej = {
        ...cand,
        id: `${taskId}-rejected-${rejCount}`,
        rejection_reasons: reasons.length ? reasons : ['excess variant — already have 3 passing'],
      };
      fs.writeFileSync(
        path.join(REJECTED, `${taskId}_${rejCount}.json`),
        JSON.stringify(versionedRej, null, 2),
      );
    }
  }

  // Write all passing variants for this task-id as a single array
  if (passingVariants.length > 0) {
    fs.writeFileSync(
      path.join(STAGE1, `${taskId}.json`),
      JSON.stringify(passingVariants, null, 2),
    );
  }

  report.push({
    task_id: taskId, target: TARGET,
    generated: candidates.length, passed: passCount, rejected: rejCount,
  });
}

// ─── Global uniqueness check ──────────────────────────────────────────────

const dups = findDuplicates(allPassing as any);
if (dups.length > 0) {
  console.warn('\n⚠  Duplicate groups detected (primary_skill + correct_answer + task_type):');
  for (const group of dups) {
    console.warn('   ', (group as any[]).map((t: any) => t.id).join(', '));
  }
} else {
  console.log('\nUniqueness check: all passing tasks are distinct ✓');
}

// ─── Report table ─────────────────────────────────────────────────────────

const COL = [10, 8, 11, 8, 10];
const hr  = '  ' + ['-'.repeat(COL[0]+2), '-'.repeat(COL[1]+2), '-'.repeat(COL[2]+2), '-'.repeat(COL[3]+2), '-'.repeat(COL[4]+2)].join('+');

function row(cells: string[]) {
  return '  ' + cells.map((c, i) => ` ${c.padEnd(COL[i])} `).join('|');
}

console.log('\n' + row(['task_id','target','generated','passed','rejected']));
console.log(hr);
for (const r of report) {
  console.log(row([r.task_id, String(r.target), String(r.generated), String(r.passed), String(r.rejected)]));
}
console.log(hr);
const totG = report.reduce((s, r) => s + r.generated, 0);
const totP = report.reduce((s, r) => s + r.passed,    0);
const totR = report.reduce((s, r) => s + r.rejected,  0);
console.log(row(['TOTAL', String(TARGET * TASK_IDS.length), String(totG), String(totP), String(totR)]));

// ─── Verification summary ─────────────────────────────────────────────────

const stage1Files = fs.readdirSync(STAGE1).filter(f => f.endsWith('.json'));
console.log(`\nstage1/ populated: ${stage1Files.length} files`);
console.log('  ' + stage1Files.join('  '));

const under = report.filter(r => r.passed < TARGET);
if (under.length > 0) {
  console.log('\n⚠  Task IDs below 3 variants:');
  for (const r of under) console.log(`   ${r.task_id}: ${r.passed}/3 passed`);
} else {
  console.log('\nAll 10 task IDs have ≥ 3 passing variants ✓');
}
