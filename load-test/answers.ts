/**
 * Derive an input_text for a task response.
 * Mirrors the routing in backend/src/lib/error-engine/attempt-processor.ts.
 * When beCorrect=false we produce a plausibly wrong answer (not just empty string)
 * so the error classifier fires and generates realistic error data.
 */

interface Task {
  id: string;
  task_type: string;
  options: unknown;
}

// Task-type sets (mirrors attempt-processor constants)
const CHOICE_TYPES = new Set([
  'TT_1_1','TT_1_2','TT_1_3','TT_1_4','TT_1_5','TT_1_6','TT_1_7','TT_1_8',
  'TT_3_1','TT_3_2','TT_3_3',
]);
const FILL_TYPES = new Set([
  'TT_2_1','TT_2_2','TT_2_3','TT_2_4','TT_2_5','TT_2_6',
  'TT_5_1','TT_5_3','TT_5_4',
]);
const DICTATION_TYPES = new Set(['TT_4_1','TT_4_2','TT_7_1','TT_7_2','TT_7_3','TT_7_4']);
const MATCH_TYPES = new Set(['TT_MATCH_PAIRS']);
const ASSEMBLE_TYPES = new Set(['TT_ASSEMBLE_WORD']);
const TAP_TYPES = new Set(['TT_TAP_FIND_ERROR']);

function corrupt(word: string): string {
  // Drop the last character — simple way to produce a C1/B1-type error
  if (word.length <= 1) return word + 'х';
  return word.slice(0, -1);
}

export function deriveAnswer(task: Task, beCorrect: boolean): string {
  const opts = task.options as Record<string, unknown>;
  const tt = task.task_type;

  if (CHOICE_TYPES.has(tt)) {
    const choices = (opts['choices'] ?? []) as { text: string; is_correct: boolean }[];
    const correct = choices.find((c) => c.is_correct);
    const wrong = choices.find((c) => !c.is_correct);
    if (beCorrect) return correct?.text ?? 'нар';
    return wrong?.text ?? corrupt(correct?.text ?? 'нар');
  }

  if (FILL_TYPES.has(tt)) {
    const blank = String(opts['blank_answer'] ?? opts['blank_answer'] ?? 'нар');
    if (beCorrect) return blank;
    return corrupt(blank);
  }

  if (tt === 'TT_5_2' || tt === 'TT_7_5') {
    const blank = String(opts['blank_answer'] ?? 'нар');
    if (beCorrect) return blank;
    return corrupt(blank);
  }

  if (DICTATION_TYPES.has(tt)) {
    const expected = (opts['expected_answers'] ?? []) as string[];
    const answer = expected.join(' ');
    if (beCorrect) return answer;
    return expected.map((w) => corrupt(w)).join(' ');
  }

  if (tt === 'TT_7_6') {
    const expected = (opts['expected_answers'] ?? []) as string[];
    const answer = expected.join(' ');
    if (beCorrect) return answer;
    return expected.map((w) => corrupt(w)).join(' ');
  }

  if (MATCH_TYPES.has(tt)) {
    const pairs = (opts['pairs'] ?? []) as { left: string; right: string }[];
    if (beCorrect) {
      return JSON.stringify(pairs.map((p) => ({ left: p.left, right: p.right })));
    }
    // Swap first two pairs to get wrong answer
    const shuffled = [...pairs];
    if (shuffled.length >= 2) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return JSON.stringify(shuffled.map((p) => ({ left: p.left, right: p.right })));
  }

  if (ASSEMBLE_TYPES.has(tt)) {
    const order = (opts['correct_order'] ?? []) as string[];
    if (beCorrect) return JSON.stringify(order);
    const shuffled = [...order].reverse();
    return JSON.stringify(shuffled);
  }

  if (TAP_TYPES.has(tt)) {
    const errorIdx = Number(opts['error_word_index'] ?? 0);
    if (beCorrect) return String(errorIdx);
    return String(errorIdx === 0 ? 1 : 0);
  }

  // Correction / copy / mini-text / boundary: use correct_text
  const correctText = String(opts['correct_text'] ?? 'нар');
  if (beCorrect) return correctText;
  return corrupt(correctText);
}
