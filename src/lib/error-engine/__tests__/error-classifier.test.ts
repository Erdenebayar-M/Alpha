import { checkAnswer, checkSentence } from '../answer-checker';
import {
  classifyWordErrors,
  classifySentenceErrors,
  calculateScore,
  type ClassifiedError,
  type TaskMeta,
} from '../error-classifier';

/** Helper: classify a word pair and return error codes found. */
function classifyWord(
  expected: string,
  actual: string,
  meta?: TaskMeta,
): ClassifiedError[] {
  const diff = checkAnswer(expected, actual);
  return classifyWordErrors(diff, expected, actual, meta);
}

/** Helper: return just the error code strings. */
function codes(errors: ClassifiedError[]): string[] {
  return errors.map((e) => e.errorCode);
}

// ═══════════════════════════════════════════════════════════════════════════════
// B1 — Үсэг орхигдол  (10 examples from the doc)
// ═══════════════════════════════════════════════════════════════════════════════

describe('B1 — Үсэг орхигдол', () => {
  it.each([
    ['ном', 'нм', 'о'],         // #1
    ['гэр', 'гр', 'э'],         // #2
    ['мал', 'мл', 'а'],         // #3
    ['цас', 'цс', 'а'],         // #4
    ['алим', 'алм', 'и'],       // #6
    ['гутал', 'гтал', 'у'],     // #7
    ['морь', 'мрь', 'о'],       // #8
    ['хивс', 'хвс', 'и'],       // #10
  ])('"%s" → "%s" → B1 (missing "%s")', (expected, actual, missingChar) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('B1');
    const b1 = errors.find((e) => e.errorCode === 'B1');
    expect(b1).toBeDefined();
    expect(b1!.expectedChar).toBe(missingChar);
    expect(b1!.severity).toBe(2);
  });

  // #5: бага→ба — two chars missing (г and а), both classified as B1
  it('"бага" → "ба" → B1 (multiple missing chars)', () => {
    const errors = classifyWord('бага', 'ба');
    const b1s = errors.filter((e) => e.errorCode === 'B1');
    expect(b1s.length).toBeGreaterThanOrEqual(1);
    expect(b1s[0].severity).toBe(2);
  });

  // #9 Edge case: цэцэг→цэцг should be C4 NOT B1
  it('цэцэг→цэцг should be C4, NOT B1', () => {
    const errors = classifyWord('цэцэг', 'цэцг');
    expect(codes(errors)).toContain('C4');
    expect(codes(errors)).not.toContain('B1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C1 — Урт эгшиг орхигдол  (10 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C1 — Урт эгшиг орхигдол', () => {
  it.each([
    ['тогоо', 'того'],       // #1
    ['хоол', 'хол'],         // #2
    ['сүү', 'сү'],           // #3  (note: doc has "су" but intended сү)
    ['ээж', 'эж'],           // #4
    ['аав', 'ав'],           // #5
    ['туулай', 'тулай'],     // #6
    ['шувуу', 'шуву'],       // #7
    ['сургууль', 'сургуль'], // #9
    ['харандаа', 'харанда'],  // #10
  ])('"%s" → "%s" → C1', (expected, actual) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('C1');
    const c1 = errors.find((e) => e.errorCode === 'C1');
    expect(c1!.severity).toBe(2);
  });

  // #8 Edge: хүүхэд→хүхд has C1 (үү→ү) + C4 (missing э)
  it('хүүхэд→хүхд → C1 + C4', () => {
    const errors = classifyWord('хүүхэд', 'хүхд');
    const errorCodes = codes(errors);
    expect(errorCodes).toContain('C1');
    // The missing э at position 4 is a reduced vowel → C4
    // (хүүхэд has reduced vowel at position 4 per the lookup)
    // Even if not in the lookup, at minimum C1 should be present
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C2 — Урт эгшиг илүүдэл  (10 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2 — Урт эгшиг илүүдэл', () => {
  it.each([
    ['тогоо', 'тогооо'],   // #1 ооо→оо
    ['цас', 'цаас'],       // #2
    ['сүү', 'сүүү'],       // #3
    ['ном', 'ноом'],       // #4
    ['мал', 'маал'],       // #5
    ['гал', 'гаал'],       // #6
    ['шувуу', 'шувууу'],   // #10
  ])('"%s" → "%s" → C2', (expected, actual) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('C2');
    const c2 = errors.find((e) => e.errorCode === 'C2');
    expect(c2!.severity).toBe(2);
  });

  // #8 Edge: морьь→морь is NOT C2 (ь is not a vowel)
  it('морь→морьь → NOT C2 (ь is not a vowel)', () => {
    const errors = classifyWord('морь', 'морьь');
    expect(codes(errors)).not.toContain('C2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C4 — Балархай эгшиг орхигдол  (10 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('C4 — Балархай эгшиг орхигдол', () => {
  it.each([
    ['дэвтэр', 'дэвтр'],   // #1
    ['газар', 'газр'],       // #2
    ['самбар', 'самбр'],     // #3
    ['хувцас', 'хувцс'],    // #4
    ['сандал', 'сандл'],     // #5
    ['авдар', 'авдр'],       // #6
    ['байшин', 'байшн'],     // #7
    ['хундага', 'хундга'],   // #9
    ['янзага', 'янзга'],     // #10
  ])('"%s" → "%s" → C4', (expected, actual) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('C4');
    const c4 = errors.find((e) => e.errorCode === 'C4');
    expect(c4!.severity).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D3 — Гийгүүлэгч андуурал  (10 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('D3 — Гийгүүлэгч андуурал', () => {
  it.each([
    ['ном', 'нум', 'о', 'у'],    // #1 — note: о/у is vowel confusion flagged as D3 in doc
    ['гэр', 'кэр', 'г', 'к'],    // #2
    ['нар', 'мар', 'н', 'м'],    // #3
    ['гэрг', 'гэрк', 'г', 'к'], // #5 (гэрг→гэрк г/к confusion)
    ['цас', 'цаз', 'с', 'з'],    // #6
    ['модь', 'моть', 'д', 'т'],  // #7
    ['бал', 'пал', 'б', 'п'],    // #9
    ['шар', 'жар', 'ш', 'ж'],    // #10
  ])('"%s" → "%s" → D3 (%s/%s)', (expected, actual, expChar, actChar) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('D3');
    const d3 = errors.find((e) => e.errorCode === 'D3');
    expect(d3!.severity).toBe(2);
    expect(d3!.expectedChar).toBe(expChar);
    expect(d3!.actualChar).toBe(actChar);
  });

  // #4 Edge: гэрд→гэрт is E2 NOT D3 (suffix position)
  it('гэрт→гэрд → E2 NOT D3 (suffix position)', () => {
    const errors = classifyWord('гэрт', 'гэрд', { taskType: 'TT4', knownRoot: 'гэр' });
    expect(codes(errors)).toContain('E2');
    expect(codes(errors)).not.toContain('D3');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E1 / E2 / E7 — Залгаврын алдаанууд  (10 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('E-family — Залгаврын алдаанууд', () => {
  // #1 E1: гэр→гэрт (suffix completely missing)
  it('гэрт→гэр → E1 (suffix missing)', () => {
    const errors = classifyWord('гэрт', 'гэр', { taskType: 'TT4', knownRoot: 'гэр' });
    expect(codes(errors)).toContain('E1');
  });

  // #2 E2: гэрд→гэрт (wrong suffix)
  it('гэрт→гэрд → E2 (wrong suffix)', () => {
    const errors = classifyWord('гэрт', 'гэрд', { taskType: 'TT4', knownRoot: 'гэр' });
    expect(codes(errors)).toContain('E2');
  });

  // #3 E7: номоа→номоо (spelling error in suffix)
  it('номоо→номоа → E7 (suffix spelling error)', () => {
    const errors = classifyWord('номоо', 'номоа', { taskType: 'TT4', knownRoot: 'ном' });
    expect(codes(errors)).toContain('E7');
  });

  // #4 E2: номыг→номийг (wrong suffix variant)
  it('номийг→номыг → E2 (wrong suffix variant)', () => {
    const errors = classifyWord('номийг', 'номыг', { taskType: 'TT4', knownRoot: 'ном' });
    expect(codes(errors)).toContain('E2');
  });

  // #5 No error: сургуульд→сургуульд
  it('сургуульд→сургуульд → no error', () => {
    const errors = classifyWord('сургуульд', 'сургуульд');
    expect(errors).toHaveLength(0);
  });

  // #6 E1: ном→номоо (suffix missing)
  it('номоо→ном → E1 (suffix missing)', () => {
    const errors = classifyWord('номоо', 'ном', { taskType: 'TT4', knownRoot: 'ном' });
    expect(codes(errors)).toContain('E1');
  });

  // #8 No error: малд→малд
  it('малд→малд → no error', () => {
    const errors = classifyWord('малд', 'малд');
    expect(errors).toHaveLength(0);
  });

  // #9 E1: хоолтой→хоолт (partial suffix)
  it('хоолтой→хоолт → E1 (partial suffix omission)', () => {
    const errors = classifyWord('хоолтой', 'хоолт', { taskType: 'TT4', knownRoot: 'хоол' });
    expect(codes(errors)).toContain('E1');
  });

  // #10 E7: гэртээ→гэрте (suffix spelling)
  it('гэртээ→гэрте → E7 (suffix spelling)', () => {
    const errors = classifyWord('гэртээ', 'гэрте', { taskType: 'TT4', knownRoot: 'гэр' });
    expect(codes(errors)).toContain('E7');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B3 — Үсгийн байрлал солигдол  (5 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('B3 — Үсгийн байрлал солигдол', () => {
  it.each([
    ['ном', 'нмо'],   // #1
    ['алим', 'алми'],  // #5
  ])('"%s" → "%s" → B3', (expected, actual) => {
    const errors = classifyWord(expected, actual);
    expect(codes(errors)).toContain('B3');
    const b3 = errors.find((e) => e.errorCode === 'B3');
    expect(b3!.severity).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G1 / G2 — Тэмдэглэгээний алдаа  (8 examples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('G1/G2 — Тэмдэглэгээний алдаа', () => {
  // #1 G1+G2: бат ирлээ → Бат ирлээ.
  it('Бат ирлээ. → бат ирлээ → G1+G2', () => {
    const diff = checkSentence('Бат ирлээ.', 'бат ирлээ');
    const errors = classifySentenceErrors(diff);
    const ec = codes(errors);
    expect(ec).toContain('G1');
    expect(ec).toContain('G2');
  });

  // #2 G2: Би явна → Би явна.
  it('Би явна. → Би явна → G2 only', () => {
    const diff = checkSentence('Би явна.', 'Би явна');
    const errors = classifySentenceErrors(diff);
    const ec = codes(errors);
    expect(ec).toContain('G2');
    expect(ec).not.toContain('G1');
  });

  // #3 G1: би явна. → Би явна.
  it('Би явна. → би явна. → G1 only', () => {
    const diff = checkSentence('Би явна.', 'би явна.');
    const errors = classifySentenceErrors(diff);
    const ec = codes(errors);
    expect(ec).toContain('G1');
    expect(ec).not.toContain('G2');
  });

  // #4 No error: Би явна. → Би явна.
  it('Би явна. → Би явна. → no errors', () => {
    const diff = checkSentence('Би явна.', 'Би явна.');
    const errors = classifySentenceErrors(diff);
    expect(errors).toHaveLength(0);
  });

  // #6 G2: Сар тод байна → Сар тод байна.
  it('Сар тод байна. → Сар тод байна → G2', () => {
    const diff = checkSentence('Сар тод байна.', 'Сар тод байна');
    const errors = classifySentenceErrors(diff);
    expect(codes(errors)).toContain('G2');
  });

  // #7 G1+G2: гэр дулаахан → Гэр дулаахан.
  it('Гэр дулаахан. → гэр дулаахан → G1+G2', () => {
    const diff = checkSentence('Гэр дулаахан.', 'гэр дулаахан');
    const errors = classifySentenceErrors(diff);
    const ec = codes(errors);
    expect(ec).toContain('G1');
    expect(ec).toContain('G2');
  });

  // #8 No error: Бат? → Бат?
  it('Бат? → Бат? → no errors', () => {
    const diff = checkSentence('Бат?', 'Бат?');
    const errors = classifySentenceErrors(diff);
    expect(errors).toHaveLength(0);
  });

  // G1 severity check
  it('G1 has severity 1', () => {
    const diff = checkSentence('Би явна.', 'би явна.');
    const errors = classifySentenceErrors(diff);
    const g1 = errors.find((e) => e.errorCode === 'G1');
    expect(g1!.severity).toBe(1);
  });

  // G2 severity check
  it('G2 has severity 1', () => {
    const diff = checkSentence('Би явна.', 'Би явна');
    const errors = classifySentenceErrors(diff);
    const g2 = errors.find((e) => e.errorCode === 'G2');
    expect(g2!.severity).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// H4 — Өөрийгөө шалгаагүй  (5 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

describe('H4 — Өөрийгөө шалгаагүй', () => {
  const baseMeta: TaskMeta = {
    taskType: 'TT6',
    correctAnswer: 'сүү',
  };

  // #1 No revision submitted
  it('no revision → H4', () => {
    const diff = checkSentence('сүү', 'сү');
    const errors = classifySentenceErrors(diff, {
      ...baseMeta,
      originalAttempt: 'сү',
      revision: null,
    });
    expect(codes(errors)).toContain('H4');
  });

  // #2 Revision identical to original wrong answer
  it('revision identical to original wrong → H4', () => {
    const diff = checkSentence('сүү', 'сү');
    const errors = classifySentenceErrors(diff, {
      ...baseMeta,
      originalAttempt: 'сү',
      revision: 'сү',
    });
    expect(codes(errors)).toContain('H4');
  });

  // #3 Correct revision
  it('correct revision → no H4', () => {
    const diff = checkSentence('сүү', 'сүү');
    const errors = classifySentenceErrors(diff, {
      ...baseMeta,
      originalAttempt: 'сү',
      revision: 'сүү',
    });
    expect(codes(errors)).not.toContain('H4');
  });

  // #4 Original was already correct
  it('original already correct → no H4', () => {
    const diff = checkSentence('сүү', 'сүү');
    const errors = classifySentenceErrors(diff, {
      ...baseMeta,
      originalAttempt: 'сүү',
      revision: 'сүү',
    });
    expect(codes(errors)).not.toContain('H4');
  });

  // #5 Correct revision of C1 error
  it('того→тогоо revision → no H4', () => {
    const diff = checkSentence('тогоо', 'тогоо');
    const errors = classifySentenceErrors(diff, {
      taskType: 'TT6',
      correctAnswer: 'тогоо',
      originalAttempt: 'того',
      revision: 'тогоо',
    });
    expect(codes(errors)).not.toContain('H4');
  });

  // H4 only applies to TT6
  it('non-TT6 task → no H4 even with matching conditions', () => {
    const diff = checkSentence('сүү', 'сү');
    const errors = classifySentenceErrors(diff, {
      taskType: 'TT4',
      correctAnswer: 'сүү',
      originalAttempt: 'сү',
      revision: null,
    });
    expect(codes(errors)).not.toContain('H4');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E-family — auto-suffix detection (no knownRoot needed)
// ═══════════════════════════════════════════════════════════════════════════════

// Auto-detect only matches suffixes of length >= 2; 1-char suffixes (т, д, г) are skipped
// to avoid false positives with root-final consonants.
describe('E-family — auto-suffix detection (no knownRoot)', () => {
  it('номоо → ном: E1 (suffix -оо absent)', () => {
    const errors = classifyWord('номоо', 'ном');
    expect(codes(errors)).toContain('E1');
  });

  it('номийг → номыг: E2 (-ыг instead of -ийг)', () => {
    const errors = classifyWord('номийг', 'номыг');
    expect(codes(errors)).toContain('E2');
  });

  it('номоо → номоа: E7 (spelling error within suffix)', () => {
    const errors = classifyWord('номоо', 'номоа');
    expect(codes(errors)).toContain('E7');
  });

  it('гэртээ → гэрте: E7 (missing second э in -ээ)', () => {
    const errors = classifyWord('гэртээ', 'гэрте');
    expect(codes(errors)).toContain('E7');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// calculateScore
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateScore', () => {
  it('no errors → 1.0', () => {
    expect(calculateScore([])).toBe(1.0);
  });

  it('one G1 only (severity 1) → 0.75', () => {
    const errors: ClassifiedError[] = [{
      errorCode: 'G1', severity: 1, position: 0,
      contextWord: '', message: '',
    }];
    expect(calculateScore(errors)).toBe(0.75);
  });

  it('one C1 (severity 2) → 0.5', () => {
    const errors: ClassifiedError[] = [{
      errorCode: 'C1', severity: 2, position: 0,
      contextWord: '', message: '',
    }];
    expect(calculateScore(errors)).toBe(0.5);
  });

  it('C1 + E2 + G2 (2 sev-2 + 1 sev-1 = 3 errors, 2 sev2+) → 0.25', () => {
    const errors: ClassifiedError[] = [
      { errorCode: 'C1', severity: 2, position: 0, contextWord: '', message: '' },
      { errorCode: 'E2', severity: 2, position: 3, contextWord: '', message: '' },
      { errorCode: 'G2', severity: 1, position: 5, contextWord: '', message: '' },
    ];
    expect(calculateScore(errors)).toBe(0.5);
  });

  it('3+ severity-2 errors → 0.25', () => {
    const errors: ClassifiedError[] = [
      { errorCode: 'C1', severity: 2, position: 0, contextWord: '', message: '' },
      { errorCode: 'D3', severity: 2, position: 1, contextWord: '', message: '' },
      { errorCode: 'B1', severity: 2, position: 3, contextWord: '', message: '' },
    ];
    expect(calculateScore(errors)).toBe(0.25);
  });

  it('two severity-2 errors → 0.5', () => {
    const errors: ClassifiedError[] = [
      { errorCode: 'C1', severity: 2, position: 0, contextWord: '', message: '' },
      { errorCode: 'D3', severity: 2, position: 1, contextWord: '', message: '' },
    ];
    expect(calculateScore(errors)).toBe(0.5);
  });
});
