import { Text, StyleSheet, View } from 'react-native';

import TextEntryScreen from '@/src/features/exercise/components/TextEntryScreen';
import { exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

/**
 * Sentence-fill task (sentenceFillOptions: TT_5_2/7_5): a full sentence is shown with
 * a "_" gap; the child types just the missing word, graded against `blank_answer`
 * (the backend checks only that single word, not the whole sentence).
 */
export default function SentenceFill({ task, onResult }: ExerciseRendererProps) {
  const sentenceTemplate = task.options.sentence_template ?? task.prompt_text;
  const blankAnswer = task.options.blank_answer ?? task.correct_answer;
  const hint = task.options.hint;

  const ex = useTextEntryExercise(task, onResult, { compareTo: blankAnswer });

  // A cheap indexOf+slice on a short string — not worth manual memoization.
  const blankIdx = sentenceTemplate.indexOf('_');
  const [prefix, suffix] =
    blankIdx === -1
      ? [sentenceTemplate, '']
      : [sentenceTemplate.slice(0, blankIdx), sentenceTemplate.slice(blankIdx + 1)];

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
        <Text style={styles.sentence}>
          {prefix}
          <Text style={[styles.blank, ex.value ? styles.blankFilled : null]}> {ex.value || '____'} </Text>
          {suffix}
        </Text>
      </View>

      {hint ? <Text style={styles.hint}>💡 {hint}</Text> : null}
    </TextEntryScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    ...shadows.card,
  },
  sentence: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.textChoice,
    letterSpacing: -0.032,
    textAlign: 'center',
    lineHeight: 32,
  },
  blank: {
    fontFamily: fonts.black,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  blankFilled: {
    color: colors.choiceSelectedBorder,
  },
  hint: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
