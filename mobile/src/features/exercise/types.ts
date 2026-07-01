export interface TaskChoice {
  text: string;
  is_correct: boolean;
}

export interface TaskOptions {
  choices?: TaskChoice[];
  audio_trigger?: boolean;
  distractors?: string[];
  // interaction-form-specific extras may appear here; keep this open/optional
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
