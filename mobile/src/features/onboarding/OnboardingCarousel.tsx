import { useCallback, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import PageDots from '@/src/features/onboarding/PageDots';
import { DESIGN } from '@/src/features/onboarding/motion';
import Slide1 from '@/src/features/onboarding/slides/Slide1';
import Slide2 from '@/src/features/onboarding/slides/Slide2';
import Slide3 from '@/src/features/onboarding/slides/Slide3';
import { colors } from '@/src/theme/colors';

/**
 * The three-slide onboarding carousel (Figma 163:1739, 142:1677, 142:1839).
 *
 * Deliberately knows nothing about where it is mounted — it just reports `onDone`.
 * Today that is the top of today's lesson; when it becomes the app's launch screen
 * it can be dropped into an `app/(onboarding)` route unchanged.
 */

const SLIDES = [Slide1, Slide2, Slide3];

/** Slide 1 is a vertical gradient; slides 2 and 3 sit on flat `primaryBlue`. */
function GradientBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="onboardingSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.onboardingGradientTop} />
          <Stop offset="1" stopColor={colors.onboardingGradientBottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#onboardingSky)" />
    </Svg>
  );
}

export default function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  // Highest slide reached: an entrance plays once, so swiping back never replays it.
  const [furthest, setFurthest] = useState(0);

  // Size the board off both axes so it never overflows a short screen (AGENTS.md §12).
  const scale = Math.min(width / DESIGN.width, height / DESIGN.height);

  const goTo = useCallback(
    (next: number) => {
      if (next >= SLIDES.length) {
        onDone();
        return;
      }
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
      setFurthest((seen) => Math.max(seen, next));
    },
    [onDone, width]
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex(next);
      setFurthest((seen) => Math.max(seen, next));
    },
    [width]
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        // Swiping past the last slide finishes, matching the tap-through affordance.
        onScrollEndDrag={(event) => {
          if (event.nativeEvent.contentOffset.x > (SLIDES.length - 1) * width + width * 0.15) onDone();
        }}
      >
        {SLIDES.map((Slide, i) => (
          <Pressable
            key={i}
            style={{ width, height }}
            onPress={() => goTo(i + 1)}
            accessibilityRole="button"
            accessibilityLabel="Үргэлжлүүлэх"
          >
            {i === 0 ? <GradientBackground /> : null}
            <View style={styles.centre}>
              <Slide play={i <= furthest} scale={scale} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.dots, { bottom: Math.max(insets.bottom, 12) + 24 }]} pointerEvents="none">
        <PageDots count={SLIDES.length} index={index} scale={scale} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Flat blue behind everything: slides 2 and 3 use it directly, slide 1 paints over it.
  root: { flex: 1, backgroundColor: colors.primaryBlue },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
