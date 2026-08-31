import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, type PressableProps, type View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  PRESS_DOWN_DURATION,
  PRESS_EASING,
  PRESS_SCALE,
  PRESS_UP_DURATION,
} from '@/src/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  /** Override how far the button sinks into its own bottom edge on press, in px.
   *  Defaults to the button's own `borderBottomWidth` when it also has a fixed
   *  `height` (shrinking a border on a fixed-height, border-box view is
   *  layout-neutral). Pass 0 to opt a bordered button out of the sink. */
  depth?: number;
  /** Override how far the press-in scales down. Defaults to PRESS_SCALE. */
  pressScale?: number;
}

/**
 * Drop-in replacement for Pressable: shrinks slightly and (for buttons with a 3D
 * bottom edge) sinks down on press-in, then settles firmly back on release with no
 * bounce or overshoot — so every tap in the app feels like a real button press. The
 * animated style is merged onto the same node (no extra wrapper view), so flex/layout
 * styles on `style` keep working exactly as on a plain Pressable.
 */
export default forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, children, disabled, depth, pressScale = PRESS_SCALE, onPressIn, onPressOut, ...rest },
  ref
) {
  const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
  const flat = StyleSheet.flatten(resolvedStyle) as
    | { borderBottomWidth?: number; height?: number }
    | undefined;
  const sink =
    depth ??
    (typeof flat?.borderBottomWidth === 'number' && typeof flat?.height === 'number'
      ? flat.borderBottomWidth
      : 0);

  const scale = useSharedValue(1);
  const depthValue = useSharedValue(0);
  const [pressed, setPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: depthValue.value }, { scale: scale.value }],
    ...(sink > 0 ? { borderBottomWidth: sink - depthValue.value } : null),
  }));

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        if (!disabled) {
          scale.value = withTiming(pressScale, { duration: PRESS_DOWN_DURATION, easing: PRESS_EASING });
          if (sink > 0) {
            depthValue.value = withTiming(sink, { duration: PRESS_DOWN_DURATION, easing: PRESS_EASING });
          }
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        if (!disabled) {
          scale.value = withTiming(1, { duration: PRESS_UP_DURATION, easing: PRESS_EASING });
          if (sink > 0) {
            depthValue.value = withTiming(0, { duration: PRESS_UP_DURATION, easing: PRESS_EASING });
          }
        }
        onPressOut?.(event);
      }}
      style={[typeof style === 'function' ? style({ pressed }) : style, animatedStyle]}
      {...rest}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
});
