import { ScrollView, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterTileBar from '@/src/features/exercise/components/LetterTileBar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import WordWithBlanks from '@/src/features/exercise/components/WordWithBlanks';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useFillTiles } from '@/src/features/exercise/hooks/useFillTiles';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { CHARACTER_PRESS_SCALE } from '@/src/theme/motion';

/**
 * Audio fill-the-letters task (TT_2_4, "Үгийг сонсоод дутуу үсгийг нөхөх"): the child
 * hears the word (tap the character to replay) and taps letters from a bank into the
 * word's blanks — the audio sibling of FillLetterTiles (TT_2_1), which shows a picture
 * instead. Reuses CharacterAvatar + AudioControls from AudioSpelling for the listening
 * half, and WordWithBlanks/LetterTileBar/useFillTiles from FillLetterTiles for the rest.
 */
export default function AudioFillLetterTiles({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  const ex = useFillTiles(task, onResult);

  const { player, status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url);

  const displayText = task.options.display_text ?? task.prompt_text;

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 16, align: 'center' })}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          onPress={handleToggleAudio}
          pressScale={CHARACTER_PRESS_SCALE}
          accessibilityRole="button"
          accessibilityLabel="Сонсох / зогсоох"
        >
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </PressableScale>

        <AudioControls player={player} />

        <WordWithBlanks text={displayText} filled={ex.placed} />

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <LetterTileBar
        tiles={ex.tiles}
        usedTiles={ex.usedTiles}
        isAnswered={ex.isAnswered}
        onSelect={ex.place}
        onBackspace={ex.removeLast}
      />

      <SubmitButton onPress={ex.submit} disabled={!ex.canSubmit} />
    </View>
  );
}
