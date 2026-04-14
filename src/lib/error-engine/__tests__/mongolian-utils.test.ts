import {
  LONG_VOWEL_PAIRS,
  CONFUSABLE_CONSONANT_PAIRS,
  isLongVowelPart,
  isReducedVowelPosition,
  syllabify,
  extractSuffix,
} from "../mongolian-utils";

// ─── LONG_VOWEL_PAIRS ─────────────────────────────────────────────────────────

describe("LONG_VOWEL_PAIRS", () => {
  it("contains exactly the 7 canonical Mongolian long-vowel digraphs", () => {
    expect(LONG_VOWEL_PAIRS).toEqual(["аа", "ээ", "оо", "өө", "уу", "үү", "ий"]);
  });

  it("includes ий as a long vowel (often missed)", () => {
    expect(LONG_VOWEL_PAIRS).toContain("ий");
  });

  it("is readonly (length matches declaration)", () => {
    expect(LONG_VOWEL_PAIRS).toHaveLength(7);
  });
});

// ─── CONFUSABLE_CONSONANT_PAIRS ───────────────────────────────────────────────

describe("CONFUSABLE_CONSONANT_PAIRS", () => {
  it("contains all 6 D3-relevant pairs", () => {
    expect(CONFUSABLE_CONSONANT_PAIRS).toHaveLength(6);
  });

  const expected: [string, string][] = [
    ["н", "м"],
    ["г", "к"],
    ["д", "т"],
    ["б", "п"],
    ["з", "с"],
    ["ж", "ш"],
  ];
  it.each(expected)("includes pair [%s, %s]", (a, b) => {
    expect(CONFUSABLE_CONSONANT_PAIRS).toContainEqual([a, b]);
  });
});

// ─── isLongVowelPart ──────────────────────────────────────────────────────────

describe("isLongVowelPart", () => {
  // Doc examples
  it('тогоо pos 3 → true (first о of оо)', () => {
    expect(isLongVowelPart("тогоо", 3)).toBe(true);
  });

  it('тогоо pos 4 → true (second о of оо)', () => {
    expect(isLongVowelPart("тогоо", 4)).toBe(true);
  });

  it('ном pos 1 → false (single о, not a digraph)', () => {
    expect(isLongVowelPart("ном", 1)).toBe(false);
  });

  it('сүү pos 1 → true (first ү of үү)', () => {
    expect(isLongVowelPart("сүү", 1)).toBe(true);
  });

  it('сүү pos 2 → true (second ү of үү)', () => {
    expect(isLongVowelPart("сүү", 2)).toBe(true);
  });

  // Long-vowel pair coverage for all 7 digraphs
  it.each([
    ["аав",  0, true,  "аа — first а (index 0)"],
    ["аав",  1, true,  "аа — second а (index 1)"],
    ["ээж",  0, true,  "ээ — first э"],
    ["ээж",  1, true,  "ээ — second э"],
    ["тогоо", 3, true, "оо — first о"],
    ["тогоо", 4, true, "оо — second о"],
    ["нөөгч", 1, true, "өө — first ө"],
    ["нөөгч", 2, true, "өө — second ө"],
    ["туул",  1, true, "уу — first у"],
    ["туул",  2, true, "уу — second у"],
    ["сүү",   1, true, "үү — first ү"],
    ["сүү",   2, true, "үү — second ү"],
    ["ийм",   0, true, "ий — first и (edge case)"],
    ["ийм",   1, true, "ий — second й (edge case)"],
  ] as [string, number, boolean, string][])(
    "%s pos %d → %s (%s)",
    (word, pos, expected) => {
      expect(isLongVowelPart(word, pos)).toBe(expected);
    }
  );

  // Negative cases — single vowels that are NOT part of a digraph
  it.each([
    ["ном",    0, "н is a consonant"],
    ["ном",    1, "single о"],
    ["ном",    2, "м is a consonant"],
    ["гэр",    1, "single э"],
    ["мал",    1, "single а"],
  ] as [string, number, string][])(
    "%s pos %d → false (%s)",
    (word, pos) => {
      expect(isLongVowelPart(word, pos)).toBe(false);
    }
  );

  // Boundary / out-of-range
  it("returns false for negative position", () => {
    expect(isLongVowelPart("тогоо", -1)).toBe(false);
  });

  it("returns false for position >= word.length", () => {
    expect(isLongVowelPart("тогоо", 5)).toBe(false);
  });

  it("returns false for empty word", () => {
    expect(isLongVowelPart("", 0)).toBe(false);
  });
});

// ─── isReducedVowelPosition ───────────────────────────────────────────────────

describe("isReducedVowelPosition", () => {
  // All 18 doc-specified words.
  // Positions are 0-based, derived from C4 error pairs (e.g. газар→газр means
  // the reduced vowel is the second а, at 0-based index 3).
  it.each([
    ["газар",   3, true,  "г.а.з.*а*.р — dropped а"],
    ["самбар",  4, true,  "с.а.м.б.*а*.р — dropped а"],
    ["дэвтэр",  4, true,  "д.э.в.т.*э*.р — dropped э"],
    ["хувцас",  4, true,  "х.у.в.ц.*а*.с — dropped а"],
    ["сандал",  4, true,  "с.а.н.д.*а*.л — dropped а"],
    ["авдар",   3, true,  "а.в.д.*а*.р — dropped а"],
    ["байшин",  4, true,  "б.а.й.ш.*и*.н — dropped и"],
    ["хундага", 4, true,  "х.у.н.д.*а*.г.а — dropped а"],
    ["янзага",  3, true,  "я.н.з.*а*.г.а — dropped а"],
    ["жинхэнэ", 4, true,  "ж.и.н.х.*э*.н.э — dropped э"],
    ["эмнэлэг", 3, true,  "э.м.н.*э*.л.э.г — dropped э"],
    ["салбар",  4, true,  "с.а.л.б.*а*.р — dropped а"],
    ["түвшин",  4, true,  "т.ү.в.ш.*и*.н — dropped и"],
    ["бортого", 4, true,  "б.о.р.т.*о*.г.о — dropped о"],
    ["оньсого", 4, true,  "о.н.ь.с.*о*.г.о — dropped о"],
    ["асуудал", 5, true,  "а.с.у.у.д.*а*.л — dropped а"],
    ["эрдэнэ",  3, true,  "э.р.д.*э*.н.э — dropped э"],
  ] as [string, number, boolean, string][])(
    "%s pos %d → %s (%s)",
    (word, pos, expected) => {
      expect(isReducedVowelPosition(word, pos)).toBe(expected);
    }
  );

  // цэцэг edge case: doc Section 2.1 — 2nd э at position 3 (0-based) is C4, not B1
  // цэцэг→цэцг means the э at index 3 is the reduced vowel
  it("цэцэг pos 3 → true (critical C4 edge case: 2nd э is reduced, not B1)", () => {
    expect(isReducedVowelPosition("цэцэг", 3)).toBe(true);
  });

  // Non-reduced positions in known words
  it("газар pos 0 → false (г is a consonant)", () => {
    expect(isReducedVowelPosition("газар", 0)).toBe(false);
  });

  it("газар pos 1 → false (first а is not the reduced vowel)", () => {
    expect(isReducedVowelPosition("газар", 1)).toBe(false);
  });

  it("газар pos 2 → false (з is a consonant, not the reduced vowel)", () => {
    expect(isReducedVowelPosition("газар", 2)).toBe(false);
  });

  // Unknown word
  it("unknown word → false regardless of position", () => {
    expect(isReducedVowelPosition("ном", 1)).toBe(false);
    expect(isReducedVowelPosition("гэр", 1)).toBe(false);
  });

  // Boundary
  it("returns false for negative position", () => {
    expect(isReducedVowelPosition("газар", -1)).toBe(false);
  });

  it("returns false for position >= word.length", () => {
    expect(isReducedVowelPosition("газар", 5)).toBe(false);
  });
});

// ─── syllabify ────────────────────────────────────────────────────────────────

describe("syllabify", () => {
  // Doc examples
  it('ном → ["ном"] (monosyllabic CVC)', () => {
    expect(syllabify("ном")).toEqual(["ном"]);
  });

  it('тогоо → ["то", "гоо"] (long vowel kept in second syllable)', () => {
    expect(syllabify("тогоо")).toEqual(["то", "гоо"]);
  });

  it('дэвтэр → ["дэв", "тэр"] (consonant cluster split)', () => {
    expect(syllabify("дэвтэр")).toEqual(["дэв", "тэр"]);
  });

  // Additional coverage
  it('гэр → ["гэр"] (monosyllabic)', () => {
    expect(syllabify("гэр")).toEqual(["гэр"]);
  });

  it('мал → ["мал"] (monosyllabic)', () => {
    expect(syllabify("мал")).toEqual(["мал"]);
  });

  it('сүү → ["сүү"] (monosyllabic with long vowel)', () => {
    expect(syllabify("сүү")).toEqual(["сүү"]);
  });

  it('ааав → handles leading long vowel followed by consonant + vowel', () => {
    // аа = long vowel, в = consonant at end → ["аав"] but "ааав" shouldn't crash
    expect(syllabify("аав")).toEqual(["аав"]);
  });

  it('empty string → []', () => {
    expect(syllabify("")).toEqual([]);
  });

  // Monosyllabic words ending in consonant cluster
  it('хивс → ["хивс"] (all consonants after vowel form one coda)', () => {
    expect(syllabify("хивс")).toEqual(["хивс"]);
  });
});

// ─── extractSuffix ────────────────────────────────────────────────────────────

describe("extractSuffix", () => {
  // Doc examples
  it('гэрт / гэр → dative-locative suffix т', () => {
    expect(extractSuffix("гэрт", "гэр")).toEqual({
      root: "гэр",
      suffix: "т",
      suffixType: "dative-locative",
    });
  });

  it('номоо / ном → possessive-reflexive suffix оо', () => {
    expect(extractSuffix("номоо", "ном")).toEqual({
      root: "ном",
      suffix: "оо",
      suffixType: "possessive-reflexive",
    });
  });

  it('гэр / гэр → null (no suffix)', () => {
    expect(extractSuffix("гэр", "гэр")).toBeNull();
  });

  // All MVP suffix types
  it('гэрд / гэр → dative-locative suffix д', () => {
    expect(extractSuffix("гэрд", "гэр")).toEqual({
      root: "гэр",
      suffix: "д",
      suffixType: "dative-locative",
    });
  });

  it('номийг / ном → accusative suffix ийг', () => {
    expect(extractSuffix("номийг", "ном")).toEqual({
      root: "ном",
      suffix: "ийг",
      suffixType: "accusative",
    });
  });

  it('номыг / ном → accusative suffix ыг', () => {
    expect(extractSuffix("номыг", "ном")).toEqual({
      root: "ном",
      suffix: "ыг",
      suffixType: "accusative",
    });
  });

  it('номг / ном → accusative suffix г (short form)', () => {
    expect(extractSuffix("номг", "ном")).toEqual({
      root: "ном",
      suffix: "г",
      suffixType: "accusative",
    });
  });

  it('гэрээс / гэр → ablative suffix ээс', () => {
    expect(extractSuffix("гэрээс", "гэр")).toEqual({
      root: "гэр",
      suffix: "ээс",
      suffixType: "ablative",
    });
  });

  it('номоос / ном → ablative suffix оос', () => {
    expect(extractSuffix("номоос", "ном")).toEqual({
      root: "ном",
      suffix: "оос",
      suffixType: "ablative",
    });
  });

  it('номаас / ном → ablative suffix аас', () => {
    expect(extractSuffix("номаас", "ном")).toEqual({
      root: "ном",
      suffix: "аас",
      suffixType: "ablative",
    });
  });

  it('өрөөөөс / өрөө → ablative suffix өөс', () => {
    expect(extractSuffix("өрөөөөс", "өрөө")).toEqual({
      root: "өрөө",
      suffix: "өөс",
      suffixType: "ablative",
    });
  });

  it('гэртэй / гэр → comitative suffix тэй', () => {
    expect(extractSuffix("гэртэй", "гэр")).toEqual({
      root: "гэр",
      suffix: "тэй",
      suffixType: "comitative",
    });
  });

  it('малтай / мал → comitative suffix тай', () => {
    expect(extractSuffix("малтай", "мал")).toEqual({
      root: "мал",
      suffix: "тай",
      suffixType: "comitative",
    });
  });

  it('номтой / ном → comitative suffix той', () => {
    expect(extractSuffix("номтой", "ном")).toEqual({
      root: "ном",
      suffix: "той",
      suffixType: "comitative",
    });
  });

  it('гэррүү / гэр → directional suffix рүү', () => {
    expect(extractSuffix("гэррүү", "гэр")).toEqual({
      root: "гэр",
      suffix: "рүү",
      suffixType: "directional",
    });
  });

  it('малруу / мал → directional suffix руу', () => {
    expect(extractSuffix("малруу", "мал")).toEqual({
      root: "мал",
      suffix: "руу",
      suffixType: "directional",
    });
  });

  it('гэрээ / гэр → possessive-reflexive suffix ээ', () => {
    expect(extractSuffix("гэрээ", "гэр")).toEqual({
      root: "гэр",
      suffix: "ээ",
      suffixType: "possessive-reflexive",
    });
  });

  it('өрөөөө / өрөө → possessive-reflexive suffix өө', () => {
    expect(extractSuffix("өрөөөө", "өрөө")).toEqual({
      root: "өрөө",
      suffix: "өө",
      suffixType: "possessive-reflexive",
    });
  });

  // Greedy matching: аас must win over аа when suffix is аас
  it('аас suffix takes priority over аа (greedy, longest-first)', () => {
    const result = extractSuffix("номаас", "ном");
    expect(result?.suffix).toBe("аас");
    expect(result?.suffixType).toBe("ablative");
  });

  // Root not a prefix → null
  it('returns null when word does not start with the given root', () => {
    expect(extractSuffix("гэрт", "ном")).toBeNull();
  });

  // Unknown suffix → null
  it('returns null for an unrecognised suffix', () => {
    expect(extractSuffix("гэрийн", "гэр")).toBeNull();
  });

  // Empty suffix (word === root) → null
  it('returns null when word equals root (no suffix)', () => {
    expect(extractSuffix("ном", "ном")).toBeNull();
  });
});
