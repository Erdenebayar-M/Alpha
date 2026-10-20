import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { feedback } from '../../../theme/tokens';

/** A gentle side-to-side wobble for a wrong answer — never red, never harsh. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    const d = feedback.shakeDistance;
    const t = { duration: feedback.shakeStepMs };
    x.set(withSequence(withTiming(-d, t), withTiming(d, t), withTiming(-d / 2, t), withTiming(0, t)));
  };
  return { style, shake };
}
