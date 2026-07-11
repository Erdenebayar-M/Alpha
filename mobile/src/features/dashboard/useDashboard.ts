import { useQuery } from '@tanstack/react-query';

import { getProgress, getSkills } from '@/src/api/dashboard';
import { getCurrentPlan } from '@/src/api/plan';

export function useSkills(learnerId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'skills', learnerId],
    queryFn: () => getSkills(learnerId as string),
    enabled: Boolean(learnerId),
    retry: false, // a 404 before the diagnostic is an expected empty state, not a fault
  });
}

export function useProgress(learnerId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'progress', learnerId],
    queryFn: () => getProgress(learnerId as string),
    enabled: Boolean(learnerId),
  });
}

export function usePlan(learnerId: string | undefined) {
  return useQuery({
    queryKey: ['plan', 'current', learnerId],
    queryFn: () => getCurrentPlan(learnerId as string),
    enabled: Boolean(learnerId),
    retry: false, // a 404 (NO_ACTIVE_PLAN) before the diagnostic is an expected empty state
  });
}
