import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getFeedbackDelayMs, getFeedbackText } from '@/src/features/exercise/feedbackTiming';
import type { Task } from '@/src/features/exercise/types';

export interface UseAssembleWordOptions {
  /** Whether clearing a slot re-packs the remaining letters left (the typing model
   *  AssembleWord/AudioAssembleWord use). Set false for a drag-to-a-specific-slot
   *  screen, where clearing slot N should only empty slot N. Default true. */
  repackOnClear?: boolean;
}

export interface AssembleWordExercise {
  /** The scrambled letter pool (word letters + distractors), in payload order. */
  tiles: string[];
  /** Per-slot tile index (or null). Length === correct_order.length. */
  slots: (number | null)[];
  /** Parallel to `tiles`: whether that tile currently sits in a slot (greyed out). */
  usedTiles: boolean[];
  isAnswered: boolean;
  feedback: string | null;
  /** Every slot filled and not yet committed — drives the submit button. */
  canSubmit: boolean;
  /** Drop a tile into the next empty slot (ignored if used or already answered). */
  place: (tileIndex: number) => void;
  /** Drop a tile into a specific slot — moves the tile if it's already placed
   *  elsewhere, and returns any tile currently occupying that slot to the pool. */
  placeAt: (slotIndex: number, tileIndex: number) => void;
  /** Clear the letter in a slot. With repackOnClear (default), remaining letters
   *  re-pack left; otherwise only the given slot empties. */
  clearSlot: (slotIndex: number) => void;
  submit: () => void;
}

/**
 * Answer machinery for the assemble-the-word task ("Үсгүүдийг зөв дараалалд оруулж
 * үг бүтээгээрэй"): the child taps or drags scrambled tiles to fill a row of slots in
 * order. Slots hold tile *indices* (not letters) so duplicate letters/syllables and
 * distractors are tracked unambiguously. Grading is exact: the placed tile sequence
 * must equal `correct_order`. Mirrors usePunctuationExercise — renderers own only layout.
 */
export function useAssembleWord(
  task: Task,
  onResult: (isCorrect: boolean, inputText: string) => void,
  options: UseAssembleWordOptions = {}
): AssembleWordExercise {
  const { repackOnClear = true } = options;

  const tiles = useMemo(() => task.options.tiles ?? [], [task.options.tiles]);
  const correctOrder = useMemo(
    () => task.options.correct_order ?? [],
    [task.options.correct_order]
  );
  const slotCount = correctOrder.length;

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

  const place = useCallback(
    (tileIndex: number) => {
      if (isAnswered) return;
      setSlots((prev) => {
        if (prev.includes(tileIndex)) return prev; // tile already placed
        const next = [...prev];
        const empty = next.indexOf(null);
        if (empty === -1) return prev; // all slots full
        next[empty] = tileIndex;
        return next;
      });
    },
    [isAnswered]
  );

  const placeAt = useCallback(
    (slotIndex: number, tileIndex: number) => {
      if (isAnswered) return;
      setSlots((prev) => {
        if (slotIndex < 0 || slotIndex >= prev.length) return prev;
        const next = [...prev];
        const previousSlot = next.indexOf(tileIndex);
        if (previousSlot !== -1) next[previousSlot] = null; // moving an already-placed tile
        next[slotIndex] = tileIndex;
        return next;
      });
    },
    [isAnswered]
  );

  const clearSlot = useCallback(
    (slotIndex: number) => {
      if (isAnswered) return;
      setSlots((prev) => {
        if (prev[slotIndex] === null) return prev;
        if (!repackOnClear) {
          const next = [...prev];
          next[slotIndex] = null;
          return next;
        }
        // Drop this slot's tile, then re-pack the rest left so there is never a gap.
        const remaining = prev.filter((_, i) => i !== slotIndex && prev[i] !== null);
        const next = Array<number | null>(prev.length).fill(null);
        remaining.forEach((tileIndex, i) => {
          next[i] = tileIndex;
        });
        return next;
      });
    },
    [isAnswered, repackOnClear]
  );

  const canSubmit = !isAnswered && slotCount > 0 && slots.every((s) => s !== null);

  const submit = useCallback(() => {
    if (!canSubmit) return;
    const placed = slots.map((tileIndex) => tiles[tileIndex as number]);
    const correct = placed.join('') === correctOrder.join('');
    setWasCorrect(correct);
    setIsAnswered(true);
    timerRef.current = setTimeout(
      () => onResult(correct, JSON.stringify(placed)),
      getFeedbackDelayMs(task, correct)
    );
  }, [canSubmit, slots, tiles, correctOrder, onResult, task]);

  const feedback = useMemo(() => {
    if (!isAnswered) return null;
    return getFeedbackText(task, wasCorrect);
  }, [isAnswered, wasCorrect, task]);

  return {
    tiles,
    slots,
    usedTiles,
    isAnswered,
    feedback,
    canSubmit,
    place,
    placeAt,
    clearSlot,
    submit,
  };
}
