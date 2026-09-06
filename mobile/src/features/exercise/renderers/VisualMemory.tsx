import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInput, View } from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Visual-memory task (visualMemoryOptions: TT_7_2): the text to memorize is shown
 * for `display_seconds` with a countdown, then hidden; the child types it from
 * memory. Graded (backend) with a sentence-aware diff against `correct_answer`.
 */
export default function VisualMemory({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const textToMemorize = task.options.text_to_memorize ?? task.correct_answer;
  const displaySeconds = task.options.display_seconds ?? 5;

  const [secondsLeft, setSecondsLeft] = useState(displaySeconds);
  // Derived, not independent state — recall starts the instant the countdown hits 0,
  // with no separate setState needed to make that transition.
  const phase: 'memorize' | 'recall' = secondsLeft <= 0 ? 'recall' : 'memorize';

  const ex = useTextEntryExercise(task, onResult, { compareTo: task.correct_answer });

  useEffect(() => {
    if (phase !== 'memorize') return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase !== 'recall') return;
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    ex.submit();
  };

  return (
    <KeyboardAvoidingView style={exerciseStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 20, align: 'center' })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

        {phase === 'memorize' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.memorizeText}>{textToMemorize}</Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{secondsLeft}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.hiddenCard}>
              <Text style={styles.hiddenText}>?</Text>
            </View>
            <FeedbackText>{ex.feedback}</FeedbackText>
          </>
        )}
      </ScrollView>

      {phase === 'recall' ? (
        <AnswerInput
          ref={inputRef}
          value={ex.value}
          onChangeText={ex.setValue}
          onSubmit={handleSubmit}
          disabled={ex.isAnswered}
          state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  memorizeText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.032,
    lineHeight: 34,
  },
  countdownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.progressTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontFamily: fonts.black,
    fontSize: 24,
    color: colors.progressText,
  },
  hiddenCard: {
    width: '100%',
    minHeight: 120,
    backgroundColor: colors.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  hiddenText: {
    fontFamily: fonts.black,
    fontSize: 40,
    color: colors.textMuted,
  },
});
