import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Brand, ms, Radius, Spacing, Typography } from '@/constants/theme';

type OptionButtonProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /**
   * Selected-state treatment:
   *  - `outlined` (default): blue border + tint + lift shadow (diagnostic screen).
   *  - `soft`: filled tint only, no border/shadow change (listen-&-choose screen).
   */
  variant?: 'outlined' | 'soft';
  /** Sizing from the parent grid (e.g. `width: '48%'`). */
  style?: StyleProp<ViewStyle>;
};

/** Answer option cell for the diagnostic 2×2 multiple-choice grid. */
export function OptionButton({
  label,
  selected = false,
  onPress,
  variant = 'outlined',
  style,
}: OptionButtonProps) {
  const selectedStyle = variant === 'soft' ? styles.optionSelectedSoft : styles.optionSelected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        variant === 'soft' && styles.optionSoft,
        style,
        selected && selectedStyle,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: Brand.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Brand.optionBorder,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    // Tall, squarish cell with a large tap target for young children.
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Brand.optionSelectedBorder,
    backgroundColor: Brand.optionSelectedTint,
    // Selected cell reads as "lifted".
    shadowColor: Brand.optionSelectedBorder,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionSoft: {
    // Cooler, lighter border + rounder, taller cells (listen screen, pages 6–8).
    borderColor: Brand.optionBorderCool,
    borderRadius: Radius.xxl,
    minHeight: ms(112),
  },
  optionSelectedSoft: {
    // Soft fill only — border stays, no shadow lift (pages 6–8).
    backgroundColor: Brand.optionSelectedTint,
    borderColor: Brand.optionBorderCool,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: Brand.textBody,
    fontFamily: Typography.family,
    fontSize: Typography.option.fontSize,
    lineHeight: Typography.option.lineHeight,
    fontWeight: Typography.option.fontWeight,
    textAlign: 'center',
  },
  labelSelected: {
    color: Brand.navy,
    fontWeight: '700',
  },
});
