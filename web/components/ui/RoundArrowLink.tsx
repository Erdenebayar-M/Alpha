import { cn } from "@/lib/cn";

interface RoundArrowLinkProps {
  href: string;
  /** Accessible name — the button is icon-only, so callers name the
   *  destination (e.g. the Article it opens) rather than printing text. */
  "aria-label": string;
  className?: string;
}

/**
 * The Featured article card's round arrow CTA (Figma node 1401:22074,
 * "Frame 91"): a 40px brand-green circle around a 20px white chevron
 * (10px padding each side, matching the frame's own `p-[10px]`).
 */
export default function RoundArrowLink({ href, "aria-label": ariaLabel, className }: RoundArrowLinkProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "focus-ring group flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-green transition-transform duration-150 ease-press hover:-translate-y-px active:translate-y-px active:duration-75",
        className
      )}
    >
      <svg viewBox="0 0 21 21" className="size-5" aria-hidden="true">
        <path
          d="M1.75 10.5H19.25M10.5 1.75L19.25 10.5L10.5 19.25"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </a>
  );
}
