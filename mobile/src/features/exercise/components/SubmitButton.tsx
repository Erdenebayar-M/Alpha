import { StyleSheet } from 'react-native';

import PressableScale from '@/src/components/PressableScale';
import { ArrowRightIcon } from '@/src/features/exercise/components/icons';
import { colors } from '@/src/theme/colors';

interface SubmitButtonProps {
  onPress: () => void;
  disabled: boolean;
}

/** The arrow "continue" button shared by the submit-flavor renderers
 *  (FillBlank, LetterChoice): disabled → faint blue, enabled → primary blue. */
export default function SubmitButton({ onPress, disabled }: SubmitButtonProps) {
  return (
    <PressableScale
      style={[styles.submit, disabled ? styles.submitDisabled : styles.submitActive]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Үргэлжлүүлэх"
    >
      <ArrowRightIcon size={28} color={colors.white} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  submit: {
    height: 62,
    marginTop: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  submitActive: {
    backgroundColor: colors.primaryBlue,
    borderBottomColor: '#1E44C4',
  },
  submitDisabled: {
    backgroundColor: 'rgba(46, 91, 232, 0.2)',
    borderBottomColor: 'rgba(79, 158, 245, 0.5)',
  },
});
