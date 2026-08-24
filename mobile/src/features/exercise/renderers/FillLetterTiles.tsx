import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import LetterTileBar from '@/src/features/exercise/components/LetterTileBar';
import SproutAvatar, { type SproutState } from '@/src/features/exercise/components/SproutAvatar';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import WordWithBlanks from '@/src/features/exercise/components/WordWithBlanks';
import { VOLUME_HIGH_SVG } from '@/src/features/exercise/components/volumeIcons';
import { useFillTiles } from '@/src/features/exercise/hooks/useFillTiles';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const BUBBLE_LABEL = 'Үгийг нөхөөрэй';

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

  const [hasFinished, setHasFinished] = useState(false);
  const ex = useFillTiles(task, onResult);

  const player = useAudioPlayer(task.prompt_audio_url ?? task.audio_url);
  const status = useAudioPlayerStatus(player);

  // Let the prompt END so the sprout can settle into pose 3 (see FillBlank).
  useEffect(() => {
    try {
      player.loop = false;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

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

  const displayText = task.options.display_text ?? task.prompt_text;

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

        <View style={styles.divider} />

        {/* The picture beside its word, blanks and all. */}
        <View style={styles.wordRow}>
          {task.image_url ? (
            <Image source={task.image_url} style={styles.wordImage} contentFit="contain" />
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
  divider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: colors.divider,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordImage: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
});
