import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// The three poses of Khishigee (the green sprout). All three PNGs were exported
// from the same Figma "Khishigee" frame (87x107 @4x = 348x428), so they share one
// canvas and stay pixel-aligned when stacked — we just cross-fade their opacity.
const pose1 = require('@/assets/characters/sprout/pose1.png'); // idle: wink, hands on hips
const pose2 = require('@/assets/characters/sprout/pose2.png'); // playing: eyes open, arm raised
const pose3 = require('@/assets/characters/sprout/pose3.png'); // done: settled wink, hand on cheek

// Figma Khishigee frame aspect (87 x 107).
const ASPECT = 348 / 428;
export const DEFAULT_SPROUT_WIDTH = 104;

const FADE_MS = 300;

export type SproutState = 'idle' | 'playing' | 'done';

interface SproutAvatarProps {
  /** Drives which pose is shown (cross-faded) and how lively the bob is:
   *  idle = pose 1 (gentle sway), playing = pose 2 (full bob), done = pose 3 (settling). */
  state: SproutState;
  width?: number;
}

export default function SproutAvatar({ state, width = DEFAULT_SPROUT_WIDTH }: SproutAvatarProps) {
  const height = width / ASPECT;
  const scale = width / 104;

  // One always-running oscillation (0->1->0); amplitude is scaled by `amp` so the
  // motion swells while audio plays and settles when idle/done — no restart glitch.
  const phase = useSharedValue(0);
  const amp = useSharedValue(0.5);

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(phase);
  }, [phase]);

  useEffect(() => {
    const target = state === 'playing' ? 1 : state === 'done' ? 0.3 : 0.5;
    amp.value = withTiming(target, { duration: 500, easing: Easing.out(Easing.quad) });
  }, [state, amp]);

  // Opacity per pose, cross-faded on state change.
  const o1 = useSharedValue(1);
  const o2 = useSharedValue(0);
  const o3 = useSharedValue(0);
  useEffect(() => {
    o1.value = withTiming(state === 'idle' ? 1 : 0, { duration: FADE_MS });
    o2.value = withTiming(state === 'playing' ? 1 : 0, { duration: FADE_MS });
    o3.value = withTiming(state === 'done' ? 1 : 0, { duration: FADE_MS });
  }, [state, o1, o2, o3]);

  const bobStyle = useAnimatedStyle(() => {
    const centered = phase.value - 0.5; // -0.5 .. 0.5
    return {
      transform: [
        { translateY: -centered * 11 * amp.value * scale },
        { rotate: `${centered * 1.4 * amp.value}deg` },
        { scale: 1 + (phase.value - 0.5) * 0.012 * amp.value },
      ],
    };
  });

  const s1 = useAnimatedStyle(() => ({ opacity: o1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: o2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: o3.value }));

  return (
    <Animated.View style={[styles.root, { width, height }, bobStyle]} pointerEvents="none">
      <Animated.View style={[styles.fill, s1]}>
        <Image source={pose1} style={styles.fill} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.fill, s2]}>
        <Image source={pose2} style={styles.fill} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.fill, s3]}>
        <Image source={pose3} style={styles.fill} contentFit="contain" />
      </Animated.View>
    </Animated.View>
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
    width: '100%',
    height: '100%',
  },
});
