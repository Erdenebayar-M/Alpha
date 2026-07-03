import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Task, TaskChoice } from '@/src/features/exercise/types';

export interface UseChoiceExerciseOptions {
  /** When true, selecting a choice immediately commits the answer and schedules
   *  onResult — for screens with no submit button (ImageMatch, AudioChoice). Submit
   *  -button screens (FillBlank, LetterChoice) leave this off and call submit(). */
  autoSubmit?: boolean;
  /** How long feedback stays on screen before onResult advances. Default 1000ms. */
  feedbackDelayMs?: number;
}

export interface ChoiceExercise {
  choices: TaskChoice[];
  selectedIndex: number | null;
  selectedChoice: TaskChoice | null;
  /** True once the answer is committed (on select for autoSubmit, on submit otherwise). */
  isAnswered: boolean;
  /** Supportive feedback (correct/wrong → feedback_text); null until answered. */
  feedback: string | null;
  /** A choice is selected and not yet committed — drives the submit button's enabled state. */
  canSubmit: boolean;
  select: (index: number) => void;
  /** Clear the current (uncommitted) selection — e.g. the backspace tile. */
  clear: () => void;
  submit: () => void;
}

const DEFAULT_FEEDBACK_DELAY_MS = 1000;

/**
 * Shared answer machinery for every choice-based renderer: selection state, the
 * "answered" latch, correct/wrong feedback derivation, and the delayed onResult
 * submit. Supports both interaction flavors — instant-submit-on-tap (autoSubmit)
 * and select-then-submit — so renderers only own their layout, not this logic.
 */
export function useChoiceExercise(
  task: Task,
  onResult: (isCorrect: boolean) => void,
  options: UseChoiceExerciseOptions = {}
): ChoiceExercise {
  const { autoSubmit = false, feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS } = options;

  const choices = useMemo(() => task.options.choices ?? [], [task.options.choices]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Guard the pending onResult timer so it can't fire after unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const commit = useCallback(
    (isCorrect: boolean) => {
      setIsAnswered(true);
      timerRef.current = setTimeout(() => onResult(isCorrect), feedbackDelayMs);
    },
    [onResult, feedbackDelayMs]
  );

  const select = useCallback(
    (index: number) => {
      if (isAnswered) return;
      setSelectedIndex(index);
      if (autoSubmit) commit(choices[index]?.is_correct ?? false);
    },
    [isAnswered, autoSubmit, choices, commit]
  );

  const clear = useCallback(() => {
    if (!isAnswered) setSelectedIndex(null);
  }, [isAnswered]);

  const submit = useCallback(() => {
    if (isAnswered || selectedIndex === null) return;
    commit(choices[selectedIndex]?.is_correct ?? false);
  }, [isAnswered, selectedIndex, choices, commit]);

  const selectedChoice = selectedIndex !== null ? (choices[selectedIndex] ?? null) : null;

  const feedback = useMemo(() => {
    if (!isAnswered || !selectedChoice) return null;
    return (
      (selectedChoice.is_correct ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text
    );
  }, [isAnswered, selectedChoice, task.feedback_correct, task.feedback_wrong, task.feedback_text]);

  const canSubmit = selectedIndex !== null && !isAnswered;

  return { choices, selectedIndex, selectedChoice, isAnswered, feedback, canSubmit, select, clear, submit };
}
