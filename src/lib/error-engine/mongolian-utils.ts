/**
 * Mongolian spelling utility functions for the Error Classifier engine.
 * Used by the answer checker / error classifier pipeline (Phase 2).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Mongolian long-vowel digraphs (each pair counts as one long vowel). */
export const LONG_VOWEL_PAIRS: readonly string[] = [
  "аа", "ээ", "оо", "өө", "уу", "үү", "ий",
] as const;

/**
 * Confusable consonant pairs (D3 error targets).
 * Each tuple is [written, expected] — both directions are valid.
 */
export const CONFUSABLE_CONSONANT_PAIRS: readonly [string, string][] = [
  ["н", "м"],
  ["г", "к"],
  ["д", "т"],
  ["б", "п"],
  ["з", "с"],
  ["ж", "ш"],
] as const;

// ─── Long-vowel helpers ───────────────────────────────────────────────────────

/**
 * Returns true when the character at `position` is part of a long-vowel digraph
 * in `word`.
 *
 * Examples:
 *   isLongVowelPart("тогоо", 3) → true   (first о of "оо")
 *   isLongVowelPart("тогоо", 4) → true   (second о of "оо")
 *   isLongVowelPart("ном",   1) → false
 *   isLongVowelPart("сүү",   1) → true
 */
export function isLongVowelPart(word: string, position: number): boolean {
  if (position < 0 || position >= word.length) return false;

  for (const pair of LONG_VOWEL_PAIRS) {
    // Check if this position is the first char of the pair
    if (
      position + 1 < word.length &&
      word[position] === pair[0] &&
      word[position + 1] === pair[1]
    ) {
      return true;
    }
    // Check if this position is the second char of the pair
    if (
      position - 1 >= 0 &&
      word[position - 1] === pair[0] &&
      word[position] === pair[1]
    ) {
      return true;
    }
  }
  return false;
}

// ─── Reduced-vowel (балархай эгшиг) helpers ──────────────────────────────────

/**
 * Lookup table: word → set of 0-based positions that contain a reduced
 * (weakly-pronounced / балархай) vowel.
 *
 * Positions are 0-based. The spec lists them as 1-based, so we subtract 1.
 * e.g. "газар" pos 3 (spec) → index 2 (0-based).
 */
const REDUCED_VOWEL_LOOKUP: ReadonlyMap<string, ReadonlySet<number>> = new Map([
  // 0-based index of the reduced (балархай) vowel — the one children drop.
  // Derived from C4 error pairs: газар→газр, дэвтэр→дэвтр, etc.
  ["газар",    new Set([3])],   // г(0) а(1) з(2) *а(3)* р(4)
  ["самбар",   new Set([4])],   // с(0) а(1) м(2) б(3) *а(4)* р(5)
  ["дэвтэр",   new Set([4])],   // д(0) э(1) в(2) т(3) *э(4)* р(5)
  ["хувцас",   new Set([4])],   // х(0) у(1) в(2) ц(3) *а(4)* с(5)
  ["сандал",   new Set([4])],   // с(0) а(1) н(2) д(3) *а(4)* л(5)
  ["авдар",    new Set([3])],   // а(0) в(1) д(2) *а(3)* р(4)
  ["байшин",   new Set([4])],   // б(0) а(1) й(2) ш(3) *и(4)* н(5)
  ["цэцэг",    new Set([3])],   // ц(0) э(1) ц(2) *э(3)* г(4)
  ["хундага",  new Set([4])],   // х(0) у(1) н(2) д(3) *а(4)* г(5) а(6)
  ["янзага",   new Set([3])],   // я(0) н(1) з(2) *а(3)* г(4) а(5)
  ["жинхэнэ",  new Set([4])],   // ж(0) и(1) н(2) х(3) *э(4)* н(5) э(6)
  ["эмнэлэг",  new Set([3])],   // э(0) м(1) н(2) *э(3)* л(4) э(5) г(6)
  ["салбар",   new Set([4])],   // с(0) а(1) л(2) б(3) *а(4)* р(5)
  ["түвшин",   new Set([4])],   // т(0) ү(1) в(2) ш(3) *и(4)* н(5)
  ["бортого",  new Set([4])],   // б(0) о(1) р(2) т(3) *о(4)* г(5) о(6)
  ["оньсого",  new Set([4])],   // о(0) н(1) ь(2) с(3) *о(4)* г(5) о(6)
  ["асуудал",  new Set([5])],   // а(0) с(1) у(2) у(3) д(4) *а(5)* л(6)
  ["эрдэнэ",   new Set([3])],   // э(0) р(1) д(2) *э(3)* н(4) э(5)
]);

/**
 * Returns true when the character at `position` (0-based) is a known reduced
 * vowel in `word`.
 *
 * MVP: dictionary-based only. NLP-based generalisation is out of scope.
 */
export function isReducedVowelPosition(word: string, position: number): boolean {
  if (position < 0 || position >= word.length) return false;
  const positions = REDUCED_VOWEL_LOOKUP.get(word);
  return positions !== undefined && positions.has(position);
}

// ─── Syllabification ─────────────────────────────────────────────────────────

/** Mongolian vowel characters (includes long-vowel components). */
const VOWELS = new Set([
  "а", "э", "и", "о", "у", "ө", "ү", "е", "ё",
]);

/**
 * Splits a Mongolian word into syllables following CV(C) structure.
 *
 * Algorithm (MVP):
 * 1. Walk left-to-right.
 * 2. A syllable boundary occurs after a vowel run when followed by a
 *    consonant + vowel sequence (i.e. the next consonant starts a new
 *    syllable only if a vowel follows it).
 * 3. Long vowels (digraphs) stay together in the same syllable.
 *
 * Examples:
 *   syllabify("ном")    → ["ном"]
 *   syllabify("тогоо")  → ["то", "гоо"]
 *   syllabify("дэвтэр") → ["дэв", "тэр"]
 */
export function syllabify(word: string): string[] {
  if (word.length === 0) return [];

  const syllables: string[] = [];
  let current = "";

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    current += ch;

    if (VOWELS.has(ch)) {
      // Consume a following vowel if it forms a long-vowel pair with this one
      if (i + 1 < word.length && VOWELS.has(word[i + 1])) {
        // Look-ahead: is this a recognised long-vowel pair?
        const maybePair = ch + word[i + 1];
        if (LONG_VOWEL_PAIRS.includes(maybePair)) {
          current += word[i + 1];
          i++;
        }
      }

      // Decide whether to cut here:
      // Cut if there is at least one more consonant AND a vowel after that
      // (i.e. the next consonant belongs to the upcoming syllable).
      const remaining = word.slice(i + 1);
      if (remaining.length > 0 && !VOWELS.has(remaining[0])) {
        // There is a consonant next — peek further
        let consonantCount = 0;
        let j = 0;
        while (j < remaining.length && !VOWELS.has(remaining[j])) {
          consonantCount++;
          j++;
        }
        const hasVowelAfterConsonants = j < remaining.length;

        if (hasVowelAfterConsonants) {
          if (consonantCount === 1) {
            // Single consonant → it starts the next syllable
            syllables.push(current);
            current = "";
          } else {
            // Consonant cluster: last consonant starts next syllable, rest stay
            syllables.push(current + remaining.slice(0, consonantCount - 1));
            i += consonantCount - 1;
            current = "";
          }
        }
        // If no vowel follows, all remaining consonants are a coda of this syl
      }
    }
  }

  if (current.length > 0) syllables.push(current);
  return syllables;
}

// ─── Suffix extraction ───────────────────────────────────────────────────────

export type SuffixType =
  | "dative-locative"       // -д / -т
  | "accusative"            // -ийг / -ыг / -г
  | "ablative"              // -аас / -ээс / -оос / -өөс
  | "comitative"            // -тай / -тэй / -той
  | "directional"           // -руу / -рүү
  | "possessive-reflexive"; // -аа / -ээ / -оо / -өө  (reflexive possessive)

interface SuffixResult {
  root: string;
  suffix: string;
  suffixType: SuffixType;
}

/**
 * Ordered from longest to shortest so greedy matching works correctly.
 * Each entry: [suffix, suffixType]
 */
const SUFFIX_TABLE: ReadonlyArray<[string, SuffixType]> = [
  // Ablative (4 chars)
  ["аас", "ablative"],
  ["ээс", "ablative"],
  ["оос", "ablative"],
  ["өөс", "ablative"],
  // Accusative (3 chars)
  ["ийг", "accusative"],
  ["ыг",  "accusative"],
  // Comitative (3 chars)
  ["тай", "comitative"],
  ["тэй", "comitative"],
  ["той", "comitative"],
  // Directional (3 chars)
  ["руу", "directional"],
  ["рүү", "directional"],
  // Possessive-reflexive (2 chars)
  ["аа",  "possessive-reflexive"],
  ["ээ",  "possessive-reflexive"],
  ["оо",  "possessive-reflexive"],
  ["өө",  "possessive-reflexive"],
  // Accusative short (1 char — must come after longer forms)
  ["г",   "accusative"],
  // Dative-locative (1 char)
  ["д",   "dative-locative"],
  ["т",   "dative-locative"],
];

/**
 * Given a surface `word` and its known `knownRoot`, extracts the suffix and
 * classifies it.
 *
 * Returns `null` when:
 *   - `word` equals `knownRoot` (no suffix present), or
 *   - the suffix is not in the MVP table.
 *
 * Examples:
 *   extractSuffix("гэрт",  "гэр")  → { root: "гэр",  suffix: "т",  suffixType: "dative-locative" }
 *   extractSuffix("номоо", "ном")  → { root: "ном",  suffix: "оо", suffixType: "possessive-reflexive" }
 *   extractSuffix("гэр",   "гэр")  → null
 */
export function extractSuffix(
  word: string,
  knownRoot: string,
): SuffixResult | null {
  if (word === knownRoot) return null;
  if (!word.startsWith(knownRoot)) return null;

  const rawSuffix = word.slice(knownRoot.length);

  // Try to match the raw suffix against the table (longest first)
  for (const [suffix, suffixType] of SUFFIX_TABLE) {
    if (rawSuffix === suffix) {
      return { root: knownRoot, suffix, suffixType };
    }
  }

  return null;
}
