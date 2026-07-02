// Fallback map used only when a task's own interaction_form is null.
// Seeded from the task_type codes present in mockData.ts.
const taskTypeMap: Record<string, string> = {
  TT_1_5: 'multiple_choice',
  TT_2_3: 'fill_blank',
  TT_4_2: 'audio_choice',
  // Placeholder codes — the real task_type -> interaction_form mapping is owned by
  // the backend (AGENTS §14). Tasks carry interaction_form directly; this is fallback only.
  TT_1_2: 'image_match',
  TT_5_1: 'text_input',
};

export function getInteractionForm(taskType: string): string {
  return taskTypeMap[taskType] ?? 'fallback';
}
