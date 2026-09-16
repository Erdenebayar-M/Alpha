"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

// One CollectionCard's own width (244px, see CollectionCard.tsx) plus the
// row's own gap-6 (24px) — scrolling by this much moves exactly one card;
// scroll-snap then settles the row on the nearest card regardless, so this
// doesn't need to be pixel-exact.
const SCROLL_STEP_PX = 244 + 24;

interface CollectionsScrollerProps {
  headingId: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
}

/**
 * The Collections row's scroll region (issue #93, a follow-up to #73) plus
 * optional prev/next buttons layered over its edges. The scroll mechanism
 * itself — native `overflow-x-auto` + `scroll-snap`, `tabIndex=0`, focusable
 * card links — is unchanged from #73 and is already sufficient on its own
 * (research for #93 found the WAI-ARIA APG Carousel pattern doesn't apply to
 * a static, non-looping, non-autoplaying row like this one; Adrian
 * Roselli's simpler "scrollable region" guidance is what's implemented
 * here). The buttons are a pointer-device convenience layered on top, not a
 * second scroll mechanism — they call `scrollBy` on the same container
 * every other input already scrolls.
 *
 * This is a Client Component only because the buttons need to read/drive
 * the scroll container's state; `children` (the five `CollectionCard`s) are
 * still rendered server-side by CollectionsRow and passed straight through.
 */
export default function CollectionsScroller({ headingId, prevLabel, nextLabel, children }: CollectionsScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Pulled out of the effect (rather than a plain closure inside it) so
  // `scrollByCard` can also call it directly: an instant ("auto") scroll
  // finishes synchronously, before `scrollBy` even returns, so the caller
  // already knows the final position and doesn't need to wait on a
  // `scroll`/`scrollend` event to find out — which matters because a
  // programmatic instant scroll doesn't reliably fire one on every engine.
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // -2px tolerance rather than -1: fractional `scrollLeft`/`scrollWidth`
    // (non-100% zoom, some browsers' subpixel layout) can leave a 1px gap
    // at true rest that a -1 tolerance still treats as "not yet at the
    // end".
    const nextAtStart = el.scrollLeft <= 0;
    const nextAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;

    // A `disabled` button that currently holds focus loses focus outright
    // (drops to <body>, no relocation) — move focus to the button that's
    // about to become the enabled one *before* the state flip disables its
    // sibling, so a keyboard user paging to the end never loses their
    // place. Falls back to the scroll region itself in the (here
    // unreachable, since there are always more cards than fit) case where
    // both ends are true at once.
    if (nextAtStart && document.activeElement === prevButtonRef.current) {
      (nextAtEnd ? el : nextButtonRef.current)?.focus();
    }
    if (nextAtEnd && document.activeElement === nextButtonRef.current) {
      (nextAtStart ? el : prevButtonRef.current)?.focus();
    }

    setAtStart(nextAtStart);
    setAtEnd(nextAtEnd);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();

    // Belt and suspenders: `scroll` covers pointer/wheel scrolling and
    // `scrollend` (where supported) catches anything `scroll` misses once
    // motion settles — both cover the *smooth*-scroll button click, whose
    // final position genuinely isn't known until the animation finishes.
    // Tab-driven focus moving the row doesn't reliably fire either — a
    // focused element's own scroll-into-view lands synchronously within the
    // same `focus()` call, so `focusin` reads the already-settled position
    // directly (no rAF/timeout needed, and a scheduled read is the wrong
    // fix anyway: rAF callbacks can stall indefinitely on a
    // backgrounded/inactive tab). `document.fonts.ready` recomputes once
    // Nunito finishes loading — a late font swap can widen card text enough
    // to change `scrollWidth` without any scroll/resize of its own.
    el.addEventListener("scroll", updateEdges, { passive: true });
    el.addEventListener("scrollend", updateEdges, { passive: true });
    el.addEventListener("focusin", updateEdges);
    window.addEventListener("resize", updateEdges);
    document.fonts?.ready?.then(updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      el.removeEventListener("scrollend", updateEdges);
      el.removeEventListener("focusin", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduceMotion ? "auto" : "smooth";
    el.scrollBy({ left: direction * SCROLL_STEP_PX, behavior });
    if (behavior === "auto") updateEdges();
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="group"
        aria-labelledby={headingId}
        className="focus-ring flex snap-x snap-mandatory gap-6 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <ScrollButton
        ref={prevButtonRef}
        direction="prev"
        label={prevLabel}
        disabled={atStart}
        onClick={() => scrollByCard(-1)}
      />
      <ScrollButton
        ref={nextButtonRef}
        direction="next"
        label={nextLabel}
        disabled={atEnd}
        onClick={() => scrollByCard(1)}
      />
    </div>
  );
}

interface ScrollButtonProps {
  ref: Ref<HTMLButtonElement>;
  direction: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}

// Desktop/pointer-only (`lg:flex`, hidden below it) — mobile already has
// native swipe, and a 40px button floating over a 244px-wide card is too
// cramped below `lg`. Reuses the card chevron's own asset/circle treatment
// (`bg-brand-green` + `collection-chevron.svg`) rather than inventing a new
// button style, mirroring is CSS-only (`-scale-x-100`) so "prev" doesn't
// need a second asset. `ref` is forwarded (a plain prop under React 19) so
// the parent can redirect focus off a button the instant it's about to
// become `disabled` — see CollectionsScroller's own `updateEdges` comment.
function ScrollButton({ ref, direction, label, disabled, onClick }: ScrollButtonProps) {
  const isPrev = direction === "prev";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand-green shadow-md transition-[opacity,filter] duration-150 lg:flex",
        isPrev ? "left-2" : "right-2",
        "hover:brightness-95 disabled:pointer-events-none disabled:opacity-30"
      )}
    >
      <Image
        src="/images/landing/collection-chevron.svg"
        alt=""
        width={14}
        height={14}
        className={isPrev ? "-scale-x-100" : undefined}
      />
    </button>
  );
}
