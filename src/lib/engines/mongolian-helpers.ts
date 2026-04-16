// Mongolian orthography helper functions used by the error-classification engines.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Long vowel digraphs recognised in Mongolian Cyrillic orthography. */
export const LONG_VOWEL_PAIRS: readonly string[] = [
  "аа", "ээ", "оо", "өө", "уу", "үү", "ий",
] as const;

/**
 * Consonant pairs that Grade 1–4 children commonly confuse.
 * Stored bidirectionally so both н→м and м→н are present.
 */
export const CONSONANT_CONFUSION_PAIRS: ReadonlyMap<string, string> = new Map([
  ["н", "м"], ["м", "н"],
  ["г", "к"], ["к", "г"],
  ["д", "т"], ["т", "д"],
  ["б", "п"], ["п", "б"],
  ["з", "с"], ["с", "з"],
  ["ж", "ш"], ["ш", "ж"],
]);

/**
 * Known Mongolian suffixes, longest first so the greedy scan in
 * `extractSuffix` always prefers the longest match.
 */
export const KNOWN_SUFFIXES: readonly string[] = [
  "-ийг", "-ыг",
  "-ийн", "-ын",
  "-аас", "-ээс", "-оос", "-өөс",
  "-тай", "-тэй", "-той",
  "-руу", "-рүү", "-луу", "-лүү",
  "-аа", "-ээ", "-оо", "-өө",
  "-д", "-т",
] as const;

/**
 * Words whose written form contains one or more vowels that are
 * reduced (dropped or weakened) in normal speech.
 *
 * Keys   — the canonical spelled form of the word.
 * Values — 0-based character positions of the reduced vowel(s).
 *
 * Only words with a genuine reduced vowel are included; words with
 * fully stressed vowels (e.g. "бага", "цонх") are omitted.
 */
export const REDUCED_VOWEL_MAP: ReadonlyMap<string, readonly number[]> = new Map([
  ["газар",   [3]],   // а at index 3  (г-а-з-[а]-р)
  ["самбар",  [4]],   // а at index 4  (с-а-м-б-[а]-р)
  ["дэвтэр",  [4]],   // э at index 4  (д-э-в-т-[э]-р)
  ["хүүхэд",  [4]],   // э at index 4  (х-ү-ү-х-[э]-д)
  ["байшин",  [4]],   // и at index 4  (б-а-й-ш-[и]-н)
  ["хувцас",  [4]],   // а at index 4  (х-у-в-ц-[а]-с)
  ["сандал",  [4]],   // а at index 4  (с-а-н-д-[а]-л)
  ["авдар",   [3]],   // а at index 3  (а-в-д-[а]-р)
  ["цэцэг",   [3]],   // э at index 3  (ц-э-ц-[э]-г)
  ["хундага", [4]],   // а at index 4  (х-у-н-д-[а]-г-а)
  ["янзага",  [5]],   // а at index 5  (я-н-з-а-г-[а])
  ["бортого", [4]],   // о at index 4  (б-о-р-т-[о]-г-о)
  ["эрдэнэ",  [3]],   // э at index 3  (э-р-д-[э]-н-э)
  ["оньсого", [4]],   // о at index 4  (о-н-ь-с-[о]-г-о)
  ["жинхэнэ", [4]],   // э at index 4  (ж-и-н-х-[э]-н-э)
  ["мөнгө",   [4]],   // ө at index 4  (м-ө-н-г-[ө])
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the character at `position` is the **second** character
 * of a long-vowel digraph (e.g. the second 'о' in "тогоо").
 */
export function isLongVowelPosition(word: string, position: number): boolean {
  if (position < 1 || position >= word.length) return false;
  const pair = word[position - 1] + word[position];
  return LONG_VOWEL_PAIRS.includes(pair);
}

/**
 * Returns `true` if `position` is a known reduced-vowel position for `word`.
 * Returns `false` conservatively when the word is not in `REDUCED_VOWEL_MAP`.
 */
export function isReducedVowelPosition(word: string, position: number): boolean {
  const positions = REDUCED_VOWEL_MAP.get(word);
  if (!positions) return false;
  return positions.includes(position);
}

/**
 * Tries to strip a known suffix from `word`, longest-first.
 * Returns `{ root, suffix }` on the first match, or `null` if no known
 * suffix matches.
 *
 * The `suffix` value keeps its leading dash (e.g. `"-т"`).
 */
export function extractSuffix(word: string): { root: string; suffix: string } | null {
  for (const suffix of KNOWN_SUFFIXES) {
    const tail = suffix.slice(1); // strip leading "-"
    if (word.length > tail.length && word.endsWith(tail)) {
      return { root: word.slice(0, word.length - tail.length), suffix };
    }
  }
  return null;
}

/**
 * Returns `true` if `a` and `b` form a known consonant confusion pair.
 * The check is symmetric: `("г","к")` and `("к","г")` both return `true`.
 */
export function isConsonantConfusionPair(a: string, b: string): boolean {
  return CONSONANT_CONFUSION_PAIRS.get(a) === b;
}

/** Returns `true` if `char` is a Mongolian Cyrillic vowel letter. */
export function isVowel(char: string): boolean {
  return "аэиоуөү".includes(char);
}

/**
 * Returns `true` if `char` is a Mongolian Cyrillic consonant letter
 * (i.e. a Cyrillic letter that is not a vowel).
 */
export function isConsonant(char: string): boolean {
  return "бвгджзйклмнпрстфхцчшщъь".includes(char);
}
