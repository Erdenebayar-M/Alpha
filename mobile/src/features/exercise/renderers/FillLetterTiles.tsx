import { Image } from 'expo-image';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import BuddyPrompt from '@/src/features/exercise/components/BuddyPrompt';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterTileBar from '@/src/features/exercise/components/LetterTileBar';
import { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import WordWithBlanks from '@/src/features/exercise/components/WordWithBlanks';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useFillTiles } from '@/src/features/exercise/hooks/useFillTiles';
import { useAudioFinishedLatch, useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';

const BUBBLE_LABEL = 'Дутуу үсгийг нөхөөрэй';

/**
 * Picture fill-the-letters task (TT_2_1, "Зураг харж дутуу үсэг нөхөх"): the child sees
 * a picture beside its word with several letters missing, and taps letters from the bank
 * to fill the blanks left to right — backspace pulls the last one back. The multi-blank
 * sibling of FillBlank: same character/bubble/word/bank layout, but the bank is the
 * shuffled letters of `blank_answer` and each placed tile is consumed rather than
 * highlighted. State and grading live in useFillTiles; this owns layout only.
 */
export default function FillLetterTiles({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(88, Math.min(width * 0.26, height * 0.14, 120));
  const pictureSize = Math.max(80, Math.min(width * 0.26, height * 0.14, 103));

  const ex = useFillTiles(task, onResult);

  // Let the prompt END so the sprout can settle into pose 3 (see FillBlank).
  const { status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });
  const hasFinished = useAudioFinishedLatch(status);
  const sproutState: SproutState = hasFinished ? 'done' : status.playing ? 'playing' : 'idle';

  const displayText = task.options.display_text ?? task.prompt_text;

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 16, align: 'center' })}
        showsVerticalScrollIndicator={false}
      >
        <BuddyPrompt variant="sprout" label={BUBBLE_LABEL} sproutState={sproutState} onPress={handleToggleAudio} width={avatarWidth} />

        <View style={styles.divider} />

        {/* The picture beside its word, blanks and all. */}
        <View style={styles.wordRow}>
          {task.image_url ? (
            <Image
              source={task.image_url}
              style={[
                styles.wordImage,
                { width: pictureSize, height: pictureSize, borderRadius: pictureSize / 2 },
              ]}
              contentFit="contain"
            />
          ) : null}
          <WordWithBlanks text={displayText} filled={ex.placed} />
        </View>

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

const styles = StyleSheet.create({
  divider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: colors.divider,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  wordImage: {
    backgroundColor: colors.white,
  },
});
