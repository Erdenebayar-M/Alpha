import type { ComponentType } from 'react';

import AudioChoice from '@/src/features/exercise/renderers/AudioChoice';
import Fallback from '@/src/features/exercise/renderers/Fallback';
import MultipleChoice from '@/src/features/exercise/renderers/MultipleChoice';
import type { Task } from '@/src/features/exercise/types';

export interface ExerciseRendererProps {
  task: Task;
  onResult: (isCorrect: boolean) => void;
}

// fill_blank falls back to Fallback until its renderer is built.
export const registry: Record<string, ComponentType<ExerciseRendererProps>> = {
  multiple_choice: MultipleChoice,
  fill_blank: Fallback,
  audio_choice: AudioChoice,
  fallback: Fallback,
};
