import { pickReviewSounds } from '../../../engine/remix';
import { shuffle } from '../../../engine/rng';
import type { GameContext, GameProps } from '../types';

export const MAX_WORDS = 4;
export const MAX_DISTRACTORS = 2;

/** One draggable tile; `key` is unique even when a Sound appears twice in a word. */
export interface Tile {
  key: string;
  sound: string;
}

export interface Round {
  wordId: string;
  /** The word's Sounds in order — one slot each. */
  sounds: string[];
  /** The word's tiles plus distractors, shuffled. */
  tiles: Tile[];
}

export type Drop = 'right' | 'wrong' | 'ignore';

/** Builds every round up front, so all random choices come from ctx.rng once. */
export function buildRounds(game: GameProps<'build-word'>['game'], ctx: GameContext): Round[] {
  return game.words.slice(0, MAX_WORDS).map((wordId, i) => {
    const sounds = ctx.segmentWord(ctx.wordById(wordId));
    const distractors = pickReviewSounds({
      taught: ctx.taught,
      weak: ctx.weak,
      exclude: sounds,
      count: MAX_DISTRACTORS,
      rng: ctx.rng,
    });
    const tiles = [...sounds, ...distractors].map((sound, n) => ({ key: `${i}-${n}`, sound }));
    return { wordId, sounds, tiles: shuffle(tiles, ctx.rng) };
  });
}

/** Slot ids handed to the kit's DropZone, and back to an index. */
export const slotId = (index: number) => `slot-${index}`;
export const slotIndex = (zoneId: string | null): number | null => {
  const m = zoneId?.match(/^slot-(\d+)$/);
  return m ? Number(m[1]) : null;
};

/**
 * What a drop means. `placed[i]` is the key of the tile locked in slot i (or null).
 * A tile fits any empty slot wanting its Sound; a filled slot or a used tile is ignored.
 */
export function judgeDrop(round: Round, placed: readonly (string | null)[], tileKey: string, slot: number | null): Drop {
  const tile = round.tiles.find((t) => t.key === tileKey);
  if (!tile || slot === null || slot >= round.sounds.length) return 'ignore';
  if (placed[slot] !== null || placed.includes(tileKey)) return 'ignore';
  return tile.sound === round.sounds[slot] ? 'right' : 'wrong';
}

/** Splits items into `rows` rows of near-equal length, keeping order (the first rows get the extras). */
export function splitRows<T>(items: readonly T[], rows: number): T[][] {
  const per = Math.ceil(items.length / rows);
  return Array.from({ length: Math.min(rows, Math.ceil(items.length / per)) }, (_, r) => items.slice(r * per, (r + 1) * per));
}
