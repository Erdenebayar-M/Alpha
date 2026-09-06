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
 * Copy-the-text task (copyOptions: TT_7_1): the text to copy stays visible the whole
 * time; the child retypes it below. Graded (backend) with a sentence-aware diff
 * against `correct_answer`.
 */
export default function CopyText({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const textToCopy = task.options.text_to_copy ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo: task.correct_answer });

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
          <Text style={styles.copyText}>{textToCopy}</Text>
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
    paddingVertical: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  copyText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textChoice,
    textAlign: 'center',
    letterSpacing: -0.032,
    lineHeight: 34,
  },
});
