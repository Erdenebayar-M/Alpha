import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { bubble, colors, motion, radii, shadow } from '../theme/tokens';

interface Props {
  onPress: () => void;
  children: ReactNode;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  style?: ViewStyle;
}

/** Round, oversized, pressable bubble — the one button shape children use. */
export function BubbleButton({
  onPress,
  children,
  size = bubble,
  color = colors.white,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: color, transform: [{ scale: pressed ? motion.pressScale : 1 }] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', ...shadow },
});
