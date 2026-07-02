import type { ComponentType } from 'react';

import Fallback from '@/src/features/exercise/renderers/Fallback';
import MultipleChoice from '@/src/features/exercise/renderers/MultipleChoice';
import type { Task } from '@/src/features/exercise/types';

export interface ExerciseRendererProps {
  task: Task;
  onResult: (isCorrect: boolean) => void;
}

// fill_blank and audio_choice fall back to Fallback until their renderers are built.
export const registry: Record<string, ComponentType<ExerciseRendererProps>> = {
  multiple_choice: MultipleChoice,
  fill_blank: Fallback,
  audio_choice: Fallback,
  fallback: Fallback,
};
