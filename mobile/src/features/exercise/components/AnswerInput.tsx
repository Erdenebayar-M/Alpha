import { forwardRef } from 'react';
import { StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface AnswerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** Correct/wrong tint once the answer has been checked; null while unanswered. */
  state: 'correct' | 'wrong' | null;
}

/**
 * The bottom answer sheet for text-entry tasks: a single rounded input the child
 * types into with the native keyboard. Mirrors ChoiceGrid's sheet chrome so the
 * text and choice screens share one visual language.
 */
const AnswerInput = forwardRef<TextInput, AnswerInputProps>(function AnswerInput(
  { value, onChangeText, onSubmit, disabled, state },
  ref
) {
  const { height } = useWindowDimensions();
  // Shrink the sheet on short screens so it doesn't crowd the content above it.
  const compact = height < 720;
  const sheetPadding = compact ? 20 : 28;

  return (
    <View style={[styles.sheet, { padding: sheetPadding, borderRadius: compact ? 36 : 46 }]}>
      <TextInput
        ref={ref}
        style={[
          styles.field,
          state === 'correct' && styles.fieldCorrect,
          state === 'wrong' && styles.fieldWrong,
        ]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        placeholder="Энд бич..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        returnKeyType="done"
        submitBehavior="submit"
        cursorColor={colors.textChoice}
        selectionColor={colors.textChoice}
      />
    </View>
  );
});

export default AnswerInput;

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    shadowColor: '#2C4064',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  field: {
    minHeight: 58,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.textChoice,
    letterSpacing: -0.032,
    shadowColor: '#283C64',
    shadowOffset: { width: -1, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldCorrect: {
    borderColor: colors.choiceSelectedBorder,
    backgroundColor: colors.feedbackCorrectFieldBg,
  },
  fieldWrong: {
    borderColor: colors.feedbackWrongBorder,
    backgroundColor: colors.feedbackWrongBg,
  },
});
