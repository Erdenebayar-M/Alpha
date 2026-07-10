import { z } from 'zod';

// ─── Request schemas ─────────────────────────────────────────────────────────

export const startDiagnosticSchema = z.object({
  learner_id: z.string().min(1),
});

export const submitDiagnosticSchema = z.object({
  session_id: z.string().min(1),
  task_id: z.string().min(1),
  input_text: z.string().min(1),
  time_seconds: z.number().int().min(0),
});

/**
 * @deprecated The single-phase adaptive diagnostic has no phase hand-off; the
 * next item is returned inline by POST /diagnostic/submit. Kept only so existing
 * mobile imports keep compiling until the mobile flow is migrated. Do not use in
 * new code.
 */
export const nextPhaseSchema = z.object({
  session_id: z.string().min(1),
});

// ─── Response contract types (single-phase adaptive) ─────────────────────────

/** Task payload the client renders. Mirrors the route's TASK_SELECT. */
export interface DiagnosticTask {
  id: string;
  task_type: string;
  prompt_text: string;
  options: unknown; // JSONB; structure varies by task_type
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  estimated_time_seconds: number;
}

/** Final diagnostic result. `general_level` now comes from the adaptive climb. */
export interface DiagnosticResult {
  general_level: string; // "M0".."M5" — from the climb ceiling
  level_confidence: 'LOW' | 'MEDIUM' | 'HIGH'; // bank-aware confidence in the level
  bank_coverage: number; // distinct rungs the bank had for this grade
  capped_by_bank: boolean; // top passed rung was simply the top the bank has
  confidence: string; // legacy overall (item-count) confidence
  skill_levels: Record<string, string>;
  skill_scores: Record<string, number>;
  skill_confidence: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
  top_error_codes: string[];
  priority_skills: string[];
  recommended_daily_minutes: number;
}

export interface DiagnosticStartResponse {
  session_id: string;
  task: DiagnosticTask;
  item_number: number; // 1-based index of the item returned (starts at 1)
}

/** Per-attempt scoring, common to both submit outcomes. */
interface DiagnosticSubmitBase {
  score: number;
  is_correct: boolean;
  error_codes: string[];
  feedback: string;
}

export interface DiagnosticSubmitContinue extends DiagnosticSubmitBase {
  completed: false;
  next_task: DiagnosticTask;
  item_number: number; // 1-based index of next_task
}

export interface DiagnosticSubmitComplete extends DiagnosticSubmitBase {
  completed: true;
  result: DiagnosticResult;
  plan_id: string;
  lessons_generated: boolean; // false if plan lesson generation failed (plan may be empty)
}

export type DiagnosticSubmitResponse =
  | DiagnosticSubmitContinue
  | DiagnosticSubmitComplete;
