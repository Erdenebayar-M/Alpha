import type { SoundTally } from '../store/progress';

export interface Answer {
  sound: string;
  correct: boolean;
}

export type SoundAccuracy = Record<string, SoundTally>;

export function tallyAnswers(acc: SoundAccuracy, answers: readonly Answer[]): SoundAccuracy {
  const out: SoundAccuracy = { ...acc };
  for (const { sound, correct } of answers) {
    const t = out[sound] ?? { correct: 0, attempts: 0 };
    out[sound] = { correct: t.correct + (correct ? 1 : 0), attempts: t.attempts + 1 };
  }
  return out;
}

interface WeakOptions {
  /** Ignore Sounds with fewer attempts than this — not enough evidence yet. */
  minAttempts?: number;
  /** A Sound is weak below this accuracy. */
  below?: number;
  max?: number;
}

/** Taught Sounds the child gets wrong most, worst first. Drives the Weak-sound remix. */
export function weakSounds(
  acc: SoundAccuracy,
  taught: ReadonlySet<string>,
  { minAttempts = 3, below = 0.8, max = 3 }: WeakOptions = {},
): string[] {
  return Object.entries(acc)
    .filter(([s, t]) => taught.has(s) && t.attempts >= minAttempts && t.correct / t.attempts < below)
    .sort(([, a], [, b]) => a.correct / a.attempts - b.correct / b.attempts || b.attempts - a.attempts)
    .slice(0, max)
    .map(([s]) => s);
}
