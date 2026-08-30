import { useEffect, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Fill-the-blank task (fillOptions: TT_2_1/2_4/3_2/4_3/4_4/5_5): the word/phrase is
 * shown with a "_" gap; the child types just the missing letter(s) into the answer
 * sheet. The backend grades the typed fill against `blank_answer` directly (not the
 * reconstructed word), so input_text carries the raw typed value.
 */
export default function FillLetter({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const displayText = task.options.display_text ?? task.prompt_text;
  const blankAnswer = task.options.blank_answer ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo: blankAnswer });

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  // Split the display text on the "_" blank marker: "н_м" -> "н" / "м". A cheap
  // indexOf+slice on a short string — not worth manual memoization.
  const blankIdx = displayText.indexOf('_');
  const [prefix, suffix] =
    blankIdx === -1 ? [displayText, ''] : [displayText.slice(0, blankIdx), displayText.slice(blankIdx + 1)];

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

        <View style={styles.word}>
          <Text style={styles.wordText}>{prefix}</Text>
          <View style={[styles.slot, ex.value ? styles.slotFilled : null]}>
            <Text style={styles.slotText}>{ex.value}</Text>
          </View>
          <Text style={styles.wordText}>{suffix}</Text>
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
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    gap: 16,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
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
    minWidth: 40,
    height: 44,
    marginHorizontal: 3,
    paddingHorizontal: 6,
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
