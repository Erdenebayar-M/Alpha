import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Task } from '@/src/features/exercise/types';

export interface UseFillTilesOptions {
  /** How long feedback stays on screen before onResult advances. Default 1200ms. */
  feedbackDelayMs?: number;
}

export interface FillTilesExercise {
  /** The letter bank: `blank_answer`'s letters, shuffled once per mount. */
  tiles: string[];
  /** Per-blank tile index (or null). Length === the number of missing letters. */
  slots: (number | null)[];
  /** `slots` resolved to letters — one entry per blank, for the word display. */
  placed: (string | null)[];
  /** Parallel to `tiles`: whether that tile currently sits in a blank (faded out). */
  usedTiles: boolean[];
  isAnswered: boolean;
  feedback: string | null;
  /** Every blank filled and not yet committed — drives the submit button. */
  canSubmit: boolean;
  /** Drop a tile into the next empty blank (ignored if used or already answered). */
  place: (tileIndex: number) => void;
  /** Backspace: pull the last placed letter back out of the word. */
  removeLast: () => void;
  submit: () => void;
}

const DEFAULT_FEEDBACK_DELAY_MS = 1200;

/** Deterministic-per-mount shuffle (same helper as useMatchExercise): the bank is
 *  scrambled once so re-renders don't reorder the tiles under the child's finger. */
function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Answer machinery for the picture fill-the-letters task (TT_2_1, "Зураг харж дутуу
 * үсэг нөхөх"): the word is shown with "_" gaps and the child taps letter tiles to
 * fill them left to right. The bank holds exactly the letters of `blank_answer`
 * shuffled — `fillOptions` carries no distractors — so slot count === letter count.
 *
 * Slots hold tile *indices* rather than letters so a repeated letter (e.g. the two
 * "у" of "Сургууль") is tracked unambiguously, mirroring useAssembleWord. Grading is
 * exact against `blank_answer`, and input_text carries the joined fill letters (NOT
 * the reconstructed word) because the backend grades the fill directly — see
 * FillLetter's note on the same contract.
 */
export function useFillTiles(
  task: Task,
  onResult: (isCorrect: boolean, inputText: string) => void,
  options: UseFillTilesOptions = {}
): FillTilesExercise {
  const { feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS } = options;

  // The missing letters in their correct order. NFC-normalised so a composed and a
  // decomposed "ү" compare equal, and lower-cased because the bank is always shown
  // in lower case even when the word itself is capitalised.
  const letters = useMemo(() => {
    const answer = task.options.blank_answer ?? task.correct_answer ?? '';
    return Array.from(answer.normalize('NFC').toLowerCase().trim());
  }, [task.options.blank_answer, task.correct_answer]);

  const tiles = useMemo(() => shuffle(letters), [letters]);
  const slotCount = letters.length;

  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array<number | null>(slotCount).fill(null)
  );
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

  const usedTiles = useMemo(() => {
    const used = tiles.map(() => false);
    for (const tileIndex of slots) {
      if (tileIndex !== null) used[tileIndex] = true;
    }
    return used;
  }, [tiles, slots]);

  const placed = useMemo(
    () => slots.map((tileIndex) => (tileIndex === null ? null : tiles[tileIndex])),
    [slots, tiles]
  );

  const place = useCallback(
    (tileIndex: number) => {
      if (isAnswered) return;
      setSlots((prev) => {
        if (prev.includes(tileIndex)) return prev; // tile already placed
        const empty = prev.indexOf(null);
        if (empty === -1) return prev; // every blank is full
        const next = [...prev];
        next[empty] = tileIndex;
        return next;
      });
    },
    [isAnswered]
  );

  const removeLast = useCallback(() => {
    if (isAnswered) return;
    setSlots((prev) => {
      // Blanks fill left to right, so the last filled one is the last non-null.
      const last = prev.reduce<number>((acc, slot, i) => (slot !== null ? i : acc), -1);
      if (last === -1) return prev;
      const next = [...prev];
      next[last] = null;
      return next;
    });
  }, [isAnswered]);

  const canSubmit = !isAnswered && slotCount > 0 && slots.every((slot) => slot !== null);

  const submit = useCallback(() => {
    if (!canSubmit) return;
    const answer = placed.join('');
    const correct = answer === letters.join('');
    setWasCorrect(correct);
    setIsAnswered(true);
    timerRef.current = setTimeout(() => onResult(correct, answer), feedbackDelayMs);
  }, [canSubmit, placed, letters, onResult, feedbackDelayMs]);

  const feedback = useMemo(() => {
    if (!isAnswered) return null;
    return (wasCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text;
  }, [isAnswered, wasCorrect, task.feedback_correct, task.feedback_wrong, task.feedback_text]);

  return {
    tiles,
    slots,
    placed,
    usedTiles,
    isAnswered,
    feedback,
    canSubmit,
    place,
    removeLast,
    submit,
  };
}
