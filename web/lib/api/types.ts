/**
 * Hand-mirrored copy of the backend's diagnostic response contract
 * (shared/src/validators/diagnostic.ts + shared/src/validators/task.ts). web/
 * is not an npm workspace member (see web/AGENTS.md), so it can't import
 * @app/shared directly — same constraint mobile is under, and the same fix:
 * mirror the types by hand and catch drift with a script instead of a build
 * dependency. See web/scripts/check-shared-drift.mjs, which reads the two
 * shared/ files as text and asserts every type/field named here still exists
 * there.
 *
 * One deliberate difference from the backend's own `DiagnosticTask`: no
 * `correct_answer` field. The proxy routes in web/app/api/diagnostic/*
 * strip it server-side before a task ever reaches the browser — see
 * web/lib/api/server/sanitizeTask.ts.
 */

// ── Task payload ──────────────────────────────────────────────────────────

export interface ApiDiagnosticTask {
  id: string;
  task_type: string;
  prompt_text: string;
  interaction_form: string | null;
  options: unknown; // JSONB; shape depends on task_type — see per-type interfaces below
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  estimated_time_seconds: number;
  feedback_text: string | null;
  feedback_correct: string | null;
  feedback_wrong: string | null;
}

// ── Start / submit envelope ───────────────────────────────────────────────

export interface DiagnosticStartResponse {
  session_id: string;
  learner_id: string;
  task: ApiDiagnosticTask;
  item_number: number;
}

interface DiagnosticSubmitBase {
  score: number;
  is_correct: boolean;
  error_codes: string[];
  feedback: string;
}

export interface DiagnosticSubmitContinue extends DiagnosticSubmitBase {
  completed: false;
  next_task: ApiDiagnosticTask;
  item_number: number;
}

export interface DiagnosticResult {
  general_level: string; // "M0".."M5"
  level_confidence: "LOW" | "MEDIUM" | "HIGH";
  bank_coverage: number;
  capped_by_bank: boolean;
  confidence: string;
  skill_levels: Record<string, string>;
  skill_scores: Record<string, number>;
  skill_confidence: Record<string, "LOW" | "MEDIUM" | "HIGH">;
  top_error_codes: string[];
  priority_skills: string[];
  recommended_daily_minutes: number;
}

export interface DiagnosticSubmitComplete extends DiagnosticSubmitBase {
  completed: true;
  result: DiagnosticResult;
  plan_id: string;
  lessons_generated: boolean;
}

export type DiagnosticSubmitResponse = DiagnosticSubmitContinue | DiagnosticSubmitComplete;

// ── Per-type `options` shapes (mirrors shared/src/validators/task.ts) ──────

export interface ChoiceOptions {
  /** `is_correct` is stripped server-side (lib/api/server/sanitizeTask.ts) —
   *  it is the answer key, and no renderer reads it. */
  choices: { text: string }[];
  audio_trigger: boolean;
}

export interface FillOptions {
  display_text: string;
  blank_position: number;
  blank_answer: string;
  context_word: string;
}

export interface SentenceFillOptions {
  sentence_template: string;
  blank_answer: string;
  context_sentence: string;
  hint?: string;
}

export interface CorrectionOptions {
  incorrect_text: string;
  correct_text: string;
}

export interface DictationOptions {
  audio_text: string;
  word_count: number;
  expected_answers: string[];
  allow_partial: boolean;
}

export interface MiniTextOptions {
  audio_text: string;
  sentence_count: number;
  expected_answers: string[];
}

export interface SelfCheckOptions {
  original_attempt: string;
  model_answer: string;
  comparison_mode: "side_by_side" | "highlight_diff";
}

export interface MatchPairsOptions {
  pairs: { left: string; right: string; left_image_url?: string; right_image_url?: string }[];
  image_side: "left" | "right" | "none";
}

export interface AssembleWordOptions {
  tiles: string[];
  correct_order: string[];
}

export interface TapFindErrorOptions {
  sentence: string;
  /** `error_word_index` is stripped server-side — see sanitizeTask.ts. */
  correct_text: string;
}

export interface CopyOptions {
  text_to_copy: string;
}

export interface VisualMemoryOptions {
  text_to_memorize: string;
  display_seconds: number;
}

// ── Envelope + client errors ────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; per_page?: number; total?: number; has_next?: boolean };
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
