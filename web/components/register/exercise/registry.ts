import type { ComponentType } from "react";
import type { DiagnosticForm, DiagnosticTask } from "@/lib/diagnostic-tasks";
import type { ExerciseProps } from "@/components/register/exercise/types";
import AudioChoice from "@/components/register/exercise/renderers/AudioChoice";
import ImageMatch from "@/components/register/exercise/renderers/ImageMatch";
import FillLetterTiles from "@/components/register/exercise/renderers/FillLetterTiles";
import PunctuationChoice from "@/components/register/exercise/renderers/PunctuationChoice";
import PlaceToken from "@/components/register/exercise/renderers/PlaceToken";
import MatchPairs from "@/components/register/exercise/renderers/MatchPairs";
import AssembleWord from "@/components/register/exercise/renderers/AssembleWord";
import SentenceCapital from "@/components/register/exercise/renderers/SentenceCapital";

type RendererFor<F extends DiagnosticForm> = ComponentType<ExerciseProps<Extract<DiagnosticTask, { form: F }>>>;

/**
 * Which component draws which exercise — the web counterpart of
 * mobile/src/features/exercise/registry.ts, and the reason adding a tenth
 * exercise is a new key here rather than a new branch in a screen.
 * mobile/AGENTS.md §3.1 puts it plainly: a `switch (task_type)` inside a screen
 * "belongs in the registry".
 *
 * Nine keys, seven components: exercises 1, 2, 4 and 9 are the same
 * single-select interaction over different media (see ChoiceExercise), and 5
 * and 6 are the same placement with a different mark (see PlaceToken).
 *
 * The map is exhaustive over DiagnosticForm, so a form added to
 * lib/diagnostic-tasks.ts without a renderer is a type error, not a runtime
 * fallback.
 */
export const registry: { readonly [F in DiagnosticForm]: RendererFor<F> } = {
  audio_choice: AudioChoice,
  image_match: ImageMatch,
  fill_letter_tiles: FillLetterTiles,
  punctuation_choice: PunctuationChoice,
  punctuation_place: PlaceToken,
  comma_place: PlaceToken,
  match_pairs: MatchPairs,
  assemble_word: AssembleWord,
  sentence_capital: SentenceCapital,
};
