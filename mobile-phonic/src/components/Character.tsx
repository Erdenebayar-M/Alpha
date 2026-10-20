import { useEffect } from 'react';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { imageSource, type ImageId } from '../assets/manifest';
import { motion } from '../theme/tokens';

interface Props {
  id: ImageId;
  size: number;
  /** Idle bob so characters never look frozen. */
  bob?: boolean;
}

export function Character({ id, size, bob = true }: Props) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (!bob) {
      y.value = 0;
      return;
    }
    const ease = Easing.inOut(Easing.quad);
    y.value = withRepeat(
      withSequence(
        withTiming(-size * motion.bobHeight, { duration: motion.bobMs, easing: ease }),
        withTiming(0, { duration: motion.bobMs, easing: ease }),
      ),
      -1,
    );
    return () => cancelAnimation(y);
  }, [bob, size, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Image source={imageSource(id)} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
