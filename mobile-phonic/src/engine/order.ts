import type { Curriculum, Level } from '../content/schema';

/** Every Level in Learning-path order, across Worlds. */
export const levelOrder = (c: Curriculum): Level[] => c.worlds.flatMap((w) => w.levels);

/** Sound ids taught at or before each Level, keyed by Level id. */
export function taughtByLevel(c: Curriculum): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const taught = new Set<string>();
  for (const level of levelOrder(c)) {
    taught.add(level.newSound);
    out.set(level.id, new Set(taught));
  }
  return out;
}
