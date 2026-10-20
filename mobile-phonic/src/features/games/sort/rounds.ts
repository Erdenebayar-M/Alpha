import type { Word } from '../../../content/schema';
import { shuffle } from '../../../engine/rng';

export interface SortRound {
  word: Word;
  /** The Sound the word starts with: the basket it belongs in. */
  target: string;
}

export type DropOutcome = 'correct' | 'wrong' | 'ignored';

/** One round per word, shuffled. A word starting with neither basket's Sound is skipped. */
export function buildRounds(
  words: readonly Word[],
  sounds: readonly string[],
  segmentWord: (word: Word) => string[],
  rng: () => number,
): SortRound[] {
  const rounds = words.flatMap((word) => {
    const target = segmentWord(word)[0];
    return sounds.includes(target) ? [{ word, target }] : [];
  });
  return shuffle(rounds, rng);
}

export const basketId = (soundId: string) => `basket-${soundId}`;

/** What a release means: on the right basket, on the wrong one, or nowhere (just springs back). */
export function dropOutcome(round: SortRound, zoneId: string | null): DropOutcome {
  if (zoneId === null) return 'ignored';
  return zoneId === basketId(round.target) ? 'correct' : 'wrong';
}
