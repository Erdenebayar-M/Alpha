import { forwardRef, useState } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PRESS_DOWN_DURATION, PRESS_SCALE, PRESS_SCALE_SPRING } from '@/src/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Drop-in replacement for Pressable: scales down on press-in and springs back with
 * a slight bounce on release, so every tap in the app feels tactile for small
 * fingers. The animated style is merged onto the same node (no extra wrapper view),
 * so flex/layout styles on `style` keep working exactly as on a plain Pressable.
 */
export default forwardRef<View, PressableProps>(function PressableScale(
  { style, children, disabled, onPressIn, onPressOut, ...rest },
  ref
) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        if (!disabled) {
          scale.value = withTiming(PRESS_SCALE, { duration: PRESS_DOWN_DURATION });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        if (!disabled) {
          scale.value = withSpring(1, PRESS_SCALE_SPRING);
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
