import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import PressableScale from '@/src/components/PressableScale';
import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import SpeakerButton from '@/src/features/exercise/components/SpeakerButton';
import SubmitButton from '@/src/features/exercise/components/SubmitButton';
import TalkingBuddy from '@/src/features/exercise/components/TalkingBuddy';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// The buddy asks the same question on every sentence-capital task; the fill-in
// sentence itself lives in prompt_text (with the "_" blank), mirroring FillBlank.
const BUBBLE_LABEL = 'Өгүүлбэр юугаар эхлэх вэ?';

/**
 * "Sentence starts with a capital letter" task ("Өгүүлбэр том үсгээр эхлэх дасгал"):
 * a sentence has a blank where its first word belongs. The child picks the correctly
 * CASED form of the word (e.g. зуны / Зуны / ЗУНЫ) — tapping a chip flies it into the
 * blank and removes it from the row; tapping the filled blank sends it back. Naran the
 * yellow buddy reads the prompt aloud when the speaker is tapped and "talks" while it
 * plays. Built on the shared choice hook, so scoring/feedback come for free.
 */
export default function SentenceCapital({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const buddyWidth = Math.max(84, Math.min(width * 0.24, 108));
  const compact = height < 720;

  const ex = useChoiceExercise(task, onResult);

  const { status, toggle: handlePlay } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });

  // Split the prompt on the "_" blank marker (AGENTS §5), tolerating a run of
  // underscores ("____ өдөр сайхан." → prefix "" / suffix " өдөр сайхан."). A cheap
  // regex match on a short string — not worth manual memoization.
  const blankMatch = task.prompt_text.match(/_+/);
  const [prefix, suffix] =
    !blankMatch || blankMatch.index === undefined
      ? [task.prompt_text, '']
      : [task.prompt_text.slice(0, blankMatch.index), task.prompt_text.slice(blankMatch.index + blankMatch[0].length)];

  const filled = ex.selectedChoice?.text ?? null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
      >
        {/* Naran + speech bubble; tapping either plays the prompt audio. */}
        <PressableScale
          style={styles.questionRow}
          onPress={handlePlay}
          accessibilityRole="button"
          accessibilityLabel="Сонсох"
        >
          <TalkingBuddy playing={status.playing} width={buddyWidth} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{BUBBLE_LABEL}</Text>
            <View style={styles.bubbleTail} />
            <View style={styles.speakerBadge}>
              <SpeakerButton playing={status.playing} onPress={handlePlay} size={40} />
            </View>
          </View>
        </PressableScale>

        {/* White card: picture on top, sentence with the fillable word slot below. */}
        <View style={styles.card}>
          {task.image_url ? (
            <Image source={task.image_url} style={styles.cardImage} contentFit="contain" transition={200} />
          ) : null}
          <View style={styles.sentence}>
            {prefix ? <Text style={styles.sentenceText}>{prefix}</Text> : null}
            {filled ? (
              <Animated.View key="filled" entering={ZoomIn.duration(220)}>
                <PressableScale
                  onPress={ex.clear}
                  disabled={ex.isAnswered}
                  style={styles.slotPill}
                  accessibilityRole="button"
                  accessibilityLabel={`${filled} — буцаах`}
                >
                  <Text style={styles.slotPillText}>{filled}</Text>
                </PressableScale>
              </Animated.View>
            ) : (
              <View style={styles.slotEmpty}>
                <Text style={styles.slotEmptyText}>_____</Text>
              </View>
            )}
            <Text style={styles.sentenceText}>{suffix}</Text>
          </View>
        </View>

        {/* Word chips (shared ChoiceGrid): the chosen one leaves the row (hiddenIndex)
            because it has "flown" into the blank above. */}
        <ChoiceGrid
          choices={ex.choices}
          selectedIndex={ex.selectedIndex}
          isAnswered={ex.isAnswered}
          onSelect={ex.select}
          singleRow
          hiddenIndex={ex.selectedIndex}
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
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 22,
  },
  contentCompact: {
    gap: 14,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#E5F2FF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 96,
    justifyContent: 'center',
  },
  bubbleText: {
    fontFamily: fonts.black,
    fontSize: 18,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.036,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    bottom: 22,
    width: 12,
    height: 12,
    backgroundColor: '#E5F2FF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  speakerBadge: {
    position: 'absolute',
    left: -14,
    top: -12,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#A8BDE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  cardImage: {
    width: 108,
    height: 76,
  },
  sentence: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sentenceText: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    color: colors.textChoice,
    letterSpacing: -0.052,
  },
  slotEmpty: {
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  slotEmptyText: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    color: colors.textChoice,
    letterSpacing: -0.052,
  },
  slotPill: {
    backgroundColor: colors.choiceSelectedBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 4,
    shadowColor: '#4F7DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  slotPillText: {
    fontFamily: fonts.black,
    fontSize: 24,
    color: colors.white,
    letterSpacing: -0.048,
  },
});
