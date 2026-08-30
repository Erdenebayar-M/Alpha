// task_type is the default dispatch key (see ExerciseEngine.tsx). The
// backend's own interaction_form enum (7 values: CHOOSE/MATCH/FILL/ASSEMBLE/
// TRANSCRIBE/CORRECT/TAP) has no overlap with this map's renderer keys, so it
// can never resolve a renderer on its own — but a task MAY instead carry a
// renderer key directly in interaction_form (e.g. a fixture or a future
// backend opting a specific task into a non-default renderer, such as
// 'syllable_assemble_word' sharing TT_1_4 with the default 'assemble_word').
// ExerciseEngine uses resolveInteractionForm() below to prefer that override
// when — and only when — it names a real registry entry; the 7-value backend
// enum itself never matches a registry key, so ordinary backend payloads are
// unaffected. Covers all 43 backend task_type codes, verified against the
// per-type options shape in shared/src/validators/task.ts's
// TASK_TYPE_OPTION_SHAPE.
export const taskTypeMap: Record<string, string> = {
  // choiceOptions — purpose-built renderers where the interaction clearly fits...
  TT_1_1: 'letter_choice',
  TT_1_2: 'image_match',
  TT_4_2: 'audio_choice',
  TT_6_1: 'sentence_capital',
  TT_6_2: 'punctuation_choice',
  TT_2_3: 'fill_blank',
  // choiceOptions, audio variant — hear the word, pick the correctly spelled one.
  TT_1_5: 'audio_word_choice',
  TT_3_1: 'audio_word_choice',
  // ...the rest of choiceOptions fall back to the generic choice renderer.
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
  // TT_1_4 shows a picture (assemble_word); TT_2_2 hears the word instead
  // (audio_assemble_word) — same split as fill-letters' TT_2_1/TT_2_4 pair below.
  TT_1_4: 'assemble_word',
  TT_2_2: 'audio_assemble_word',

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

// The backend's own InteractionForm enum (schema.prisma) — these values never
// name a registry renderer, so seeing one in task.interaction_form is expected
// and not a sign of client/backend drift.
export const BACKEND_INTERACTION_FORMS = new Set([
  'CHOOSE',
  'MATCH',
  'FILL',
  'ASSEMBLE',
  'TRANSCRIBE',
  'CORRECT',
  'TAP',
]);

/**
 * Resolves the renderer key for a task. Prefers task.interaction_form when it
 * names a real registry entry (an explicit renderer override); falls back to
 * taskTypeMap otherwise. `isRegistered` is injected rather than importing
 * registry.ts directly, so this stays testable without pulling in every
 * renderer (and therefore reanimated/worklets — see engineDispatch.test.ts).
 */
export function resolveInteractionForm(
  taskType: string,
  interactionForm: string | null | undefined,
  isRegistered: (key: string) => boolean,
): string {
  if (interactionForm && isRegistered(interactionForm)) {
    return interactionForm;
  }
  return getInteractionForm(taskType);
}
