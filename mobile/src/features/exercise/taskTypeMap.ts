// Fallback map used only when a task's own interaction_form is null.
// Seeded from the task_type codes present in mockData.ts.
const taskTypeMap: Record<string, string> = {
  TT_1_5: 'multiple_choice',
  TT_2_3: 'fill_blank',
  TT_4_2: 'audio_choice',
  // Placeholder codes — the real task_type -> interaction_form mapping is owned by
  // the backend (AGENTS §14). Tasks carry interaction_form directly; this is fallback only.
  TT_1_2: 'image_match',
  TT_1_1: 'letter_choice',
  TT_5_1: 'text_input',
  // Connect-two-columns matching tasks (backend uses matchPairsOptions for these).
  TT_1_3: 'match_pairs',
  TT_3_3: 'match_pairs',
  TT_5_3: 'match_pairs',
  // Copy-the-word / transcribe: the child retypes the shown word (options.text_to_copy,
  // no choices). The real G1 bank tags these TT_7_1; the text_input renderer fits.
  TT_7_1: 'text_input',
  // Place-the-correct-punctuation: pick the sentence's end mark (. / ? / !) (placeholder code).
  TT_8_1: 'punctuation_choice',
  // Drag the end mark into the gap after the word that ends each sentence (placeholder code).
  TT_8_2: 'punctuation_place',
  // Drag a comma into the dashed gaps between words within a sentence (placeholder code).
  TT_8_3: 'comma_place',
  // Assemble the word: tap scrambled letter tiles to fill the slots in order.
  TT_1_4: 'assemble_word',
  TT_2_2: 'assemble_word',
};

export function getInteractionForm(taskType: string): string {
  return taskTypeMap[taskType] ?? 'fallback';
}

/**
 * Last-resort resolver: infer a renderer key from the task's options shape when
 * neither the task's own interaction_form nor the task_type map yields a usable
 * renderer. This keeps the diagnostic/lesson from freezing on the dead-end
 * Fallback renderer for any task whose options we recognise (the backend serves
 * interaction_form = null today, and may later send raw enum values that aren't
 * registry keys). Returns null when the shape is unrecognised.
 */
export function inferInteractionForm(options: unknown): string | null {
  if (!options || typeof options !== 'object') return null;
  const o = options as Record<string, unknown>;

  if (Array.isArray(o.tiles) && Array.isArray(o.correct_order)) return 'assemble_word';
  if (Array.isArray(o.pairs)) return 'match_pairs';
  if (o.punctuation && typeof o.punctuation === 'object') {
    const p = o.punctuation as Record<string, unknown>;
    return Array.isArray(p.gap_positions) ? 'comma_place' : 'punctuation_place';
  }
  if (typeof o.text_to_copy === 'string') return 'text_input';
  if (Array.isArray(o.choices) && o.choices.length > 0) return 'multiple_choice';
  return null;
}
