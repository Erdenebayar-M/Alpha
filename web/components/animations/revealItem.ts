import type { CSSProperties } from "react";

/** `fade`: opacity only (a section's heading). `slide`: fades in while
 *  sliding left from 40px to the right (the blocks under the heading). */
export type RevealItemKind = "fade" | "slide";

/** Marks one element inside a `<Reveal mode="sequence">` to play when the
 *  section enters the viewport, `step` × 90ms after the sequence starts (see
 *  the [data-reveal='sequence'] rules in globals.css). Spread onto the element
 *  itself, so a flex/grid child keeps its own sizing without a wrapper.
 *
 *  Kept out of Reveal.tsx: that is a Client Component module, and a plain
 *  function exported from one can't be called by the Server Component
 *  sections that use this. */
export function revealItem(kind: RevealItemKind, step: number) {
  return {
    "data-reveal-item": kind,
    style: { "--reveal-step": step } as CSSProperties,
  };
}
