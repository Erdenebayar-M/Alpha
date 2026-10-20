import { useRef, useState } from 'react';
import { playAudio } from '../../audio/play';
import { curriculum, levelById } from '../../content';
import type { GameResult } from '../../engine/progress';
import { useActiveProfile, useProgress } from '../../store/progress';
import { buildGameContext } from '../games/context';
import type { GameContext } from '../games/types';

const PRAISE = ['fb_good_1', 'fb_good_2', 'fb_good_3', 'fb_good_4', 'fb_good_5'] as const;

/** Plays a Level's Games in order, recording each result; `done` once the last one ends. */
export function useLevelRun(levelId: string) {
  const level = levelById(levelId);
  const profile = useActiveProfile();
  const recordGameResult = useProgress((s) => s.recordGameResult);
  const [index, setIndex] = useState(0);
  // Index of the last Game already handled, so a double onFinish/onSkip can't record twice or skip a Game.
  const handled = useRef(-1);

  // Built once per run so weak Sounds don't shift mid-Level.
  const [ctx] = useState<GameContext | null>(() =>
    level ? buildGameContext(curriculum, level, profile?.soundAccuracy ?? {}, Date.now()) : null,
  );

  const advance = (result: GameResult | null) => {
    if (!level || handled.current === index) return;
    handled.current = index;
    if (result) recordGameResult(level, level.games[index].id, result);
    const last = index + 1 >= level.games.length;
    playAudio(last ? 'fl_level_done' : PRAISE[index % PRAISE.length]);
    setIndex(index + 1);
  };

  return {
    ctx,
    game: level?.games[index] ?? null,
    done: !level || index >= level.games.length,
    finish: (result: GameResult) => advance(result),
    skip: () => advance(null),
  };
}
