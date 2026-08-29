import { Image } from 'expo-image';
import { useMemo } from 'react';
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

// The buddy asks the same question on every punctuation task; the sentence needing
// its end mark lives in prompt_text (with the "_" blank), mirroring SentenceCapital.
const BUBBLE_LABEL = 'Зөв тэмдэг аль нь вэ? Сонгоорой';

/**
 * "Place the correct punctuation mark" task ("Зөв тэмдэг тавих"): a sentence is missing
 * its final mark, and the child picks the right one (. / ? / !). Unlike SentenceCapital,
 * the chosen chip STAYS in the row (it just highlights) — it does not fly into the blank;
 * the end-of-sentence slot merely MIRRORS the selection. Naran the yellow buddy reads the
 * prompt aloud when the speaker is tapped and "talks" while it plays. Built on the shared
 * choice hook, so scoring/feedback come for free.
 */
export default function SentencePunctuation({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  const buddyWidth = Math.max(84, Math.min(width * 0.24, 108));
  const compact = height < 720;

  const ex = useChoiceExercise(task, onResult);

  const { status, toggle: handlePlay } = useTaskAudio(task.prompt_audio_url ?? task.audio_url, {
    loop: false,
    replayFromStart: true,
  });

  // Split the prompt on the "_" blank marker (AGENTS §5). The mark sits at the end here
  // ("Хүүхэд хаашаа явж байна_" → prefix "Хүүхэд хаашаа явж байна" / suffix "").
  const [prefix, suffix] = useMemo(() => {
    const m = task.prompt_text.match(/_+/);
    if (!m || m.index === undefined) return [task.prompt_text, ''];
    return [task.prompt_text.slice(0, m.index), task.prompt_text.slice(m.index + m[0].length)];
  }, [task.prompt_text]);

  const filled = ex.selectedChoice?.text ?? null;

  // Keep the mark slot glued to the LAST word of the sentence so it never wraps onto its
  // own line and read as a separate element — the symbol should sit right at the sentence's
  // end. Split the prefix into everything-but-the-last-word + the last word.
  const [head, lastWord] = useMemo(() => {
    const trimmed = prefix.replace(/\s+$/, '');
    const i = trimmed.lastIndexOf(' ');
    return i >= 0 ? [trimmed.slice(0, i + 1), trimmed.slice(i + 1)] : ['', trimmed];
  }, [prefix]);

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

        {/* White card: picture on top, sentence with the end-mark slot below. */}
        <View style={styles.card}>
          {task.image_url ? (
            <Image source={task.image_url} style={styles.cardImage} contentFit="contain" transition={200} />
          ) : null}
          <View style={styles.sentence}>
            {head ? <Text style={styles.sentenceText}>{head}</Text> : null}
            {/* Last word + mark slot stay together on one line so the slot always hugs the
                end of the sentence instead of drifting off as a separate box. */}
            <View style={styles.wordSlot}>
              <Text style={styles.sentenceText}>{lastWord}</Text>
              <View style={styles.slot}>
                {filled ? (
                  <Animated.Text key={filled} entering={ZoomIn.duration(220)} style={styles.slotText}>
                    {filled}
                  </Animated.Text>
                ) : null}
              </View>
            </View>
            {suffix ? <Text style={styles.sentenceText}>{suffix}</Text> : null}
          </View>
        </View>

        {/* Symbol chips (shared ChoiceGrid). The chosen chip stays in the row and just
            highlights — no hiddenIndex — because it does NOT move into the blank. */}
        <ChoiceGrid
          choices={ex.choices}
          selectedIndex={ex.selectedIndex}
          isAnswered={ex.isAnswered}
          onSelect={ex.select}
          singleRow
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
    width: 84,
    height: 80,
  },
  sentence: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sentenceText: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    color: colors.textChoice,
    letterSpacing: -0.052,
  },
  // The last word and its mark slot ride together (no wrap between them) so the slot always
  // sits right at the end of the sentence.
  wordSlot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  // The end-of-sentence mark slot: a small white box with a blue underline, tucked directly
  // behind the last word. Empty until a symbol is chosen, then it mirrors the selected chip.
  slot: {
    minWidth: 26,
    minHeight: 34,
    marginLeft: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryBlue,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#283C64',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  slotText: {
    fontFamily: fonts.black,
    fontSize: 26,
    color: colors.textChoice,
    letterSpacing: -0.052,
  },
});
