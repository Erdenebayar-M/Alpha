export interface TaskChoice {
  text: string;
  is_correct: boolean;
}

/** One correct left↔right pairing for a matching task (mirrors the backend
 *  `matchPairsOptions` in @app/shared). `image_side` (on TaskOptions) says which
 *  side is a picture; the other side is text. */
export interface TaskPair {
  left: string;
  right: string;
  left_image_url?: string;
  right_image_url?: string;
}

export interface TaskOptions {
  choices?: TaskChoice[];
  audio_trigger?: boolean;
  distractors?: string[];
  // Matching tasks (TT_1_3 / TT_3_3 / TT_5_3): the correct pairs + which column is the image.
  pairs?: TaskPair[];
  image_side?: 'left' | 'right' | 'none';
  // Link behavior for matching tasks: 'any' locks every link and grades at submit
  // (default); 'correct-only' locks a link only when it's the right pair.
  match_lock_mode?: 'any' | 'correct-only';
  // Place-the-punctuation-mark task: the child drags `mark` into the gaps
  // between/after `tokens` where a sentence ends. `answer_gaps` lists the correct
  // "after tokens[i]" indices (e.g. [2, 6]). NOTE: earlier comments here named this
  // TT_8_2, but shared/src/validators/task.ts's TASK_TYPE_OPTION_SHAPE says TT_8_2 is
  // correctionOptions — no backend task_type currently maps to this shape at all
  // (see PunctuationPlace.tsx / CommaPlace.tsx header notes).
  punctuation?: PunctuationOptions;
  // Assemble-the-word task (TT_1_4 / TT_2_2), mirrors the backend `assembleWordOptions`
  // in @app/shared: `tiles` is the scrambled letter pool (word letters + a few
  // distractors), `correct_order` is the target letter sequence. The child taps tiles
  // to fill slots in order — slot count is `correct_order.length`.
  tiles?: string[];
  correct_order?: string[];

  // Fill-the-blank task (fillOptions: TT_2_1/2_4/3_2/4_3/4_4/5_5). `display_text` uses
  // "_" as the blank marker; `blank_answer` is the letter(s) that belong there (this is
  // what the child types and what input_text carries — NOT the reconstructed full word);
  // `context_word` is the full correct word, for local feedback only.
  display_text?: string;
  blank_position?: number;
  blank_answer?: string;
  context_word?: string;

  // Sentence-fill task (sentenceFillOptions: TT_5_2/7_5). `sentence_template` uses "_"
  // for the blank; the child types just the missing word (`blank_answer`).
  // `context_sentence` is the full correct sentence — present in shared/ but not yet
  // read by any renderer here; kept for parity with the backend shape.
  sentence_template?: string;
  context_sentence?: string;
  hint?: string;

  // Correction/edit task (correctionOptions: TT_2_5/2_6/3_5/4_5/6_3/6_4/8_2). The child
  // edits `incorrect_text` into `correct_text`.
  incorrect_text?: string;
  correct_text?: string;

  // Dictation task (dictationOptions: TT_7_3/7_4). `audio_text` is the transcript (not
  // played directly — audio comes from task.audio_url); `expected_answers` is one string
  // per sentence, used for local feedback.
  audio_text?: string;
  word_count?: number;
  expected_answers?: string[];
  allow_partial?: boolean;

  // Mini-text dictation (miniTextOptions: TT_7_6) — reuses audio_text/expected_answers above.
  sentence_count?: number;

  // Copy-the-text task (copyOptions: TT_7_1).
  text_to_copy?: string;

  // Visual-memory task (visualMemoryOptions: TT_7_2).
  text_to_memorize?: string;
  display_seconds?: number;

  // Self-check task (selfCheckOptions: TT_8_4).
  original_attempt?: string;
  model_answer?: string;
  comparison_mode?: 'side_by_side' | 'highlight_diff';

  // Tap-find-error task (tapFindErrorOptions: TT_8_1). `sentence` is the full sentence
  // shown; `error_word_index` is the 0-based index (split on whitespace) of the wrong word.
  sentence?: string;
  error_word_index?: number;
  // interaction-form-specific extras may appear here; keep this open/optional
}

/** Content for the drag-the-mark-into-the-sentence task ("Өгүүлбэрийн төгсгөлд
 *  тэмдэг тавих"). `tokens` are the sentence words in order; `answer_gaps` are the
 *  0-based indices such that the mark belongs *after* `tokens[i]`. */
export interface PunctuationOptions {
  mark: string;
  tokens: string[];
  answer_gaps: number[];
  /** Boundaries that show a droppable gap (comma task). A dashed circle renders
   *  after `tokens[i]` for each `i` here, and `answer_gaps` is a subset (the rest are
   *  distractors the child must leave empty). Absent → PunctuationPlace behaviour, where
   *  every token boundary is an (invisible) drop slot. NOTE: not TT_8_3 — that code is
   *  choiceOptions per shared/; see CommaPlace.tsx's header note. */
  gap_positions?: number[];
}

export interface Task {
  // ── Fields the backend serves to the client (TASK_SELECT, shared across
  // diagnostic / lesson / checkpoint). These are always present. ──────────────
  id: string;
  task_type: string; // e.g. "TT_1_5" (one of ~43 codes)
  interaction_form: string | null; // preferred renderer key; may be null -> use taskTypeMap
  prompt_text: string; // "_" marks the blank in fill-in tasks
  correct_answer: string;
  options: TaskOptions;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string | null;
  estimated_time_seconds: number;

  // feedback shown to the child
  feedback_text: string | null;
  feedback_correct: string | null;
  feedback_wrong: string | null;

  // ── Fields the backend does NOT send today (present only in mock data /
  // future payloads). Optional so the real API response type-checks; renderers
  // that read them already guard for absence. ────────────────────────────────
  task_id?: string;
  stage?: string; // e.g. "STAGE2"
  prompt_audio_url?: string | null;
  secondary_skill?: string | null;
  level_target?: string | null;
  error_targets?: string[];
  grade_band?: string[]; // ["G1"]
  grade_levels?: string[]; // ["G1:M3"]
  difficulty?: number;
  lesson_slot_fit?: string; // e.g. "WARM_UP"
  is_diagnostic?: boolean;
}
