import type { Task } from './types';

// A correct answer has nothing to read — just a brief affirming pulse.
const CORRECT_DELAY_MS = 350;
// A wrong answer needs enough time to read feedback_wrong / feedback_text.
const WRONG_DELAY_MS = 1200;
// Diagnostic tasks show no feedback message — advance immediately, no pause.
const DIAGNOSTIC_DELAY_MS = 0;

/** How long a renderer's answer hook should hold on the answered state before
 *  calling onResult and advancing. Dynamic per answer: diagnostic tasks (no
 *  feedback shown) and correct answers (nothing to read) pause briefly; a wrong
 *  answer outside the diagnostic holds long enough for the child to read the
 *  feedback text. */
export function getFeedbackDelayMs(task: Pick<Task, 'is_diagnostic'>, isCorrect: boolean): number {
  if (task.is_diagnostic) return DIAGNOSTIC_DELAY_MS;
  return isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS;
}

type FeedbackTask = Pick<Task, 'is_diagnostic' | 'feedback_correct' | 'feedback_wrong' | 'feedback_text'>;

/** Supportive feedback text for an answered task — null for diagnostic tasks, which
 *  show no feedback message at all. */
export function getFeedbackText(task: FeedbackTask, isCorrect: boolean): string | null {
  if (task.is_diagnostic) return null;
  return (isCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text;
}
