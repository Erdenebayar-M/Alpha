"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/** `rise`: the wrapper itself fades and rises 16px (Pricing on `/`).
 *  `sequence`: the wrapper stays put; each item inside it marked with
 *  `revealItem()` plays on its own once *it* reaches the trigger line, delayed
 *  by its step (/landing-new's sections). */
export type RevealMode = "rise" | "sequence";

interface RevealProps {
  children: ReactNode;
  mode?: RevealMode;
  className?: string;
  style?: CSSProperties;
}

/** An item plays once its top edge is 25% of the viewport above the bottom,
 *  so it is clearly on screen while it animates. Measured as a line rather
 *  than an intersection ratio so a card taller than that band still plays. */
const SEQUENCE_OBSERVER: IntersectionObserverInit = { rootMargin: "0px 0px -25% 0px" };

/** A fast/large scroll (trackpad flick, Page Down, a same-page anchor jump)
 *  can move an element from below the trigger line to fully above the
 *  viewport between two observer samples, so `isIntersecting` never reports
 *  `true` for it. Once that element's bottom edge has passed the viewport
 *  top, it must already have crossed the trigger line, so it's still owed
 *  its reveal. `boundingClientRect` reflects real geometry regardless of
 *  `rootMargin`, so this check is unaffected by SEQUENCE_OBSERVER's offset. */
function hasScrolledPast(entry: IntersectionObserverEntry) {
  return entry.boundingClientRect.bottom <= 0;
}

/** Same test on a live element. Skips `display: none` items (all-zero rect). */
function isAboveViewport(el: Element) {
  const rect = el.getBoundingClientRect();
  return (rect.width > 0 || rect.height > 0) && rect.bottom <= 0;
}

/** Wraps a block and flags what has entered the viewport, once, then stops
 *  watching it. CSS (the [data-reveal] rules in globals.css) drives the
 *  actual animation; this only decides *when* to start it — no per-frame JS.
 *
 *  `sequence` flags each item with a `data-visible` attribute directly rather
 *  than through React state: the items are Server Component markup passed in
 *  as `children`, and React never renders that attribute on them, so it
 *  leaves it alone on re-render. */
export default function Reveal({ children, mode = "rise", className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (mode === "sequence") {
      const pending = new Set(node.querySelectorAll("[data-reveal-item]"));
      const reveal = (target: Element) => {
        target.setAttribute("data-visible", "true");
        observer.unobserve(target);
        pending.delete(target);
      };
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || hasScrolledPast(entry)) reveal(entry.target);
        }
      }, SEQUENCE_OBSERVER);
      pending.forEach((item) => observer.observe(item));

      // Chromium doesn't re-run the observer callback when one jump carries an
      // item from below the trigger line to fully above the viewport (the
      // intersection ratio is 0 at both samples), so also check on scroll.
      let frame = 0;
      const onScroll = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          pending.forEach((item) => {
            if (isAboveViewport(item)) reveal(item);
          });
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && (entry.isIntersecting || hasScrolledPast(entry))) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <div
      ref={ref}
      data-reveal={mode}
      data-visible={mode === "rise" ? visible : undefined}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
}
