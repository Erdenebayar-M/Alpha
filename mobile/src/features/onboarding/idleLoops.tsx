import { createContext, type FC, type ReactNode, useContext, useEffect } from 'react';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { EASE_SPRING_B, WAVE_KEYFRAMES, WAVE_ORIGIN, WAVE_REPEAT_COUNT } from '@/src/features/onboarding/motion';

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
 * That match is the whole trick behind `withEyeOpen`'s cross-dissolve: measured at 0.02
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

// ---------------------------------------------------------------------------
// Eyes that open and shut on demand (`EyeOpenProvider` + `withEyeOpen`/`withEyeCover`).
//
// Used by the boy on the Gender step, whose eyes open when he's picked and shut again
// when he's un-picked. Both directions are read off ONE shared driver rather than being
// two one-shot animations fired on mount, for two reasons:
//
//  - Nothing mounts or unmounts when the selection changes. The previous version swapped
//    the whole `CharacterArt` (a single flattened SVG -> a five-leaf board) at the moment
//    of the tap, so five SVGs had to mount and paint *before* the opening could start —
//    which is what made the open read as a stutter. Every leaf now lives for the whole
//    step and only its transform changes, on the UI thread.
//  - Closing is the same choreography backwards, for free, and it can be interrupted:
//    tapping twice quickly retargets the driver from wherever it currently is instead of
//    restarting from either end.
// ---------------------------------------------------------------------------

/** 0 = shut (drawn closed-eye art visible), 1 = open. Absent provider => open. */
const EyeOpenContext = createContext<SharedValue<number> | null>(null);

/** A wide-eyed pop on the way open; a softer, slightly slower settle on the way shut. */
const EYE_OPEN_MS = 340;
const EYE_CLOSE_MS = 260;

/**
 * The cross-dissolve, expressed as three overlapping windows on the driver:
 * the real eye fades in almost immediately, the drawn arcs fade out over the first
 * third, and only then does the eye actually grow. So the arcs are still partly there
 * while the eye is a shut slit of about their own stroke weight sitting on top of them —
 * there is no frame with a bare face, and none with two distinguishable shapes. At the
 * closed end the eye is fully transparent, so an unselected character is pixel-identical
 * to its plain flattened art.
 */
const EYE_FADE_IN_AT = 0.12;
const LID_FADE_OUT_AT = 0.35;
const EYE_GROWS_FROM = 0.28;

/**
 * Drives every `withEyeOpen`/`withEyeCover` leaf below it. Wrap the character (or
 * anything containing it — this crosses `AvatarBubble` and `FigmaBoard` untouched) and
 * flip `open`.
 */
export function EyeOpenProvider({ open, children }: { open: boolean; children: ReactNode }) {
  const value = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    value.value = open
      ? // `EASE_SPRING_B` — the sampled Figma spring every character entrance rides.
        // Its 1.068 overshoot carries through the interpolations below as a small
        // wide-eyed pop, which is what makes waking up read as a reaction to the tap.
        withTiming(1, { duration: EYE_OPEN_MS, easing: EASE_SPRING_B })
      : // Shutting gets no overshoot: eyelids don't bounce closed.
        withTiming(0, { duration: EYE_CLOSE_MS, easing: Easing.inOut(Easing.ease) });
  }, [open, value]);

  return <EyeOpenContext.Provider value={value}>{children}</EyeOpenContext.Provider>;
}

function useEyeOpen(): SharedValue<number> {
  // Hooks can't be conditional, so the fallback is always created; it's a constant 1, so
  // a character used without a provider (Personal Info, Grade) just renders open-eyed.
  const standalone = useSharedValue(1);
  return useContext(EyeOpenContext) ?? standalone;
}

/**
 * An eye leaf that follows the `EyeOpenProvider` driver — shut and invisible at 0, open
 * and blinking at 1 — instead of blinking unconditionally like `withBlink`.
 *
 * `fromX` (board px) lets the eye *travel* as it opens, for the case where its resting
 * position isn't where the closed art it replaces was drawn: at the shut end it sits
 * shifted by `fromX`, on top of that art, and converges to its real box as it opens.
 */
export function withEyeOpen(Art: FC<SvgProps>, fromX = 0, blinkHoldMs = 2400): FC<SvgProps> {
  function Eye(props: SvgProps) {
    const open = useEyeOpen();
    const blink = useSharedValue(1);

    useEffect(() => {
      // Runs forever, but is scaled out of existence below while the eye is shut, so a
      // closed-eyed character never twitches. Same squash and pace as `withBlink`.
      blink.value = withRepeat(
        withDelay(
          blinkHoldMs,
          withSequence(
            withTiming(0.15, { duration: 70, easing: LOOP_EASE }),
            withTiming(1, { duration: 120, easing: LOOP_EASE })
          )
        ),
        -1,
        false
      );
    }, [blink]);

    const style = useAnimatedStyle(() => {
      const t = open.value;
      // Three-point range so the driver's spring overshoot (it peaks at 1.068) carries
      // into a small over-open that settles back, instead of being clamped flat at 1 —
      // while the shut end stays pinned at the slit rather than extrapolating past it.
      const lid = interpolate(t, [EYE_GROWS_FROM, 1, 1.07], [SHUT_SCALE_Y, 1, 1.06], Extrapolation.CLAMP);
      const opened = Math.min(Math.max(t, 0), 1);
      return {
        opacity: interpolate(t, [0, EYE_FADE_IN_AT], [0, 1], Extrapolation.CLAMP),
        transform: [
          { translateX: interpolate(t, [EYE_GROWS_FROM, 1], [fromX, 0], Extrapolation.CLAMP) },
          // Blinking only bites in proportion to how open the eye is.
          { scaleY: lid * (1 - (1 - blink.value) * opened) },
        ],
      };
    });

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return Eye;
}

/**
 * The counterpart leaf: a character's *drawn* closed-eye art (the arcs it ships with),
 * fading out from under the opening eye and back in as it shuts.
 */
export function withEyeCover(Art: FC<SvgProps>): FC<SvgProps> {
  function EyeCover(props: SvgProps) {
    const open = useEyeOpen();

    const style = useAnimatedStyle(() => ({
      opacity: interpolate(open.value, [0, LID_FADE_OUT_AT], [1, 0], Extrapolation.CLAMP),
    }));

    return (
      <Animated.View style={[{ width: '100%', height: '100%' }, style]}>
        <Art {...props} />
      </Animated.View>
    );
  }
  return EyeCover;
}

/**
 * Swings a hand/arm leaf through `WAVE_KEYFRAMES` (the same bounded wave `WavingArm` in
 * `slides/Slide1.tsx` plays) a fixed number of times on mount, then settles at rest.
 * A second, independent implementation of the same swing data: `WavingArm` is a
 * separately positioned overlay keyed to a slide's own entrance choreography
 * (`WAVE_LAYER`'s fade-in delay), which doesn't apply to a leaf that's just part of a
 * character board with no entrance timeline of its own.
 *
 * `origin` is where the limb swings from, and it matters: the default is the leaf's
 * centre, which for a whole-arm asset is mid-forearm, so the shoulder end swings out
 * of the body as far as the hand does and the arm reads as detached. Pass the point
 * where the art meets the body — `WAVE_ORIGIN` is slide 1's, for reference.
 */
export function withWave(
  Art: FC<SvgProps>,
  startDelayMs = 200,
  repeatCount = WAVE_REPEAT_COUNT,
  origin: string = WAVE_ORIGIN
): FC<SvgProps> {
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
      <Animated.View style={[{ width: '100%', height: '100%', transformOrigin: origin }, style]}>
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
