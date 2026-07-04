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

// "Naran" the yellow buddy, waving pose. Exported from Figma node 513:8273 (the
// vector character composited @4x, the #F8FBFF export background flood-filled to
// transparent → 353x298) and used as a single flat image — the face (and its baked
// smile) plus the raised waving arm are baked in. To make it "talk" we overlay an
// animated mouth on top of the baked smile and squash/stretch the body, exactly like
// TalkingSprout does for the green sprout.
const body = require('@/assets/characters/buddy/body.png');

const ASPECT = 353 / 298; // width / height (the buddy is wider than tall)
export const DEFAULT_TALKING_BUDDY_WIDTH = 108;

// Baked smile position as a fraction of the buddy box, measured from body.png
// (dark-pixel connected component: x 146..212, y 127..162 of 353x298 → the wide
// central smile, distinct from the eye pupils / eyebrows / arms). The overlay mouth
// is sized a touch larger so it fully covers the baked smile at every flap phase.
const MOUTH = {
  cx: 0.507,
  cy: 0.49,
  w: 0.22, // fraction of box width
  h: 0.12, // fraction of box height (open height) — shallow so it reads as a mouth, not a gape
};

// Flap cadence (ms per open OR close half-cycle). Matches TalkingSprout's calm pace.
const FLAP_MS = 300;

const MOUTH_COLOR = '#1A1613'; // near-black, matching the baked smile
const TONGUE_COLOR = '#FF8AA0';

interface TalkingBuddyProps {
  /** Drives the talking animation: mouth flaps open/closed + the body squash-bobs
   *  while true; still with the resting baked smile while false. Wire it to the
   *  audio player's status.playing so it tracks playback. */
  playing: boolean;
  width?: number;
}

/**
 * Talking Naran (the yellow buddy). Because the face is a flat baked image, "talking"
 * is a lip-flap (an animated mouth drawn over the baked smile, shown only while
 * playing) combined with a gentle squash-stretch of the whole body — both driven off
 * `playing`. Same technique as TalkingSprout, tuned to this character's proportions.
 */
export default function TalkingBuddy({ playing, width = DEFAULT_TALKING_BUDDY_WIDTH }: TalkingBuddyProps) {
  const height = width / ASPECT;
  const scale = width / DEFAULT_TALKING_BUDDY_WIDTH;

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
    <View style={[styles.root, { width, height }]} pointerEvents="none">
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
