/**
 * The rolling-hills horizon behind the hero, ported 1:1 from the Figma export
 * (node 1195:6160, "Skill Journey Artwork"). Every layer there is a bare flat
 * ellipse — no gradients, no filters — so the full 13-layer stack (plus the
 * six shrub ellipses under the trees) is one request-free inline SVG instead
 * of ~19 separate image layers. Coordinates and fills are the exact Figma
 * values off the 1440x1327 artboard, cropped to a 1440x927 viewBox — 927 is
 * where the design's own pricing section begins ("Үнийн санал ба хөл",
 * y=927), so nothing visible in the hero is lost, and the wrapper this sits
 * in (HeroScene) is aspect-locked to the same 1440:927 ratio so
 * `xMidYMax slice` only ever crops symmetrically left/right on wider
 * viewports, never the horizon.
 */
export default function Hills() {
  return (
    <svg
      viewBox="0 0 1440 927"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-full w-full"
      aria-hidden="true"
    >
      <ellipse cx="1075.5" cy="724" rx="443.5" ry="243" fill="var(--color-hill-back)" opacity="0.7" />
      <ellipse cx="611.5" cy="769.5" rx="274.5" ry="230.5" fill="var(--color-hill-mid-center)" opacity="0.75" />
      <ellipse cx="611.5" cy="769.5" rx="274.5" ry="230.5" fill="var(--color-hill-mid-center)" opacity="0.75" />
      <ellipse cx="263" cy="890.5" rx="450" ry="297.5" fill="var(--color-hill-back-left)" opacity="0.7" />
      <ellipse
        cx="277.931"
        cy="882.899"
        rx="442.145"
        ry="291.5"
        transform="rotate(1.35837 277.931 882.899)"
        fill="var(--color-hill-back-left-soft)"
        opacity="0.7"
      />
      <ellipse cx="475.5" cy="865.5" rx="363.5" ry="233.5" fill="var(--color-hill-mid)" opacity="0.85" />
      <ellipse cx="384.914" cy="1073.4" rx="392.914" ry="230.4" fill="var(--color-hill-front)" />
      <ellipse cx="1197.26" cy="886.629" rx="271.543" ry="195.429" fill="var(--color-hill-shade)" opacity="0.05" />
      <rect x="-8" y="905" width="1456" height="342" fill="var(--color-hill-front)" opacity="0.7" />
      <rect x="0" y="761" width="1456" height="441" fill="var(--color-hill-mid)" opacity="0.85" />

      {/* Shrubs tucked under the two trees (Figma "Ellipse 58/59/61/62/63/64").
          Figma blurs these so they read as soft background texture instead of
          flat circles, and paints them *before* hill-mid-left/hill-front below
          so those hills cover their lower half — only a soft sliver peeks
          above the hill crest, instead of sitting fully exposed in front of
          it. The rest of this file skips filters for perf, but blurring 6
          small ellipses is cheap. */}
      <g style={{ filter: "blur(6px)" }}>
        <ellipse cx="1232.229" cy="471.086" rx="18.514" ry="26.743" fill="var(--color-bush)" />
        <ellipse cx="1168.457" cy="481.371" rx="45.257" ry="28.8" fill="var(--color-bush-teal)" />
        <ellipse cx="1112.914" cy="508.114" rx="14.4" ry="18.514" fill="var(--color-bush)" />
        <ellipse cx="1284.357" cy="499.886" rx="24.686" ry="39.086" fill="var(--color-bush-teal)" />
        <ellipse cx="1096.457" cy="479.314" rx="18.514" ry="22.629" fill="var(--color-bush)" />
        <ellipse cx="1215.771" cy="508.114" rx="18.514" ry="26.743" fill="var(--color-bush-teal)" />
      </g>

      <ellipse cx="1091.5" cy="841.5" rx="526.5" ry="360.5" fill="var(--color-hill-mid-left)" opacity="0.85" />
      <ellipse cx="1085.5" cy="837" rx="526.5" ry="356" fill="var(--color-hill-mid-left)" opacity="0.85" />
      <ellipse cx="674" cy="969" rx="845" ry="376" fill="var(--color-hill-front)" />
    </svg>
  );
}
