import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Khishigee the green sprout, "thinking" pose. Exported from Figma node 444:5690
// (316x428, the #F8FBFF export background flood-filled to transparent) and used as a
// single flat image — the face (and its smile) is baked in. To make it "talk" we
// overlay an animated mouth on top of the baked smile and squash/stretch the body.
const body = require('@/assets/characters/sprout-talk/body.png');

export const TALKING_SPROUT_ASPECT = 316 / 428;
const ASPECT = TALKING_SPROUT_ASPECT;
export const DEFAULT_TALKING_SPROUT_WIDTH = 96;

// Baked smile position as a fraction of the sprout box, measured from body.png
// (dark-pixel centroid: x 130..185, y 189..209 of 316x428). The overlay mouth is
// sized a touch larger so it fully covers the baked smile at every flap phase.
const MOUTH = {
  cx: 0.498,
  cy: 0.465,
  w: 0.22, // fraction of box width
  h: 0.092, // fraction of box height (open height) — kept shallow so it reads as a mouth, not a gape
};

// Flap cadence (ms per open OR close half-cycle). Higher = slower, calmer talking.
const FLAP_MS = 300;

const MOUTH_COLOR = '#47262F';
const TONGUE_COLOR = '#FF9DB0';

interface TalkingSproutProps {
  /** Drives the talking animation: mouth flaps open/closed + the body squash-bobs
   *  while true; still with the resting baked smile while false. Wire it to the
   *  audio player's status.playing so it tracks playback. */
  playing: boolean;
  width?: number;
  /** Fraction of the sprite's full height to show, measured from the top. The sprite
   *  is a full-body character (sprout-tip → face → landscape belly → shadow); the
   *  design on some screens clips it to just the top portion (head-to-chest, above the
   *  belly). 1 = whole body; ~0.64 = the "peeking over the card" crop. The sprite still
   *  renders at full size internally (so the mouth overlay + animation stay aligned) —
   *  only the visible viewport is shortened and the bottom is clipped. */
  visibleFraction?: number;
}

/**
 * Talking Khishigee. Because the face is a flat baked image, "talking" is a
 * lip-flap (an animated mouth drawn over the baked smile, shown only while playing)
 * combined with a gentle squash-stretch of the whole body — both driven off `playing`.
 */
export default function TalkingSprout({
  playing,
  width = DEFAULT_TALKING_SPROUT_WIDTH,
  visibleFraction = 1,
}: TalkingSproutProps) {
  const height = width / ASPECT;
  // Clipped viewport height. The sprite still lays out at full `height` inside; the root
  // is shortened + overflow-hidden so the bottom of the body is cropped away.
  const visibleHeight = height * visibleFraction;
  const scale = width / DEFAULT_TALKING_SPROUT_WIDTH;

  // flap ping-pongs 0..1 (mouth openness); engaged fades the whole effect in/out so
  // the resting baked smile shows when idle.
  const flap = useSharedValue(0);
  const engaged = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      engaged.value = withTiming(1, { duration: 180 });
      flap.value = withRepeat(
        withTiming(1, { duration: FLAP_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true // reverse → smooth open/close ping-pong
      );
    } else {
      cancelAnimation(flap);
      flap.value = withTiming(0, { duration: 160 });
      engaged.value = withTiming(0, { duration: 220 });
    }
    return () => cancelAnimation(flap);
  }, [playing, flap, engaged]);

  // Talk-bounce: stretch up + narrow slightly as the mouth opens, so the body
  // "speaks" in sync with the flap. Gated by `engaged` so it's still when idle.
  const bodyStyle = useAnimatedStyle(() => {
    const t = flap.value * engaged.value;
    return {
      transform: [
        { translateY: -t * 2.5 * scale },
        { scaleX: 1 - t * 0.04 },
        { scaleY: 1 + t * 0.05 },
      ],
    };
  });

  // Mouth openness: never fully closed (0.4 floor) so it always covers the baked smile.
  const mouthStyle = useAnimatedStyle(() => ({
    opacity: engaged.value,
    transform: [{ scaleY: 0.4 + flap.value * 0.6 }],
  }));

  const mouthW = width * MOUTH.w;
  const mouthH = height * MOUTH.h;

  return (
    <View style={[styles.root, { width, height: visibleHeight }]} pointerEvents="none">
      {/* Full-size sprite, top-anchored, so only the top `visibleFraction` shows through
          the clipped root. Mouth positions below are fractions of the full `height`. */}
      <Animated.View style={[styles.body, { width, height }, bodyStyle]}>
        <Image source={body} style={styles.fill} contentFit="contain" />
        <Animated.View
          style={[
            styles.mouth,
            {
              width: mouthW,
              height: mouthH,
              borderRadius: mouthH * 0.42,
              left: width * (MOUTH.cx - MOUTH.w / 2),
              top: height * (MOUTH.cy - MOUTH.h / 2),
            },
            mouthStyle,
          ]}
        >
          <View style={[styles.tongue, { borderRadius: mouthH }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  mouth: {
    position: 'absolute',
    backgroundColor: MOUTH_COLOR,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tongue: {
    width: '62%',
    height: '58%',
    marginBottom: '-14%',
    backgroundColor: TONGUE_COLOR,
  },
});
