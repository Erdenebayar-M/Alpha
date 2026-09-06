import { ScrollView, Text, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { CHARACTER_PRESS_SCALE } from '@/src/theme/motion';

export default function AudioChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the character off both axes so it never crowds a short screen (e.g. SE).
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  // Picking a choice submits immediately (no submit button on this screen).
  const ex = useChoiceExercise(task, onResult, { autoSubmit: true });
  const { player, status, toggle: handleToggleAudio } = useTaskAudio(task.prompt_audio_url ?? task.audio_url);

  return (
    <View style={exerciseStyles.container}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 10, align: 'center' })}
        showsVerticalScrollIndicator={false}
      >
        <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

        <PressableScale
          onPress={handleToggleAudio}
          pressScale={CHARACTER_PRESS_SCALE}
          accessibilityRole="button"
          accessibilityLabel="Сонсох / зогсоох"
        >
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </PressableScale>

        <AudioControls player={player} />

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
