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

// Both characters are flat baked images (face + smile baked in) — Naran the yellow
// buddy (Figma node 513:8273, waving pose, 353x298 @4x, #F8FBFF flood-filled to
// transparent) and Khishigee the green sprout (Figma node 444:5690, "thinking" pose,
// 316x428). To make either "talk" we overlay an animated mouth on top of the baked
// smile and squash/stretch the body — same technique, different proportions/colours,
// so one component now drives both off a small per-character table.
const buddyBody = require('@/assets/characters/buddy/body.png');
const sproutBody = require('@/assets/characters/sprout-talk/body.png');

export type TalkingCharacterKind = 'buddy' | 'sprout';

interface CharacterSpec {
  body: number;
  aspect: number; // width / height
  defaultWidth: number;
  // Baked smile position as a fraction of the character box (measured from the body
  // PNG's dark-pixel connected component). The overlay mouth is sized a touch larger
  // so it fully covers the baked smile at every flap phase.
  mouth: { cx: number; cy: number; w: number; h: number };
  mouthColor: string;
  tongueColor: string;
}

const CHARACTERS: Record<TalkingCharacterKind, CharacterSpec> = {
  buddy: {
    body: buddyBody,
    aspect: 353 / 298,
    defaultWidth: 108,
    // Measured from body.png: dark-pixel connected component x 146..212, y 127..162
    // of 353x298 — the wide central smile, distinct from the eye pupils/eyebrows/arms.
    mouth: { cx: 0.507, cy: 0.49, w: 0.22, h: 0.12 },
    mouthColor: '#1A1613', // near-black, matching the baked smile
    tongueColor: '#FF8AA0',
  },
  sprout: {
    body: sproutBody,
    aspect: 316 / 428,
    defaultWidth: 96,
    // Measured from body.png: dark-pixel centroid x 130..185, y 189..209 of 316x428.
    mouth: { cx: 0.498, cy: 0.465, w: 0.22, h: 0.092 },
    mouthColor: '#47262F',
    tongueColor: '#FF9DB0',
  },
};

/** Public aspect ratios, for a caller that needs to size around the character before
 *  it mounts (e.g. `LetterChoice` positioning hand art relative to the sprout). */
export const CHARACTER_ASPECT: Record<TalkingCharacterKind, number> = {
  buddy: CHARACTERS.buddy.aspect,
  sprout: CHARACTERS.sprout.aspect,
};

// Flap cadence (ms per open OR close half-cycle). Same calm pace for both characters.
const FLAP_MS = 300;

interface TalkingCharacterProps {
  character: TalkingCharacterKind;
  /** Drives the talking animation: mouth flaps open/closed + the body squash-bobs
   *  while true; still with the resting baked smile while false. Wire it to the
   *  audio player's status.playing so it tracks playback. */
  playing: boolean;
  width?: number;
  /** Fraction of the sprite's full height to show, measured from the top. The sprite
   *  is a full-body character (sprout-tip → face → landscape belly → shadow, for
   *  `sprout`); some screens clip it to just the top portion. 1 = whole body. The
   *  sprite still renders at full size internally (so the mouth overlay + animation
   *  stay aligned) — only the visible viewport is shortened and the bottom is
   *  clipped. Unused (always 1) for `buddy`, which is always shown in full. */
  visibleFraction?: number;
}

/**
 * A talking character overlay: because the face is a flat baked image, "talking" is a
 * lip-flap (an animated mouth drawn over the baked smile, shown only while playing)
 * combined with a gentle squash-stretch of the whole body — both driven off `playing`.
 */
export default function TalkingCharacter({
  character,
  playing,
  width,
  visibleFraction = 1,
}: TalkingCharacterProps) {
  const spec = CHARACTERS[character];
  const w = width ?? spec.defaultWidth;
  const height = w / spec.aspect;
  // Clipped viewport height. The sprite still lays out at full `height` inside; the
  // root is shortened + overflow-hidden so the bottom of the body is cropped away.
  const visibleHeight = height * visibleFraction;
  const scale = w / spec.defaultWidth;

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

  const mouthW = w * spec.mouth.w;
  const mouthH = height * spec.mouth.h;

  return (
    <View style={[styles.root, { width: w, height: visibleHeight }]} pointerEvents="none">
      {/* Full-size sprite, top-anchored, so only the top `visibleFraction` shows through
          the clipped root. Mouth positions below are fractions of the full `height`. */}
      <Animated.View style={[styles.body, { width: w, height }, bodyStyle]}>
        <Image source={spec.body} style={styles.fill} contentFit="contain" />
        <Animated.View
          style={[
            styles.mouth,
            {
              width: mouthW,
              height: mouthH,
              borderRadius: mouthH * 0.42,
              left: w * (spec.mouth.cx - spec.mouth.w / 2),
              top: height * (spec.mouth.cy - spec.mouth.h / 2),
              backgroundColor: spec.mouthColor,
            },
            mouthStyle,
          ]}
        >
          <View style={[styles.tongue, { borderRadius: mouthH, backgroundColor: spec.tongueColor }]} />
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tongue: {
    width: '62%',
    height: '58%',
    marginBottom: '-14%',
  },
});
