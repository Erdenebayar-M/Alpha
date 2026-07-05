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
  // Place-the-punctuation-mark task (TT_8_2): the child drags `mark` into the gaps
  // between/after `tokens` where a sentence ends. `answer_gaps` lists the correct
  // "after tokens[i]" indices (e.g. [2, 6]).
  punctuation?: PunctuationOptions;
  // interaction-form-specific extras may appear here; keep this open/optional
}

/** Content for the drag-the-mark-into-the-sentence task ("Өгүүлбэрийн төгсгөлд
 *  тэмдэг тавих"). `tokens` are the sentence words in order; `answer_gaps` are the
 *  0-based indices such that the mark belongs *after* `tokens[i]`. */
export interface PunctuationOptions {
  mark: string;
  tokens: string[];
  answer_gaps: number[];
  /** Boundaries that show a droppable gap (comma task, TT_8_3). A dashed circle renders
   *  after `tokens[i]` for each `i` here, and `answer_gaps` is a subset (the rest are
   *  distractors the child must leave empty). Absent → PunctuationPlace behaviour, where
   *  every token boundary is an (invisible) drop slot. */
  gap_positions?: number[];
}

export interface Task {
  id: string;
  task_id: string;
  stage: string; // e.g. "STAGE2"
  task_type: string; // e.g. "TT_1_5" (one of ~43 codes)
  interaction_form: string | null; // preferred renderer key; may be null -> use taskTypeMap
  prompt_text: string; // "_" marks the blank in fill-in tasks
  correct_answer: string;
  options: TaskOptions;

  audio_url: string | null;
  prompt_audio_url: string | null;
  image_url: string | null;

  // skill / targeting metadata (display + analytics; app rarely branches on these)
  primary_skill: string | null;
  secondary_skill: string | null;
  level_target: string | null;
  error_targets: string[];
  grade_band: string[]; // ["G1"]
  grade_levels: string[]; // ["G1:M3"]
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: string; // e.g. "WARM_UP"

  // feedback shown to the child
  feedback_text: string | null;
  feedback_correct: string | null;
  feedback_wrong: string | null;

  is_diagnostic: boolean;
}
