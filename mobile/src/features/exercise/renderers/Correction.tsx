import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInput, View } from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Correction task (correctionOptions: TT_2_5/2_6/3_5/4_5/6_3/6_4/8_2): the child is
 * shown a sentence/word with a mistake (`incorrect_text`) and edits it into the
 * corrected form. The answer sheet starts pre-filled with the incorrect text so the
 * child edits rather than retypes from scratch; input_text carries whatever they end
 * up with, graded against `correct_text` (sentence-aware diff, backend-side).
 */
export default function Correction({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const incorrectText = task.options.incorrect_text ?? '';
  const correctText = task.options.correct_text ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, {
    compareTo: correctText,
    initialValue: incorrectText,
  });

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    Keyboard.dismiss();
    ex.submit();
  };

  return (
    <KeyboardAvoidingView style={exerciseStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 16, align: 'center' })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Засах өгүүлбэр</Text>
          <Text style={styles.cardText}>{incorrectText}</Text>
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
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
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
    fontSize: 22,
    color: colors.textChoice,
    letterSpacing: -0.032,
  },
});
