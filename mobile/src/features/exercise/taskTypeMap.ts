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
  // Sentence-starts-with-a-capital: pick the correctly-cased first word (placeholder code).
  TT_7_1: 'sentence_capital',
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
