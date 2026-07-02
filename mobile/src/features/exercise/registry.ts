import type { ComponentType } from 'react';

import AudioChoice from '@/src/features/exercise/renderers/AudioChoice';
import AudioSpelling from '@/src/features/exercise/renderers/AudioSpelling';
import Fallback from '@/src/features/exercise/renderers/Fallback';
import FillBlank from '@/src/features/exercise/renderers/FillBlank';
import ImageMatch from '@/src/features/exercise/renderers/ImageMatch';
import MultipleChoice from '@/src/features/exercise/renderers/MultipleChoice';
import type { Task } from '@/src/features/exercise/types';

export interface ExerciseRendererProps {
  task: Task;
  onResult: (isCorrect: boolean) => void;
}

export const registry: Record<string, ComponentType<ExerciseRendererProps>> = {
  multiple_choice: MultipleChoice,
  fill_blank: FillBlank,
  audio_choice: AudioChoice,
  image_match: ImageMatch,
  text_input: AudioSpelling,
  fallback: Fallback,
};
