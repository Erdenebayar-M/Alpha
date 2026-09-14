import type { ApiDiagnosticTask } from "@/lib/api/types";

/**
 * The answer key never reaches the browser.
 *
 * The backend's TASK_SELECT (backend/src/lib/task-select.ts) sends
 * `correct_answer` on every served task — invisible on a phone, but visible in
 * a browser's Network tab. `options` carries two more of them, for the same
 * reason: `choices[].is_correct` marks the right option outright, and
 * `tapFindErrorOptions.error_word_index` is the whole answer to that task. No
 * renderer needs either (lib/api/adapt.ts reads only `choice.text`, and the
 * tap card reports the index the learner picked), so both are dropped here
 * with `correct_answer`.
 *
 * The fields deliberately left in are the ones a card genuinely draws or
 * measures itself against: `correct_text` (the comma card counts how many
 * marks are missing before offering itself), `model_answer` (the self-check
 * screen shows it on purpose), `blank_answer` (its length sizes the slot).
 * Those are worth revisiting server-side, but not by breaking the screens that
 * read them.
 *
 * Both diagnostic proxy routes call this before a task reaches the client.
 */
export function stripCorrectAnswer(task: Record<string, unknown>): ApiDiagnosticTask {
  const sanitized = { ...task };
  delete sanitized.correct_answer;
  sanitized.options = stripOptionAnswers(sanitized.options);
  return sanitized as unknown as ApiDiagnosticTask;
}

function stripOptionAnswers(options: unknown): unknown {
  if (!options || typeof options !== "object" || Array.isArray(options)) return options;

  const stripped = { ...(options as Record<string, unknown>) };
  delete stripped.error_word_index;

  if (Array.isArray(stripped.choices)) {
    stripped.choices = stripped.choices.map((choice) => {
      if (!choice || typeof choice !== "object" || Array.isArray(choice)) return choice;
      const withoutAnswer = { ...(choice as Record<string, unknown>) };
      delete withoutAnswer.is_correct;
      return withoutAnswer;
    });
  }

  return stripped;
}
