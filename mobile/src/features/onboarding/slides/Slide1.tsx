import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import BgBlobLeft from '@/assets/onboarding/slide1/bg-blob-left.svg';
import BgBlobRight from '@/assets/onboarding/slide1/bg-blob-right.svg';
import DotLeft from '@/assets/onboarding/slide1/dot-left.svg';
import DotRight from '@/assets/onboarding/slide1/dot-right.svg';
import Headline from '@/assets/onboarding/slide1/headline.svg';
import MiniStar1 from '@/assets/onboarding/slide1/ministar-1.svg';
import MiniStar2 from '@/assets/onboarding/slide1/ministar-2.svg';
import Ring from '@/assets/onboarding/slide1/ring.svg';
import SparkleBottomLeft from '@/assets/onboarding/slide1/sparkle-bl.svg';
import SparkleBottomRight from '@/assets/onboarding/slide1/sparkle-br.svg';
import SparkleLeft from '@/assets/onboarding/slide1/sparkle-left.svg';
import Star1 from '@/assets/onboarding/slide1/star1.svg';
import Star2 from '@/assets/onboarding/slide1/star2.svg';
import SwooshLeft from '@/assets/onboarding/slide1/swoosh-left.svg';
import SwooshRight from '@/assets/onboarding/slide1/swoosh-right.svg';
import SwooshTop from '@/assets/onboarding/slide1/swoosh-top.svg';
import WordmarkName from '@/assets/onboarding/slide1/wordmark-name.svg';
import WordmarkOrto from '@/assets/onboarding/slide1/wordmark-orto.svg';

import AnimatedLayer from '@/src/features/onboarding/AnimatedLayer';
import { GREEN, PINK, WAVING_HAND, YELLOW, type CharacterArt } from '@/src/features/onboarding/characters';
import FigmaBoard from '@/src/features/onboarding/FigmaBoard';
import {
  DESIGN,
  EASE_OUT_EXPO,
  SLIDE1_LAYERS,
  WAVE_KEYFRAMES,
  WAVE_LAYER,
  WAVE_START,
} from '@/src/features/onboarding/motion';

/**
 * Slide 1 — the brand splash (Figma 163:1739). Geometry and choreography live in
 * `motion.ts`; the mascots live in `characters.tsx`. This file only pairs each
 * layer key with its artwork.
 */

/** Layers that are a single exported vector, stretched to their Figma box. */
const SIMPLE_ART: Record<string, ReactNode> = {
  bgBlobRight: <BgBlobRight width="100%" height="100%" />,
  bgBlobLeft: <BgBlobLeft width="100%" height="100%" />,
  ring: <Ring width="100%" height="100%" />,
  swooshTop: <SwooshTop width="100%" height="100%" />,
  swooshRight: <SwooshRight width="100%" height="100%" />,
  swooshLeft: <SwooshLeft width="100%" height="100%" />,
  headline: <Headline width="100%" height="100%" />,
  star1: <Star1 width="100%" height="100%" />,
  star2: <Star2 width="100%" height="100%" />,
  sparkleLeft: <SparkleLeft width="100%" height="100%" />,
  sparkleBottomRight: <SparkleBottomRight width="100%" height="100%" />,
  sparkleBottomLeft: <SparkleBottomLeft width="100%" height="100%" />,
  miniStar1: <MiniStar1 width="100%" height="100%" />,
  miniStar2: <MiniStar2 width="100%" height="100%" />,
  dotRight: <DotRight width="100%" height="100%" />,
  dotLeft: <DotLeft width="100%" height="100%" />,
};

const CHARACTER_ART: Record<string, CharacterArt> = {
  pink: PINK,
  green: GREEN,
  yellow: YELLOW,
};

/**
 * The wordmark group holds two sibling exports — the "ОРТО ба" lettering and the
 * diaeresis that sits above it — positioned inside the group's own box.
 */
function Wordmark({ scale }: { scale: number }) {
  return (
    <View style={styles.fill}>
      <View style={[styles.absolute, { left: 0, top: 33.8 * scale, width: 136.2 * scale, height: 30.5 * scale }]}>
        <WordmarkName width="100%" height="100%" />
      </View>
      <View style={[styles.absolute, { left: 110.5 * scale, top: 0, width: 23.8 * scale, height: 31.6 * scale }]}>
        <WordmarkOrto width="100%" height="100%" />
      </View>
    </View>
  );
}

/** Renders a mascot at its native board size, then scales the whole thing as one unit. */
function ScaledBoard({ art, scale }: { art: CharacterArt; scale: number }) {
  return (
    <View style={styles.centre}>
      <View style={{ width: art.size.width, height: art.size.height, transform: [{ scale }] }}>
        <FigmaBoard size={art.size} leaves={art.leaves} />
      </View>
    </View>
  );
}

/**
 * The pink mascot's hand. It enters with everything else, then keeps waving —
 * Figma's rotate track swings twice between 1000ms and 1900ms and we loop exactly
 * that segment, so the screen never goes completely still.
 */
function WavingHand({ play, scale }: { play: boolean; scale: number }) {
  const opacity = useSharedValue(0);
  // `as const` on the keyframes narrows to a literal, which would reject the swings.
  const rotate = useSharedValue<number>(WAVE_KEYFRAMES[0].deg);

  useEffect(() => {
    if (!play) return;

    opacity.value = withDelay(
      WAVE_LAYER.fadeDelay,
      withTiming(1, { duration: WAVE_LAYER.fadeDuration, easing: EASE_OUT_EXPO })
    );

    const swings = WAVE_KEYFRAMES.slice(1).map((frame) =>
      withTiming(frame.deg, { duration: frame.duration, easing: Easing.inOut(Easing.ease) })
    );
    // The last keyframe returns to the first, so the sequence loops seamlessly.
    rotate.value = withDelay(WAVE_START, withRepeat(withSequence(...swings), -1, false));
  }, [play, opacity, rotate]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absolute,
        {
          left: WAVE_LAYER.rect.left * scale,
          top: WAVE_LAYER.rect.top * scale,
          width: WAVE_LAYER.rect.width * scale,
          height: WAVE_LAYER.rect.height * scale,
        },
        style,
      ]}
    >
      <ScaledBoard art={WAVING_HAND} scale={scale} />
    </Animated.View>
  );
}

export default function Slide1({ play, scale }: { play: boolean; scale: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ width: DESIGN.width * scale, height: DESIGN.height * scale }}
    >
      {SLIDE1_LAYERS.map((layer) => {
        const character = CHARACTER_ART[layer.key];
        return (
          <AnimatedLayer key={layer.key} spec={layer} play={play} scale={scale}>
            {character ? (
              <ScaledBoard art={character} scale={scale} />
            ) : layer.key === 'wordmark' ? (
              <Wordmark scale={scale} />
            ) : (
              SIMPLE_ART[layer.key]
            )}
          </AnimatedLayer>
        );
      })}
      <WavingHand play={play} scale={scale} />
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
