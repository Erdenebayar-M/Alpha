import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { feedback } from '../../../theme/tokens';

/** A quick grow-and-settle for a correct answer. */
export function usePop(scale: number = feedback.popScale) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const pop = () => {
    const t = { duration: feedback.popMs };
    s.set(withSequence(withTiming(1 + scale, t), withTiming(1, t)));
  };
  return { style, pop };
}
