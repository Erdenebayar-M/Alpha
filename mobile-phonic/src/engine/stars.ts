import type { Curriculum, Level } from '../content/schema';
import { levelOrder } from './order';

/** levelId -> gameId -> best Stars, as stored on a Profile. */
export type StarsByLevel = Record<string, Record<string, number>>;

/** 0 mistakes = 3, 1–2 = 2, more = 1. Finishing a Game always earns at least 1 (gentle failure). */
export const starsForMistakes = (mistakes: number): number => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

export const levelStars = (level: Level, stars: Record<string, number> | undefined): number =>
  level.games.reduce((sum, g) => sum + (stars?.[g.id] ?? 0), 0);

export const isLevelComplete = (level: Level, stars: Record<string, number> | undefined): boolean =>
  level.games.every((g) => (stars?.[g.id] ?? 0) >= 1);

/** The first Level is always open; every later one opens when the one before is Complete. */
export function unlockedLevelIds(c: Curriculum, stars: StarsByLevel): Set<string> {
  const out = new Set<string>();
  const order = levelOrder(c);
  for (let i = 0; i < order.length; i++) {
    if (i > 0 && !isLevelComplete(order[i - 1], stars[order[i - 1].id])) break;
    out.add(order[i].id);
  }
  return out;
}
