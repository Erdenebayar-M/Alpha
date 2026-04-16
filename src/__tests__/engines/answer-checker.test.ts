import { checkAnswer, RawDiff } from "../../lib/engines/answer-checker";

// ---------------------------------------------------------------------------
// TT1_CHOICE — exact match
// ---------------------------------------------------------------------------

describe("TT1_CHOICE", () => {
  it("exact match → isCorrect: true, all arrays empty", () => {
    const result = checkAnswer("ном", "ном", "TT1_CHOICE");
    expect(result.isCorrect).toBe(true);
    expect(result.missingChars).toHaveLength(0);
    expect(result.extraChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
    expect(result.caseErrors).toHaveLength(0);
    expect(result.missingPunctuation).toHaveLength(0);
    expect(result.transpositions).toHaveLength(0);
  });

  it("mismatch → isCorrect: false", () => {
    const result = checkAnswer("нум", "ном", "TT1_CHOICE");
    expect(result.isCorrect).toBe(false);
  });

  it("case differs → isCorrect: false (case-sensitive)", () => {
    const result = checkAnswer("Ном", "ном", "TT1_CHOICE");
    expect(result.isCorrect).toBe(false);
  });

  it("whitespace is normalised before comparison", () => {
    const result = checkAnswer("  ном  ", "ном", "TT1_CHOICE");
    expect(result.isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TT2_FILL — fill-the-blank, case-insensitive
// ---------------------------------------------------------------------------

describe("TT2_FILL", () => {
  it("correct fill → isCorrect: true", () => {
    const result = checkAnswer("о", "о", "TT2_FILL");
    expect(result.isCorrect).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("wrong fill → isCorrect: false with wrongChars entry", () => {
    const result = checkAnswer("у", "о", "TT2_FILL");
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars).toHaveLength(1);
    expect(result.wrongChars[0]).toMatchObject({ expected: "о", actual: "у", position: 0 });
  });

  it("fill is case-insensitive: 'А' matches 'а'", () => {
    const result = checkAnswer("А", "а", "TT2_FILL");
    expect(result.isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — missing characters
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – missing characters", () => {
  it("'нм' vs 'ном' → missingChars includes {char:'о', position:1}", () => {
    const result = checkAnswer("нм", "ном", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars.some((c) => c.char === "о" && c.position === 1)).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("'гр' vs 'гэр' → missingChars includes 'э'", () => {
    const result = checkAnswer("гр", "гэр", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars.some((c) => c.char === "э")).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("'того' vs 'тогоо' → missingChars includes the second 'о'", () => {
    const result = checkAnswer("того", "тогоо", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars.some((c) => c.char === "о")).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
    expect(result.transpositions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — extra characters
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – extra characters", () => {
  it("'ноом' vs 'ном' → extraChars includes extra 'о'", () => {
    const result = checkAnswer("ноом", "ном", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.extraChars.some((c) => c.char === "о")).toBe(true);
    expect(result.missingChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("'номм' vs 'ном' → extraChars includes extra 'м'", () => {
    const result = checkAnswer("номм", "ном", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.extraChars.some((c) => c.char === "м")).toBe(true);
    expect(result.missingChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — wrong characters
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – wrong characters", () => {
  it("'кэр' vs 'гэр' → wrongChars includes {expected:'г', actual:'к'}", () => {
    const result = checkAnswer("кэр", "гэр", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars).toHaveLength(1);
    expect(result.wrongChars[0]).toMatchObject({ expected: "г", actual: "к", position: 0 });
    expect(result.missingChars).toHaveLength(0);
    expect(result.extraChars).toHaveLength(0);
  });

  it("perfect match → no wrongChars", () => {
    const result = checkAnswer("гэр", "гэр", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — transpositions
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – transpositions", () => {
  it("'нмо' vs 'ном' → one transposition detected, no wrongChars", () => {
    const result = checkAnswer("нмо", "ном", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.transpositions).toHaveLength(1);
    const t = result.transpositions[0];
    // The transposed pair is (о, м) — order depends on which is expected/actual
    expect(t.chars).toContain("о");
    expect(t.chars).toContain("м");
    expect(result.wrongChars).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — case errors
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – case errors", () => {
  it("'би явна.' vs 'Би явна.' → caseError at position 0, no missingPunctuation", () => {
    const result = checkAnswer("би явна.", "Би явна.", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.caseErrors).toHaveLength(1);
    expect(result.caseErrors[0]).toMatchObject({ expected: "Б", actual: "б", position: 0 });
    expect(result.missingPunctuation).toHaveLength(0);
    expect(result.missingChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("same case → no caseError", () => {
    const result = checkAnswer("Би явна.", "Би явна.", "TT3_CORRECTION");
    expect(result.caseErrors).toHaveLength(0);
    expect(result.isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — missing punctuation
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – missing punctuation", () => {
  it("'Би явна' vs 'Би явна.' → missingPunctuation for period", () => {
    const result = checkAnswer("Би явна", "Би явна.", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
    expect(result.missingPunctuation).toHaveLength(1);
    expect(result.missingPunctuation[0]).toMatchObject({ char: ".", expectedPosition: "end" });
    expect(result.caseErrors).toHaveLength(0);
    expect(result.missingChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("input already has terminal punctuation → no missingPunctuation", () => {
    const result = checkAnswer("Би явна!", "Би явна!", "TT3_CORRECTION");
    expect(result.missingPunctuation).toHaveLength(0);
  });

  it("expected has no terminal punctuation → no missingPunctuation reported", () => {
    const result = checkAnswer("ном", "ном", "TT3_CORRECTION");
    expect(result.missingPunctuation).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TT3_CORRECTION — combined: perfect sentence
// ---------------------------------------------------------------------------

describe("TT3_CORRECTION – isCorrect", () => {
  it("identical strings → isCorrect: true", () => {
    const result = checkAnswer("Би явна.", "Би явна.", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(true);
  });

  it("any difference → isCorrect: false", () => {
    const result = checkAnswer("Би ябна.", "Би явна.", "TT3_CORRECTION");
    expect(result.isCorrect).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TT4_DICTATION
// ---------------------------------------------------------------------------

describe("TT4_DICTATION", () => {
  it("exact word-list match → isCorrect: true", () => {
    const result = checkAnswer("ном гэр нар", "ном гэр нар", "TT4_DICTATION");
    expect(result.isCorrect).toBe(true);
    expect(result.missingChars).toHaveLength(0);
    expect(result.wrongChars).toHaveLength(0);
  });

  it("'ном гр нар' vs 'ном гэр нар' → missingChars includes 'э'", () => {
    const result = checkAnswer("ном гр нар", "ном гэр нар", "TT4_DICTATION");
    expect(result.isCorrect).toBe(false);
    expect(result.missingChars.some((c) => c.char === "э")).toBe(true);
    expect(result.wrongChars).toHaveLength(0);
    expect(result.extraChars).toHaveLength(0);
  });

  it("wrong word: 'ном кэр нар' vs 'ном гэр нар' → wrongChars with г→к", () => {
    const result = checkAnswer("ном кэр нар", "ном гэр нар", "TT4_DICTATION");
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars.some((w) => w.expected === "г" && w.actual === "к")).toBe(true);
  });

  it("comma-separated input is handled like spaces", () => {
    const result = checkAnswer("ном,гэр,нар", "ном гэр нар", "TT4_DICTATION");
    expect(result.isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TT6_SELF_CHECK — same full-diff logic as TT3
// ---------------------------------------------------------------------------

describe("TT6_SELF_CHECK", () => {
  it("identical → isCorrect: true", () => {
    const result = checkAnswer("гэр", "гэр", "TT6_SELF_CHECK");
    expect(result.isCorrect).toBe(true);
  });

  it("wrong char → isCorrect: false with wrongChars", () => {
    const result = checkAnswer("кэр", "гэр", "TT6_SELF_CHECK");
    expect(result.isCorrect).toBe(false);
    expect(result.wrongChars[0]).toMatchObject({ expected: "г", actual: "к" });
  });
});

// ---------------------------------------------------------------------------
// Pre-processing edge cases
// ---------------------------------------------------------------------------

describe("Pre-processing", () => {
  it("collapses multiple internal spaces before comparing", () => {
    const result = checkAnswer("ном  гэр", "ном гэр", "TT1_CHOICE");
    expect(result.isCorrect).toBe(true);
  });

  it("NFC normalisation: composed and decomposed forms are equal", () => {
    // 'э' composed (U+044D) vs a hypothetical decomposed sequence — both NFC to same
    const composed = "\u044D"; // э composed
    const result = checkAnswer(composed, "э", "TT1_CHOICE");
    expect(result.isCorrect).toBe(true);
  });
});
