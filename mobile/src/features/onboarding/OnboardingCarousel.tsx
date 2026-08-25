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
import { boardScale, DESIGN } from '@/src/features/onboarding/motion';
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

  // The page indicator is a carousel-level overlay shared by all three slides, so it
  // scales off the common 390x844 board rather than either slide's own frame.
  const dotsScale = boardScale(DESIGN, width, height);

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
      >
        {SLIDES.map((Slide, i) => (
          <Pressable
            key={i}
            // Slide 1's art deliberately overruns its 395px board on both sides,
            // so each page has to clip or it bleeds into its neighbour.
            style={{ width, height, overflow: 'hidden' }}
            onPress={() => goTo(i + 1)}
            accessibilityRole="button"
            accessibilityLabel="Үргэлжлүүлэх"
          >
            {i === 0 ? <GradientBackground /> : null}
            <View style={styles.centre}>
              <Slide play={i <= furthest} width={width} height={height} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View
        style={[styles.dots, { bottom: Math.max(90 * dotsScale, insets.bottom + 12) }]}
        pointerEvents="none"
      >
        <PageDots count={SLIDES.length} index={index} scale={dotsScale} />
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
