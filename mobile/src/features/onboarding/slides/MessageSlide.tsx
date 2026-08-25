import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import CharacterAvatar from '@/src/features/exercise/components/CharacterAvatar';
import { DESIGN, EASE_OUT_EXPO } from '@/src/features/onboarding/motion';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Shared shape for onboarding slides 2 and 3 (Figma 142:1677 / 142:1839): flat blue,
 * a left-aligned headline with coloured word runs, and the mascot below it.
 *
 * PROVISIONAL — the type scale and mascot pose here are read off the Figma *renders*,
 * not off layer geometry, and the mascot is the app's existing `CharacterAvatar`
 * standing in. Both are replaced once these two nodes can be read properly; the text,
 * colours and background are already exact.
 */

export interface TextRun {
  text: string;
  colour?: string;
}

/** Design-px metrics measured off the 390x844 renders. */
const TEXT_LEFT = 46;
const TEXT_TOP = 227;
const FONT_SIZE = 31;
const LINE_HEIGHT = 42;

interface MessageSlideProps {
  /** One entry per rendered line. */
  lines: readonly TextRun[];
  play: boolean;
  scale: number;
}

export default function MessageSlide({ lines, play, scale }: MessageSlideProps) {
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
          { left: TEXT_LEFT * scale, top: TEXT_TOP * scale, right: 16 * scale },
          textStyle,
        ]}
      >
        {lines.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.line,
              {
                fontSize: FONT_SIZE * scale,
                lineHeight: LINE_HEIGHT * scale,
                color: line.colour ?? colors.white,
              },
            ]}
          >
            {line.text}
          </Text>
        ))}
      </Animated.View>

      <Animated.View style={[styles.mascot, mascotStyle]}>
        <CharacterAvatar playing={false} width={150 * scale} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  text: { position: 'absolute' },
  line: { fontFamily: fonts.extrabold },
  mascot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    alignItems: 'center',
  },
});
