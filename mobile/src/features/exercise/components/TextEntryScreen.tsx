import { type ReactNode, useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, type TextInput } from 'react-native';

import AnswerInput from '@/src/features/exercise/components/AnswerInput';
import FeedbackText from '@/src/features/exercise/components/FeedbackText';
import { exerciseContent, exerciseStyles } from '@/src/features/exercise/exerciseStyles';

interface TextEntryScreenProps {
  gap: number;
  justify?: 'center' | 'space-evenly';
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  state: 'correct' | 'wrong' | null;
  feedback: string | null;
  /** The scrollable content above the feedback line — typically the prompt Text
   *  followed by the task's own card/word/sentence display. */
  children: ReactNode;
}

/**
 * The shell every plain text-entry renderer (CopyText, Correction, Dictation,
 * FillLetter, MiniText, SelfCheck, SentenceFill) hand-rolled identically: autofocus
 * the answer sheet 350ms after mount, dismiss the keyboard before submitting, and lay
 * out KeyboardAvoidingView > ScrollView(children + feedback) > AnswerInput. Renderers
 * with real control-flow differences around the input (VisualMemory hides it during
 * its memorize phase; AudioSpelling manages its own compare/timer state instead of
 * `useTextEntryExercise`) keep their own copy rather than bending this one to fit.
 */
export default function TextEntryScreen({
  gap,
  justify,
  value,
  onChangeText,
  onSubmit,
  disabled,
  state,
  feedback,
  children,
}: TextEntryScreenProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    Keyboard.dismiss();
    onSubmit();
  };

  return (
    <KeyboardAvoidingView style={exerciseStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={exerciseStyles.scroll}
        contentContainerStyle={exerciseContent({ gap, align: 'center', justify })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}

        <FeedbackText>{feedback}</FeedbackText>
      </ScrollView>

      <AnswerInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmit={handleSubmit}
        disabled={disabled}
        state={state}
      />
    </KeyboardAvoidingView>
  );
}
