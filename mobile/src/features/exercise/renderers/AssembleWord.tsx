import { Image } from 'expo-image';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterPool from '@/src/features/exercise/components/LetterPool';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import WordSlots from '@/src/features/exercise/components/WordSlots';
import { useAssembleWord } from '@/src/features/exercise/hooks/useAssembleWord';
import { useAudioFinishedLatch, useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const PROMPT_FALLBACK = 'Үсгүүдийг зөв дараалалд оруулж үг бүтээгээрэй.';

/**
 * Assemble-the-word task (TT_1_4 / TT_2_2, interaction_form `assemble_word`): the child
 * taps scrambled letter tiles to fill the answer slots in order — a "typing" feel with
 * no drag-and-drop. Tapping a filled slot clears it. Grading and state live in
 * useAssembleWord; this owns layout + the audio-driven sprout, mirroring FillBlank.
 */
export default function AssembleWord({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(72, Math.min(width * 0.22, height * 0.12, 96));

  const ex = useAssembleWord(task, onResult);

  // Let the prompt END so the sprout can settle into its "done" pose (see FillBlank).
  const { status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });
  const hasFinished = useAudioFinishedLatch(status);
  const sproutState: SproutState = hasFinished ? 'done' : status.playing ? 'playing' : 'idle';

  const promptText = task.prompt_text?.trim() ? task.prompt_text : PROMPT_FALLBACK;
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
        {/* Prompt bubble + the sprout, whose speaker replays the prompt audio. */}
        <PressableScale
          style={styles.header}
          onPress={handleToggleAudio}
          accessibilityRole="button"
          accessibilityLabel="Сонсох"
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{promptText}</Text>
          </View>
          <View style={styles.characterCluster}>
            <SpeakerButton playing={status.playing} onPress={handleToggleAudio} size={40} />
            <SproutAvatar state={sproutState} width={avatarWidth} />
          </View>
        </PressableScale>

        {/* The picture of the target word. */}
        {task.image_url ? (
          <View style={styles.imageCard}>
            <Image source={task.image_url} style={styles.image} contentFit="cover" />
          </View>
        ) : null}

        {/* Answer slots (tap a filled slot to clear it). */}
        <WordSlots letters={slotLetters} onClearSlot={ex.clearSlot} isAnswered={ex.isAnswered} />

        {/* The scrambled letter pool. */}
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#E5F2FF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 19,
    lineHeight: 24,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.038,
  },
  characterCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  imageCard: {
    width: 140,
    height: 140,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: '#A8BDE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
