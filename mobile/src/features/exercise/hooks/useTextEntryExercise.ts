import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Task } from '@/src/features/exercise/types';

export interface UseTextEntryOptions {
  /** What the typed value is graded against locally, for instant feedback (defaults to
   *  task.correct_answer). The backend re-grades authoritatively with its own logic
   *  per task family — this only drives the correct/wrong tint and feedback text. */
  compareTo?: string;
  /** Case-insensitive compare (default true) — the backend's own fill/choice checks
   *  are case-insensitive too. */
  caseInsensitive?: boolean;
  /** Pre-fill the field (e.g. Correction starts from the incorrect text to edit). */
  initialValue?: string;
  /** How long feedback stays on screen before onResult advances. Default 1200ms. */
  feedbackDelayMs?: number;
}

export interface TextEntryExercise {
  value: string;
  setValue: (value: string) => void;
  isAnswered: boolean;
  isCorrect: boolean;
  feedback: string | null;
  /** Non-empty, uncommitted text — drives the submit button's enabled state. */
  canSubmit: boolean;
  submit: () => void;
}

const DEFAULT_FEEDBACK_DELAY_MS = 1200;

/** NFC-normalise, trim, collapse internal whitespace — mirrors the backend's own
 *  normalizeStr so local feedback agrees with server-side grading. */
function normalize(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Shared answer machinery for text-entry renderers (fill-the-blank, correction,
 * sentence-fill, dictation, mini-text, visual-memory, copy, self-check): a single
 * controlled value, the "answered" latch, local correct/wrong feedback compared
 * against `compareTo`, and the delayed onResult submit carrying the raw typed text
 * as input_text — mirrors useChoiceExercise/useAssembleWord for the same shape.
 */
export function useTextEntryExercise(
  task: Task,
  onResult: (isCorrect: boolean, inputText: string) => void,
  options: UseTextEntryOptions = {}
): TextEntryExercise {
  const {
    compareTo,
    caseInsensitive = true,
    initialValue = '',
    feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS,
  } = options;

  const [value, setValue] = useState(initialValue);
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

  const canSubmit = !isAnswered && value.trim().length > 0;

  const submit = useCallback(() => {
    if (!canSubmit) return;
    const target = compareTo ?? task.correct_answer;
    const a = normalize(value);
    const b = normalize(target);
    const correct = caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;
    const submitted = value.trim();
    setWasCorrect(correct);
    setIsAnswered(true);
    timerRef.current = setTimeout(() => onResult(correct, submitted), feedbackDelayMs);
  }, [canSubmit, value, compareTo, task.correct_answer, caseInsensitive, onResult, feedbackDelayMs]);

  const feedback = useMemo(() => {
    if (!isAnswered) return null;
    return (wasCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text;
  }, [isAnswered, wasCorrect, task.feedback_correct, task.feedback_wrong, task.feedback_text]);

  return { value, setValue, isAnswered, isCorrect: wasCorrect, feedback, canSubmit, submit };
}
