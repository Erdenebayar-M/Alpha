import { useMutation, useQuery } from '@tanstack/react-query';

import { completeLesson, getTodayLesson, submitAttempt, type SubmitAttemptInput } from '@/src/api/lesson';

export function useGetTodayLesson(learnerId: string | undefined) {
  return useQuery({
    queryKey: ['lesson', 'today', learnerId],
    queryFn: () => getTodayLesson(learnerId as string),
    enabled: Boolean(learnerId),
  });
}

export function useSubmitAttempt() {
  return useMutation({
    mutationFn: (input: SubmitAttemptInput) => submitAttempt(input),
  });
}

export function useCompleteLesson() {
  return useMutation({
    mutationFn: (lessonId: string) => completeLesson(lessonId),
  });
}
