import { useAudioPlayer } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useChoiceExercise } from '@/src/features/exercise/hooks/useChoiceExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';

export default function MultipleChoice({ task, onResult }: ExerciseRendererProps) {
  // Picking a choice submits immediately (this legacy screen has no submit button).
  const ex = useChoiceExercise(task, onResult, { autoSubmit: true });
  const player = useAudioPlayer(task.prompt_audio_url);

  const handlePlayAudio = () => {
    try {
      player.play();
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  return (
    <View style={styles.container}>
      {task.prompt_audio_url ? (
        <Pressable style={styles.audioButton} onPress={handlePlayAudio}>
          <Text style={styles.audioButtonText}>🔊 Listen</Text>
        </Pressable>
      ) : null}

      <Text style={styles.prompt}>{task.prompt_text}</Text>

      <View style={styles.choices}>
        {ex.choices.map((choice, index) => {
          const isSelected = ex.selectedIndex === index;
          return (
            <Pressable
              key={`${choice.text}-${index}`}
              style={[
                styles.choiceButton,
                isSelected && (choice.is_correct ? styles.choiceCorrect : styles.choiceWrong),
              ]}
              onPress={() => ex.select(index)}
              disabled={ex.isAnswered}
            >
              <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                {choice.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FeedbackText>{ex.feedback}</FeedbackText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  audioButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
  },
  choices: {
    gap: 12,
  },
  choiceButton: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  choiceCorrect: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  choiceWrong: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  choiceText: {
    fontSize: 18,
    fontWeight: '600',
  },
  choiceTextSelected: {
    color: '#fff',
  },
});
