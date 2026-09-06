import { Text, StyleSheet, View } from 'react-native';

import TextEntryScreen from '@/src/features/exercise/components/TextEntryScreen';
import { exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

/**
 * Correction task (correctionOptions: TT_2_5/2_6/3_5/4_5/6_3/6_4/8_2): the child is
 * shown a sentence/word with a mistake (`incorrect_text`) and edits it into the
 * corrected form. The answer sheet starts pre-filled with the incorrect text so the
 * child edits rather than retypes from scratch; input_text carries whatever they end
 * up with, graded against `correct_text` (sentence-aware diff, backend-side).
 */
export default function Correction({ task, onResult }: ExerciseRendererProps) {
  const incorrectText = task.options.incorrect_text ?? '';
  const correctText = task.options.correct_text ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, {
    compareTo: correctText,
    initialValue: incorrectText,
  });

  return (
    <TextEntryScreen
      gap={16}
      value={ex.value}
      onChangeText={ex.setValue}
      onSubmit={ex.submit}
      disabled={ex.isAnswered}
      state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
      feedback={ex.feedback}
    >
      <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Засах өгүүлбэр</Text>
        <Text style={styles.cardText}>{incorrectText}</Text>
      </View>
    </TextEntryScreen>
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
    ...shadows.card,
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
