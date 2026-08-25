import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { easingFor, type LayerSpec } from '@/src/features/onboarding/motion';

/** Settle value when a track doesn't name one: 1 for the multiplicative props, 0 for the additive ones. */
function settleValue(prop: string): number {
  return prop === 'opacity' || prop === 'scale' ? 1 : 0;
}

interface AnimatedLayerProps {
  spec: LayerSpec;
  /** Flips to true when the slide first becomes visible; the entrance runs once. */
  play: boolean;
  /** Design px -> device px. */
  scale: number;
  children: ReactNode;
}

/**
 * Positions one Figma layer in the scaled design board and replays its keyframe
 * tracks. Every layer of every slide goes through this — the per-slide files only
 * supply geometry (from `motion.ts`) and artwork.
 */
export default function AnimatedLayer({ spec, play, scale, children }: AnimatedLayerProps) {
  const tracks = spec.tracks;

  // Seed each shared value at its track's starting value so nothing flashes at its
  // settled position on the frame before `play` turns true.
  const initial = (prop: string) => {
    const track = tracks.find((t) => t.prop === prop);
    return track ? track.from : settleValue(prop);
  };

  const opacity = useSharedValue(initial('opacity'));
  const translateY = useSharedValue(initial('translateY'));
  const layerScale = useSharedValue(initial('scale'));
  const rotate = useSharedValue(initial('rotate'));

  useEffect(() => {
    if (!play) return;

    for (const track of tracks) {
      const target = track.to ?? settleValue(track.prop);
      const animation = withDelay(
        track.delay,
        withTiming(target, { duration: track.duration, easing: easingFor(track.curve) })
      );

      if (track.prop === 'opacity') opacity.value = animation;
      else if (track.prop === 'translateY') translateY.value = animation;
      else if (track.prop === 'scale') layerScale.value = animation;
      else rotate.value = animation;
    }
  }, [play, tracks, opacity, translateY, layerScale, rotate]);

  // translateY is authored in design px, so it has to ride the same scale as the box.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value * scale },
      { scale: layerScale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Rotation/skew/mirroring baked into the Figma layer sits under the animated
  // transform, so an animated rotate composes on top of the resting angle rather
  // than replacing it. Order matches Tailwind's fixed canonical composition
  // (rotate -> skewX -> scale), same convention as FigmaBoard.tsx.
  const staticTransform = [
    ...(spec.staticRotate ? [{ rotate: `${spec.staticRotate}deg` }] : []),
    ...(spec.staticSkewX ? [{ skewX: `${spec.staticSkewX}deg` }] : []),
    ...(spec.flipY ? [{ scaleY: -1 }] : []),
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          left: spec.rect.left * scale,
          top: spec.rect.top * scale,
          width: spec.rect.width * scale,
          height: spec.rect.height * scale,
        },
        animatedStyle,
      ]}
    >
      <Animated.View
        style={[
          spec.artSize ? styles.centre : styles.fill,
          staticTransform.length > 0 && { transform: staticTransform },
        ]}
      >
        {spec.artSize ? (
          <View style={{ width: spec.artSize.width * scale, height: spec.artSize.height * scale }}>
            {children}
          </View>
        ) : (
          children
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
  // Figma's `flex items-center justify-center`: an explicitly-sized child is
  // centred in the layout box rather than stretched to fill it (matches the
  // `hypot`/`size` centring convention in FigmaBoard.tsx).
  centre: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
