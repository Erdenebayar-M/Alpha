import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { blend, colors, radii, shadow } from '../../../theme/tokens';
import { useLatest } from '../kit';
import { freshSweep, sweepStep } from './rounds';

interface Props {
  /** Pixel width of the track; each of `count` tiles owns an equal slice of it. */
  width: number;
  count: number;
  /** The finger passed these tiles (in order) — voice them; `complete` when it reached the end of the word. */
  onSweep: (passed: number[], complete: boolean) => void;
  /** The finger lifted. */
  onLift: () => void;
  /** False until the instruction has been heard: touches are ignored and use up nothing. */
  enabled: boolean;
}

/** A rail under the tiles. Dragging anywhere along it moves the knob and calls out each tile it passes. */
export function SlideTrack({ width, count, onSweep, onLift, enabled }: Props) {
  // Gesture progress lives in shared values: it never drives rendering.
  const sweep = useSharedValue(freshSweep);
  const done = useSharedValue(false);
  const knobX = useSharedValue(0);
  const latest = useLatest({ onSweep, onLift, enabled });

  const move = (x: number) => {
    if (!latest.current.enabled) return;
    const step = sweepStep(sweep.get(), x, width, count);
    sweep.set(step.next);
    const complete = step.complete && !done.get();
    if (complete) done.set(true);
    if (step.play.length || complete) latest.current.onSweep(step.play, complete);
  };
  const begin = () => sweep.set(freshSweep);
  const lift = () => latest.current.onLift();

  const follow = (e: { x: number }) => {
    'worklet';
    knobX.set(Math.min(width, Math.max(0, e.x)));
    runOnJS(move)(e.x);
  };

  const pan = Gesture.Pan()
    .withTestId('blend-track')
    .minDistance(0)
    .enabled(enabled)
    .onBegin((e) => {
      runOnJS(begin)();
      follow(e);
    })
    .onUpdate(follow)
    .onFinalize(() => runOnJS(lift)());

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knobX.value - blend.knobSize / 2 }] }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.touch, { width }]}>
        <View style={styles.rail} />
        <Animated.View style={[styles.knob, knobStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  touch: { height: blend.trackHeight, justifyContent: 'center' },
  rail: { height: blend.railHeight, borderRadius: radii.pill, backgroundColor: colors.skyDeep },
  knob: {
    position: 'absolute',
    width: blend.knobSize,
    height: blend.knobSize,
    borderRadius: radii.pill,
    backgroundColor: colors.sun,
    ...shadow,
  },
});
