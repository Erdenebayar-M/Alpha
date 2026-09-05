interface ArrowIconProps {
  className?: string;
}

/** The CTA's trailing arrow, vectors exported 1:1 from the Figma "back" node.
 *  Figma renders this at 52.5 x 28.9 (node 1202:7494) — landscape, not the
 *  viewBox's own near-square bounds, which include stroke bleed. */
export default function ArrowIcon({ className }: ArrowIconProps) {
  return (
    <svg viewBox="0 0 53.4153 43.2476" className={className} aria-hidden="true">
      <line x1="7" y1="22.153" x2="45.5" y2="22.153" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
      <line
        x1="7"
        y1="-7"
        x2="28.9418"
        y2="-7"
        transform="matrix(0.745845 0.666119 -0.701617 0.712554 19.75 7.15303)"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="-7"
        x2="28.9418"
        y2="-7"
        transform="matrix(0.745845 -0.666119 -0.701617 -0.712554 19.75 36.0945)"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  );
}
