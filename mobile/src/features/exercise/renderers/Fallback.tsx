import { StyleSheet, Text, View } from 'react-native';

import type { ExerciseRendererProps } from '@/src/features/exercise/registry';

export default function Fallback({ task }: ExerciseRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>I don&apos;t know this task type yet</Text>
      <Text style={styles.prompt}>{task?.prompt_text ?? ''}</Text>
      <Text style={styles.answer}>Correct answer: {task?.correct_answer ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  prompt: {
    fontSize: 18,
    fontWeight: '600',
  },
  answer: {
    fontSize: 16,
    color: '#4b5563',
  },
});
