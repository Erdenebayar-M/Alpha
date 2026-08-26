import { Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/src/features/exercise/components/icons';
import { colors } from '@/src/theme/colors';

interface CheckAnswerBoxProps {
  /** Whether the two slots are currently shown merged into one word pill. */
  checked: boolean;
  /** Disabled (faint) until every slot is filled — a deliberate deviation from the
   *  Figma mock, which draws the same enabled-looking box mid-fill; a visibly
   *  not-yet-ready control reads better to a 6-year-old than a dead tap target. */
  disabled: boolean;
  onPress: () => void;
}

/**
 * The Material-3-style checkbox (Figma "Checkboxes", node 770:11429) — a merge/
 * un-merge toggle, not a grade: checking it previews the assembled word as one piece
 * (right or wrong, no signal either way); unchecking splits it back into the same two
 * slots, tiles intact, so the child can fix a syllable and try again. Only the arrow
 * button actually submits. A plain 18px box per the design, in a 44px tap area to
 * clear the kids-UX touch-target rule (§8) without inflating the visual.
 */
export default function CheckAnswerBox({ checked, disabled, onPress }: CheckAnswerBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={13}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel="Нэгтгэх"
      style={({ pressed }) => [styles.hitArea, pressed && !disabled && styles.pressed]}
    >
      <View
        style={[
          styles.box,
          checked && styles.boxChecked,
          disabled && !checked && styles.boxDisabled,
        ]}
      >
        {checked ? <CheckIcon size={12} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primaryBlue,
  },
  boxDisabled: {
    opacity: 0.4,
  },
});
