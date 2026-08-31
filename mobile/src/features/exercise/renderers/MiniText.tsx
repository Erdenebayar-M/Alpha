import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInput } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { CHARACTER_PRESS_SCALE } from '@/src/theme/motion';
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
  const { player, status, toggle: handleToggleAudio } = useTaskAudio(audioUrl);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

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

        <PressableScale
          onPress={handleToggleAudio}
          pressScale={CHARACTER_PRESS_SCALE}
          accessibilityRole="button"
          accessibilityLabel="Сонсох / зогсоох"
        >
          <CharacterAvatar playing={status.playing} width={150} />
        </PressableScale>

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
