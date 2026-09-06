// Figma's own "bg-sky" layer is only 252px tall (node 1195:6163) — the
// transition completes near the top of the artwork, then stays flat pale
// below it. Pixel stops (instead of percentages) reproduce that regardless
// of how tall the consuming scene's own container is. Shared by HeroScene
// and RegisterScene, which crop the same 1195:6160 artwork to different
// heights.
export const SKY_GRADIENT =
  "linear-gradient(to bottom, rgba(63,160,251,0.13) 0px, #E5F1FD 126px, #FAFCFE 252px)";
