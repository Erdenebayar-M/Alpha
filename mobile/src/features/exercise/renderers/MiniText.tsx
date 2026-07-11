import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, type TextInput } from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Mini-text dictation task (miniTextOptions: TT_7_6): a short (2–5 sentence) audio
 * passage; the child hears it (tap the character to replay) and types it all out.
 * The backend splits input_text on sentence-ending punctuation and grades each
 * sentence against `expected_answers`; local feedback compares the joined answer.
 */
export default function MiniText({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const expectedAnswers = task.options.expected_answers;
  const compareTo = expectedAnswers?.join(' ') ?? task.correct_answer;

  const ex = useTextEntryExercise(task, onResult, { compareTo });

  const audioUrl = task.prompt_audio_url ?? task.audio_url;
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    try {
      player.loop = true;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSubmit = () => {
    Keyboard.dismiss();
    ex.submit();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <Pressable onPress={handleToggleAudio} accessibilityRole="button" accessibilityLabel="Сонсох / зогсоох">
          <CharacterAvatar playing={status.playing} width={150} />
        </Pressable>

        <AudioControls player={player} />

        <FeedbackText>{ex.feedback}</FeedbackText>
      </ScrollView>

      <AnswerInput
        ref={inputRef}
        value={ex.value}
        onChangeText={ex.setValue}
        onSubmit={handleSubmit}
        disabled={ex.isAnswered}
        state={ex.isAnswered ? (ex.isCorrect ? 'correct' : 'wrong') : null}
      />
    </KeyboardAvoidingView>
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
});
