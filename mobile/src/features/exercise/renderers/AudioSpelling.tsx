import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInput, useWindowDimensions, View } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import AudioControls from '@/src/features/exercise/components/AudioControls';
import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import { getFeedbackDelayMs } from '@/src/features/exercise/feedbackTiming';
import type { ExerciseRendererProps } from '@/src/features/exercise/registry';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Case/whitespace-insensitive compare so "Хурга " or "хурга" still count.
const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Audio-dictation text entry ("Сонссон үгээ бичээрэй"): the child hears the word
 * (tap the character to replay) and types it with the native keyboard. Reuses the
 * CharacterAvatar + AudioControls from AudioChoice; the answer sheet is a TextInput.
 */
export default function AudioSpelling({ task, onResult }: ExerciseRendererProps) {
  const { width, height } = useWindowDimensions();
  // Size the character off both axes so it never crowds a short screen (e.g. SE).
  const avatarWidth = Math.max(120, Math.min(width * 0.44, height * 0.22, 186));

  const [answer, setAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const player = useAudioPlayer(task.prompt_audio_url ?? task.audio_url);
  const status = useAudioPlayerStatus(player);

  // Loop the prompt so it keeps playing while the child adjusts volume/speed.
  useEffect(() => {
    try {
      player.loop = true;
    } catch {
      // ignore; some mock players may not support looping
    }
  }, [player]);

  // Open the keyboard as soon as the task mounts ("activate keyboard").
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSubmit = () => {
    if (isAnswered || answer.trim().length === 0) return;
    setIsAnswered(true);
    Keyboard.dismiss();
    const isCorrect = normalize(answer) === normalize(task.correct_answer);
    const submitted = answer.trim();
    setTimeout(() => onResult(isCorrect, submitted), getFeedbackDelayMs(task, isCorrect));
  };

  const isCorrect = isAnswered && normalize(answer) === normalize(task.correct_answer);
  const feedback = isAnswered
    ? ((isCorrect ? task.feedback_correct : task.feedback_wrong) ?? task.feedback_text)
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prompt}>{task.prompt_text}</Text>

        <PressableScale onPress={handleToggleAudio} accessibilityRole="button" accessibilityLabel="Сонсох / зогсоох">
          <CharacterAvatar playing={status.playing} width={avatarWidth} />
        </PressableScale>

        <AudioControls player={player} />

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </ScrollView>

      <AnswerInput
        ref={inputRef}
        value={answer}
        onChangeText={setAnswer}
        onSubmit={handleSubmit}
        disabled={isAnswered}
        state={isAnswered ? (isCorrect ? 'correct' : 'wrong') : null}
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
  feedback: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textChoice,
    textAlign: 'center',
  },
});
