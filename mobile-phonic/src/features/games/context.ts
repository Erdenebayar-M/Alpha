import type { Curriculum, Level, Sound, Word } from '../../content/schema';
import { segment } from '../../content/segment';
import { weakSounds, type SoundAccuracy } from '../../engine/accuracy';
import { taughtByLevel } from '../../engine/order';
import { mulberry32 } from '../../engine/rng';
import type { GameContext } from './types';

/** Builds a Game's context once per Level run, so every renderer shares the same lookups. */
export function buildGameContext(c: Curriculum, level: Level, accuracy: SoundAccuracy, seed: number): GameContext {
  const known = taughtByLevel(c).get(level.id) ?? new Set<string>();
  const sounds = new Map<string, Sound>(c.sounds.map((s) => [s.id, s]));
  const words = new Map<string, Word>(c.words.map((w) => [w.id, w]));
  const decodableWords = c.words.filter((w) => segment(w.text, c.sounds)?.every((s) => known.has(s)));

  return {
    curriculum: c,
    level,
    taught: [...known],
    weak: weakSounds(accuracy, known),
    rng: mulberry32(seed),
    // Validation guarantees every id a Game references exists.
    soundById: (id) => sounds.get(id)!,
    wordById: (id) => words.get(id)!,
    segmentWord: (w) => segment(w.text, c.sounds) ?? [],
    decodableWords,
  };
}
