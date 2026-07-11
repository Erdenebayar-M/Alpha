import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInput, View } from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Self-check task (selfCheckOptions: TT_8_4): the child's own earlier attempt is
 * shown next to the model answer so they can compare, then they type a corrected
 * version. Graded (backend) with a sentence-aware diff against `model_answer`.
 * `comparison_mode` (side_by_side vs highlight_diff) only changes emphasis in the
 * full design system — the simplest version always shows both texts plainly.
 */
export default function SelfCheck({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const originalAttempt = task.options.original_attempt ?? '';
  const modelAnswer = task.options.model_answer ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo: modelAnswer });

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    Keyboard.dismiss();
    ex.submit();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Таны бичсэн</Text>
          <Text style={styles.cardText}>{originalAttempt}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Зөв хариулт</Text>
          <Text style={[styles.cardText, styles.modelText]}>{modelAnswer}</Text>
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <AnswerInput
        ref={inputRef}
        value={ex.value}
        onChangeText={ex.setValue}
        onSubmit={handleSubmit}
        disabled={ex.isAnswered}
        state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
      />
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
    marginBottom: 4,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  cardText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.textChoice,
    letterSpacing: -0.032,
  },
  modelText: {
    color: colors.choiceSelectedBorder,
  },
});
