/*
 * Validator test suite.
 * All Mongolian string literals are built from constants imported from
 * mongolianChars.ts — no raw Mongolian characters in source code strings.
 *
 * Unicode reference (chars used in test strings):
 *   A=\u0430  E=\u044D  I=\u0438  O=\u043E  U=\u0443  OE=\u04E9
 *   UE=\u04AF I_SHORT=\u0439  Y=\u044B
 *   G=\u0433  R=\u0440  S=\u0441  N=\u043D  M=\u043C  D=\u0434
 *   L=\u043B  KH=\u0445 T=\u0442
 */

import {
  A, E, O, OE, U, UE,
  N, M, G, R, S, D, L, KH, T,
} from '../scripts/validators/mongolianChars';
import { applyErrorRule, ErrorCode } from '../scripts/validators/errorRules';
import { validateTask } from '../scripts/validators/schemaValidator';
import { isValidWord } from '../scripts/validators/orthography';
import { validateDistractors } from '../scripts/validators/distractor';
import { findDuplicates } from '../scripts/validators/uniqueness';

import sampleTasksData from '../generated/sample-tasks.json';
import fixtures from './fixtures/error-rules.json';

// ---------------------------------------------------------------------------
// 1. Codepoint audit — catches the U+0151 (Hungarian ő) corruption bug
// ---------------------------------------------------------------------------
describe('char_constants_are_correct_codepoints', () => {
  test('A  is U+0430', () => expect(A.codePointAt(0)).toBe(0x0430));
  test('E  is U+044D', () => expect(E.codePointAt(0)).toBe(0x044D));
  test('O  is U+043E', () => expect(O.codePointAt(0)).toBe(0x043E));
  test('OE is U+04E9 (Mongolian oe, NOT U+0151 Hungarian oe)', () =>
    expect(OE.codePointAt(0)).toBe(0x04e9));
  test('U  is U+0443', () => expect(U.codePointAt(0)).toBe(0x0443));
  test('UE is U+04AF', () => expect(UE.codePointAt(0)).toBe(0x04af));
});

// ---------------------------------------------------------------------------
// 2. Error-rule fixtures
// ---------------------------------------------------------------------------
describe('error_rules_fixtures', () => {
  for (const fixture of fixtures as Array<{
    code: string;
    input: string;
    expected_outputs: string[];
  }>) {
    test(`${fixture.code} on "${fixture.input}"`, () => {
      const result = applyErrorRule(fixture.input, fixture.code as ErrorCode);
      expect(fixture.expected_outputs).toContain(result);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Schema validation
// ---------------------------------------------------------------------------
describe('schema_validator', () => {
  test('test_schema_good: first sample task passes', () => {
    const tasks = (sampleTasksData as { tasks: unknown[] }).tasks;
    const { ok, errors } = validateTask(tasks[0]);
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  test('test_schema_bad: empty object fails', () => {
    const { ok } = validateTask({});
    expect(ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Orthography
// ---------------------------------------------------------------------------
describe('orthography', () => {
  // Build seed words using char constants to avoid raw literals
  const NOM = N + O + M;   // ном — in seed-words.json (W001)
  const GER = G + E + R;   // гэр — in seed-words.json (W004)
  const SAR = S + A + R;   // сар — in seed-words.json (W006)

  test('test_orthography_accepts_seed_words', () => {
    expect(isValidWord(NOM)).toBe(true);
    expect(isValidWord(GER)).toBe(true);
    expect(isValidWord(SAR)).toBe(true);
  });

  test('test_orthography_rejects_latin: "gar"', () => {
    expect(isValidWord('gar')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Distractor validation
// ---------------------------------------------------------------------------
describe('distractor_validator', () => {
  test('test_distractor_on_sample_task: D3 derivation matches distractor', () => {
    // ном (N+O+M) with D3 error → мом (M+O+M): н→м substitution
    const NOM = N + O + M;
    const MOM = M + O + M;

    const task = {
      correct_answer: NOM,
      error_targets: ['D3'],
      options: {
        choices: [
          { text: NOM, is_correct: true  },
          { text: MOM, is_correct: false }, // derived by D3: н→м
        ],
      },
    };

    const { ok, reasons } = validateDistractors(task);
    expect(reasons).toEqual([]);
    expect(ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Uniqueness
// ---------------------------------------------------------------------------
describe('uniqueness_validator', () => {
  test('test_uniqueness_finds_duplicates', () => {
    const NOM = N + O + M;
    const GER = G + E + R;

    const tasks = [
      { primary_skill: 'S1', correct_answer: NOM, task_type: 'TT1_CHOICE', id: 'T1' },
      { primary_skill: 'S1', correct_answer: NOM, task_type: 'TT1_CHOICE', id: 'T2' },
      { primary_skill: 'S2', correct_answer: GER, task_type: 'TT2_FILL',   id: 'T3' },
    ];

    const dupes = findDuplicates(tasks);
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toHaveLength(2);
  });

  test('test_uniqueness_no_false_positives', () => {
    const NOM = N + O + M;
    const GER = G + E + R;
    const SAR = S + A + R;

    const tasks = [
      { primary_skill: 'S1', correct_answer: NOM, task_type: 'TT1_CHOICE', id: 'T1' },
      { primary_skill: 'S2', correct_answer: GER, task_type: 'TT2_FILL',   id: 'T2' },
      { primary_skill: 'S1', correct_answer: SAR, task_type: 'TT1_CHOICE', id: 'T3' },
    ];

    const dupes = findDuplicates(tasks);
    expect(dupes).toHaveLength(0);
  });
});
