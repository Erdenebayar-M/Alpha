import { apiRequest } from '@/src/api/client';

// Mirrors GET /api/dashboard/skills — one LearnerSkillState row projected for the
// parent view. s1..s8 are the eight orthography skills; each has a score (0..1),
// a level (M0..M5) and a confidence.
export interface SkillsState {
  general_level: string;
  s1_score: number; s1_level: string; s1_confidence: string;
  s2_score: number; s2_level: string; s2_confidence: string;
  s3_score: number; s3_level: string; s3_confidence: string;
  s4_score: number; s4_level: string; s4_confidence: string;
  s5_score: number; s5_level: string; s5_confidence: string;
  s6_score: number; s6_level: string; s6_confidence: string;
  s7_score: number; s7_level: string; s7_confidence: string;
  s8_score: number; s8_level: string; s8_confidence: string;
  weak_skills: string[];
  top_error_codes: string[];
  current_streak: number;
  longest_streak: number;
  updated_at: string;
}

export interface RecentLesson {
  id: string;
  day_number: number;
  accuracy: number;
  completed_at: string;
}

export interface ProgressState {
  current_streak: number;
  longest_streak: number;
  recent_lessons: RecentLesson[];
}

export function getSkills(learnerId: string): Promise<{ skills: SkillsState }> {
  return apiRequest<{ skills: SkillsState }>(
    `/dashboard/skills?learner_id=${encodeURIComponent(learnerId)}`,
  );
}

export function getProgress(learnerId: string): Promise<ProgressState> {
  return apiRequest<ProgressState>(
    `/dashboard/progress?learner_id=${encodeURIComponent(learnerId)}`,
  );
}
