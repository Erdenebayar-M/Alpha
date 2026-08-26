import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import SparkleLg from '@/assets/icons/sparkle-lg.svg';
import SparkleSm from '@/assets/icons/sparkle-sm.svg';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface MergedWordPillProps {
  /** The word currently assembled from the placed tiles — shown as-is, right or wrong;
   *  this is a preview of what the child built, not a correctness signal. */
  word: string;
}

// Twinkle loop lifted from the Figma motion track on node 770:11850 (2.4s, infinite):
// opacity/scale/rotate each step through the same waypoints at slightly different
// paces, which is what reads as an irregular "twinkle" rather than a metronome pulse.
function useTwinkle() {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.out(Easing.quad);
    const easeInOut = Easing.inOut(Easing.quad);

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 200, easing: easeInOut }),
        withTiming(0.3, { duration: 300, easing: easeOut }),
        withTiming(1, { duration: 200, easing: easeInOut }),
        withTiming(0.2, { duration: 300, easing: easeOut }),
        withTiming(1, { duration: 300, easing: easeInOut }),
        withTiming(0.3, { duration: 300, easing: easeOut }),
        withTiming(1, { duration: 300, easing: easeInOut }),
        withTiming(0.4, { duration: 200, easing: easeOut }),
        withTiming(0.4, { duration: 300 })
      ),
      -1
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 250, easing: easeInOut }),
        withTiming(0.6, { duration: 250, easing: easeOut }),
        withTiming(1.2, { duration: 300, easing: easeInOut }),
        withTiming(1, { duration: 300, easing: easeOut }),
        withTiming(1.3, { duration: 400, easing: easeInOut }),
        withTiming(0.7, { duration: 300, easing: easeOut }),
        withTiming(1, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 400, easing: easeInOut }),
        withTiming(10, { duration: 400, easing: easeInOut }),
        withTiming(-12, { duration: 400, easing: easeInOut }),
        withTiming(8, { duration: 400, easing: easeInOut }),
        withTiming(0, { duration: 500, easing: easeInOut }),
        withTiming(0, { duration: 300 })
      ),
      -1
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(rotate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }, { scale: scale.value }],
  }));
}

function Sparkle({
  Glyph,
  size,
  style,
}: {
  Glyph: typeof SparkleLg;
  size: { width: number; height: number };
  style: { top: number; right: number };
}) {
  const animatedStyle = useTwinkle();
  return (
    <Animated.View style={[styles.sparkle, style, animatedStyle]}>
      <Glyph width={size.width} height={size.height} />
    </Animated.View>
  );
}

/**
 * The merged-word display (Figma 770:11246): once the child checks the "merge" box,
 * the two answer slots collapse into one pill with twinkling sparkles showing whatever
 * word they assembled — right or wrong, this is a preview, not a grade. Unchecking
 * splits back to WordSlots + SyllablePool without losing the placed tiles.
 */
export default function MergedWordPill({ word }: MergedWordPillProps) {
  return (
    <View style={styles.wrap}>
      <Animated.View entering={ZoomIn.duration(220)} style={styles.pill}>
        <Text style={styles.word}>{word}</Text>
      </Animated.View>
      <Sparkle Glyph={SparkleLg} size={{ width: 20, height: 19 }} style={{ top: 0, right: -8 }} />
      <Sparkle Glyph={SparkleSm} size={{ width: 15, height: 14 }} style={{ top: -9, right: -22 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  pill: {
    width: 105,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: '#1E3A8A',
    textAlign: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
});
