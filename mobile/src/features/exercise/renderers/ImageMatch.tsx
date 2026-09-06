import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';

/**
 * Image + multiple-choice ("Зөв бичсэн үгийг олоорой"): show a picture of the
 * word, the child picks the correctly-spelled variant. Reuses ChoiceGrid so the
 * bottom sheet is identical to the other choice-based screens.
 */
export default function ImageMatch({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the picture off both axes so it never crowds a short screen (e.g. SE).
  const cardSize = Math.max(160, Math.min(width * 0.56, height * 0.28, 240));

  // Picking a choice submits immediately (no submit button on this screen).
  const ex = useChoiceExercise(task, onResult, { autoSubmit: true });

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 10, align: 'center' })}
        showsVerticalScrollIndicator={false}
      >
        <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

        <View style={[styles.card, { width: cardSize, height: cardSize, borderRadius: cardSize * 0.3 }]}>
          {task.image_url ? (
            <Image source={{ uri: task.image_url }} style={styles.image} contentFit="cover" transition={200} />
          ) : null}
        </View>

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <ChoiceGrid
        choices={ex.choices}
        selectedIndex={ex.selectedIndex}
        isAnswered={ex.isAnswered}
        onSelect={ex.select}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#A8BDE3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
