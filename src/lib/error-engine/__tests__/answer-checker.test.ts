import { checkAnswer, checkSentence } from '../answer-checker';

// ─── B1: character omission ──────────────────────────────────────────────────

describe('B1 — character omission', () => {
  it('"нм" vs "ном" → missing "о" at position 1', () => {
    const result = checkAnswer('ном', 'нм');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'о', position: 1 });
  });

  it('"гр" vs "гэр" → missing "э" at position 1', () => {
    const result = checkAnswer('гэр', 'гр');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'э', position: 1 });
  });

  it('"мрь" vs "морь" → missing "о" at position 1', () => {
    const result = checkAnswer('морь', 'мрь');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'о', position: 1 });
  });

  it('"хвс" vs "хивс" → missing "и" at position 1', () => {
    const result = checkAnswer('хивс', 'хвс');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'и', position: 1 });
  });
});

// ─── C1: long vowel omission ────────────────────────────────────────────────

describe('C1 — long vowel omission', () => {
  it('"того" vs "тогоо" → missing "о" at position 4', () => {
    const result = checkAnswer('тогоо', 'того');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'о', position: 4 });
  });

  it('"хол" vs "хоол" → missing "о" at position 2', () => {
    const result = checkAnswer('хоол', 'хол');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'о', position: 2 });
  });

  it('"су" vs "сүү" → missing "ү" at position 2', () => {
    const result = checkAnswer('сүү', 'сү');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'ү', position: 2 });
  });

  it('"эж" vs "ээж" → missing "э" at position 1', () => {
    const result = checkAnswer('ээж', 'эж');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual({ char: 'э', position: 1 });
  });

  it('"сургуль" vs "сургууль" → missing char at position 5', () => {
    const result = checkAnswer('сургууль', 'сургуль');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars).toContainEqual(
      expect.objectContaining({ position: 5 }),
    );
  });
});

// ─── C2: long vowel excess ──────────────────────────────────────────────────

describe('C2 — long vowel excess', () => {
  it('"цаас" vs "цас" → extra "а" at position 2', () => {
    const result = checkAnswer('цас', 'цаас');
    expect(result.isCorrect).toBe(false);
    expect(result.extraChars).toContainEqual({ char: 'а', position: 2 });
  });

  it('"ноом" vs "ном" → extra "о" at position 2', () => {
    const result = checkAnswer('ном', 'ноом');
    expect(result.isCorrect).toBe(false);
    expect(result.extraChars).toContainEqual({ char: 'о', position: 2 });
  });

  it('"маал" vs "мал" → extra "а" at position 2', () => {
    const result = checkAnswer('мал', 'маал');
    expect(result.isCorrect).toBe(false);
    expect(result.extraChars).toContainEqual({ char: 'а', position: 2 });
  });
});

// ─── D3: consonant substitution ─────────────────────────────────────────────

describe('D3 — consonant substitution', () => {
  it('"нум" vs "ном" → wrongChars {expected: "о", actual: "у"}', () => {
    const result = checkAnswer('ном', 'нум');
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars).toContainEqual({
      expected: 'о',
      actual: 'у',
      position: 1,
    });
  });

  it('"кэр" vs "гэр" → wrongChars {expected: "г", actual: "к"}', () => {
    const result = checkAnswer('гэр', 'кэр');
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars).toContainEqual({
      expected: 'г',
      actual: 'к',
      position: 0,
    });
  });

  it('"мар" vs "нар" → wrongChars {expected: "н", actual: "м"}', () => {
    const result = checkAnswer('нар', 'мар');
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars).toContainEqual({
      expected: 'н',
      actual: 'м',
      position: 0,
    });
  });
});

// ─── B3: transposition ──────────────────────────────────────────────────────

describe('B3 — transposition', () => {
  it('"нмо" vs "ном" → transposition detected', () => {
    const result = checkAnswer('ном', 'нмо');
    expect(result.isCorrect).toBe(false);
    expect(result.transpositions.length).toBeGreaterThanOrEqual(1);
    expect(result.transpositions[0].position).toBe(1);
  });

  it('"алми" vs "алим" → transposition detected', () => {
    const result = checkAnswer('алим', 'алми');
    expect(result.isCorrect).toBe(false);
    expect(result.transpositions.length).toBeGreaterThanOrEqual(1);
    expect(result.transpositions[0].position).toBe(2);
  });
});

// ─── Multi-error ─────────────────────────────────────────────────────────────

describe('Multi-error', () => {
  it('"хүүхд" vs "хүүхэд" → missingChars detected', () => {
    const result = checkAnswer('хүүхэд', 'хүүхд');
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Exact match ─────────────────────────────────────────────────────────────

describe('Exact match', () => {
  it('identical words are correct', () => {
    const result = checkAnswer('ном', 'ном');
    expect(result.isCorrect).toBe(true);
    expect(result.editDistance).toBe(0);
    expect(result.missingChars).toHaveLength(0);
    expect(result.extraChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
    expect(result.transpositions).toHaveLength(0);
  });
});

// ─── Sentence-level tests ───────────────────────────────────────────────────

describe('checkSentence', () => {
  it('"бат ирлээ" vs "Бат ирлээ." → caseError + missingPunctuation', () => {
    const result = checkSentence('Бат ирлээ.', 'бат ирлээ');
    expect(result.caseErrors).toContainEqual({
      position: 0,
      expected: 'Б',
      actual: 'б',
    });
    expect(result.missingPunctuation).toContainEqual(
      expect.objectContaining({ char: '.' }),
    );
  });

  it('"Би явна" vs "Би явна." → missingPunctuation "."', () => {
    const result = checkSentence('Би явна.', 'Би явна');
    expect(result.missingPunctuation).toContainEqual(
      expect.objectContaining({ char: '.' }),
    );
    expect(result.caseErrors).toHaveLength(0);
  });

  it('"би явна." vs "Би явна." → caseError at position 0', () => {
    const result = checkSentence('Би явна.', 'би явна.');
    expect(result.caseErrors).toContainEqual({
      position: 0,
      expected: 'Б',
      actual: 'б',
    });
    expect(result.missingPunctuation).toHaveLength(0);
  });

  it('identical sentences produce no errors', () => {
    const result = checkSentence('Би явна.', 'Би явна.');
    expect(result.caseErrors).toHaveLength(0);
    expect(result.missingPunctuation).toHaveLength(0);
    expect(result.extraPunctuation).toHaveLength(0);
    expect(result.missingWords).toHaveLength(0);
    expect(result.extraWords).toHaveLength(0);
    for (const w of result.words) {
      expect(w.diff.isCorrect).toBe(true);
    }
  });

  it('handles missing words', () => {
    const result = checkSentence('Би сайн байна.', 'Би байна.');
    expect(result.missingWords.length).toBeGreaterThanOrEqual(1);
  });

  it('handles extra words', () => {
    const result = checkSentence('Би явна.', 'Би маш явна.');
    expect(result.extraWords.length).toBeGreaterThanOrEqual(1);
  });
});
