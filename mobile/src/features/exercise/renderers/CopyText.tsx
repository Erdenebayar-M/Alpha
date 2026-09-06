import { Text, StyleSheet, View } from 'react-native';

import TextEntryScreen from '@/src/features/exercise/components/TextEntryScreen';
import { exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { shadows } from '@/src/theme/shadows';
import { fonts } from '@/src/theme/typography';

/**
 * Copy-the-text task (copyOptions: TT_7_1): the text to copy stays visible the whole
 * time; the child retypes it below. Graded (backend) with a sentence-aware diff
 * against `correct_answer`.
 */
export default function CopyText({ task, onResult }: ExerciseRendererProps) {
  const textToCopy = task.options.text_to_copy ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo: task.correct_answer });

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
        <Text style={styles.copyText}>{textToCopy}</Text>
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
    paddingVertical: 24,
    ...shadows.card,
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
