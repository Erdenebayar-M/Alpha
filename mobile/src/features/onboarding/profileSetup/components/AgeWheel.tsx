import { useCallback, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * The Нас (age) picker (Figma 804:10235 / 804:10351): a 216x35 white pill holding a
 * snap-scrolling wheel of ages.
 *
 * Figma draws two states of the same control — the idle frame sizes the middle three
 * numbers larger than their neighbours, and the selected frame fades everything except
 * the chosen number to near-white. Both fall out of one mechanism here: each item's
 * scale and opacity are interpolated from its distance to the centre of the pill, so
 * neighbours are both smaller and visibly more transparent, not just lighter text.
 *
 * A wheel always has something under the centre line, so age is never unset — the step's
 * Continue button gates on the name fields alone.
 */

const AGES = [5, 6, 7, 8, 9, 10, 11];
/** Figma's item pitch drifts 24..32px as the labels widen; the wheel needs one fixed step. */
const ITEM = 27;
const PILL = { width: 216, height: 35 };
/** Figma's largest (centred) number is 17px; neighbours fall to ~14px at 0.82. */
const FONT = 17;

const AnimatedText = Animated.createAnimatedComponent(Text);

export const DEFAULT_AGE = 8;

export default function AgeWheel({
  value,
  onChange,
  scale = 1,
}: {
  value: number;
  onChange: (age: number) => void;
  scale?: number;
}) {
  const step = ITEM * scale;
  // Where the wheel opens. Only read on mount — the wheel is uncontrolled after that,
  // so later positions come from the user's own scrolling.
  const startIndex = Math.max(AGES.indexOf(value), 0);
  // Scroll offset in item units, so each item can compare against its own index.
  const progress = useSharedValue(startIndex);
  const ref = useRef<ScrollView>(null);
  const seeded = useRef(false);

  // `contentOffset` alone does not stick on an Animated.ScrollView, so the opening
  // position is applied once layout has given the row its real width.
  const seed = useCallback(() => {
    if (seeded.current) return;
    seeded.current = true;
    ref.current?.scrollTo({ x: startIndex * step, animated: false });
  }, [startIndex, step]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      progress.value = event.contentOffset.x / step;
    },
  });

  const handleSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      const age = AGES[Math.min(Math.max(index, 0), AGES.length - 1)];
      if (age !== undefined) onChange(age);
    },
    [onChange, step]
  );

  return (
    <View
      style={[
        styles.pill,
        { width: PILL.width * scale, height: PILL.height * scale, borderRadius: 24 * scale },
      ]}
    >
      <Animated.ScrollView
        ref={ref}
        onLayout={seed}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleSettle}
        // Half a pill minus half an item on each side, so the first and last ages can
        // still reach the centre line.
        contentContainerStyle={{ paddingHorizontal: ((PILL.width - ITEM) / 2) * scale }}
      >
        {AGES.map((age, index) => (
          <AgeItem key={age} age={age} index={index} progress={progress} width={step} scale={scale} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function AgeItem({
  age,
  index,
  progress,
  width,
  scale,
}: {
  age: number;
  index: number;
  progress: { value: number };
  width: number;
  scale: number;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      opacity: interpolate(distance, [0, 1, 2], [1, 0.4, 0.2], 'clamp'),
      transform: [{ scale: interpolate(distance, [0, 1, 2], [1, 0.82, 0.7], 'clamp') }],
    };
  });

  return (
    <View style={[styles.item, { width }]}>
      <AnimatedText style={[styles.text, { fontSize: FONT * scale }, style]}>{age}</AnimatedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: colors.white, overflow: 'hidden' },
  item: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  text: { fontFamily: fonts.semibold, textAlign: 'center', color: colors.textNavy },
});
