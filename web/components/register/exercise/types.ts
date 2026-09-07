import type { DiagnosticTask } from "@/lib/diagnostic-tasks";

/**
 * What every diagnostic renderer receives. Deliberately close to mobile's
 * `ExerciseRendererProps` (mobile/src/features/exercise/types.ts), minus the
 * correctness half of its `onResult(isCorrect, inputText)` signature: nothing
 * in this flow holds an answer key, so a renderer reports only what the learner
 * did, never whether it was right.
 */
export interface ExerciseProps<T extends DiagnosticTask = DiagnosticTask> {
  readonly task: T;
  /** 1-based position, for the card's count badge. */
  readonly position: number;
  readonly total: number;
  readonly onResult: (answer: string) => void;
}
