/**
 * Dev-only mount/settle timing for Slide1 — there's no instrumentation anywhere else in
 * the app (no console.time, no react-native-performance, no dev overlay). Three numbers
 * per mount, all logged relative to `t0` (captured on the first render):
 *  - `commit`  — t0 -> the mount effect firing
 *  - `layout`  — t0 -> the root View's first onLayout
 *  - `settle`  — t0 -> the last dropped frame (>32ms gap) during the entrance, via
 *                `recordFrameGaps`, starting once `play` flips true
 *
 * Every branch is `__DEV__`-gated and dead-code-eliminated from release bundles; the
 * hook itself is unconditional (rules-of-hooks) so it's safe to call from Slide1 as-is.
 */

import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { recordFrameGaps } from '@/src/features/onboarding/__perf__/frameGapRecorder';

const SETTLE_WINDOW_MS = 3000;

export function useDevMountPerf(label: string, play: boolean): { onLayout: (event: LayoutChangeEvent) => void } {
  // `useState`'s lazy initializer is React's sanctioned escape hatch for a one-time
  // impure read (https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state)
  // — `useRef(performance.now())` would call `performance.now()` on every render instead.
  const [t0] = useState(() => (__DEV__ ? performance.now() : 0));
  const loggedLayout = useRef(false);
  const startedSettleRecording = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    const elapsed = performance.now() - t0;
    console.log(`[perf:${label}] commit +${elapsed.toFixed(1)}ms`);
    // Only meant to run once, right after this component's first commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!__DEV__ || !play || startedSettleRecording.current) return;
    startedSettleRecording.current = true;
    recordFrameGaps(SETTLE_WINDOW_MS, (summary) => {
      const settleElapsed = summary.settleAt - t0;
      console.log(
        `[perf:${label}] settle +${settleElapsed.toFixed(1)}ms` +
          ` (maxGap=${summary.maxGapMs.toFixed(1)}ms,` +
          ` drops>32ms=${summary.dropsOver32ms}, drops>100ms=${summary.dropsOver100ms})`
      );
    });
  }, [label, play, t0]);

  function onLayout(_event: LayoutChangeEvent) {
    if (!__DEV__ || loggedLayout.current) return;
    loggedLayout.current = true;
    const elapsed = performance.now() - t0;
    console.log(`[perf:${label}] layout +${elapsed.toFixed(1)}ms`);
  }

  return { onLayout };
}
