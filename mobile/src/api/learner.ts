import { apiRequest } from '@/src/api/client';

export interface Learner {
  id: string;
  name: string;
  grade: number;
  variant: 'A' | 'B';
  daily_minutes: number;
}

export interface CreateLearnerInput {
  name: string;
  grade: number;
  daily_minutes?: number;
}

export function getLearners(): Promise<{ learners: Learner[] }> {
  return apiRequest<{ learners: Learner[] }>('/learner');
}

export function createLearner(input: CreateLearnerInput): Promise<Learner> {
  return apiRequest<Learner>('/learner', { method: 'POST', body: input });
}

export function getLearner(id: string): Promise<Learner> {
  return apiRequest<Learner>(`/learner/${id}`);
}
