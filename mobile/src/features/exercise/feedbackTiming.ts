import type { Task } from './types';

// A correct answer has nothing to read — just a brief affirming pulse.
const CORRECT_DELAY_MS = 350;
// A wrong answer needs enough time to read feedback_wrong / feedback_text.
const WRONG_DELAY_MS = 1200;
// Diagnostic tasks show no feedback message — keep the adaptive stream moving.
const DIAGNOSTIC_DELAY_MS = 300;

/** How long a renderer's answer hook should hold on the answered state before
 *  calling onResult and advancing. Dynamic per answer: diagnostic tasks (no
 *  feedback shown) and correct answers (nothing to read) pause briefly; a wrong
 *  answer outside the diagnostic holds long enough for the child to read the
 *  feedback text. */
export function getFeedbackDelayMs(task: Pick<Task, 'is_diagnostic'>, isCorrect: boolean): number {
  if (task.is_diagnostic) return DIAGNOSTIC_DELAY_MS;
  return isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS;
}
