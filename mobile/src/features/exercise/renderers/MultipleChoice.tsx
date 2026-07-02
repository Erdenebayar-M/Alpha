import { useAudioPlayer } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExerciseRendererProps } from '@/src/features/exercise/registry';

const FEEDBACK_DELAY_MS = 1000;

export default function MultipleChoice({ task, onResult }: ExerciseRendererProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const player = useAudioPlayer(task.prompt_audio_url);

  const choices = task.options.choices ?? [];

  const handlePlayAudio = () => {
    try {
      player.play();
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  const handleSelect = (index: number, isCorrect: boolean) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    setTimeout(() => onResult(isCorrect), FEEDBACK_DELAY_MS);
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
        {choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const isAnswered = selectedIndex !== null;
          return (
            <Pressable
              key={`${choice.text}-${index}`}
              style={[
                styles.choiceButton,
                isSelected && (choice.is_correct ? styles.choiceCorrect : styles.choiceWrong),
              ]}
              onPress={() => handleSelect(index, choice.is_correct)}
              disabled={isAnswered}
            >
              <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                {choice.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedIndex !== null && task.feedback_text ? (
        <Text style={styles.feedback}>{task.feedback_text}</Text>
      ) : null}
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
  feedback: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
});
