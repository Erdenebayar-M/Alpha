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
import { GREEN, PINK, WAVING_ARM, YELLOW, type CharacterArt } from '@/src/features/onboarding/characters';
import FigmaBoard from '@/src/features/onboarding/FigmaBoard';
import {
  DESIGN_SLIDE1,
  EASE_OUT_EXPO,
  SLIDE1_LAYERS,
  WAVE_KEYFRAMES,
  WAVE_LAYER,
  WAVE_ORIGIN,
  WAVE_REPEAT_COUNT,
  WAVE_START,
  boardScale,
} from '@/src/features/onboarding/motion';
import { useMountWaves } from '@/src/features/onboarding/useMountWaves';

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
 * Mounting all 21 layers (three of them full mascots, ~50 FigmaBoard leaves
 * combined) in the same commit is what makes this slide's first paint slow —
 * not the entrance choreography itself, which already staggers when each
 * layer's animation *starts* via its own track delays below. This map instead
 * staggers when each layer *mounts*, in the same relative order as those
 * authored delays, so the visual result is unchanged (every layer starts
 * invisible either way — see AnimatedLayer's `initial()`) but the synchronous
 * mount burst is spread across a few animation frames. Each mascot gets its
 * own wave since they're disproportionately expensive versus a single
 * decorative SVG.
 */
const LAYER_WAVE: Record<string, number> = {
  bgBlobRight: 0,
  bgBlobLeft: 0,
  ring: 0,
  wordmark: 0,
  headline: 1,
  pink: 2,
  green: 3,
  swooshTop: 3,
  yellow: 4,
  swooshRight: 4,
  star1: 5,
  star2: 5,
  swooshLeft: 5,
  sparkleLeft: 5,
  sparkleBottomRight: 5,
  sparkleBottomLeft: 5,
  dotRight: 5,
  dotLeft: 5,
  miniStar1: 5,
  miniStar2: 5,
};
const TOTAL_WAVES = 6;
const WAVING_ARM_WAVE = 5;

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
 * The yellow mascot's left arm (viewer's left). It enters with everything else, then
 * waves — Figma's rotate track swings twice between 1000ms and 1900ms and we loop that
 * segment `WAVE_REPEAT_COUNT` times (~2.7s), then let it settle at its resting angle
 * rather than wave forever.
 *
 * The swing pivots at the shoulder (`WAVE_ORIGIN`), not the view's centre, so the end
 * that meets the body stays put and only the hand travels.
 */
function WavingArm({ play, scale }: { play: boolean; scale: number }) {
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
    // The last keyframe returns to the first, so repeated cycles loop seamlessly and
    // the hand is already at rest when the repeats run out.
    rotate.value = withDelay(WAVE_START, withRepeat(withSequence(...swings), WAVE_REPEAT_COUNT, false));
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
        // Static, so it sits on the style array rather than in the worklet above.
        { transformOrigin: WAVE_ORIGIN },
        style,
      ]}
    >
      <ScaledBoard art={WAVING_ARM} scale={scale} />
    </Animated.View>
  );
}

/**
 * Splits at the boundary Figma's own paint order puts `<WavingArm>` at — right
 * after `wordmark`, before `green`. See the comment on `SLIDE1_LAYERS` in motion.ts.
 */
const WAVING_ARM_INDEX = SLIDE1_LAYERS.findIndex((layer) => layer.key === 'green');

function renderLayer(layer: (typeof SLIDE1_LAYERS)[number], play: boolean, scale: number) {
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
}

const isMounted = (layer: (typeof SLIDE1_LAYERS)[number], wave: number) =>
  (LAYER_WAVE[layer.key] ?? 0) <= wave;

export default function Slide1({ play, width, height }: { play: boolean; width: number; height: number }) {
  const scale = boardScale(DESIGN_SLIDE1, width, height);
  const wave = useMountWaves(play, TOTAL_WAVES);
  return (
    <View
      pointerEvents="none"
      style={{ width: DESIGN_SLIDE1.width * scale, height: DESIGN_SLIDE1.height * scale }}
    >
      {SLIDE1_LAYERS.slice(0, WAVING_ARM_INDEX)
        .filter((layer) => isMounted(layer, wave))
        .map((layer) => renderLayer(layer, play, scale))}
      {wave >= WAVING_ARM_WAVE ? <WavingArm play={play} scale={scale} /> : null}
      {SLIDE1_LAYERS.slice(WAVING_ARM_INDEX)
        .filter((layer) => isMounted(layer, wave))
        .map((layer) => renderLayer(layer, play, scale))}
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
