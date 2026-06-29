import { WORD_ANCHORED, tierFor } from '../task-tier';

// ─── WORD_ANCHORED set ────────────────────────────────────────────────────────

describe('WORD_ANCHORED', () => {
  it('contains every derive-capability TTCode', () => {
    const deriveCapabilityCodes = [
      'TT_1_2', 'TT_1_3', 'TT_1_4',
      'TT_2_1',
      'TT_3_1', 'TT_3_2',
      'TT_4_2', 'TT_4_3', 'TT_4_4',
      'TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_4', 'TT_5_5', 'TT_5_6', 'TT_5_7',
      'TT_7_3',
    ];
    for (const code of deriveCapabilityCodes) {
      expect(WORD_ANCHORED.has(code)).toBe(true);
    }
  });

  it('contains the extra single-word types not in derive-capability TTCode', () => {
    const extra = ['TT_1_1', 'TT_1_5', 'TT_2_2', 'TT_2_3', 'TT_4_1', 'TT_7_1', 'TT_7_2'];
    for (const code of extra) {
      expect(WORD_ANCHORED.has(code)).toBe(true);
    }
  });

  it('does not contain sentence-level types', () => {
    const sentenceLevel = [
      'TT_5_2', // directional suffix in sentence
      'TT_6_1', 'TT_6_2', 'TT_6_3', 'TT_6_4', // punctuation
      'TT_7_4', 'TT_7_5', 'TT_7_6',            // sentence/mini-text dictation
      'TT_8_1', 'TT_8_2', 'TT_8_3', 'TT_8_4',  // find-error / self-check
    ];
    // TT_5_2 is actually word-anchored (suffix selection), so we exclude it
    const trueSentenceLevel = sentenceLevel.filter((t) => t !== 'TT_5_2');
    for (const code of trueSentenceLevel) {
      expect(WORD_ANCHORED.has(code)).toBe(false);
    }
  });
});

// ─── tierFor ──────────────────────────────────────────────────────────────────

describe('tierFor', () => {
  it('returns "word" for word-anchored types', () => {
    expect(tierFor('TT_2_1')).toBe('word');   // fill — derive-capability
    expect(tierFor('TT_3_2')).toBe('word');   // fill (reduced vowel)
    expect(tierFor('TT_7_3')).toBe('word');   // word dictation
    expect(tierFor('TT_1_4')).toBe('word');   // assemble-word
    expect(tierFor('TT_1_1')).toBe('word');   // extra
    expect(tierFor('TT_7_1')).toBe('word');   // copy
    expect(tierFor('TT_7_2')).toBe('word');   // visual-memory
  });

  it('returns "sentence" for sentence-level types', () => {
    expect(tierFor('TT_6_1')).toBe('sentence');
    expect(tierFor('TT_6_2')).toBe('sentence');
    expect(tierFor('TT_6_3')).toBe('sentence');
    expect(tierFor('TT_6_4')).toBe('sentence');
    expect(tierFor('TT_7_4')).toBe('sentence');
    expect(tierFor('TT_7_5')).toBe('sentence');
    expect(tierFor('TT_7_6')).toBe('sentence');
    expect(tierFor('TT_8_1')).toBe('sentence');
    expect(tierFor('TT_8_3')).toBe('sentence');
  });

  it('returns "sentence" for unknown/arbitrary task codes', () => {
    expect(tierFor('TT_UNKNOWN')).toBe('sentence');
    expect(tierFor('')).toBe('sentence');
  });
});
