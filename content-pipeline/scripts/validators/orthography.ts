/*
 * Orthography validator: checks whether a word is in the trusted seed set
 * or is composed entirely of Mongolian Cyrillic characters.
 * No Mongolian character literals are used directly — all char logic is
 * delegated to mongolianChars.ts.
 */

import { isMongolian } from './mongolianChars';
import seedData from '../../generated/seed-words.json';

const trustedWords = new Set<string>(
  (seedData.words as Array<{ word: string }>).map((w) => w.word),
);

/**
 * Returns true if:
 *   (a) the word is in the trusted seed-word set, OR
 *   (b) every character passes isMongolian() from mongolianChars.ts
 */
export function isValidWord(word: string): boolean {
  if (trustedWords.has(word)) return true;
  return [...word].every((ch) => isMongolian(ch));
}
