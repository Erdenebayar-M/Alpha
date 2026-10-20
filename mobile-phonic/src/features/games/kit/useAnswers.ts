import { useEffect, useRef } from 'react';
import type { Answer } from '../../../engine/accuracy';
import type { GameResult } from '../../../engine/progress';
import { useLatest } from './useLatest';

/**
 * Collects a Game's answers (a wrong answer is a mistake) and ends the Game.
 * `finish()` is idempotent and does nothing once the Game has unmounted, so late
 * timers or audio callbacks can never report a Game twice or after the child left.
 */
export function useAnswers(onFinish: (result: GameResult) => void) {
  const answers = useRef<Answer[]>([]);
  const done = useRef(false);
  const finishRef = useLatest(onFinish);

  useEffect(() => {
    done.current = false;
    return () => {
      done.current = true;
    };
  }, []);

  const result = (): GameResult => ({
    mistakes: answers.current.filter((a) => !a.correct).length,
    answers: [...answers.current],
  });

  return {
    record: (sound: string, correct: boolean) => {
      if (!done.current) answers.current.push({ sound, correct });
    },
    finish: () => {
      if (done.current) return;
      done.current = true;
      finishRef.current(result());
    },
    result,
  };
}
