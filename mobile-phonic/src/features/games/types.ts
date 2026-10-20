import type { ComponentType } from 'react';
import type { Curriculum, Game, GameKind, Level, Sound, Word } from '../../content/schema';
import type { GameResult } from '../../engine/progress';

/** Everything a Game renderer may know besides its own config (ADR 0003). */
export interface GameContext {
  curriculum: Curriculum;
  level: Level;
  /** Sound ids taught at or before this Level. */
  taught: string[];
  /** The child's weakest taught Sounds, worst first — feed to pickReviewSounds(). */
  weak: string[];
  /** Seeded per run; use it for every random choice so runs are reproducible. */
  rng: () => number;
  soundById: (id: string) => Sound;
  wordById: (id: string) => Word;
  /** A word's Sound ids in order (long vowels/diphthongs are one Sound). */
  segmentWord: (word: Word) => string[];
  /** Every word Decodable at this Level — e.g. picture distractors for blend-pick. */
  decodableWords: Word[];
}

export interface GameProps<K extends GameKind = GameKind> {
  game: Extract<Game, { kind: K }>;
  ctx: GameContext;
  /** Call once when the Game ends, reporting every answer by Sound. */
  onFinish: (result: GameResult) => void;
}

export type GameRenderer<K extends GameKind> = ComponentType<GameProps<K>>;
