import { apiRequest } from '@/src/api/client';

// Mirrors GET /api/plan/current — the learner's active study plan with its per-day
// lessons and checkpoints. The backend generates this after a diagnostic; the app
// only reads it (never computes the schedule itself). A 404 with code
// NO_ACTIVE_PLAN is the expected empty state before the first diagnostic.

export interface PlanLesson {
  id: string;
  day_number: number;
  status: string; // e.g. "PENDING" | "IN_PROGRESS" | "COMPLETED"
  scheduled_date: string;
  primary_skill: string; // "S1".."S8"
  total_tasks: number;
  completed_tasks: number;
}

export interface PlanCheckpoint {
  id: string;
  scheduled_date: string;
  status: string;
}

export interface Plan {
  id: string;
  template: string; // "INTENSIVE" | "BALANCED" | "STABILIZATION"
  status: string;
  priority_skills: string[];
  target_errors: string[];
  daily_minutes: number;
  duration_days: number;
  source: string;
  started_at: string | null;
  ended_at: string | null;
  lessons: PlanLesson[];
  checkpoints: PlanCheckpoint[];
}

export function getCurrentPlan(learnerId: string): Promise<{ plan: Plan }> {
  return apiRequest<{ plan: Plan }>(
    `/plan/current?learner_id=${encodeURIComponent(learnerId)}`,
  );
}
