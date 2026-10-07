import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { validateTaskContent } from '@app/shared';
import { convertVariant, migrateDir } from '../scripts/migrate-to-v3';

const base = {
  id: 'G12-001-v1',
  prompt_text: 'x',
  correct_answer: 'a',
  audio_url: null,
  image_url: null,
  primary_skill: 'S2',
  secondary_skill: null,
  level_target: 'M1',
  error_targets: [],
  grade_band: ['G1', 'G2'],
  difficulty: 1,
  estimated_time_seconds: 30,
  lesson_slot_fit: 'CORE',
  feedback_text: '',
};
const fill = { display_text: 'н_м', blank_position: 1, blank_answer: 'о', context_word: 'ном' };
const choice = {
  choices: [{ text: 'a', is_correct: true }, { text: 'b', is_correct: false }],
  audio_trigger: false,
};
const dict = (n: number) => ({
  audio_text: 'a', word_count: n, expected_answers: ['a'], allow_partial: true,
});
const corr = (code: string) => ({
  incorrect_text: 'a', correct_text: 'b', error_type: code, hint: 'h',
});

function conv(task_type: string, options: object, extra: object = {}) {
  const c = convertVariant({ ...base, task_type, options, ...extra });
  if (!c) throw new Error('not converted');
  return c;
}

describe('convertVariant mappings', () => {
  test.each([
    ['TT4_DICTATION', dict(2), 'TT_7_3'],
    ['TT4_DICTATION', dict(5), 'TT_7_4'],
    ['TT5_MINI_TEXT', { audio_text: 'a b', sentence_count: 2, expected_answers: ['a'] }, 'TT_7_6'],
    ['TT6_SELF_CHECK', { original_attempt: 'a', model_answer: 'b', comparison_mode: 'side_by_side' }, 'TT_8_4'],
    ['TT3_CORRECTION', corr('G1'), 'TT_6_3'],
    ['TT3_CORRECTION', corr('G2'), 'TT_6_3'],
    ['TT3_CORRECTION', corr('G4'), 'TT_6_4'],
    ['TT3_CORRECTION', corr('B1'), 'TT_2_6'],
    ['TT3_CORRECTION', corr('C1'), 'TT_3_5'],
  ])('%s → %s is converted without review', (type, options, expected) => {
    const c = conv(type, options);
    expect(c.variant.task_type).toBe(expected);
    expect(c.needsReview).toBe(false);
    expect(c.variant.needs_review).toBeUndefined();
    expect(validateTaskContent(c.variant).ok).toBe(true);
  });

  test('TT3 strips error_type and hint from options', () => {
    expect(conv('TT3_CORRECTION', corr('G1')).variant.options).toEqual({
      incorrect_text: 'a', correct_text: 'b',
    });
  });

  test.each(['E2', 'E7', 'A'])('TT3 unmapped code %s is flagged', (code) => {
    const c = conv('TT3_CORRECTION', corr(code));
    expect(c.variant.task_type).toBe('TT_2_6');
    expect(c.needsReview).toBe(true);
    expect(c.variant.needs_review).toBe(true);
    expect(validateTaskContent(c.variant).ok).toBe(true);
  });

  test.each([
    ['S3', 'TT_3_4'],
    ['S2', 'TT_2_3'],
  ])('TT1_CHOICE with %s → %s, flagged', (skill, expected) => {
    const c = conv('TT1_CHOICE', choice, { primary_skill: skill });
    expect(c.variant.task_type).toBe(expected);
    expect(c.needsReview).toBe(true);
    expect(c.variant.migration_note).toContain('TT1_CHOICE');
    expect(validateTaskContent(c.variant).ok).toBe(true);
  });

  test('TT1_CHOICE S3 with audio → TT_3_1', () => {
    const c = conv('TT1_CHOICE', choice, { primary_skill: 'S3', audio_url: 'a.mp3' });
    expect(c.variant.task_type).toBe('TT_3_1');
  });

  test.each([
    ['S1', 'TT_2_1'], ['S2', 'TT_2_1'], ['S3', 'TT_3_2'], ['S5', 'TT_5_5'], ['S8', 'TT_4_4'],
  ])('TT2_FILL with %s → %s, flagged', (skill, expected) => {
    const c = conv('TT2_FILL', fill, { primary_skill: skill });
    expect(c.variant.task_type).toBe(expected);
    expect(c.needsReview).toBe(true);
    expect(validateTaskContent(c.variant).ok).toBe(true);
  });

  test('derives grade_levels and is_diagnostic', () => {
    const v = conv('TT2_FILL', fill).variant;
    expect(v.grade_levels).toEqual(['G1:M1', 'G2:M1']);
    expect(v.is_diagnostic).toBe(false);
  });

  test('TT4 without word_count is flagged', () => {
    const { word_count, ...rest } = dict(2);
    expect(conv('TT4_DICTATION', rest).needsReview).toBe(true);
  });

  test('constructor-like error_type falls back flagged', () => {
    expect(conv('TT3_CORRECTION', corr('constructor')).needsReview).toBe(true);
  });

  test('TT3 keeps legacy error_type in migration_note', () => {
    expect(conv('TT3_CORRECTION', corr('G1')).variant.migration_note).toContain('G1');
  });

  test('v3 variants are left alone', () => {
    expect(convertVariant({ ...base, task_type: 'TT_2_1', options: fill })).toBeNull();
  });
});

describe('migrateDir', () => {
  let dirs: { inDir: string; outDir: string };
  beforeEach(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-v3-'));
    dirs = { inDir: path.join(tmp, 'validated'), outDir: path.join(tmp, 'v3-proposed') };
    fs.mkdirSync(dirs.inDir);
  });

  test('writes proposals, reports counts, leaves input untouched, drops failures', () => {
    const good = { ...base, task_type: 'TT4_DICTATION', options: dict(2) };
    const bad = { ...base, id: 'bad', task_type: 'TT4_DICTATION', options: { audio_text: 1 } };
    const flagged = { ...base, id: 'f', task_type: 'TT2_FILL', options: fill };
    const input = JSON.stringify({ task_id: 'G12-001', variants: [good, bad, flagged] });
    fs.writeFileSync(path.join(dirs.inDir, 'G12-001.json'), input);

    const report = migrateDir(dirs.inDir, dirs.outDir);

    expect(report.converted).toBe(2);
    expect(report.flagged).toBe(1);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0].id).toBe('bad');
    expect(fs.readFileSync(path.join(dirs.inDir, 'G12-001.json'), 'utf8')).toBe(input);
    const out = JSON.parse(fs.readFileSync(path.join(dirs.outDir, 'G12-001.json'), 'utf8'));
    expect(out.variants.map((v: any) => v.id)).toEqual([base.id, 'f']);
    for (const v of out.variants) expect(validateTaskContent(v).ok).toBe(true);
  });

  test('unknown legacy type is reported, not thrown; stale proposals are cleared', () => {
    const odd = { ...base, id: 'odd', task_type: 'TT1_FOO', options: {} };
    fs.writeFileSync(path.join(dirs.inDir, 'a.json'), JSON.stringify({ task_id: 'a', variants: [odd] }));
    fs.mkdirSync(dirs.outDir);
    fs.writeFileSync(path.join(dirs.outDir, 'stale.json'), '{}');
    const report = migrateDir(dirs.inDir, dirs.outDir);
    expect(report.failed.map((f) => f.id)).toEqual(['odd']);
    expect(fs.existsSync(path.join(dirs.outDir, 'stale.json'))).toBe(false);
  });

  test('refuses to write into the input folder', () => {
    expect(() => migrateDir(dirs.inDir, dirs.inDir)).toThrow();
  });
});
