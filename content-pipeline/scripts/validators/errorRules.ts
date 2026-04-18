/*
 * Error-rule engine: transforms a correct word into a word exhibiting a
 * specific Mongolian spelling error.  All Mongolian character literals are
 * imported from mongolianChars.ts — none are declared here.
 */

import {
  LONG_VOWEL_PAIRS,
  HARMONY_SWAP,
  CONFUSABLE_CONSONANTS,
  KNOWN_SUFFIXES,
  SUFFIX_SWAPS,
  isVowel,
} from './mongolianChars';

export type ErrorCode =
  | 'B1' | 'C1' | 'C2' | 'C4'
  | 'D3' | 'B3'
  | 'E1' | 'E2' | 'E7'
  | 'G1' | 'G2' | 'H4';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the index of the first adjacent long-vowel pair, or -1. */
export function findLongVowelPairIndex(word: string): number {
  for (let i = 0; i < word.length - 1; i++) {
    for (const [a, b] of LONG_VOWEL_PAIRS) {
      if (word[i] === a && word[i + 1] === b) return i;
    }
  }
  return -1;
}

/** Returns the index of the first vowel in syllable 2+ (i.e. the second
 *  vowel in the word), or -1 if fewer than two vowels exist. */
export function findReducedVowelIndex(word: string): number {
  let vowelCount = 0;
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word[i])) {
      vowelCount++;
      if (vowelCount >= 2) return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Main rule application
// ---------------------------------------------------------------------------

/**
 * Applies the named error rule to `word`, returning a derived (incorrect)
 * string, or null if the rule cannot be applied to this word.
 */
export function applyErrorRule(word: string, code: ErrorCode): string | null {
  switch (code) {

    case 'B1': {
      // Delete the first character that is NOT part of a long-vowel pair.
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        const partOfLongPair =
          (i > 0     && word[i - 1] === ch && isVowel(ch)) ||
          (i < word.length - 1 && word[i + 1] === ch && isVowel(ch));
        if (!partOfLongPair) {
          return word.slice(0, i) + word.slice(i + 1);
        }
      }
      return null; // word consists entirely of long-vowel chars
    }

    case 'C1': {
      // Delete the first character of the first long-vowel pair.
      const idx = findLongVowelPairIndex(word);
      if (idx === -1) return null;
      return word.slice(0, idx) + word.slice(idx + 1);
    }

    case 'C2': {
      // Duplicate the first short (non-doubled) vowel to create a false long pair.
      for (let i = 0; i < word.length; i++) {
        if (isVowel(word[i])) {
          const alreadyLong =
            (i > 0 && word[i - 1] === word[i]) ||
            (i < word.length - 1 && word[i + 1] === word[i]);
          if (!alreadyLong) {
            return word.slice(0, i + 1) + word[i] + word.slice(i + 1);
          }
        }
      }
      return null;
    }

    case 'C4': {
      // Delete the first vowel in syllable 2+ (the second vowel overall).
      const idx = findReducedVowelIndex(word);
      if (idx === -1) return null;
      return word.slice(0, idx) + word.slice(idx + 1);
    }

    case 'D3': {
      // Replace the first confusable character with its confusion partner.
      for (let i = 0; i < word.length; i++) {
        for (const [a, b] of CONFUSABLE_CONSONANTS) {
          if (word[i] === a) return word.slice(0, i) + b + word.slice(i + 1);
          if (word[i] === b) return word.slice(0, i) + a + word.slice(i + 1);
        }
      }
      return null;
    }

    case 'B3': {
      // Transpose the first pair of adjacent different characters.
      for (let i = 0; i < word.length - 1; i++) {
        if (word[i] !== word[i + 1]) {
          return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
        }
      }
      return null;
    }

    case 'E1': {
      // Strip the last recognizable suffix (longest match first).
      const sorted = [...KNOWN_SUFFIXES].sort((a, b) => b.length - a.length);
      for (const suffix of sorted) {
        if (word.endsWith(suffix)) {
          return word.slice(0, word.length - suffix.length);
        }
      }
      return null;
    }

    case 'E2': {
      // Swap the correct suffix for the wrong harmony/case form.
      for (const [correct, wrong] of SUFFIX_SWAPS) {
        if (word.endsWith(correct)) {
          return word.slice(0, word.length - correct.length) + wrong;
        }
      }
      return null;
    }

    case 'E7': {
      // Starting from the end of the word, swap the first vowel with its
      // wrong-harmony partner (suffix vowel harmony violation).
      for (let i = word.length - 1; i >= 0; i--) {
        if (HARMONY_SWAP.has(word[i])) {
          return word.slice(0, i) + HARMONY_SWAP.get(word[i])! + word.slice(i + 1);
        }
      }
      return null;
    }

    case 'G1': {
      // Lowercase the first character (sentence-initial capitalization error).
      if (word.length === 0) return null;
      const lower = word[0].toLowerCase();
      if (lower === word[0]) return null; // already lowercase
      return lower + word.slice(1);
    }

    case 'G2': {
      // Remove trailing sentence-end period.
      if (word.endsWith('.')) return word.slice(0, -1);
      return null;
    }

    case 'H4': {
      // Self-check failure: word is returned unchanged (semantic error only).
      return word;
    }
  }
}
