import type { ComponentType } from 'react';

import AssembleWord from '@/src/features/exercise/renderers/AssembleWord';
import AudioChoice from '@/src/features/exercise/renderers/AudioChoice';
import AudioSpelling from '@/src/features/exercise/renderers/AudioSpelling';
import CommaPlace from '@/src/features/exercise/renderers/CommaPlace';
import Correction from '@/src/features/exercise/renderers/Correction';
import CopyText from '@/src/features/exercise/renderers/CopyText';
import Dictation from '@/src/features/exercise/renderers/Dictation';
import Fallback from '@/src/features/exercise/renderers/Fallback';
import FillBlank from '@/src/features/exercise/renderers/FillBlank';
import FillLetter from '@/src/features/exercise/renderers/FillLetter';
import FillLetterTiles from '@/src/features/exercise/renderers/FillLetterTiles';
import ImageMatch from '@/src/features/exercise/renderers/ImageMatch';
import LetterChoice from '@/src/features/exercise/renderers/LetterChoice';
import MatchPairs from '@/src/features/exercise/renderers/MatchPairs';
import MiniText from '@/src/features/exercise/renderers/MiniText';
import MultipleChoice from '@/src/features/exercise/renderers/MultipleChoice';
import PunctuationPlace from '@/src/features/exercise/renderers/PunctuationPlace';
import SelfCheck from '@/src/features/exercise/renderers/SelfCheck';
import SentenceCapital from '@/src/features/exercise/renderers/SentenceCapital';
import SentenceFill from '@/src/features/exercise/renderers/SentenceFill';
import SentencePunctuation from '@/src/features/exercise/renderers/SentencePunctuation';
import TapFindError from '@/src/features/exercise/renderers/TapFindError';
import VisualMemory from '@/src/features/exercise/renderers/VisualMemory';
import type { Task } from '@/src/features/exercise/types';

export interface ExerciseRendererProps {
  task: Task;
  /** isCorrect drives local feedback; inputText is the learner's real answer
   *  (choice text, typed text, or a JSON/index encoding for structured answers —
   *  see each hook) and is what the screen submits to the backend for grading
   *  and error classification. */
  onResult: (isCorrect: boolean, inputText: string) => void;
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
  fill_letter: FillLetter,
  fill_letter_tiles: FillLetterTiles,
  correction: Correction,
  sentence_fill: SentenceFill,
  dictation: Dictation,
  mini_text: MiniText,
  tap_find_error: TapFindError,
  visual_memory: VisualMemory,
  copy_text: CopyText,
  self_check: SelfCheck,
  fallback: Fallback,
};
