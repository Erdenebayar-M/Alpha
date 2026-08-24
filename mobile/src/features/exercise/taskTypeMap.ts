// Fallback map used only when a task's own interaction_form is null. Covers all 43
// backend task_type codes (shared/src/validators/task.ts TASK_TYPE_OPTION_SHAPE) —
// every code maps to a renderer whose registry key matches its actual options shape.
const taskTypeMap: Record<string, string> = {
  // choiceOptions — purpose-built renderers where the interaction clearly fits...
  TT_1_1: 'letter_choice',
  TT_1_2: 'image_match',
  TT_4_2: 'audio_choice',
  TT_6_1: 'sentence_capital',
  TT_6_2: 'punctuation_choice',
  // choiceOptions, audio variant — hear the word, pick the correctly spelled one.
  TT_1_5: 'audio_word_choice',
  TT_3_1: 'audio_word_choice',
  // ...the rest of choiceOptions fall back to the generic choice renderer.
  TT_2_3: 'multiple_choice',
  TT_3_4: 'multiple_choice',
  TT_4_1: 'multiple_choice',
  TT_5_1: 'multiple_choice',
  TT_5_4: 'multiple_choice',
  TT_5_6: 'multiple_choice',
  TT_5_7: 'multiple_choice',
  TT_7_7: 'multiple_choice',
  TT_8_3: 'multiple_choice',

  // matchPairsOptions — connect-two-columns matching.
  TT_1_3: 'match_pairs',
  TT_3_3: 'match_pairs',
  TT_5_3: 'match_pairs',

  // assembleWordOptions — tap scrambled tiles to spell the word in order.
  TT_1_4: 'assemble_word',
  TT_2_2: 'assemble_word',

  // fillOptions, picture variant — tap letters from a bank into the word's blanks.
  TT_2_1: 'fill_letter_tiles',
  // fillOptions, audio variant — hear the word, tap letters into its blanks.
  TT_2_4: 'audio_fill_letter_tiles',

  // fillOptions — type just the missing letter(s) into a word's blank.
  TT_3_2: 'fill_letter',
  TT_4_3: 'fill_letter',
  TT_4_4: 'fill_letter',
  TT_5_5: 'fill_letter',

  // sentenceFillOptions — type just the missing word into a sentence's blank.
  TT_5_2: 'sentence_fill',
  TT_7_5: 'sentence_fill',

  // correctionOptions — edit incorrect_text into correct_text.
  TT_2_5: 'correction',
  TT_2_6: 'correction',
  TT_3_5: 'correction',
  TT_4_5: 'correction',
  TT_6_3: 'correction',
  TT_6_4: 'correction',
  TT_8_2: 'correction',

  // copyOptions / visualMemoryOptions — retype a shown / memorized text.
  TT_7_1: 'copy_text',
  TT_7_2: 'visual_memory',

  // dictationOptions — hear audio, type the word(s)/sentence.
  TT_7_3: 'dictation',
  TT_7_4: 'dictation',

  // miniTextOptions — hear a short passage, type it all out.
  TT_7_6: 'mini_text',

  // tapFindErrorOptions — tap the wrong word in a sentence.
  TT_8_1: 'tap_find_error',

  // selfCheckOptions — compare an earlier attempt to the model answer, retype corrected.
  TT_8_4: 'self_check',
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
 * registry keys). Returns null when the shape is unrecognised. Order matters: more
 * specific/unique fields are checked before the generic `choices` fallback.
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
  if (typeof o.sentence === 'string' && typeof o.error_word_index === 'number') return 'tap_find_error';
  if (typeof o.original_attempt === 'string') return 'self_check';
  if (typeof o.text_to_memorize === 'string') return 'visual_memory';
  if (typeof o.text_to_copy === 'string') return 'copy_text';
  if (typeof o.incorrect_text === 'string') return 'correction';
  if (typeof o.sentence_template === 'string') return 'sentence_fill';
  if (typeof o.display_text === 'string') return 'fill_letter';
  if (Array.isArray(o.expected_answers)) {
    return typeof o.sentence_count === 'number' ? 'mini_text' : 'dictation';
  }
  if (Array.isArray(o.choices) && o.choices.length > 0) return 'multiple_choice';
  return null;
}
