import type { Word } from '../../../content/schema';
import { shuffle } from '../../../engine/rng';
import { blend, space, tile, touchMin } from '../../../theme/tokens';
import type { GameContext } from '../types';

export const CHOICES = 3;

export interface Round {
  word: Word;
  /** The word's Sound ids in order. */
  sounds: string[];
  /** The target and its distractors, shuffled. */
  choices: Word[];
}

/** Pictures first, then words that start differently (so the choice is a real listening one). */
function preference(candidate: Word, firstSound: string, ctx: GameContext): number {
  const hasImage = candidate.image ? 0 : 2;
  const sameStart = ctx.segmentWord(candidate)[0] === firstSound ? 1 : 0;
  return hasImage + sameStart;
}

/**
 * Two distractors for a target: other Decodable words, picture words first. If fewer than
 * two exist, fill from any curriculum word that starts with a different Sound.
 */
export function pickDistractors(target: Word, ctx: GameContext): Word[] {
  const first = ctx.segmentWord(target)[0];
  const rank = (pool: Word[]) =>
    shuffle(pool, ctx.rng)
      .map((w, i) => ({ w, i, score: preference(w, first, ctx) }))
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .map((e) => e.w);

  const decodable = ctx.decodableWords.filter((w) => w.id !== target.id);
  const picked = rank(decodable).slice(0, CHOICES - 1);
  if (picked.length < CHOICES - 1) {
    const taken = new Set([target.id, ...picked.map((w) => w.id)]);
    const others = ctx.curriculum.words.filter((w) => !taken.has(w.id) && ctx.segmentWord(w)[0] !== first);
    picked.push(...rank(others).slice(0, CHOICES - 1 - picked.length));
  }
  return picked;
}

export function buildRound(word: Word, ctx: GameContext): Round {
  return {
    word,
    sounds: ctx.segmentWord(word),
    choices: shuffle([word, ...pickDistractors(word, ctx)], ctx.rng),
  };
}

/** At most 3 words per Game (GAMES.md). */
export function buildRounds(wordIds: readonly string[], ctx: GameContext): Round[] {
  return wordIds.slice(0, 3).map((id) => buildRound(ctx.wordById(id), ctx));
}

/** Which tile slice an x position on the track falls in, clamped to the track. */
export function trackIndex(x: number, width: number, count: number): number {
  if (width <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor((x / width) * count)));
}

export interface Sweep {
  visited: readonly number[];
  last: number | null;
}

export const freshSweep: Sweep = { visited: [], last: null };

/**
 * One finger position on the slide track. `play` lists, in travel order, every tile the
 * finger newly entered — a fast flick passes several between two touch events and each is
 * voiced. `complete` is true at the end of the track once every tile has been passed.
 * Start each touch from `freshSweep`, so tiles passed in an earlier touch don't count.
 */
export function sweepStep(prev: Sweep, x: number, width: number, count: number): { next: Sweep; play: number[]; complete: boolean } {
  const index = trackIndex(x, width, count);
  const from = prev.last ?? index;
  const step = index >= from ? 1 : -1;
  const path = Array.from({ length: Math.abs(index - from) + 1 }, (_, i) => from + i * step);
  const visited = [...new Set([...prev.visited, ...path])];
  const atEnd = width > 0 && x >= width * (1 - blend.endZone);
  return {
    next: { visited, last: index },
    play: prev.last === null ? [index] : path.slice(1),
    complete: atEnd && visited.length === count,
  };
}

export interface Layout {
  tileSize: number;
  cardSize: number;
}

/** Sizes that fit `count` tiles across and the picture row (3 cards + Listen) in the Game area. */
export function blendLayout(areaWidth: number, areaHeight: number, count: number): Layout {
  const tileSize = Math.floor(Math.min(tile.size, (areaWidth - blend.tileGap * count) / count, areaHeight * blend.tileHeightShare));
  const cardSize = Math.floor(Math.min(tile.pictureSize, (areaWidth - touchMin - space.lg * CHOICES) / CHOICES, areaHeight * blend.cardHeightShare));
  return { tileSize, cardSize };
}
