import type { ComponentType } from 'react';

import AssembleWord from '@/src/features/exercise/renderers/AssembleWord';
import AudioChoice from '@/src/features/exercise/renderers/AudioChoice';
import AudioSpelling from '@/src/features/exercise/renderers/AudioSpelling';
import CommaPlace from '@/src/features/exercise/renderers/CommaPlace';
import Fallback from '@/src/features/exercise/renderers/Fallback';
import FillBlank from '@/src/features/exercise/renderers/FillBlank';
import ImageMatch from '@/src/features/exercise/renderers/ImageMatch';
import LetterChoice from '@/src/features/exercise/renderers/LetterChoice';
import MatchPairs from '@/src/features/exercise/renderers/MatchPairs';
import MultipleChoice from '@/src/features/exercise/renderers/MultipleChoice';
import PunctuationPlace from '@/src/features/exercise/renderers/PunctuationPlace';
import SentenceCapital from '@/src/features/exercise/renderers/SentenceCapital';
import SentencePunctuation from '@/src/features/exercise/renderers/SentencePunctuation';
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
  letter_choice: LetterChoice,
  match_pairs: MatchPairs,
  sentence_capital: SentenceCapital,
  punctuation_choice: SentencePunctuation,
  punctuation_place: PunctuationPlace,
  comma_place: CommaPlace,
  assemble_word: AssembleWord,
  fallback: Fallback,
};
