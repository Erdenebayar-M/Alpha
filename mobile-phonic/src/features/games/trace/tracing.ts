import { space, touchMin, trace } from '../../../theme/tokens';
import type { Point, Stroke } from './strokes';

export type StepStatus = 'tracing' | 'done' | 'stray';

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

/** Shortest distance from a point to the stroke's polyline. */
export function distanceToPath(stroke: Stroke, p: Point): number {
  if (stroke.length === 1) return dist(p, stroke[0]);
  let best = Infinity;
  for (let i = 1; i < stroke.length; i++) best = Math.min(best, distanceToSegment(p, stroke[i - 1], stroke[i]));
  return best;
}

/**
 * Moves the finger to `p`. `next` is how many checkpoints are already reached. Reaching the next
 * checkpoint within `tolerance` advances; once started, straying beyond tolerance × strayFactor
 * from the path is 'stray' (the caller resets the stroke). Pure, so it is unit-tested.
 */
export function stepStroke(
  stroke: Stroke,
  next: number,
  p: Point,
  tolerance = trace.tolerance,
  strayFactor = trace.strayFactor,
): { next: number; status: StepStatus } {
  if (next > 0 && distanceToPath(stroke, p) > tolerance * strayFactor) return { next: 0, status: 'stray' };
  let n = next;
  while (n < stroke.length && dist(p, stroke[n]) <= tolerance) n++;
  return { next: n, status: n >= stroke.length ? 'done' : 'tracing' };
}

/** The square board's side, from the Game's room (`useGameArea`): leaves space for the side column. */
export function boardSize({ width, height }: { width: number; height: number }): number {
  return Math.min(height * trace.boardHeightShare, width - touchMin - space.xl);
}

/**
 * An SVG path through 0–1 points scaled to a board of `size` px, smoothed with a Catmull-Rom
 * spline (as cubic Béziers, wrapped for closed strokes) so curved letters are not drawn as polygons. The checkpoints
 * themselves stay as they are for hit-testing.
 */
export function toPath(points: readonly Point[], size: number): string {
  // A closed stroke (first point == last, like о) wraps around so the curve has no cusp where it starts.
  const [first, last] = [points[0], points[points.length - 1]];
  const closed = points.length > 2 && first[0] === last[0] && first[1] === last[1];
  const n = closed ? points.length - 1 : points.length;
  const at = (i: number) => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const px = (p: Point) => `${p[0] * size} ${p[1] * size}`;
  let d = `M${px(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 2), at(i - 1), at(i), at(i + 1)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${px(c1)} ${px(c2)} ${px(p2)}`;
  }
  return d;
}

export type TraceEvent = 'none' | 'progress' | 'stray' | 'stroke' | 'letter';

/**
 * Follows the finger through a letter's strokes in order. After a stray or a finished stroke the
 * rest of that touch is ignored, so one slip is one mistake and the next stroke needs a new touch.
 */
export type Tracer = ReturnType<typeof createTracer>;

export function createTracer(strokes: readonly Stroke[]) {
  let stroke = 0;
  let next = 0;
  let ignore = false;
  return {
    /** The stroke the child is on (strokes.length once the letter is done). */
    get stroke() {
      return stroke;
    },
    /** A new touch begins. */
    begin: () => {
      ignore = false;
    },
    move(p: Point): TraceEvent {
      if (ignore || stroke >= strokes.length) return 'none';
      const step = stepStroke(strokes[stroke], next, p);
      next = step.status === 'tracing' ? step.next : 0;
      if (step.status === 'stray') {
        ignore = true;
        return 'stray';
      }
      if (step.status === 'done') {
        ignore = true;
        stroke += 1;
        return stroke === strokes.length ? 'letter' : 'stroke';
      }
      return next > 0 ? 'progress' : 'none';
    },
    /** The finger lifted: an unfinished stroke starts over. */
    end: () => {
      next = 0;
    },
  };
}
