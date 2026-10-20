import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { tile } from '../../../theme/tokens';
import { usePop } from './usePop';
import { useShake } from './useShake';

export interface ChoiceHandle {
  pop: () => void;
  shake: () => void;
}

interface Props {
  children: ReactNode;
  onPress: () => void;
  /** A wrong choice stays dimmed and stops responding. */
  dimmed?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}

/**
 * A tappable answer (a LetterTile, a PictureCard…). The Game decides right or wrong
 * and calls `pop()` or `shake()` on the handle.
 */
export const ChoiceButton = forwardRef<ChoiceHandle, Props>(function ChoiceButton(
  { children, onPress, dimmed = false, disabled = false, accessibilityLabel },
  ref,
) {
  const p = usePop();
  const s = useShake();
  useImperativeHandle(ref, () => ({ pop: p.pop, shake: s.shake }), [p.pop, s.shake]);
  return (
    <Animated.View style={[s.style, { opacity: dimmed ? tile.dimmedOpacity : 1 }]}>
      <Animated.View style={p.style}>
        <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled || dimmed} onPress={onPress}>
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});
