import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT_EXPO, PAGE_DOTS_MOTION } from '@/src/features/onboarding/motion';
import { colors } from '@/src/theme/colors';

// Geometry lifted straight from the Figma indicator (node 171:2478 -> a 108x9 export):
// a 50x9 pill for the current slide, 9x9 circles for the rest, 20px gaps.
const DOT = 9;
const PILL = 50;
const GAP = 20;

interface PageDotsProps {
  count: number;
  index: number;
  /** Design px -> device px, so the indicator tracks the artwork on small screens. */
  scale: number;
}

/**
 * The carousel's page indicator. Figma draws it as flat art with the first slide
 * always active; here it is live, so the pill travels and the spent dots recolour.
 *
 * The design file paints its two inactive dots differently (one white, one #BDC8F4)
 * — an artefact of the art not being updated per frame. A single inactive colour is
 * used instead so the control reads consistently at any index.
 */
export default function PageDots({ count, index, scale }: PageDotsProps) {
  const appear = useSharedValue(0);

  useEffect(() => {
    // Fades in over the tail of the slide-1 character entrance, as Figma has it.
    appear.value = withDelay(
      PAGE_DOTS_MOTION.delay,
      withTiming(1, { duration: PAGE_DOTS_MOTION.duration, easing: EASE_OUT_EXPO })
    );
  }, [appear]);

  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  return (
    <Animated.View style={[styles.row, { gap: GAP * scale }, appearStyle]}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === index} scale={scale} />
      ))}
    </Animated.View>
  );
}

function Dot({ active, scale }: { active: boolean; scale: number }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 260, easing: EASE_OUT_EXPO });
  }, [active, progress]);

  const width = useDerivedValue(() => (DOT + (PILL - DOT) * progress.value) * scale);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.dotInactive, colors.brandYellow]),
  }));

  return <Animated.View style={[{ height: DOT * scale, borderRadius: (DOT / 2) * scale }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
