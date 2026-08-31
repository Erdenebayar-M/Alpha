import { type ReactNode, useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  type AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { boardScale, DESIGN, EASE_OUT_EXPO } from '@/src/features/onboarding/motion';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Shared shape for onboarding slides 2 and 3 (Figma 142:1677 / 142:1839): flat blue,
 * a left-aligned headline with coloured word runs, and a mascot below it.
 *
 * `get_motion_context` returns no animation cohort for either node — both are static
 * in Figma. The entrance below is not in the design; kept so the carousel doesn't go
 * completely still after slide 1's rich choreography.
 */

export interface TextRun {
  text: string;
  colour?: string;
  weight?: 'regular' | 'black';
}

export interface MascotSpec {
  /** Local require() asset id — same convention as CharacterAvatar.tsx. */
  source: number;
  /** Box in board px, measured against the rendered ink (get_design_context + pixel audit). */
  rect: { left: number; top: number; width: number; height: number };
  /** Circular clip radius in board px, for slide 3's `rounded-[147px]` mascot. */
  circular?: boolean;
}

/** Design-px metrics from get_design_context on 142:1677 / 142:1843 (390x844 board). */
const TEXT_LEFT = 45;
const TEXT_TOP = 223;
const TEXT_WIDTH = 299.08;
const FONT_SIZE = 40;
const LINE_HEIGHT = 40;
const LETTER_SPACING = -0.4;
// NunitoSans_900Black's ink is tall enough at this size to hit the top of a 40px line
// box and get clipped by iOS (Regular's ink, even accented, stays inside it) — give the
// Black-weight line extra headroom. (A compensating negative marginBottom was tried here
// to keep the next line's flow position pixel-identical, but iOS pushes the baseline down
// within the taller box too, so the margin ended up cancelling more than just the added
// box height — it measurably compressed the gap to the next line. Letting the extra
// headroom flow through naturally keeps this line's spacing to "найзтайгаа" in line with
// the other lines' spacing, confirmed against a screenshot.)
const LINE_HEIGHT_BLACK_EXTRA = 12;

interface MessageSlideProps {
  /** One entry per rendered line — explicit lines, not wrapped text (see note below). */
  lines: readonly TextRun[];
  mascot: MascotSpec;
  play: boolean;
  width: number;
  height: number;
  /**
   * Extra art positioned over the mascot (e.g. slide 3's rotated cap label).
   * Receives the mascot's own entrance style so overlay art can animate in sync with it.
   */
  renderOverlay?: (scale: number, style: AnimatedStyle<ViewStyle>) => ReactNode;
}

export default function MessageSlide({ lines, mascot, play, width, height, renderOverlay }: MessageSlideProps) {
  const scale = boardScale(DESIGN, width, height);
  const enter = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    enter.value = withDelay(120, withTiming(1, { duration: 620, easing: EASE_OUT_EXPO }));
  }, [play, enter]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 24 * scale }],
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.9 + enter.value * 0.1 }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { width: DESIGN.width * scale, height: DESIGN.height * scale }]}
    >
      <Animated.View
        style={[
          styles.text,
          { left: TEXT_LEFT * scale, top: TEXT_TOP * scale, width: TEXT_WIDTH * scale },
          textStyle,
        ]}
      >
        {lines.map((line, i) => {
          const isBlack = line.weight === 'black';
          return (
            <Text
              key={i}
              style={[
                styles.line,
                {
                  fontFamily: isBlack ? fonts.sansBlack : fonts.sansRegular,
                  fontSize: FONT_SIZE * scale,
                  lineHeight: (isBlack ? LINE_HEIGHT + LINE_HEIGHT_BLACK_EXTRA : LINE_HEIGHT) * scale,
                  letterSpacing: LETTER_SPACING * scale,
                  color: line.colour ?? colors.white,
                },
              ]}
            >
              {line.text}
            </Text>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.mascot,
          {
            left: mascot.rect.left * scale,
            top: mascot.rect.top * scale,
            width: mascot.rect.width * scale,
            height: mascot.rect.height * scale,
            borderRadius: mascot.circular ? (mascot.rect.height * scale) / 2 : 0,
            overflow: mascot.circular ? 'hidden' : 'visible',
          },
          mascotStyle,
        ]}
      >
        <Image source={mascot.source} style={styles.mascotImage} contentFit="fill" />
      </Animated.View>
      {renderOverlay?.(scale, mascotStyle)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  text: { position: 'absolute' },
  line: { includeFontPadding: false },
  mascot: { position: 'absolute' },
  mascotImage: { width: '100%', height: '100%' },
});
