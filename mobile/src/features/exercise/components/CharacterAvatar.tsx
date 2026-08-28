import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';

import OrtoEyebrow from '@/assets/characters/eyebrow.svg';
import { FACE_CLOSED, FACE_OPEN } from '@/src/features/exercise/components/faceSvg';
import { colors } from '@/src/theme/colors';

const body = require('@/assets/characters/body.png');
const decorations = require('@/assets/characters/decorations.png');

// The character box aspect ratio, taken from the Figma "Sound component" (164.78 x 179).
const ASPECT = 164.779 / 179;
export const DEFAULT_AVATAR_WIDTH = 168;

// Each layer's rect as a percentage of the character box. Derived from the layer
// offsets/sizes in the Figma component so the whole thing scales as one unit.
type Rect = { left: number; top: number; width: number; height: number };
const LAYERS: Record<'glow' | 'body' | 'decorations' | 'eyebrow' | 'face', Rect> = {
  glow: { left: -18.3, top: -13.2, width: 136.35, height: 119.93 },
  // body.png carries ~16% empty padding on its right, so the sphere sits left of
  // center; nudge it right so the globe centers under the face/earbuds.
  body: { left: 3.9, top: 0, width: 100, height: 100 },
  decorations: { left: 9.68, top: 28.46, width: 79.9, height: 30.17 },
  // The eyebrow's own box, not its drop-shadow's: the old rect (49.76 x 22.53) was the
  // Figma filter box the flattened PNG was exported at (node I763:8687;335:2929). Solved
  // by aligning the Figma render's brow against its pupils/smile, so the brow-to-eye gap
  // matches the design — Figma's reported node box is ~2.4% larger than the path itself.
  eyebrow: { left: 28.45, top: 17.18, width: 37.13, height: 11.12 },
  face: { left: 31.56, top: 30.16, width: 37.62, height: 24.77 },
};

const pct = (n: number): DimensionValue => `${n}%`;
const rectStyle = (r: Rect) => ({
  position: 'absolute' as const,
  left: pct(r.left),
  top: pct(r.top),
  width: pct(r.width),
  height: pct(r.height),
});

// Listening sound-wave bars, inner -> outer. The taller a bar rises the bluer it
// gets; as it shrinks it fades toward white — so the blue peak travels along the row.
const WAVE_BAR_HEIGHTS = [11.5, 15.7, 19.8, 24];
const WAVE_MAX_H = 24;
const WAVE_WHITE = '#EFF5FE';
const WAVE_BLUE = '#5088EE';
const DOTS_COUNT = 4;
// Shared cadence so the side wave bars and the dots pulse at the same, calm speed.
const WAVE_PERIOD = 950;

interface CharacterAvatarProps {
  /** When true the character "listens": eyes closed + sound waves + gentle motion.
   *  When false it is fully static (eyes open), so motion tracks audio playback. */
  playing: boolean;
  width?: number;
}

export default function CharacterAvatar({ playing, width = DEFAULT_AVATAR_WIDTH }: CharacterAvatarProps) {
  const height = width / ASPECT;
  const scale = width / 164.779;

  // Float + a whisper of sway, and a soft glow pulse — but only while audio plays.
  const bob = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      bob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(bob);
      cancelAnimation(pulse);
      bob.value = withTiming(0, { duration: 450 });
      pulse.value = withTiming(0, { duration: 450 });
    }
  }, [playing, bob, pulse]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -bob.value * 5.5 * scale },
      { scale: 1 + bob.value * 0.012 },
      { rotate: `${(bob.value - 0.5) * 1.2}deg` },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
    transform: [{ scale: 0.96 + pulse.value * 0.08 }],
  }));

  return (
    <View style={[styles.root, { width, height }]}>
      <Animated.View style={[rectStyle(LAYERS.glow), glowStyle]} pointerEvents="none">
        <GlowRing />
      </Animated.View>

      <Animated.View style={[styles.fill, bobStyle]}>
        <Image source={body} style={rectStyle(LAYERS.body)} contentFit="contain" />
        <Image source={decorations} style={rectStyle(LAYERS.decorations)} contentFit="contain" />
        <View style={rectStyle(LAYERS.eyebrow)}>
          <OrtoEyebrow width="100%" height="100%" />
        </View>
        <View style={rectStyle(LAYERS.face)}>
          <SvgXml xml={playing ? FACE_CLOSED : FACE_OPEN} width="100%" height="100%" />
        </View>
      </Animated.View>

      {playing ? (
        <>
          <WaveCluster side="left" scale={scale} height={height} />
          <WaveCluster side="right" scale={scale} height={height} />
          <DotsRow scale={scale} width={width} height={height} />
        </>
      ) : null}
    </View>
  );
}

// Soft purple aura behind the character (the Figma glow flattened onto white on
// export, so we redraw it as a transparent radial gradient instead).
function GlowRing() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        {/* Figma glow: transparent center -> rgba(205,184,255,.35) at the rim.
            Extra stops soften the band (approximating the design's blur). */}
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#CDB8FF" stopOpacity={0} />
          <Stop offset="0.55" stopColor="#CDB8FF" stopOpacity={0.12} />
          <Stop offset="0.64" stopColor="#CDB8FF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#CDB8FF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#glow)" />
    </Svg>
  );
}

function WaveCluster({ side, scale, height }: { side: 'left' | 'right'; scale: number; height: number }) {
  const heights = side === 'left' ? [...WAVE_BAR_HEIGHTS].reverse() : WAVE_BAR_HEIGHTS;
  const gap = 3.4 * scale;
  return (
    <View
      style={[
        styles.waveCluster,
        { gap, top: height * 0.32 },
        side === 'left' ? { left: -6 * scale } : { right: -6 * scale },
      ]}
    >
      {heights.map((h, index) => {
        // innerRank = 0 for the bar nearest the sphere, so the pulse travels outward.
        const innerRank = side === 'left' ? WAVE_BAR_HEIGHTS.length - 1 - index : index;
        return (
          <WaveBar
            key={index}
            height={h * scale}
            heightRatio={h / WAVE_MAX_H}
            width={3.4 * scale}
            delay={innerRank * (WAVE_PERIOD / 2)}
          />
        );
      })}
    </View>
  );
}

function WaveBar({
  height,
  heightRatio,
  width,
  delay,
}: {
  height: number;
  heightRatio: number;
  width: number;
  delay: number;
}) {
  const s = useSharedValue(0.4);
  useEffect(() => {
    // Grow then shrink; staggered per bar so the tall "peak" travels along the row.
    s.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: WAVE_PERIOD, easing: Easing.out(Easing.quad) }),
          withTiming(0.4, { duration: WAVE_PERIOD, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, s]);
  // Colour tracks the bar's live height (base height x current scale): taller = bluer,
  // shorter = whiter, so the blue travels with the peak.
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: s.value }],
    backgroundColor: interpolateColor(s.value * heightRatio, [0.2, 1], [WAVE_WHITE, WAVE_BLUE]),
  }));
  return <Animated.View style={[{ width, height, borderRadius: width / 2 }, style]} />;
}

function DotsRow({ scale, width, height }: { scale: number; width: number; height: number }) {
  const dot = 5 * scale;
  return (
    <View style={[styles.dotsRow, { top: height * 0.88, width, gap: 4 * scale }]}>
      {Array.from({ length: DOTS_COUNT }).map((_, index) => (
        <Dot key={index} size={dot} delay={index * (WAVE_PERIOD / 2)} />
      ))}
    </View>
  );
}

function Dot({ size, delay }: { size: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    // Same cadence as the wave bars (one full up+down == one bar cycle).
    p.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: WAVE_PERIOD, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: WAVE_PERIOD, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + p.value * 0.7,
    transform: [{ scale: 0.85 + p.value * 0.4 }],
  }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.wave[1] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  waveCluster: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
