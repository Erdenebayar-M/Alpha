import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, type TextInput } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';
import { useTextEntryExercise } from '@/src/features/exercise/hooks/useTextEntryExercise';
import { useTaskAudio } from '@/src/features/exercise/hooks/useTaskAudio';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { CHARACTER_PRESS_SCALE } from '@/src/theme/motion';

/**
 * Dictation task (dictationOptions: TT_7_3 word / TT_7_4 sentence): the child hears
 * the audio (tap the character to replay) and types what they heard. The backend
 * grades word-by-word (or sentence-by-sentence) against `expected_answers`; local
 * feedback compares against the first expected answer as a reasonable approximation.
 */
export default function Dictation({ task, onResult }: ExerciseRendererProps) {
  const inputRef = useRef<TextInput>(null);
  const expectedAnswers = task.options.expected_answers;
  const compareTo = expectedAnswers?.[0] ?? task.correct_answer;

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
    <KeyboardAvoidingView style={exerciseStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap: 10, align: 'center' })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={exerciseStyles.prompt}>{task.prompt_text}</Text>

        <PressableScale
          onPress={handleToggleAudio}
          pressScale={CHARACTER_PRESS_SCALE}
          accessibilityRole="button"
          accessibilityLabel="Сонсох / зогсоох"
        >
          <CharacterAvatar playing={status.playing} width={160} />
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
