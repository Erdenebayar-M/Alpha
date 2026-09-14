// Figma's own "bg-sky" layer is a short band at the top of the artwork (252px
// in node 1195:6163 / 1218:13210, 273px in the landing redesign's 1360:8565)
// — the transition completes near the top of the artwork, then stays flat
// pale below it. Pixel stops (instead of percentages) reproduce that
// regardless of how tall the consuming scene's own container is. The
// midpoint stop sits at half the band, per Figma's `via-1/2`.
export function skyGradient(bandHeight: number) {
  return `linear-gradient(to bottom, rgba(63,160,251,0.13) 0px, #E5F1FD ${bandHeight / 2}px, #FAFCFE ${bandHeight}px)`;
}

// Shared by HeroScene and RegisterScene, which crop the same 1195:6160
// artwork to different heights, and by LandingScene's below-`lg` tier.
export const SKY_GRADIENT = skyGradient(252);
