import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createLearner, getLearners, type CreateLearnerInput } from '@/src/api/learner';

const LEARNERS_QUERY_KEY = ['learners'];

export function useGetLearners() {
  return useQuery({
    queryKey: LEARNERS_QUERY_KEY,
    queryFn: getLearners,
  });
}

export function useCreateLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLearnerInput) => createLearner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNERS_QUERY_KEY });
    },
  });
}
