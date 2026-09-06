/**
 * The rolling-hills horizon behind the register-child flow, ported from the
 * same Figma artwork as Hills.tsx (node 1195:6160) but cropped taller — the
 * register frame (node 1218:13206, "Skill Journey - Page Background") shows
 * 1202px of the artboard instead of the hero's 927px. Verified against the
 * hero export: every layer here shares exact cx/cy/rx/ry with an existing
 * Hills.tsx ellipse (same fills, same opacities) except two — "hill-back"
 * and "hill-mid-left" aren't present in this frame, and a wider
 * "hill-mid-center" ellipse takes their place. No shrub-blur cluster here;
 * this frame's tree accent is the separate "алсын модод" blur group in
 * RegisterScene instead.
 *
 * RegisterScene now sizes this SVG's box from viewport *height* alone (see
 * that file), so on a wide-but-not-tall screen the box is wider than the
 * 1440-unit artboard. Rather than stretching or upscaling the Figma shapes
 * to fill that width (which would resize the hills), the two `<use>` copies
 * below mirror the same ten shapes across x=0 and x=1440 into just the
 * gutter regions outside the artboard, clipped so they never repaint inside
 * it. The reflection is exactly seamless: every shape's silhouette value at
 * x=0 / x=1440 is continuous with its own mirror by construction, and no
 * mirrored shape ever rises above the original anywhere in 0–1440 (checked
 * numerically), so this only ever extends the ground sideways — it never
 * changes a pixel of the artboard itself.
 */
export default function RegisterHills() {
  return (
    <svg
      viewBox="0 0 1440 1202"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-x-0 bottom-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <g id="register-hills-shapes">
          <ellipse cx="611.5" cy="769.5" rx="274.5" ry="230.5" fill="var(--color-hill-mid-center)" opacity="0.75" />
          <ellipse cx="896.5" cy="769.5" rx="559.5" ry="230.5" fill="var(--color-hill-mid-center)" opacity="0.75" />
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
          <ellipse cx="674" cy="969" rx="845" ry="376" fill="var(--color-hill-front)" />
        </g>
        <clipPath id="rh-gutter-left">
          <rect x="-4000" y="-1000" width="4000" height="4202" />
        </clipPath>
        <clipPath id="rh-gutter-right">
          <rect x="1440" y="-1000" width="4000" height="4202" />
        </clipPath>
      </defs>

      {/* Mirrors, drawn first (behind the real artboard): reflect about x=0
          and x=1440 respectively, each clipped to its own gutter. */}
      <g clipPath="url(#rh-gutter-left)">
        <use href="#register-hills-shapes" transform="matrix(-1 0 0 1 0 0)" />
      </g>
      <g clipPath="url(#rh-gutter-right)">
        <use href="#register-hills-shapes" transform="matrix(-1 0 0 1 2880 0)" />
      </g>

      <use href="#register-hills-shapes" />
    </svg>
  );
}
