import { deriveCapability, RANK, type Capability } from '../derive-capability';

function cap(word: string, pos: string, imageable = false): Capability {
  return deriveCapability({ word, part_of_speech: pos, imageable });
}

// ─── Acceptance tests (from the spec) ────────────────────────────────────────

describe('deriveCapability — acceptance', () => {
  it('"аав" (noun) → LONG_VOWEL+FINAL_CONSONANT+TAKES_SUFFIX, primary LONG_VOWEL/S3, errors C1,C2,D5,B1,B2,A1,A2', () => {
    const c = cap('аав', 'нэр үг/ерөнхий');
    // noun → TAKES_SUFFIX now fires on POS eligibility (not surface detection)
    expect(c.features.sort()).toEqual(['FINAL_CONSONANT', 'LONG_VOWEL', 'TAKES_SUFFIX']);
    expect(c.primary_feature).toBe('LONG_VOWEL'); // RANK keeps LONG_VOWEL above TAKES_SUFFIX
    expect(c.primary_skill).toBe('S3');
    for (const e of ['C1', 'C2', 'D5', 'B1', 'B2', 'A1', 'A2']) {
      expect(c.errors_possible).toContain(e);
    }
    // long vowel + consonant — no балархай candidate, no C4/C5
    expect(c.flags.balarhai_unknown).toBe(false);
    expect(c.errors_possible).not.toContain('C4');
    expect(c.errors_possible).not.toContain('C5');
  });

  it('"алтан" (adj) not in dict → CONSONANT_CLUSTER+FINAL_CONSONANT, primary CONSONANT_CLUSTER/S4, balarhai_unknown', () => {
    const c = cap('алтан', 'тэмдэг нэр');
    expect(c.features).toContain('CONSONANT_CLUSTER');
    expect(c.features).toContain('FINAL_CONSONANT');
    expect(c.features).not.toContain('REDUCED_VOWEL'); // not in dict → never emitted
    expect(c.primary_feature).toBe('CONSONANT_CLUSTER');
    expect(c.primary_skill).toBe('S4');
    // adj is not noun/verb → no suffix feature
    expect(c.features).not.toContain('TAKES_SUFFIX');
    // …т-*а*-н… is a between-consonant non-initial short vowel → review flag
    expect(c.flags.balarhai_unknown).toBe(true);
    expect(c.errors_possible).not.toContain('C4');
  });

  it('"ном" (noun) → keeps FINAL_CONSONANT (D5/S4) but primary is TAKES_SUFFIX/S5 — FINAL_CONSONANT can never win', () => {
    const c = cap('ном', 'нэр үг/ерөнхий');
    expect(c.features.sort()).toEqual(['FINAL_CONSONANT', 'TAKES_SUFFIX']);
    expect(c.primary_feature).toBe('TAKES_SUFFIX');
    expect(c.primary_skill).toBe('S5');
    // capability retained even though FINAL_CONSONANT lost the primary tag:
    expect(c.errors_possible).toContain('D5');
    expect(c.skills_possible).toContain('S4');
    expect(c.skills_possible).toContain('S5');
    expect(c.errors_possible).toContain('E4');
    expect(c.errors_possible).toContain('E5');
    expect(c.task_types_possible).toContain('TT_5_1');
    for (const e of ['B1', 'B2', 'A1', 'A2']) expect(c.errors_possible).toContain(e);
    expect(c.flags.balarhai_unknown).toBe(false);
  });

  it('final-consonant-ONLY word (adj "ариун") → primary falls through to SIMPLE/S2; D5/S4 retained', () => {
    const c = cap('ариун', 'тэмдэг нэр'); // FINAL_CONSONANT only (no cluster/long/reduced/suffix)
    expect(c.features).toEqual(['FINAL_CONSONANT']);
    expect(c.primary_feature).toBe('SIMPLE');
    expect(c.primary_skill).toBe('S2');
    expect(c.errors_possible).toContain('D5'); // capability kept
    expect(c.skills_possible).toContain('S4'); // capability kept
  });

  it('"алим" (noun, imageable) → task_types include picture type TT_1_2', () => {
    const c = cap('алим', 'нэр үг/ерөнхий', true);
    expect(c.imageable).toBe(true);
    expect(c.task_types_possible).toContain('TT_1_2');
    expect(c.task_types_possible).toContain('TT_1_3');
    expect(c.features).toContain('FINAL_CONSONANT');
  });

  it('out-of-dict word with a balархай candidate → balarhai_unknown=true, no C4/C5', () => {
    const c = cap('ажил', 'нэр үг/ерөнхий'); // …ж-*и*-л… candidate, not in dict
    expect(c.flags.balarhai_unknown).toBe(true);
    expect(c.features).not.toContain('REDUCED_VOWEL');
    expect(c.errors_possible).not.toContain('C4');
    expect(c.errors_possible).not.toContain('C5');
  });
});

// ─── Dictionary-backed REDUCED_VOWEL emission ────────────────────────────────

describe('deriveCapability — REDUCED_VOWEL (dictionary words)', () => {
  it('"газар" is in the dict → REDUCED_VOWEL emitted, primary REDUCED_VOWEL/S3, C4,C5, no unknown flag', () => {
    const c = cap('газар', 'нэр үг/ерөнхий');
    expect(c.features).toContain('REDUCED_VOWEL');
    expect(c.primary_feature).toBe('REDUCED_VOWEL'); // top of RANK
    expect(c.primary_skill).toBe('S3');
    expect(c.errors_possible).toContain('C4');
    expect(c.errors_possible).toContain('C5');
    expect(c.flags.balarhai_unknown).toBe(false);
  });
});

// ─── Suffix handling ─────────────────────────────────────────────────────────

describe('deriveCapability — TAKES_SUFFIX (POS eligibility, lemma-based)', () => {
  it('any noun lemma → TAKES_SUFFIX, S5, case/plural E4/E5, noun TT_5_x', () => {
    const c = cap('ном', 'нэр үг/ерөнхий'); // bare lemma, no surface suffix
    expect(c.features).toContain('TAKES_SUFFIX');
    expect(c.skills_possible).toContain('S5');
    expect(c.errors_possible).toContain('E4');
    expect(c.errors_possible).toContain('E5');
    expect(c.task_types_possible).toContain('TT_5_6');
    expect(c.errors_possible).not.toContain('E6'); // E6 is verb-only
  });

  it('any verb lemma → TAKES_SUFFIX + conjugation E6 + verb-tense TT_5_4', () => {
    const c = cap('ир', 'үйл үг'); // bare verb stem
    expect(c.features).toContain('TAKES_SUFFIX');
    expect(c.errors_possible).toContain('E6');
    expect(c.task_types_possible).toContain('TT_5_4');
    expect(c.errors_possible).not.toContain('E4'); // noun-only
    expect(c.errors_possible).not.toContain('E5');
  });

  it('adjective does NOT get TAKES_SUFFIX (only noun/verb are eligible)', () => {
    const c = cap('сайхан', 'тэмдэг нэр');
    expect(c.features).not.toContain('TAKES_SUFFIX');
    expect(c.skills_possible).not.toContain('S5');
  });

  it('pronoun/particle (туслах/төлөөний үг) does NOT get TAKES_SUFFIX', () => {
    const c = cap('ту', 'туслах/төлөөний үг');
    expect(c.features).not.toContain('TAKES_SUFFIX');
  });
});

// ─── SIMPLE + universals ─────────────────────────────────────────────────────

describe('deriveCapability — SIMPLE & universal floor', () => {
  it('"ту" → SIMPLE, primary SIMPLE/S2, B1/B2', () => {
    const c = cap('ту', 'туслах/төлөөний үг');
    expect(c.features).toEqual(['SIMPLE']);
    expect(c.primary_feature).toBe('SIMPLE');
    expect(c.primary_skill).toBe('S2');
    expect(c.errors_possible).toContain('B1');
    expect(c.errors_possible).toContain('B2');
  });

  it('every word carries the universal floor (S1,S2,S7 / dictation TT_7_3 / fill TT_2_1 / assemble TT_1_4)', () => {
    const c = cap('ном', 'нэр үг/ерөнхий');
    for (const s of ['S1', 'S2', 'S7']) expect(c.skills_possible).toContain(s);
    for (const t of ['TT_7_3', 'TT_2_1', 'TT_1_4']) expect(c.task_types_possible).toContain(t);
  });

  it('non-imageable words exclude picture task types', () => {
    const c = cap('ном', 'нэр үг/ерөнхий', false);
    expect(c.task_types_possible).not.toContain('TT_1_2');
    expect(c.task_types_possible).not.toContain('TT_1_3');
  });
});

// ─── Determinism, normalisation, RANK ────────────────────────────────────────

describe('deriveCapability — invariants', () => {
  it('is pure/deterministic (same input → identical output)', () => {
    const a = cap('газар', 'нэр үг/ерөнхий');
    const b = cap('газар', 'нэр үг/ерөнхий');
    expect(a).toEqual(b);
  });

  it('normalises case/whitespace before analysis', () => {
    expect(cap('  ГАЗАР  ', 'нэр үг/ерөнхий')).toEqual(cap('газар', 'нэр үг/ерөнхий'));
  });

  it('accepts English POS tokens as well as DB Mongolian values', () => {
    expect(cap('номоо', 'noun')).toEqual(cap('номоо', 'нэр үг/ерөнхий'));
  });

  it('primary_feature is always the highest-ranked present feature', () => {
    const c = cap('газар', 'нэр үг/ерөнхий'); // REDUCED + FINAL present
    const present = RANK.filter((f) => c.features.includes(f));
    expect(c.primary_feature).toBe(present[0]);
  });

  it('the universal floor never becomes the primary feature', () => {
    // A SIMPLE word still lists S1/S2/S7 but primary is SIMPLE, not a universal.
    const c = cap('ту', 'туслах/төлөөний үг');
    expect(c.primary_feature).toBe('SIMPLE');
  });
});
