/*
 * Distractor validator: for each incorrect choice in a TT1_CHOICE task,
 * verifies that it can be derived from the correct answer by applying at
 * least one of the task's error_targets rules.
 * No Mongolian character literals are used — all char constants come from
 * mongolianChars.ts via errorRules.ts.
 */

import { applyErrorRule, ErrorCode } from './errorRules';

interface Choice {
  text: string;
  is_correct: boolean;
}

interface TaskOptions {
  choices?: Choice[];
}

interface Task {
  correct_answer: string;
  options: TaskOptions;
  error_targets: string[];
}

const MVP_CODES = new Set<string>([
  'B1', 'C1', 'C2', 'C4', 'D3', 'B3', 'E1', 'E2', 'E7', 'G1', 'G2', 'H4',
]);

/**
 * Validates every is_correct=false choice against the task's error_targets.
 * A distractor passes if applyErrorRule(correct_answer, code) === distractor
 * for at least one code in error_targets.
 */
export function validateDistractors(task: Task): { ok: boolean; reasons: string[] } {
  const choices = task.options.choices;
  if (!choices) return { ok: true, reasons: [] };

  const reasons: string[] = [];
  const activeCodes = task.error_targets.filter((c) => MVP_CODES.has(c)) as ErrorCode[];

  for (const choice of choices) {
    if (choice.is_correct) continue;

    const matched = activeCodes.some(
      (code) => applyErrorRule(task.correct_answer, code) === choice.text,
    );

    if (!matched) {
      reasons.push(
        `distractor "${choice.text}" not derivable from "${task.correct_answer}" via [${activeCodes.join(', ')}]`,
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}
