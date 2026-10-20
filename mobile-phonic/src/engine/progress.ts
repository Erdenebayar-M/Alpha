import type { Level } from '../content/schema';
import type { Profile } from '../store/progress';
import { tallyAnswers, type Answer } from './accuracy';
import { isLevelComplete, starsForMistakes } from './stars';

export interface GameResult {
  mistakes: number;
  /** One entry per answer, tagged with the Sound it tested. */
  answers: Answer[];
}

/** A Profile after finishing one Game: best Stars, Sound accuracy, and the Sticker on first completion. */
export function applyGameResult(profile: Profile, level: Level, gameId: string, result: GameResult): Profile {
  if (!level.games.some((g) => g.id === gameId)) return profile;

  const before = profile.stars[level.id] ?? {};
  const levelStars = { ...before, [gameId]: Math.max(before[gameId] ?? 0, starsForMistakes(result.mistakes)) };
  const earned = isLevelComplete(level, levelStars) && !profile.stickers.includes(level.sticker);

  return {
    ...profile,
    stars: { ...profile.stars, [level.id]: levelStars },
    soundAccuracy: tallyAnswers(profile.soundAccuracy, result.answers),
    stickers: earned ? [...profile.stickers, level.sticker] : profile.stickers,
  };
}
