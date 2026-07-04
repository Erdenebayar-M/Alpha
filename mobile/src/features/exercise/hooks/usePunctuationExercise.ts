import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PunctuationOptions, Task } from '@/src/features/exercise/types';

export interface UsePunctuationExerciseOptions {
  /** How long feedback stays on screen before onResult advances. Default 1000ms. */
  feedbackDelayMs?: number;
}

export interface PunctuationExercise {
  mark: string;
  tokens: string[];
  /** Gap indices (after tokens[i]) that currently hold the mark, in placement order. */
  placed: number[];
  /** How many marks the sentence needs (== answer_gaps.length). */
  required: number;
  isAnswered: boolean;
  feedback: string | null;
  /** All required marks placed and not yet committed — drives the submit button. */
  canSubmit: boolean;
  /** Whether a mark sits after tokens[i]. */
  isPlaced: (gap: number) => boolean;
  /** Drop a mark into a gap (idempotent; ignored once answered). */
  place: (gap: number) => void;
  /** Remove the most recently placed mark (the backspace tile). */
  removeLast: () => void;
  submit: () => void;
}

const DEFAULT_FEEDBACK_DELAY_MS = 1000;

const EMPTY_OPTIONS: PunctuationOptions = { mark: '.', tokens: [], answer_gaps: [] };

/**
 * Answer machinery for the place-the-punctuation-mark task: which gaps hold a mark,
 * the "answered" latch, correct/wrong feedback, and the delayed onResult. Grading is
 * exact — the set of placed gaps must equal the set of answer_gaps (order-independent).
 * Renderers own only the drag/layout; this owns the state, mirroring useChoiceExercise.
 */
export function usePunctuationExercise(
  task: Task,
  onResult: (isCorrect: boolean) => void,
  options: UsePunctuationExerciseOptions = {}
): PunctuationExercise {
  const { feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS } = options;

  const punctuation = task.options.punctuation ?? EMPTY_OPTIONS;
  const { mark, tokens } = punctuation;
  // Stable, de-duplicated target set — sorted so grading is order-independent.
  const answerGaps = useMemo(
    () => Array.from(new Set(punctuation.answer_gaps)).sort((a, b) => a - b),
    [punctuation.answer_gaps]
  );

  const [placed, setPlaced] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Guard the pending onResult timer so it can't fire after unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const place = useCallback(
    (gap: number) => {
      if (isAnswered) return;
      setPlaced((prev) => (prev.includes(gap) ? prev : [...prev, gap]));
    },
    [isAnswered]
  );

  const removeLast = useCallback(() => {
    if (isAnswered) return;
    setPlaced((prev) => prev.slice(0, -1));
  }, [isAnswered]);

  const isPlaced = useCallback((gap: number) => placed.includes(gap), [placed]);

  const canSubmit = !isAnswered && placed.length === answerGaps.length && answerGaps.length > 0;

  const submit = useCallback(() => {
    if (!canSubmit) return;
    const sortedPlaced = [...placed].sort((a, b) => a - b);
    const correct =
      sortedPlaced.length === answerGaps.length &&
      sortedPlaced.every((gap, i) => gap === answerGaps[i]);
    setWasCorrect(correct);
    setIsAnswered(true);
    timerRef.current = setTimeout(() => onResult(correct), feedbackDelayMs);
  }, [canSubmit, placed, answerGaps, onResult, feedbackDelayMs]);

  const feedback = useMemo(() => {
    if (!isAnswered) return null;
    return (wasCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text;
  }, [isAnswered, wasCorrect, task.feedback_correct, task.feedback_wrong, task.feedback_text]);

  return {
    mark,
    tokens,
    placed,
    required: answerGaps.length,
    isAnswered,
    feedback,
    canSubmit,
    isPlaced,
    place,
    removeLast,
    submit,
  };
}
