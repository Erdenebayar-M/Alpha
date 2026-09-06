/**
 * The rolling-hills horizon behind the register-child flow, ported from the
 * same Figma artwork as Hills.tsx (node 1195:6160) but cropped taller — the
 * register frame (node 1218:13206, "Skill Journey - Page Background") shows
 * 1202px of the artboard instead of the hero's 927px. Verified against the
 * hero export: every layer here shares exact cx/cy/rx/ry with an existing
 * Hills.tsx ellipse (same fills, same opacities) except two — "hill-back"
 * and "hill-mid-left" aren't present in this frame, and a new "hill-mid-right"
 * ellipse (fill/opacity matching the hill-mid family) plus a wider
 * "hill-mid-center" ellipse take their place. No shrub-blur cluster here;
 * this frame's tree accent is the separate "алсын модод" blur group in
 * RegisterScene instead.
 */
export default function RegisterHills() {
  return (
    <svg
      viewBox="0 0 1440 1202"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-full w-full"
      aria-hidden="true"
    >
      <ellipse cx="1234.286" cy="567.771" rx="510.171" ry="246.857" fill="var(--color-hill-mid)" opacity="0.85" />
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
    </svg>
  );
}
