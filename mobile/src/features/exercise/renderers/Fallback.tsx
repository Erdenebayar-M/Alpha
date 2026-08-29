import { StyleSheet, Text, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Reached when a task's task_type has no entry in taskTypeMap (should not
// happen — all 43 backend codes are mapped — but a renderer error also lands
// here via ExerciseEngine's RendererBoundary). Must always be able to
// advance: a lesson/diagnostic that gets stuck here is stuck for good.
export default function Fallback({ task, onResult }: ExerciseRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Энэ дасгалыг одоогоор дэмжихгүй байна</Text>
      {task?.prompt_text ? <Text style={styles.prompt}>{task.prompt_text}</Text> : null}
      <PressableScale
        style={styles.skip}
        onPress={() => onResult(false, '')}
        accessibilityRole="button"
        accessibilityLabel="Алгасах"
      >
        <Text style={styles.skipText}>Алгасах</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  prompt: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.textPrompt,
    textAlign: 'center',
  },
  skip: {
    minHeight: 64,
    minWidth: 200,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlue,
  },
  skipText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
});
