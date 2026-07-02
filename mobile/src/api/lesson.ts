import { apiRequest } from '@/src/api/client';
import type { Task } from '@/src/features/exercise/types';

export interface Lesson {
  id: string;
  tasks: Task[];
}

export interface SubmitAttemptInput {
  lesson_id: string;
  task_id: string;
  input_text: string;
  time_seconds: number;
}

export interface SubmitAttemptResult {
  score: number;
  is_correct: boolean;
  feedback: string | null;
}

export interface CompleteLessonResult {
  completed: boolean;
  lesson_id: string;
  completed_at: string;
}

export function getTodayLesson(learnerId: string): Promise<{ lesson: Lesson }> {
  return apiRequest<{ lesson: Lesson }>(`/lesson/today?learner_id=${encodeURIComponent(learnerId)}`);
}

export function submitAttempt(input: SubmitAttemptInput): Promise<SubmitAttemptResult> {
  return apiRequest<SubmitAttemptResult>('/lesson/attempt', { method: 'POST', body: input });
}

export function completeLesson(lessonId: string): Promise<CompleteLessonResult> {
  return apiRequest<CompleteLessonResult>(`/lesson/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
  });
}
