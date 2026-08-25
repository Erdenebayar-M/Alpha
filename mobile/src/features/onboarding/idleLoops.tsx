import { type FC, useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { EASE_SPRING_B, WAVE_KEYFRAMES, WAVE_REPEAT_COUNT } from '@/src/features/onboarding/motion';

/**
 * Idle-loop animations shared by every onboarding character — the Slide 1 brand mascots
 * (`characters.tsx`) and the gender/personal-info/grade characters
 * (`profileSetup/genderCharacters.tsx`). Unlike `motion.ts`'s `Track`/`AnimatedLayer`
 * system, which choreographs a one-shot entrance keyed to slide activation, these
 * characters just sit on screen and need to look alive the whole time — so each helper
 * here wraps a leaf's `Art` component in its own `withRepeat` loop, the same
 * bespoke-idle-component pattern `WavingHand` uses in `slides/Slide1.tsx` for its own
 * (bounded, not looping) wave, and hands back a component with the same `FC<SvgProps>`
 * shape so it can be dropped straight into a `Leaf.Art`.
 */

const LOOP_EASE = Easing.inOut(Easing.ease);

/**
 * `scaleY` for a "shut" eye — a thin slit, deliberately not 0.
 *
 * The eye art it squashes is ~22 board px tall, so this leaves a ~2.6 board px line,
 * which is about the stroke weight of the closed-eye arcs a character is drawn with.
 * That match is the whole trick behind `withReveal`'s cross-dissolve: measured at 0.02
 * the eye collapses below one screen pixel and disappears, and the character is briefly
 * left with a blank face between the arcs fading and the eye becoming visible.
 */
const SHUT_SCALE_Y = 0.12;

/**
 * Blinks an eyes leaf in place: hold, then a quick squash-and-release, on a loop.
 *
 * Only ever apply this to art that is *just* the eyes. Figma exports the girl's whole
 * face — both eyes and the mouth — as one `face` node, and squashing that reads as a
 * grimace rather than a blink; `assets/onboarding/gender/girl/{eyes,mouth}.svg` are that
 * export split in two so the eyes can close on their own. See the note on `BOY` in
 * `genderCharacters.tsx` for why the boy character can't use this at all.
 */
export function withBlink(Art: FC<SvgProps>, holdMs = 2600): FC<SvgProps> {
  function Blinking(props: SvgProps) {
    const scaleY = useSharedValue(1);

    useEffect(() => {
      scaleY.value = withRepeat(
        withDelay(
          holdMs,
          withSequence(
            withTiming(0.15, { duration: 70, easing: LOOP_EASE }),
            withTiming(1, { duration: 120, easing: LOOP_EASE })
          )
        ),
        -1,
        false
      );
    }, [scaleY]);

    const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scaleY.value }] }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Blinking;
}

/**
 * Like `withBlink`, but starts shut and opens once on mount before settling into the
 * same periodic blink — a "waking up" reveal for a character that's about to be shown
 * open-eyed for the first time, rather than one that's already been sitting there.
 *
 * Starts shut at `SHUT_SCALE_Y` rather than part-open, and holds there for `shutMs`
 * before opening. That hold is what lets the character's *drawn* closed-eye art
 * cross-dissolve out underneath (see `withFadeOut` and `BOY_OPEN_EYES` in
 * `profileSetup/genderCharacters.tsx`): while this leaf is squashed it is visually just a
 * dark horizontal line of about the arcs' own stroke weight, so the swap between the two
 * happens with nothing to see. Without the hold, the open eye is already part-grown by
 * the time the arcs fade and the substitution reads as a cut.
 *
 * The opening itself rides `EASE_SPRING_B` — the same spring (sampled from Figma's own
 * entrance data) every character/star/sparkle entrance in Slide 1 uses — rather than the
 * plain `LOOP_EASE` the periodic blink below still uses. A one-shot reveal reads as an
 * intentional motion, so it gets a bit of overshoot; the recurring blink is meant to be a
 * quick, near-instant snap regardless of how often it repeats, so it keeps `LOOP_EASE`.
 *
 * `fromX` (board px) lets the eye *travel* while it opens, for the case where its resting
 * position isn't where the closed art it replaces was drawn: it starts shifted by `fromX`
 * — on top of that art — and converges to its real box as it opens. Defaults to 0, i.e.
 * a purely vertical reveal.
 */
export function withReveal(
  Art: FC<SvgProps>,
  openMs = 320,
  holdMs = 2400,
  shutMs = 110,
  fromX = 0
): FC<SvgProps> {
  function Revealing(props: SvgProps) {
    const scaleY = useSharedValue(SHUT_SCALE_Y);
    const shiftX = useSharedValue(fromX);

    useEffect(() => {
      // Travels on the same clock as the opening: held at `fromX` through the shut-hold,
      // then released alongside the scale. Board px — inside `FigmaBoard` one unit is one
      // board px, since the board is laid out unscaled and scaled once by its parent.
      shiftX.value = withSequence(
        withTiming(fromX, { duration: shutMs, easing: LOOP_EASE }),
        withTiming(0, { duration: openMs, easing: EASE_SPRING_B })
      );
      scaleY.value = withSequence(
        // Hold shut while the drawn closed-eye arcs fade out over the top.
        withTiming(SHUT_SCALE_Y, { duration: shutMs, easing: LOOP_EASE }),
        withTiming(1, { duration: openMs, easing: EASE_SPRING_B }),
        // `withDelay` goes *inside* `withRepeat`, exactly as in `withBlink` above, so
        // `holdMs` is the gap between every blink rather than a one-off pause before an
        // unbroken 190ms blink loop.
        withRepeat(
          withDelay(
            holdMs,
            withSequence(
              withTiming(0.15, { duration: 70, easing: LOOP_EASE }),
              withTiming(1, { duration: 120, easing: LOOP_EASE })
            )
          ),
          -1,
          false
        )
      );
    }, [scaleY, shiftX]);

    const style = useAnimatedStyle(() => ({
      transform: [{ translateX: shiftX.value }, { scaleY: scaleY.value }],
    }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Revealing;
}

/**
 * Fades a leaf out once on mount and leaves it gone — the counterpart to `withReveal`.
 *
 * Exists so a character's *drawn* closed-eye art can retire under a real open eye that
 * is opening in the same moment, instead of being deleted in one frame. The default
 * timings put it fully gone at ~160ms, straddling the end of `withReveal`'s 110ms
 * shut-hold, so the arcs are still partly there as the eye starts to open and the two
 * genuinely dissolve into one another. See `BOY_OPEN_EYES` in
 * `profileSetup/genderCharacters.tsx`.
 */
export function withFadeOut(Art: FC<SvgProps>, holdMs = 70, fadeMs = 90): FC<SvgProps> {
  function FadingOut(props: SvgProps) {
    const opacity = useSharedValue(1);

    useEffect(() => {
      opacity.value = withSequence(
        withTiming(1, { duration: holdMs, easing: LOOP_EASE }),
        withTiming(0, { duration: fadeMs, easing: LOOP_EASE })
      );
    }, [opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return FadingOut;
}

/**
 * Swings a hand/arm leaf through `WAVE_KEYFRAMES` (the same bounded wave `WavingHand` in
 * `slides/Slide1.tsx` plays) a fixed number of times on mount, then settles at rest.
 * A second, independent implementation of the same swing data: `WavingHand` is a
 * separately positioned overlay keyed to a slide's own entrance choreography
 * (`WAVE_LAYER`'s fade-in delay), which doesn't apply to a leaf that's just part of a
 * character board with no entrance timeline of its own.
 */
export function withWave(Art: FC<SvgProps>, startDelayMs = 200, repeatCount = WAVE_REPEAT_COUNT): FC<SvgProps> {
  function Waving(props: SvgProps) {
    const rotate = useSharedValue<number>(WAVE_KEYFRAMES[0].deg);

    useEffect(() => {
      const swings = WAVE_KEYFRAMES.slice(1).map((frame) =>
        withTiming(frame.deg, { duration: frame.duration, easing: LOOP_EASE })
      );
      rotate.value = withDelay(startDelayMs, withRepeat(withSequence(...swings), repeatCount, false));
    }, [rotate]);

    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Waving;
}

/** Gently pulses opacity — used for the girl's `blush` leaf as the "smiling" half of the loop. */
export function withPulse(Art: FC<SvgProps>, periodMs = 1800): FC<SvgProps> {
  function Pulsing(props: SvgProps) {
    const opacity = useSharedValue(1);

    useEffect(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: periodMs / 2, easing: LOOP_EASE }),
          withTiming(1, { duration: periodMs / 2, easing: LOOP_EASE })
        ),
        -1,
        false
      );
    }, [opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Pulsing;
}

/**
 * Widens a mouth leaf on a slow loop, so the character reads as smiling rather than
 * merely blinking. Scales about the leaf's own centre, which is why `mouth.svg` is
 * cropped tight to the mouth instead of keeping the full face viewBox.
 */
export function withSmile(Art: FC<SvgProps>, holdMs = 1500): FC<SvgProps> {
  function Smiling(props: SvgProps) {
    const grow = useSharedValue(0);

    useEffect(() => {
      grow.value = withRepeat(
        withDelay(
          holdMs,
          withSequence(
            withTiming(1, { duration: 420, easing: LOOP_EASE }),
            withTiming(1, { duration: 700, easing: LOOP_EASE }),
            withTiming(0, { duration: 420, easing: LOOP_EASE })
          )
        ),
        -1,
        false
      );
    }, [grow]);

    const style = useAnimatedStyle(() => ({
      transform: [{ scaleX: 1 + grow.value * 0.2 }, { scaleY: 1 + grow.value * 0.3 }],
    }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Smiling;
}

/** A small vertical float, for decorative marks like the girl's heart/flower leaves. */
export function withFloat(Art: FC<SvgProps>, distance = 4, periodMs = 2200): FC<SvgProps> {
  function Floating(props: SvgProps) {
    const translateY = useSharedValue(0);

    useEffect(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-distance, { duration: periodMs / 2, easing: LOOP_EASE }),
          withTiming(0, { duration: periodMs / 2, easing: LOOP_EASE })
        ),
        -1,
        false
      );
    }, [translateY]);

    const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Floating;
}

/**
 * A gentle scale-and-bob breathing loop for a whole character. The boy is one
 * flattened export with no separable eyes, so this stands in for a true blink —
 * see `genderCharacters.tsx`'s note on `BOY`.
 */
export function withBreathe(Art: FC<SvgProps>, periodMs = 2400): FC<SvgProps> {
  function Breathing(props: SvgProps) {
    const style = useBreatheStyle(periodMs);

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Breathing;
}

/**
 * The breathing loop as a hook, for breathing a whole *container* rather than one
 * `Art` leaf.
 *
 * `withBreathe` above can only wrap a single `FC<SvgProps>`, which is fine for a
 * character that is one flattened export, but not for one assembled from several leaves:
 * each leaf scales about its own box centre, so wrapping them individually pulls the
 * character apart. More importantly, a caller can hold this loop on a view that
 * *outlives* a character swap — `AvatarBubble` does exactly that — so the breathing runs
 * on unbroken phase while the art underneath changes, instead of snapping back to the
 * start of a breath at the moment of the swap.
 */
export function useBreatheStyle(periodMs = 2400) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: periodMs / 2, easing: LOOP_EASE }),
        withTiming(1, { duration: periodMs / 2, easing: LOOP_EASE })
      ),
      -1,
      false
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: periodMs / 2, easing: LOOP_EASE }),
        withTiming(0, { duration: periodMs / 2, easing: LOOP_EASE })
      ),
      -1,
      false
    );
  }, [scale, translateY, periodMs]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));
}
