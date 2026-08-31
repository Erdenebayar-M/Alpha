/**
 * Dev-only settle-time measurement: the user-perceived cost of a mount isn't "how long
 * did the commit take" but "how long does the JS thread keep missing frames afterward."
 * Runs a `requestAnimationFrame` loop for `durationMs` from the moment it's called and
 * reports the worst gap, how many frames were dropped, and when the last drop happened
 * (`settleAt`) — that timestamp against the mount's `t0` is the headline before/after
 * number for the Slide1 investigation (see the plan's Phase 0).
 */

export interface FrameGapSummary {
  maxGapMs: number;
  dropsOver32ms: number;
  dropsOver100ms: number;
  /** `performance.now()` timestamp of the last gap over 32ms (~2 frames at 60fps). */
  settleAt: number;
}

export function recordFrameGaps(durationMs: number, onDone: (summary: FrameGapSummary) => void): void {
  const start = performance.now();
  let last = start;
  let maxGapMs = 0;
  let dropsOver32ms = 0;
  let dropsOver100ms = 0;
  let settleAt = start;

  function tick() {
    const now = performance.now();
    const gap = now - last;
    last = now;

    if (gap > 32) {
      dropsOver32ms += 1;
      settleAt = now;
      if (gap > maxGapMs) maxGapMs = gap;
      if (gap > 100) dropsOver100ms += 1;
    }

    if (now - start < durationMs) {
      requestAnimationFrame(tick);
    } else {
      onDone({ maxGapMs, dropsOver32ms, dropsOver100ms, settleAt });
    }
  }

  requestAnimationFrame(tick);
}
