import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterTileBar from '@/src/features/exercise/components/LetterTileBar';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import { VOLUME_HIGH_SVG } from '@/src/features/exercise/components/volumeIcons';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const BUBBLE_LABEL = 'Үгийг нөхөөрэй';

/**
 * Fill-in-the-blank letter task ("Үгийг нөхөөрэй"): the child hears the word, taps
 * a letter tile to fill the blank slot in the word, then submits with the arrow.
 * The Sprout character animates through three poses driven by the audio lifecycle —
 * idle on load, "playing" while the prompt audio plays, "done" once it finishes.
 */
export default function FillBlank({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const avatarWidth = Math.max(88, Math.min(width * 0.26, height * 0.14, 120));

  const [hasFinished, setHasFinished] = useState(false);
  const ex = useChoiceExercise(task, onResult, { feedbackDelayMs: 1200 });

  const player = useAudioPlayer(task.prompt_audio_url);
  const status = useAudioPlayerStatus(player);

  // Unlike the looped audio screens, we need the prompt to END so the character can
  // settle into pose 3 — so looping is off and we watch didJustFinish.
  useEffect(() => {
    try {
      player.loop = false;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  // Latch "finished" when playback completes; clear it whenever it starts again so a
  // replay runs pose 2 -> pose 3 afresh.
  useEffect(() => {
    if (status.didJustFinish) setHasFinished(true);
  }, [status.didJustFinish]);
  useEffect(() => {
    if (status.playing) setHasFinished(false);
  }, [status.playing]);

  const sproutState: SproutState = hasFinished ? 'done' : status.playing ? 'playing' : 'idle';

  const handleToggleAudio = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        // Replay from the start each time the bubble is tapped.
        player.seekTo(0);
        player.play();
      }
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  // Split the prompt on the "_" blank marker (AGENTS §5): "Эрвээх_й" -> "Эрвээх" / "й".
  const [prefix, suffix] = useMemo(() => {
    const idx = task.prompt_text.indexOf('_');
    if (idx === -1) return [task.prompt_text, ''];
    return [task.prompt_text.slice(0, idx), task.prompt_text.slice(idx + 1)];
  }, [task.prompt_text]);

  const filledLetter = ex.selectedChoice ? ex.selectedChoice.text.toLowerCase() : '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Character + speech bubble; tapping either plays the prompt audio. */}
        <Pressable
          style={styles.characterRow}
          onPress={handleToggleAudio}
          accessibilityRole="button"
          accessibilityLabel="Сонсох"
        >
          <SproutAvatar state={sproutState} width={avatarWidth} />
          <View style={styles.bubble}>
            <SvgXml xml={VOLUME_HIGH_SVG.replace('__C__', colors.primaryBlue)} width={16} height={16} />
            <Text style={styles.bubbleText}>{BUBBLE_LABEL}</Text>
            <View style={styles.bubbleTail} />
          </View>
        </Pressable>

        {/* Word with the picture and the fillable blank slot. */}
        <View style={styles.wordRow}>
          {task.image_url ? (
            <Image source={task.image_url} style={styles.wordImage} contentFit="contain" />
          ) : null}
          <View style={styles.word}>
            <Text style={styles.wordText}>{prefix}</Text>
            <View style={[styles.slot, ex.selectedChoice ? styles.slotFilled : null]}>
              <Text style={styles.slotText}>{filledLetter}</Text>
            </View>
            <Text style={styles.wordText}>{suffix}</Text>
          </View>
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <LetterTileBar
        tiles={ex.choices}
        selectedIndex={ex.selectedIndex}
        isAnswered={ex.isAnswered}
        onSelect={ex.select}
        onBackspace={ex.clear}
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
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E5F2FF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    letterSpacing: -0.032,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: '#E5F2FF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  word: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.textChoice,
    letterSpacing: -0.064,
  },
  slot: {
    minWidth: 34,
    height: 40,
    marginHorizontal: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderBottomWidth: 3,
    borderBottomColor: '#DDE6F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#283C64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  slotFilled: {
    borderBottomColor: colors.choiceSelectedBorder,
  },
  slotText: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.textChoice,
    letterSpacing: -0.064,
  },
});
