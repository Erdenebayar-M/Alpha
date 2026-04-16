import { checkAnswer } from "../../lib/engines/answer-checker";
import { classifyErrors, calculateTaskScore } from "../../lib/engines/error-classifier";

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

function getCodes(input: string, expected: string): string[] {
  const diff = checkAnswer(input, expected, "TT3_CORRECTION");
  return classifyErrors(diff, expected, "TT3_CORRECTION", input).map((e) => e.code);
}

// ---------------------------------------------------------------------------
// C1 — Long vowel character missing
// ---------------------------------------------------------------------------

describe("C1 — long vowel missing", () => {
  it("'того' vs 'тогоо' → C1 (missing second о of оо)", () => {
    expect(getCodes("того", "тогоо")).toContain("C1");
  });

  it("'хол' vs 'хоол' → C1", () => {
    expect(getCodes("хол", "хоол")).toContain("C1");
  });

  it("'сү' vs 'сүү' → C1", () => {
    expect(getCodes("сү", "сүү")).toContain("C1");
  });

  it("'эж' vs 'ээж' → C1 (first char of pair missing)", () => {
    expect(getCodes("эж", "ээж")).toContain("C1");
  });

  it("'ав' vs 'аав' → C1 (first а of аа missing)", () => {
    expect(getCodes("ав", "аав")).toContain("C1");
  });

  it("'тулай' vs 'туулай' → C1", () => {
    expect(getCodes("тулай", "туулай")).toContain("C1");
  });

  it("'шуву' vs 'шувуу' → C1", () => {
    expect(getCodes("шуву", "шувуу")).toContain("C1");
  });

  it("'сургуль' vs 'сургууль' → C1", () => {
    expect(getCodes("сургуль", "сургууль")).toContain("C1");
  });

  it("'харанда' vs 'харандаа' → C1 (trailing аа)", () => {
    expect(getCodes("харанда", "харандаа")).toContain("C1");
  });
});

// ---------------------------------------------------------------------------
// C4 — Reduced (балархай) vowel missing
// ---------------------------------------------------------------------------

describe("C4 — reduced vowel missing", () => {
  it("'дэвтр' vs 'дэвтэр' → C4", () => {
    expect(getCodes("дэвтр", "дэвтэр")).toContain("C4");
  });

  it("'газр' vs 'газар' → C4", () => {
    expect(getCodes("газр", "газар")).toContain("C4");
  });

  it("'самбр' vs 'самбар' → C4", () => {
    expect(getCodes("самбр", "самбар")).toContain("C4");
  });

  it("'хувцс' vs 'хувцас' → C4", () => {
    expect(getCodes("хувцс", "хувцас")).toContain("C4");
  });

  it("'сандл' vs 'сандал' → C4", () => {
    expect(getCodes("сандл", "сандал")).toContain("C4");
  });

  it("'авдр' vs 'авдар' → C4", () => {
    expect(getCodes("авдр", "авдар")).toContain("C4");
  });

  it("'байшн' vs 'байшин' → C4", () => {
    expect(getCodes("байшн", "байшин")).toContain("C4");
  });
});

// ---------------------------------------------------------------------------
// B1 — General character missing (catch-all)
// ---------------------------------------------------------------------------

describe("B1 — general character missing", () => {
  it("'нм' vs 'ном' → B1", () => {
    expect(getCodes("нм", "ном")).toContain("B1");
  });

  it("'гр' vs 'гэр' → B1", () => {
    expect(getCodes("гр", "гэр")).toContain("B1");
  });

  it("'мл' vs 'мал' → B1", () => {
    expect(getCodes("мл", "мал")).toContain("B1");
  });

  it("'алм' vs 'алим' → B1", () => {
    expect(getCodes("алм", "алим")).toContain("B1");
  });

  it("'гтал' vs 'гутал' → B1", () => {
    expect(getCodes("гтал", "гутал")).toContain("B1");
  });

  it("'мрь' vs 'морь' → B1", () => {
    expect(getCodes("мрь", "морь")).toContain("B1");
  });

  it("'хвс' vs 'хивс' → B1", () => {
    expect(getCodes("хвс", "хивс")).toContain("B1");
  });
});

// ---------------------------------------------------------------------------
// C2 — Extra vowel (long vowel added where none belongs)
// ---------------------------------------------------------------------------

describe("C2 — extra vowel", () => {
  it("'ноом' vs 'ном' → C2", () => {
    expect(getCodes("ноом", "ном")).toContain("C2");
  });

  it("'маал' vs 'мал' → C2", () => {
    expect(getCodes("маал", "мал")).toContain("C2");
  });

  it("'цаас' vs 'цас' → C2", () => {
    expect(getCodes("цаас", "цас")).toContain("C2");
  });

  it("'гаал' vs 'гал' → C2", () => {
    expect(getCodes("гаал", "гал")).toContain("C2");
  });

  it("'шувууу' vs 'шувуу' → C2 (extra у on valid long vowel)", () => {
    expect(getCodes("шувууу", "шувуу")).toContain("C2");
  });
});

// ---------------------------------------------------------------------------
// Critical edge cases
// ---------------------------------------------------------------------------

describe("Critical edge cases", () => {
  it("'цэцг' vs 'цэцэг' → C4, NOT B1 (reduced э at position 3)", () => {
    const codes = getCodes("цэцг", "цэцэг");
    expect(codes).toContain("C4");
    expect(codes).not.toContain("B1");
  });

  it("'хүхд' vs 'хүүхэд' → both C1 (missing ү of үү) and C4 (missing reduced э)", () => {
    const codes = getCodes("хүхд", "хүүхэд");
    expect(codes).toContain("C1");
    expect(codes).toContain("C4");
  });

  it("'морьь' vs 'морь' → NO C2 (ь is not a vowel)", () => {
    const codes = getCodes("морьь", "морь");
    expect(codes).not.toContain("C2");
  });

  it("correct input → empty array", () => {
    expect(getCodes("ном", "ном")).toHaveLength(0);
  });

  // Priority: a char that qualifies for C1 must NOT also get C4 or B1
  it("'сүүрэлд' with missing ү → only C1, not B1", () => {
    const codes = getCodes("сүрэлд", "сүүрэлд");
    expect(codes).toContain("C1");
    expect(codes).not.toContain("B1");
  });

  // Priority: a char that qualifies for C4 must NOT also get B1
  it("'самбр' → only C4, not B1", () => {
    const codes = getCodes("самбр", "самбар");
    expect(codes).toContain("C4");
    expect(codes).not.toContain("B1");
  });

  // Correct classification of each missing char in a word with two errors
  it("'хүхд' → exactly two classifications: one C1 and one C4", () => {
    const codes = getCodes("хүхд", "хүүхэд");
    expect(codes.filter((c) => c === "C1")).toHaveLength(1);
    expect(codes.filter((c) => c === "C4")).toHaveLength(1);
    expect(codes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// D3 — Consonant confusion pair (root region)
// ---------------------------------------------------------------------------

describe("D3 — consonant confusion", () => {
  it("'кэр' vs 'гэр' → D3 (г↔к)", () => {
    expect(getCodes("кэр", "гэр")).toContain("D3");
  });

  it("'мар' vs 'нар' → D3 (н↔м)", () => {
    expect(getCodes("мар", "нар")).toContain("D3");
  });

  it("'цаз' vs 'цас' → D3 (с↔з)", () => {
    expect(getCodes("цаз", "цас")).toContain("D3");
  });

  it("'моть' vs 'модь' → D3 (д↔т)", () => {
    expect(getCodes("моть", "модь")).toContain("D3");
  });

  it("'пал' vs 'бал' → D3 (б↔п)", () => {
    expect(getCodes("пал", "бал")).toContain("D3");
  });

  it("'жар' vs 'шар' → D3 (ш↔ж)", () => {
    expect(getCodes("жар", "шар")).toContain("D3");
  });
});

// ---------------------------------------------------------------------------
// B3 — Transposition
// ---------------------------------------------------------------------------

describe("B3 — transposition", () => {
  it("'нмо' vs 'ном' → B3", () => {
    expect(getCodes("нмо", "ном")).toContain("B3");
  });

  it("'алми' vs 'алим' → B3", () => {
    expect(getCodes("алми", "алим")).toContain("B3");
  });
});

// ---------------------------------------------------------------------------
// E1 — Suffix completely missing
// ---------------------------------------------------------------------------

describe("E1 — suffix completely missing", () => {
  it("'гэр' vs 'гэрт' → E1 (suffix -т absent)", () => {
    expect(getCodes("гэр", "гэрт")).toContain("E1");
  });

  it("'ном' vs 'номоо' → E1 (suffix -оо absent)", () => {
    expect(getCodes("ном", "номоо")).toContain("E1");
  });
});

// ---------------------------------------------------------------------------
// E2 — Wrong suffix
// ---------------------------------------------------------------------------

describe("E2 — wrong suffix", () => {
  it("'гэрд' vs 'гэрт' → E2 (-д instead of -т)", () => {
    expect(getCodes("гэрд", "гэрт")).toContain("E2");
  });

  it("'номыг' vs 'номийг' → E2 (-ыг instead of -ийг)", () => {
    expect(getCodes("номыг", "номийг")).toContain("E2");
  });
});

// ---------------------------------------------------------------------------
// E7 — Spelling error within suffix
// ---------------------------------------------------------------------------

describe("E7 — spelling error within suffix", () => {
  it("'номоа' vs 'номоо' → E7 (а instead of second о in -оо)", () => {
    expect(getCodes("номоа", "номоо")).toContain("E7");
  });

  it("'гэрте' vs 'гэртээ' → E7 (missing second э in -ээ)", () => {
    expect(getCodes("гэрте", "гэртээ")).toContain("E7");
  });
});

// ---------------------------------------------------------------------------
// Critical edge case: suffix boundary takes priority over D3
// ---------------------------------------------------------------------------

describe("Suffix boundary priority over D3", () => {
  it("'гэрд' vs 'гэрт' → E2 (not D3): suffix check wins", () => {
    const codes = getCodes("гэрд", "гэрт");
    expect(codes).toContain("E2");
    expect(codes).not.toContain("D3");
  });
});

// ---------------------------------------------------------------------------
// G1 — Capital letter error
// ---------------------------------------------------------------------------

describe("G1 — capital letter error", () => {
  it("'би явна.' vs 'Би явна.' → G1 (first char not capitalised)", () => {
    expect(getCodes("би явна.", "Би явна.")).toContain("G1");
  });

  it("'ЦАС ОРЛОО.' vs 'Цас орлоо.' → G1 (all-caps input)", () => {
    expect(getCodes("ЦАС ОРЛОО.", "Цас орлоо.")).toContain("G1");
  });
});

// ---------------------------------------------------------------------------
// G2 — Missing terminal punctuation
// ---------------------------------------------------------------------------

describe("G2 — missing punctuation", () => {
  it("'Би явна' vs 'Би явна.' → G2", () => {
    expect(getCodes("Би явна", "Би явна.")).toContain("G2");
  });

  it("'Сар тод байна' vs 'Сар тод байна.' → G2", () => {
    expect(getCodes("Сар тод байна", "Сар тод байна.")).toContain("G2");
  });
});

// ---------------------------------------------------------------------------
// Combined G1 + G2
// ---------------------------------------------------------------------------

describe("G1 + G2 combined", () => {
  it("'би явна' vs 'Би явна.' → both G1 and G2", () => {
    const codes = getCodes("би явна", "Би явна.");
    expect(codes).toContain("G1");
    expect(codes).toContain("G2");
  });
});

// ---------------------------------------------------------------------------
// H4 — Self-check failure
// ---------------------------------------------------------------------------

describe("H4 — self-check failure", () => {
  it("child did NOT fix the error → H4 present", () => {
    const diff = checkAnswer("сү", "сүү", "TT6_SELF_CHECK");
    const codes = classifyErrors(diff, "сүү", "TT6_SELF_CHECK").map((e) => e.code);
    expect(codes).toContain("H4");
  });

  it("child DID fix the error → no errors at all", () => {
    const diff = checkAnswer("сүү", "сүү", "TT6_SELF_CHECK");
    const codes = classifyErrors(diff, "сүү", "TT6_SELF_CHECK").map((e) => e.code);
    expect(codes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Correct inputs — no errors
// ---------------------------------------------------------------------------

describe("Correct inputs produce empty result", () => {
  it("'ном' vs 'ном' → length 0", () => {
    expect(getCodes("ном", "ном")).toHaveLength(0);
  });

  it("'Би явна.' vs 'Би явна.' → length 0", () => {
    expect(getCodes("Би явна.", "Би явна.")).toHaveLength(0);
  });

  it("'тогоо' vs 'тогоо' → length 0", () => {
    expect(getCodes("тогоо", "тогоо")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateTaskScore
// ---------------------------------------------------------------------------

describe("calculateTaskScore", () => {
  it("no errors → 1.0", () => {
    expect(calculateTaskScore([])).toBe(1.0);
  });

  it("one severity-1 error → 0.75", () => {
    expect(calculateTaskScore([{ code: "G1", severity: 1 }])).toBe(0.75);
  });

  it("one severity-2 error → 0.5", () => {
    expect(calculateTaskScore([{ code: "C1", severity: 2 }])).toBe(0.5);
  });

  it("three severity-2 errors → 0.25", () => {
    expect(
      calculateTaskScore([
        { code: "C1", severity: 2 },
        { code: "C4", severity: 2 },
        { code: "B1", severity: 2 },
      ]),
    ).toBe(0.25);
  });

  it("one severity-2 + one severity-1 → 0.5", () => {
    expect(
      calculateTaskScore([
        { code: "C1", severity: 2 },
        { code: "G1", severity: 1 },
      ]),
    ).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Metadata on returned ErrorClassification objects
// ---------------------------------------------------------------------------

describe("ErrorClassification shape", () => {
  it("C1 result has severity 2 and expectedChar set", () => {
    const diff = checkAnswer("того", "тогоо", "TT3_CORRECTION");
    const errors = classifyErrors(diff, "тогоо", "TT3_CORRECTION");
    const c1 = errors.find((e) => e.code === "C1");
    expect(c1).toBeDefined();
    expect(c1!.severity).toBe(2);
    expect(c1!.expectedChar).toBe("о");
    expect(c1!.contextWord).toBe("тогоо");
  });

  it("C4 result has severity 2 and expectedChar set", () => {
    const diff = checkAnswer("дэвтр", "дэвтэр", "TT3_CORRECTION");
    const errors = classifyErrors(diff, "дэвтэр", "TT3_CORRECTION");
    const c4 = errors.find((e) => e.code === "C4");
    expect(c4).toBeDefined();
    expect(c4!.severity).toBe(2);
    expect(c4!.expectedChar).toBe("э");
  });

  it("B1 result has severity 2 and expectedChar set", () => {
    const diff = checkAnswer("нм", "ном", "TT3_CORRECTION");
    const errors = classifyErrors(diff, "ном", "TT3_CORRECTION");
    const b1 = errors.find((e) => e.code === "B1");
    expect(b1).toBeDefined();
    expect(b1!.severity).toBe(2);
    expect(b1!.expectedChar).toBe("о");
  });

  it("C2 result has severity 2 and actualChar set", () => {
    const diff = checkAnswer("ноом", "ном", "TT3_CORRECTION");
    const errors = classifyErrors(diff, "ном", "TT3_CORRECTION");
    const c2 = errors.find((e) => e.code === "C2");
    expect(c2).toBeDefined();
    expect(c2!.severity).toBe(2);
    expect(c2!.actualChar).toBe("о");
  });
});
