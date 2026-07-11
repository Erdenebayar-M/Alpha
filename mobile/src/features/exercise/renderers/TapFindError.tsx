import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const FEEDBACK_DELAY_MS = 1200;

/**
 * Tap-find-error task (tapFindErrorOptions: TT_8_1): a sentence is rendered as
 * tappable word chips; the child taps the word they think is wrong. Grading (local
 * and backend) is exact — the tapped word's 0-based index must equal
 * `error_word_index`; input_text carries that index as a string.
 */
export default function TapFindError({ task, onResult }: ExerciseRendererProps) {
  const sentence = task.options.sentence ?? task.prompt_text;
  const errorIndex = task.options.error_word_index ?? -1;
  const words = useMemo(() => sentence.split(/\s+/).filter(Boolean), [sentence]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleTap = (index: number) => {
    if (isAnswered) return;
    setSelectedIndex(index);
    setIsAnswered(true);
    const isCorrect = index === errorIndex;
    timerRef.current = setTimeout(() => onResult(isCorrect, String(index)), FEEDBACK_DELAY_MS);
  };

  const isCorrect = isAnswered && selectedIndex === errorIndex;
  const feedback = isAnswered
    ? ((isCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <View style={styles.card}>
          <View style={styles.wordWrap}>
            {words.map((word, i) => {
              const selected = selectedIndex === i;
              // Reveal the real error in place once a wrong tap has been made, so the
              // child sees where it actually was (gentle failure, not just "wrong").
              const revealCorrect = isAnswered && !isCorrect && i === errorIndex;
              return (
                <Pressable
                  key={`${word}-${i}`}
                  onPress={() => handleTap(i)}
                  disabled={isAnswered}
                  style={[
                    styles.chip,
                    selected && (isCorrect ? styles.chipCorrect : styles.chipWrong),
                    revealCorrect && styles.chipReveal,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{word}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FeedbackText>{feedback}</FeedbackText>
      </ScrollView>
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
    gap: 24,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    minHeight: 48,
    backgroundColor: colors.pastelBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCorrect: {
    backgroundColor: '#DCF7E3',
    borderColor: '#34C759',
  },
  chipWrong: {
    backgroundColor: '#FDF1F1',
    borderColor: '#F0B4B4',
  },
  chipReveal: {
    borderColor: '#34C759',
  },
  chipText: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    color: colors.textChoice,
    letterSpacing: -0.02,
  },
  chipTextSelected: {
    color: colors.textChoice,
  },
});
