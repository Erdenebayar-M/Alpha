import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import ChoiceGrid from '@/src/features/exercise/components/ChoiceGrid';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

const FEEDBACK_DELAY_MS = 1000;

export default function AudioChoice({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the character off both axes so it never crowds a short screen (e.g. SE).
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const player = useAudioPlayer(task.prompt_audio_url);
  const status = useAudioPlayerStatus(player);

  // Loop the prompt so it keeps playing while the child (or you) adjusts volume/speed.
  useEffect(() => {
    try {
      player.loop = true;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  const choices = task.options.choices ?? [];

  // Tap the character to toggle playback; the avatar animation is driven by
  // status.playing, so it starts/stops together with the audio.
  const handleToggleAudio = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // ignore playback errors (e.g. an unreachable mock URL)
    }
  };

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    const isCorrect = choices[index]?.is_correct ?? false;
    setTimeout(() => onResult(isCorrect), FEEDBACK_DELAY_MS);
  };

  const selectedChoice = selectedIndex !== null ? choices[selectedIndex] : null;
  const feedback = selectedChoice
    ? ((selectedChoice.is_correct ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <Pressable onPress={handleToggleAudio} accessibilityRole="button" accessibilityLabel="Сонсох / зогсоох">
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </Pressable>

        <AudioControls player={player} />

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </ScrollView>

      <ChoiceGrid
        choices={choices}
        selectedIndex={selectedIndex}
        isAnswered={selectedChoice !== null}
        onSelect={handleSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    gap: 10,
  },
  prompt: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: colors.textPrompt,
    textAlign: 'center',
    letterSpacing: -0.032,
  },
  feedback: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textChoice,
    textAlign: 'center',
  },
});
