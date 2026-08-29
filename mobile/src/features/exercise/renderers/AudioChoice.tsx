import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function AudioChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the character off both axes so it never crowds a short screen (e.g. SE).
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  // Picking a choice submits immediately (no submit button on this screen).
  const ex = useChoiceExercise(task, onResult, { autoSubmit: true });
  const { player, status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <PressableScale onPress={handleToggleAudio} accessibilityRole="button" accessibilityLabel="Сонсох / зогсоох">
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </PressableScale>

        <AudioControls player={player} />

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <ChoiceGrid
        choices={ex.choices}
        selectedIndex={ex.selectedIndex}
        isAnswered={ex.isAnswered}
        onSelect={ex.select}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    gap: 10,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
  },
});
