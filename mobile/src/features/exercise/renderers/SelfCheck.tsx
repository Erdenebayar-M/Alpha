import { Text, StyleSheet, View } from 'react-native';

import TextEntryScreen from '@/src/features/exercise/components/TextEntryScreen';
import { exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

/**
 * Self-check task (selfCheckOptions: TT_8_4): the child's own earlier attempt is
 * shown next to the model answer so they can compare, then they type a corrected
 * version. Graded (backend) with a sentence-aware diff against `model_answer`.
 * `comparison_mode` (side_by_side vs highlight_diff) only changes emphasis in the
 * full design system — the simplest version always shows both texts plainly.
 */
export default function SelfCheck({ task, onResult }: ExerciseRendererProps) {
  const originalAttempt = task.options.original_attempt ?? '';
  const modelAnswer = task.options.model_answer ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo: modelAnswer });

  return (
    <TextEntryScreen
      gap={12}
      justify="center"
      value={ex.value}
      onChangeText={ex.setValue}
      onSubmit={ex.submit}
      disabled={ex.isAnswered}
      state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
      feedback={ex.feedback}
    >
      <Text style={[exerciseStyles.prompt, styles.prompt]}>{task.prompt_text}</Text>

      {[
        { label: 'Таны бичсэн', text: originalAttempt, textStyle: styles.cardText },
        { label: 'Зөв хариулт', text: modelAnswer, textStyle: [styles.cardText, styles.modelText] },
      ].map((card, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardLabel}>{card.label}</Text>
          <Text style={card.textStyle}>{card.text}</Text>
        </View>
      ))}
    </TextEntryScreen>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginBottom: 4,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
    ...shadows.card,
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
