import {
  isLongVowelPosition,
  isReducedVowelPosition,
  extractSuffix,
  isConsonantConfusionPair,
  isVowel,
  isConsonant,
} from "../../lib/engines/mongolian-helpers";

// ---------------------------------------------------------------------------
// isLongVowelPosition
// ---------------------------------------------------------------------------

describe("isLongVowelPosition", () => {
  // "тогоо" = т(0)о(1)г(2)о(3)о(4)
  it("returns true for position 4 in 'тогоо' — second о of оо", () => {
    expect(isLongVowelPosition("тогоо", 4)).toBe(true);
  });

  it("returns false for position 3 in 'тогоо' — first о of оо", () => {
    expect(isLongVowelPosition("тогоо", 3)).toBe(false);
  });

  // "сүү" = с(0)ү(1)ү(2)
  it("returns true for position 2 in 'сүү' — second ү of үү", () => {
    expect(isLongVowelPosition("сүү", 2)).toBe(true);
  });

  it("returns false for position 1 in 'сүү' — first ү", () => {
    expect(isLongVowelPosition("сүү", 1)).toBe(false);
  });

  // "ном" = н(0)о(1)м(2)
  it("returns false for position 1 in 'ном' — о is not part of a long vowel", () => {
    expect(isLongVowelPosition("ном", 1)).toBe(false);
  });

  // "ээж" = э(0)э(1)ж(2)
  it("returns true for position 1 in 'ээж' — second э of ээ", () => {
    expect(isLongVowelPosition("ээж", 1)).toBe(true);
  });

  // "ий" as long vowel: "туулай" = т(0)у(1)у(2)л(3)а(4)й(5)
  // й is at position 5, and word[4] = 'а' (not 'и'), so NOT an "ий" pair
  it("returns false for й in 'туулай' — preceded by 'а', not 'и'", () => {
    expect(isLongVowelPosition("туулай", 5)).toBe(false);
  });

  // Verify "ий" detection with a word that actually contains ий
  // "ийм" = и(0)й(1)м(2)
  it("returns true for position 1 in 'ийм' — й is second of ий pair", () => {
    expect(isLongVowelPosition("ийм", 1)).toBe(true);
  });

  // Edge: position 0 can never be the second of a pair
  it("returns false for position 0 (can never be second of a pair)", () => {
    expect(isLongVowelPosition("аа", 0)).toBe(false);
  });

  // "уу" at positions 1-2 within "туулай"
  it("returns true for position 2 in 'туулай' — second у of уу", () => {
    expect(isLongVowelPosition("туулай", 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isReducedVowelPosition
// ---------------------------------------------------------------------------

describe("isReducedVowelPosition", () => {
  // "дэвтэр" = д(0)э(1)в(2)т(3)э(4)р(5)
  it("returns true for 'дэвтэр' pos 4 — э is the reduced vowel", () => {
    expect(isReducedVowelPosition("дэвтэр", 4)).toBe(true);
  });

  it("returns false for 'дэвтэр' pos 1 — first э is not reduced", () => {
    expect(isReducedVowelPosition("дэвтэр", 1)).toBe(false);
  });

  // "газар" = г(0)а(1)з(2)а(3)р(4)
  it("returns true for 'газар' pos 3 — а is reduced", () => {
    expect(isReducedVowelPosition("газар", 3)).toBe(true);
  });

  // "цэцэг" = ц(0)э(1)ц(2)э(3)г(4)
  it("returns true for 'цэцэг' pos 3 — second э is reduced", () => {
    expect(isReducedVowelPosition("цэцэг", 3)).toBe(true);
  });

  // "самбар" = с(0)а(1)м(2)б(3)а(4)р(5)
  it("returns true for 'самбар' pos 4 — second а is reduced", () => {
    expect(isReducedVowelPosition("самбар", 4)).toBe(true);
  });

  // Word not in the map — conservative false
  it("returns false for 'ном' (not in map)", () => {
    expect(isReducedVowelPosition("ном", 1)).toBe(false);
  });

  it("returns false for an unknown word", () => {
    expect(isReducedVowelPosition("хоол", 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractSuffix
// ---------------------------------------------------------------------------

describe("extractSuffix", () => {
  it("'гэрт' → root 'гэр', suffix '-т'", () => {
    expect(extractSuffix("гэрт")).toEqual({ root: "гэр", suffix: "-т" });
  });

  it("'гэрд' → root 'гэр', suffix '-д'", () => {
    expect(extractSuffix("гэрд")).toEqual({ root: "гэр", suffix: "-д" });
  });

  it("'номоо' → root 'ном', suffix '-оо'", () => {
    expect(extractSuffix("номоо")).toEqual({ root: "ном", suffix: "-оо" });
  });

  it("'номийг' → root 'ном', suffix '-ийг' (longer match wins over '-г')", () => {
    expect(extractSuffix("номийг")).toEqual({ root: "ном", suffix: "-ийг" });
  });

  // MVP limitation: "-иас" is not in the suffix list
  it("'сургуулиас' → null (suffix '-иас' not in MVP list)", () => {
    expect(extractSuffix("сургуулиас")).toBeNull();
  });

  it("'ном' → null (no known suffix)", () => {
    expect(extractSuffix("ном")).toBeNull();
  });

  it("'гэр' → null (no known suffix)", () => {
    expect(extractSuffix("гэр")).toBeNull();
  });

  // Longer suffix must win over a shorter one that is also a suffix
  // "гэраас" ends in both "-аас" and "-с"; "-аас" should win
  it("'гэраас' → root 'гэр', suffix '-аас' (longest match)", () => {
    expect(extractSuffix("гэраас")).toEqual({ root: "гэр", suffix: "-аас" });
  });

  // Suffix must not consume the entire word (root must be non-empty)
  it("returns null when suffix is as long as the whole word", () => {
    expect(extractSuffix("д")).toBeNull();
    expect(extractSuffix("т")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isConsonantConfusionPair
// ---------------------------------------------------------------------------

describe("isConsonantConfusionPair", () => {
  it("('г','к') → true", () => {
    expect(isConsonantConfusionPair("г", "к")).toBe(true);
  });

  it("('к','г') → true (bidirectional)", () => {
    expect(isConsonantConfusionPair("к", "г")).toBe(true);
  });

  it("('д','т') → true", () => {
    expect(isConsonantConfusionPair("д", "т")).toBe(true);
  });

  it("('н','м') → true", () => {
    expect(isConsonantConfusionPair("н", "м")).toBe(true);
  });

  it("('б','п') → true", () => {
    expect(isConsonantConfusionPair("б", "п")).toBe(true);
  });

  it("('з','с') → true", () => {
    expect(isConsonantConfusionPair("з", "с")).toBe(true);
  });

  it("('ж','ш') → true", () => {
    expect(isConsonantConfusionPair("ж", "ш")).toBe(true);
  });

  it("('а','э') → false (not a consonant pair)", () => {
    expect(isConsonantConfusionPair("а", "э")).toBe(false);
  });

  it("('г','д') → false (not a recognised pair)", () => {
    expect(isConsonantConfusionPair("г", "д")).toBe(false);
  });

  it("('г','г') → false (same letter)", () => {
    expect(isConsonantConfusionPair("г", "г")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isVowel / isConsonant
// ---------------------------------------------------------------------------

describe("isVowel", () => {
  it.each(["а", "э", "и", "о", "у", "ө", "ү"])("'%s' is a vowel", (ch) => {
    expect(isVowel(ch)).toBe(true);
  });

  it.each(["б", "г", "н", "с", "т", "х"])("'%s' is not a vowel", (ch) => {
    expect(isVowel(ch)).toBe(false);
  });
});

describe("isConsonant", () => {
  it.each(["б", "в", "г", "д", "ж", "з", "й", "к", "л", "м", "н", "п", "р", "с", "т", "ф", "х", "ц", "ч", "ш", "щ", "ъ", "ь"])(
    "'%s' is a consonant",
    (ch) => {
      expect(isConsonant(ch)).toBe(true);
    }
  );

  it.each(["а", "э", "и", "о", "у", "ө", "ү"])("'%s' is not a consonant", (ch) => {
    expect(isConsonant(ch)).toBe(false);
  });
});
