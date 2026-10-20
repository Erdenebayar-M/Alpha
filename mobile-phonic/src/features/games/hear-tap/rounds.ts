import { levelOrder } from '../../../engine/order';
import { pickReviewSounds } from '../../../engine/remix';
import { shuffle } from '../../../engine/rng';
import type { GameContext } from '../types';

export interface Round {
  /** Sound id spoken to the child. */
  target: string;
  /** Three Sound ids in shuffled positions: the target and two distractors. */
  options: string[];
}

const ROUNDS = 6;
/** Rounds (0-based) that review other Sounds; the rest target the focus Sound. */
const REVIEW_AT = [2, 4];
const DISTRACTORS = 2;

/** Two Sounds other than `target`: taught first, then the next in Learning-path order. */
function distractorsFor(target: string, ctx: GameContext): string[] {
  const picked = pickReviewSounds({ taught: ctx.taught, weak: ctx.weak, exclude: [target], count: DISTRACTORS, rng: ctx.rng });
  if (picked.length === DISTRACTORS) return picked;
  const upcoming = levelOrder(ctx.curriculum)
    .map((l) => l.newSound)
    .filter((s) => s !== target && !picked.includes(s));
  return [...picked, ...upcoming].slice(0, DISTRACTORS);
}

/** The 6 rounds of a hear-tap Game: focus on 1, 2, 4, 6 and review on 3 and 5. */
export function buildRounds(focus: string, ctx: GameContext): Round[] {
  const review = pickReviewSounds({ taught: ctx.taught, weak: ctx.weak, exclude: [focus], count: REVIEW_AT.length, rng: ctx.rng });
  return Array.from({ length: ROUNDS }, (_, i) => {
    const slot = REVIEW_AT.indexOf(i);
    const target = (slot >= 0 ? review[slot] : undefined) ?? focus;
    return { target, options: shuffle([target, ...distractorsFor(target, ctx)], ctx.rng) };
  });
}
