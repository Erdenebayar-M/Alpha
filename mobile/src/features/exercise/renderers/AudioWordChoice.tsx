import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';

/**
 * Audio similar-word choice task (TT_1_5, "төстэй сонсогддог үгийг ялгах"): the
 * child hears a word (tap the character to replay) and picks the correctly spelled
 * word from a row of look-alikes, then confirms with the arrow button. Sibling of
 * AudioFillLetterTiles (TT_2_4) for the listening half — CharacterAvatar +
 * AudioControls — and of FillLetterTiles for the select-then-submit flow, here via
 * useChoiceExercise + ChoiceGrid instead of letter tiles.
 */
export default function AudioWordChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the character off both axes so it never crowds a short screen (e.g. SE).
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  const ex = useChoiceExercise(task, onResult);

  const player = useAudioPlayer(task.prompt_audio_url ?? task.audio_url);
  const status = useAudioPlayerStatus(player);

  // Loop the prompt so it keeps playing while the child adjusts volume/speed.
  useEffect(() => {
    try {
      player.loop = true;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  const handleToggleAudio = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
        singleRow
      />

      <SubmitButton onPress={ex.submit} disabled={!ex.canSubmit} />
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
    gap: 16,
  },
});
