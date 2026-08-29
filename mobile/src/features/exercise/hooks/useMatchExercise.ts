import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getFeedbackDelayMs } from '@/src/features/exercise/feedbackTiming';
import type { Task } from '@/src/features/exercise/types';

/** A single tappable card in one of the two columns. `pairId` is the index of the
 *  source pair, so a left and a right item match iff their `pairId`s are equal. */
export interface MatchItem {
  id: string;
  pairId: number;
  /** Text label (the word side). Empty when this side is purely an image. */
  text: string;
  /** Picture for the image side (undefined on the text side). */
  imageUrl?: string;
  /** True when this side is the picture column (drives image-vs-text rendering). */
  isImage: boolean;
}

/** One rendered row: a fixed right (word) card, plus whichever left (image) card
 *  currently occupies its slot — the linked one if connected, else the next
 *  unlinked image from the pool (so linked pairs reflow to share a row). */
export interface MatchRow {
  right: MatchItem;
  left: MatchItem | null;
  /** A link has been committed for this row (word card locks + fills lavender). */
  locked: boolean;
}

export type MatchLockMode =
  /** Any link locks; correctness is graded only when the child submits. */
  | 'any'
  /** A link locks only if it's the correct pair; wrong taps bounce (never lock). */
  | 'correct-only';

export interface UseMatchExerciseOptions {
  /** See MatchLockMode. Default 'any' (lock freely, grade at submit). */
  lockMode?: MatchLockMode;
}

export interface MatchExercise {
  rows: MatchRow[];
  linkedCount: number;
  totalPairs: number;
  isAnswered: boolean;
  feedback: string | null;
  /** Every row linked → the submit arrow may light up. */
  canSubmit: boolean;
  /** Bumps whenever a wrong link is rejected in 'correct-only' mode, so the
   *  renderer can play a shake on the offending row. */
  rejectedRightId: string | null;
  /** The row that was filled in automatically once only one pair was left (the
   *  last one is forced), so the renderer can show it as auto-selected. */
  autoLinkedRightId: string | null;
  /** Try to link a dragged image onto a word row. Returns true if it stuck
   *  (always true in 'any' mode; only on a correct pair in 'correct-only'). */
  attemptLink: (leftId: string, rightId: string) => boolean;
  /** Release a linked pair (dropping an image off its word, or a fresh drag of a
   *  linked image) so it returns to the pool. */
  unlinkRight: (rightId: string) => void;
  submit: () => void;
}

// Deterministic-per-mount shuffle: each column is scrambled once so the two
// columns don't line up, but stays stable across re-renders (kept in useMemo).
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Answer machinery for the connect-two-columns matching task (TT_1_3 / TT_3_3 /
 * TT_5_3). Reads `task.options.pairs` + `image_side`, shuffles each column, and
 * tracks which image is linked to which word. Tap a left (image) card then a
 * right (word) card to link them; linked images reflow into their word's row.
 * `lockMode` chooses whether wrong links are allowed (graded at submit) or
 * rejected on the spot.
 */
export function useMatchExercise(
  task: Task,
  onResult: (isCorrect: boolean, inputText: string) => void,
  options: UseMatchExerciseOptions = {}
): MatchExercise {
  const { lockMode = 'any' } = options;

  const pairs = useMemo(() => task.options.pairs ?? [], [task.options.pairs]);
  const imageSide = task.options.image_side ?? 'none';

  // Split each pair into a left item and a right item, tagging which side is the
  // picture, then shuffle the two columns independently.
  const { leftItems, rightItems } = useMemo(() => {
    const left: MatchItem[] = pairs.map((p, i) => ({
      id: `L${i}`,
      pairId: i,
      text: imageSide === 'left' ? '' : p.left,
      imageUrl: imageSide === 'left' ? p.left_image_url : undefined,
      isImage: imageSide === 'left',
    }));
    const right: MatchItem[] = pairs.map((p, i) => ({
      id: `R${i}`,
      pairId: i,
      text: imageSide === 'right' ? '' : p.right,
      imageUrl: imageSide === 'right' ? p.right_image_url : undefined,
      isImage: imageSide === 'right',
    }));
    return { leftItems: shuffle(left), rightItems: shuffle(right) };
  }, [pairs, imageSide]);

  const leftById = useMemo(() => {
    const m: Record<string, MatchItem> = {};
    for (const it of leftItems) m[it.id] = it;
    return m;
  }, [leftItems]);
  const rightById = useMemo(() => {
    const m: Record<string, MatchItem> = {};
    for (const it of rightItems) m[it.id] = it;
    return m;
  }, [rightItems]);

  // rightItemId -> leftItemId that the child has linked to it.
  const [links, setLinks] = useState<Record<string, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [rejectedRightId, setRejectedRightId] = useState<string | null>(null);
  const [autoLinkedRightId, setAutoLinkedRightId] = useState<string | null>(null);

  const totalPairs = pairs.length;

  // Guard the pending onResult timer so it can't fire after unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const linkedLeftIds = useMemo(() => new Set(Object.values(links)), [links]);

  // Build the rendered rows: right column is fixed; each row's left slot shows its
  // linked image, or the next not-yet-linked image drawn from the remaining pool.
  const rows = useMemo<MatchRow[]>(() => {
    const pool = leftItems.filter((l) => !linkedLeftIds.has(l.id));
    let poolIdx = 0;
    return rightItems.map((right) => {
      const linkedLeftId = links[right.id];
      const left = linkedLeftId ? (leftById[linkedLeftId] ?? null) : (pool[poolIdx++] ?? null);
      return { right, left, locked: Boolean(linkedLeftId) };
    });
  }, [rightItems, leftItems, links, linkedLeftIds, leftById]);

  const attemptLink = useCallback(
    (leftId: string, rightId: string): boolean => {
      if (isAnswered) return false;
      const rightItem = rightById[rightId];
      const leftItem = leftById[leftId];
      if (rightItem == null || leftItem == null) return false;

      const correct = rightItem.pairId === leftItem.pairId;
      if (lockMode === 'correct-only' && !correct) {
        // Reject: bounce the row; the piece springs back so the child retries.
        setRejectedRightId(rightId);
        return false;
      }

      const next = { ...links };
      // Moving this image? drop its previous link so it isn't in two rows.
      for (const [rid, lid] of Object.entries(next)) if (lid === leftId) delete next[rid];
      // Assign to the target row (any image already there returns to the pool).
      next[rightId] = leftId;

      // Auto-complete: once only one pair is left unlinked, it's forced — fill it in
      // for the child and flag it so the renderer can show it as auto-selected.
      let auto: string | null = null;
      if (Object.keys(next).length === totalPairs - 1) {
        const usedLeft = new Set(Object.values(next));
        const usedRight = new Set(Object.keys(next));
        const remLeft = leftItems.find((l) => !usedLeft.has(l.id));
        const remRight = rightItems.find((r) => !usedRight.has(r.id));
        if (remLeft && remRight) {
          next[remRight.id] = remLeft.id;
          auto = remRight.id;
        }
      }

      setLinks(next);
      setAutoLinkedRightId(auto);
      return true;
    },
    [isAnswered, links, rightById, leftById, lockMode, totalPairs, leftItems, rightItems]
  );

  const unlinkRight = useCallback(
    (rightId: string) => {
      if (isAnswered) return;
      setLinks((prev) => {
        if (!prev[rightId]) return prev;
        const next = { ...prev };
        delete next[rightId];
        return next;
      });
      setAutoLinkedRightId((cur) => (cur === rightId ? null : cur));
    },
    [isAnswered]
  );

  // Clear the rejection flag on the next tick so the same row can shake again later.
  useEffect(() => {
    if (rejectedRightId === null) return;
    const t = setTimeout(() => setRejectedRightId(null), 400);
    return () => clearTimeout(t);
  }, [rejectedRightId]);

  const linkedCount = Object.keys(links).length;
  const isComplete = totalPairs > 0 && linkedCount === totalPairs;

  const allCorrect = useMemo(
    () =>
      rightItems.every((r) => {
        const lid = links[r.id];
        return lid != null && leftById[lid]?.pairId === r.pairId;
      }),
    [rightItems, links, leftById]
  );

  const submit = useCallback(() => {
    if (isAnswered || !isComplete) return;
    setIsAnswered(true);
    // The backend's matchPairsDiff expects a JSON array of the *canonical* pair texts
    // the child connected: the image side's originating pair's `left`, and the word
    // side's originating pair's `right` (not the shuffled item's own — possibly blank
    // on the image side — `.text`).
    const submittedPairs = Object.entries(links).map(([rightId, leftId]) => {
      const rightItem = rightById[rightId];
      const leftItem = leftById[leftId];
      return {
        left: pairs[leftItem?.pairId ?? -1]?.left ?? '',
        right: pairs[rightItem?.pairId ?? -1]?.right ?? '',
      };
    });
    timerRef.current = setTimeout(
      () => onResult(allCorrect, JSON.stringify(submittedPairs)),
      getFeedbackDelayMs(task, allCorrect)
    );
  }, [isAnswered, isComplete, allCorrect, links, rightById, leftById, pairs, onResult, task]);

  const feedback = useMemo(() => {
    if (!isAnswered) return null;
    return (allCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text;
  }, [isAnswered, allCorrect, task.feedback_correct, task.feedback_wrong, task.feedback_text]);

  return {
    rows,
    linkedCount,
    totalPairs,
    isAnswered,
    feedback,
    canSubmit: isComplete && !isAnswered,
    rejectedRightId,
    autoLinkedRightId,
    attemptLink,
    unlinkRight,
    submit,
  };
}
