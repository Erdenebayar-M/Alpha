import { Text } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import TextEntryScreen from '@/src/features/exercise/components/TextEntryScreen';
import { exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { CHARACTER_PRESS_SCALE } from '@/src/theme/motion';

/**
 * Mini-text dictation task (miniTextOptions: TT_7_6): a short (2–5 sentence) audio
 * passage; the child hears it (tap the character to replay) and types it all out.
 * The backend splits input_text on sentence-ending punctuation and grades each
 * sentence against `expected_answers`; local feedback compares the joined answer.
 */
export default function MiniText({ task, onResult }: ExerciseRendererProps) {
  const expectedAnswers = task.options.expected_answers;
  const compareTo = expectedAnswers?.join(' ') ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo });

  const audioUrl = task.prompt_audio_url ?? task.audio_url;
  const { player, status, toggle: handleToggleAudio } = useTaskAudio(audioUrl);

  return (
    <TextEntryScreen
      gap={10}
      value={ex.value}
      onChangeText={ex.setValue}
      onSubmit={ex.submit}
      disabled={ex.isAnswered}
      state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
      feedback={ex.feedback}
    >
      <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

      <PressableScale
        onPress={handleToggleAudio}
        pressScale={CHARACTER_PRESS_SCALE}
        accessibilityRole="button"
        accessibilityLabel="Сонсох / зогсоох"
      >
        <CharacterAvatar playing={status.playing} width={150} />
      </PressableScale>

      <AudioControls player={player} />
    </TextEntryScreen>
  );
}
