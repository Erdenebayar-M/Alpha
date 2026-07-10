import { apiRequest } from '@/src/api/client';
import type { Task } from '@/src/features/exercise/types';

// The diagnostic is a single adaptive loop (NOT the 3-phase A/B/C flow the older
// docs describe): start once, then submit each answer — the server returns the
// next task inline until `completed` is true. There is no `/next-phase`.

export interface DiagnosticStartResponse {
  session_id: string;
  task: Task;
  item_number: number; // 1-based index of the returned item
}

/** Final result stored on the session + surfaced to the client. */
export interface DiagnosticResult {
  general_level: string; // "M0".."M5"
  level_confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  bank_coverage: number;
  capped_by_bank: boolean;
  confidence: string;
  skill_levels: Record<string, string>;
  skill_scores: Record<string, number>;
  skill_confidence: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
  top_error_codes: string[];
  priority_skills: string[];
  recommended_daily_minutes: number;
}

interface DiagnosticSubmitBase {
  score: number;
  is_correct: boolean;
  error_codes: string[];
  feedback: string;
}

export interface DiagnosticSubmitContinue extends DiagnosticSubmitBase {
  completed: false;
  next_task: Task;
  item_number: number; // 1-based index of next_task
}

export interface DiagnosticSubmitComplete extends DiagnosticSubmitBase {
  completed: true;
  result: DiagnosticResult;
  plan_id: string;
  lessons_generated: boolean;
}

export type DiagnosticSubmitResponse = DiagnosticSubmitContinue | DiagnosticSubmitComplete;

export interface SubmitDiagnosticInput {
  session_id: string;
  task_id: string;
  input_text: string;
  time_seconds: number;
}

export function startDiagnostic(learnerId: string): Promise<DiagnosticStartResponse> {
  return apiRequest<DiagnosticStartResponse>('/diagnostic/start', {
    method: 'POST',
    body: { learner_id: learnerId },
  });
}

export function submitDiagnostic(input: SubmitDiagnosticInput): Promise<DiagnosticSubmitResponse> {
  return apiRequest<DiagnosticSubmitResponse>('/diagnostic/submit', { method: 'POST', body: input });
}

export function getDiagnosticResult(sessionId: string): Promise<{ result: DiagnosticResult }> {
  return apiRequest<{ result: DiagnosticResult }>(
    `/diagnostic/result/${encodeURIComponent(sessionId)}`,
  );
}
