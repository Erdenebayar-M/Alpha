import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterPool from '@/src/features/exercise/components/LetterPool';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import WordSlots from '@/src/features/exercise/components/WordSlots';
import { useAssembleWord } from '@/src/features/exercise/hooks/useAssembleWord';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';

/**
 * Audio assemble-the-word task (TT_2_2, interaction_form `audio_assemble_word`): the
 * audio sibling of AssembleWord (TT_1_4) — the child hears the word (tap the character
 * to replay) and taps scrambled letter tiles into a row of dashed slots, in order. Reuses
 * CharacterAvatar + AudioControls from AudioFillLetterTiles for the listening half, and
 * WordSlots/LetterPool/useAssembleWord from AssembleWord for the rest. No prompt bubble
 * and no picture card — this frame has neither.
 */
export default function AudioAssembleWord({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  const ex = useAssembleWord(task, onResult);

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

  const slotLetters = useMemo(
    () => ex.slots.map((tileIndex) => (tileIndex === null ? null : ex.tiles[tileIndex])),
    [ex.slots, ex.tiles]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={handleToggleAudio} accessibilityRole="button" accessibilityLabel="Сонсох / зогсоох">
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </Pressable>

        <AudioControls player={player} />

        <WordSlots letters={slotLetters} onClearSlot={ex.clearSlot} isAnswered={ex.isAnswered} />

        <LetterPool
          tiles={ex.tiles}
          usedTiles={ex.usedTiles}
          onSelect={ex.place}
          isAnswered={ex.isAnswered}
        />

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

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
