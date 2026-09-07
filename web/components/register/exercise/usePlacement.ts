import { useCallback, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

/** Marks a drop target so a drag can find it by coordinate. */
export const GAP_ATTRIBUTE = "data-gap-index";

export interface Placement {
  /** Index of the gap the token currently sits in, or null. */
  readonly placedAt: number | null;
  /** True once the token has been picked up by click — the keyboard/tap path. */
  readonly armed: boolean;
  readonly dragging: boolean;
  /** The gap under the pointer mid-drag, for hover feedback. */
  readonly hoveredGap: number | null;
  /** Gaps show themselves while the learner is looking for one. */
  readonly targeting: boolean;
  readonly place: (gap: number) => void;
  readonly tokenHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  };
}

function gapAt(x: number, y: number): number | null {
  const target = document.elementFromPoint(x, y)?.closest(`[${GAP_ATTRIBUTE}]`);
  const raw = target?.getAttribute(GAP_ATTRIBUTE);
  return raw === null || raw === undefined ? null : Number(raw);
}

/**
 * Moving one punctuation mark into a sentence — shared by "Өгүүлбэрийн
 * төгсгөлийг олж тэмдэглэ" (node 1255:16722) and "Таслалыг хаана, хаана тавих
 * вэ?" (node 1255:16988), which are the same interaction with a different mark.
 *
 * Two ways in, both landing on the same `place()`:
 *
 *  - Click or tap. Every gap is a real `<button>`, so it is reachable by Tab
 *    and answers to Enter and Space. Clicking the token first is optional; it
 *    just arms the gaps so they show themselves, which is what makes the
 *    keyboard path discoverable rather than a hidden affordance.
 *  - Pointer drag, which is what the design's own copy asks for ("Цэгийг
 *    чирч…" — drag the dot). It is layered on top and never the only route:
 *    dropping is resolved by hit-testing the gap under the pointer, so a drag
 *    that ends nowhere simply leaves the answer untouched.
 *
 * Pointer Events cover mouse, touch and pen in one code path, and pointer
 * capture keeps the drag alive when the finger leaves the small token.
 */
export function usePlacement(): Placement {
  const [placedAt, setPlacedAt] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);

  const place = useCallback((gap: number) => {
    setPlacedAt((previous) => (previous === gap ? null : gap));
    setArmed(false);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setHoveredGap(gapAt(event.clientX, event.clientY));
    },
    [dragging]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gap = gapAt(event.clientX, event.clientY);
      setDragging(false);
      setHoveredGap(null);
      if (gap !== null) {
        place(gap);
        return;
      }
      // A drag that went nowhere reads as a plain click on the token, which is
      // the tap path's "pick it up".
      setArmed((previous) => !previous);
    },
    [place]
  );

  const onPointerCancel = useCallback(() => {
    setDragging(false);
    setHoveredGap(null);
  }, []);

  // A pointer gesture that ends on the token still produces a click, and
  // pointer capture routes that click to the token even when the finger lifted
  // over a gap — so handling both here would arm the token again right after a
  // successful drop, leaving every gap lit. Mouse and touch are already covered
  // by onPointerUp above; `detail === 0` is what is left, which is a keyboard
  // Enter or Space on this button.
  const onClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (event.detail === 0) setArmed((previous) => !previous);
  }, []);

  return {
    placedAt,
    armed,
    dragging,
    hoveredGap,
    targeting: armed || dragging,
    place,
    tokenHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick },
  };
}
