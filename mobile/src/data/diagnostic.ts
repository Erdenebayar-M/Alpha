/**
 * Bundled, offline diagnostic content. No network — everything ships in-app.
 * The first listening question ("Сонссон үгээ олоорой") from the Figma design.
 */

export type DiagnosticOption = {
  id: number;
  label: string;
};

export type DiagnosticQuestion = {
  /** Friendly greeting shown above the prompt. */
  greeting: string;
  /** Task prompt. */
  prompt: string;
  /** Answer choices. */
  options: DiagnosticOption[];
  /** Index into `options` of the correct answer. */
  correctOptionId: number;
  /** Audio asset for the word to listen to (wired to expo-audio later). */
  // audio: require('@/assets/audio/...'),
};

export const DIAGNOSTIC_TOTAL = 8;

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    greeting: 'Сайн уу? Хонгор',
    prompt: 'Сонссон үгээ олоорой',
    options: [
      { id: 0, label: 'Хурга' },
      { id: 1, label: 'Хуурга' },
      { id: 2, label: 'Хураг' },
      { id: 3, label: 'Хураг' },
    ],
    correctOptionId: 0,
  },
];

/**
 * Listen-&-choose screen content (Figma pages 6–8). Greeting-only — no bold prompt.
 * NOTE: option labels below are placeholders mirroring the mockup. Real vocabulary
 * must come from the master content bank, not be invented (see CLAUDE.md hard rule #1).
 */
export const listenQuestion: DiagnosticQuestion = {
  greeting: 'Сайн уу? Болдоо',
  prompt: '',
  options: [
    { id: 0, label: 'Хурга' },
    { id: 1, label: 'Хурга' },
    { id: 2, label: 'Хурга' },
    { id: 3, label: 'Хурга' },
  ],
  correctOptionId: 0,
};
