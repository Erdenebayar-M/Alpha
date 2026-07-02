import { create } from 'zustand';

import type { Learner } from '@/src/api/learner';

interface ActiveLearnerState {
  activeLearner: Learner | null;
  setActiveLearner: (learner: Learner) => void;
  clearActiveLearner: () => void;
}

export const useActiveLearnerStore = create<ActiveLearnerState>((set) => ({
  activeLearner: null,
  setActiveLearner: (learner) => set({ activeLearner: learner }),
  clearActiveLearner: () => set({ activeLearner: null }),
}));
