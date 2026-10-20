import { shuffle } from './rng';

interface ReviewInput {
  taught: readonly string[];
  /** Weakest first, from weakSounds(). */
  weak: readonly string[];
  /** Sounds the Game already uses (e.g. its focus Sound). */
  exclude: readonly string[];
  count: number;
  rng: () => number;
}

/**
 * Review Sounds for a Game: weak Sounds take at most ⌈count/2⌉ slots — rounding up,
 * so a single review slot still goes to a weak Sound — and the rest are drawn at
 * random from everything taught. Never repeats, never untaught.
 */
export function pickReviewSounds({ taught, weak, exclude, count, rng }: ReviewInput): string[] {
  const allowed = (s: string) => taught.includes(s) && !exclude.includes(s);
  const fromWeak = weak.filter(allowed).slice(0, Math.ceil(count / 2));
  const rest = shuffle(taught.filter((s) => allowed(s) && !fromWeak.includes(s)), rng);
  return [...fromWeak, ...rest].slice(0, count);
}
